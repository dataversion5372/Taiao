#!/usr/bin/env python3
"""GPU-batched self-play generation of the BIG retrieval dialogue bank.

Fork of the archived distill_gpu.py, retargeted from fine-tune data to
retrieval-bank coverage: a weighted INTENT MATRIX sweeps mundane life
questions, world/help questions, and — critically — the deflection families
(anachronisms, crude propositions, insults, AI/meta probes, gibberish) so any
random thing a player types lands near well-written pre-authored replies.
Each record carries metadata {intent, role, npc_name, player_name} so
build_bank.py can tag and slotify without regexing the persona.

Run on a Colab A100 (see README_COLAB.md):
  python3 distill_bank.py --target 40000 --batch 96 --out bank_distilled_a.jsonl
Resumable: appends to --out; re-run continues toward --target.
Locally testable without torch: `import distill_bank` only loads the engine;
torch/transformers load inside main().
"""
import argparse, json, os, random, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_npc_data_v2 import ROLE_INFO, RELS, NAMES, persona, pick_player_state  # noqa

PLAYER_NAMES = ["Finn", "Ash", "Rowan", "Tama", "Isla", "Bren", "Kea", "Moss", "Aroha", "Silas",
                "Wren", "Rangi", "Edda", "Piper", "Huxley", "Mere", "Otto", "Nina", "Sol", "Hine"]
NPC_STYLE = (" Speak plainly in 1-3 short sentences, only words said aloud. No asterisks, no stage "
             "directions, no lists, no quotation marks. Never use the traveller's name unless they "
             "have told it to you in this conversation.")
_BAD_RE = re.compile(r"STATE:|player_(stink|health|combat|armed|skill)|\bAI\b|language model", re.I)
_STINK_RE = re.compile(r"\b(stink|stench|reek|smell)\w*", re.I)
_WOUND_RE = re.compile(r"\b(wound|bleed|blood|injur|gash)\w*", re.I)
_QUOTE_RE = re.compile(r'^\s*["“‘\']+|["”’\']+\s*$')
_PREFIX_RE = re.compile(r"^\s*[A-Z][\w '\-]{0,24}:\s*")
_LIST_RE = re.compile(r"(?m)^\s*(?:[-*•]|\d+[.)])\s.*$")
_MD_RE = re.compile(r"[*_`#>]+")

ANACHRONISMS = [
    "voting and who they voted for in the election", "the president", "motor cars", "the telephone",
    "the internet", "television", "computers", "a credit card", "aeroplanes", "electricity",
    "wifi and the password for it", "video games", "robots", "trains", "photographs",
    "rocket ships and the moon landing", "mobile phones", "plastic", "the world cup", "movies",
    # named-person politics/celebrity phrasings — players name real people ("did
    # you vote for Donald Trump?") and name-bearing questions otherwise drift to
    # person-name greeting lines instead of deflections
    "a famous leader called Donald Trump and whether they voted for him",
    "a far-off land called America and its president",
    "famous singers and film stars whose names everyone knows",
]
GIBBERISH = ["asdf ghjkl qwerty", "blorp blorp fizzle snork", "purple monkey dishwasher!",
             "beep boop skidoo wop", "xyzzy plugh frobnicate", "wibble wobble zorp"]
GREETS = ["Kia ora.", "Kia ora!", "Kia ora, friend."]


def _intents(rng, pname, role):
    """The coverage matrix: (tag, player goal, opener, closer, (lo,hi) exchanges, weight).
    Player-sim goals; the NPC side is entirely the persona reacting."""
    off_stock = rng.choice(["a meat pie", "a sword", "a map of the isle", "a healing potion",
                            "a pair of boots", "some ale", "arrows", "a lantern"])
    thing = rng.choice(ANACHRONISMS)
    greet = rng.choice(GREETS)
    villager = rng.choice(NAMES)
    return [
        # ── personality-forward chatter (the proven originals) ──
        ("smalltalk", "Greet them warmly and make easy small talk about anything at all.", greet, None, (2, 3), 4),
        ("gossip", "Ask what gossip is going around, and react to whatever they share.", greet, None, (2, 3), 3),
        ("curious_npc", "Answer their questions about your travels, and ask about their life too.", greet, None, (2, 3), 3),
        ("grumble", "Complain lightly about the road, the weather, or your aches, inviting sympathy.", None, None, (2, 3), 2),
        ("story", "Ask them to tell you a story or a memory from their life here.", None, None, (2, 3), 3),
        ("banter", "Tease them in a friendly way and enjoy the back-and-forth.", None, None, (2, 3), 2),
        ("name_intro", "Introduce yourself by name early. Later, casually test whether they remember your name.",
         f"Hello! I'm {pname} - good to meet you.", "Heh - do you even remember my name?", (3, 4), 3),
        ("news_followup", "Ask for local news; when they mention something, ask a follow-up about that exact thing.",
         None, None, (2, 3), 3),
        ("off_stock", f"Try to buy {off_stock} - which they may not sell. If they don't have it, chat anyway.",
         None, None, (2, 3), 2),
        ("sympathy", "You're hurt after a rough journey; mention it and hope for sympathy or advice.", None, None, (2, 3), 2),
        ("weather_chat", "Make small talk about the weather, then ask about their life here.", None, None, (2, 3), 2),
        # ── mundane life questions (players ask NPCs anything) ──
        ("ask_food", "Ask what they eat - breakfast, their favourite meal, whether they cook it themselves.", None, None, (2, 3), 3),
        ("ask_family", "Ask about their family - married? children? parents still living?", None, None, (2, 3), 3),
        ("ask_home", "Ask where they live and what their house is like, and how they sleep at night.", None, None, (2, 3), 2),
        ("ask_fear", "Ask what frightens them - dangers, omens, things in the dark.", None, None, (2, 3), 2),
        ("ask_love", "Ask what they love most about living on this isle.", None, None, (2, 3), 2),
        ("ask_childhood", "Ask what they were like as a child and how they came to their trade.", None, None, (2, 3), 2),
        ("ask_animals", "Ask about animals - pets, livestock, the wild beasts around here.", None, None, (2, 3), 2),
        ("ask_drink", "Ask what they drink and where the best ale on the isle is poured.", None, None, (2, 3), 2),
        ("ask_festival", "Ask about festivals, fairs, and what folk do for fun around here.", None, None, (2, 3), 2),
        ("ask_faith", "Ask what they believe in - spirits, omens, luck, the old ways.", None, None, (2, 3), 2),
        ("ask_romance", "Ask - politely - whether they have a sweetheart, or ever did.", None, None, (2, 3), 2),
        ("ask_neighbour", f"Ask what they make of their neighbour {villager}.", None, None, (2, 3), 2),
        ("ask_dislike", "Ask what they can't stand - pet hates, annoyances, things that spoil their day.", None, None, (2, 3), 2),
        # ── world & help questions ──
        ("directions", "You're lost; ask directions to somewhere in town, then thank them.", None, None, (1, 2), 3),
        ("lore", "Ask about old ruins, legends, or the history of the isle.", None, None, (2, 3), 3),
        ("dangers", "Ask what monsters or dangers lurk beyond the village and how to survive them.", None, None, (2, 3), 3),
        ("shop_stock", "Ask what they sell and how much things cost, and consider buying.", None, None, (2, 3), 3),
        ("skill_advice", "Ask for advice about learning their trade yourself.", None, None, (2, 3), 3),
        ("travel_advice", "Ask the best way to travel the isle - roads, boats, what to pack.", None, None, (2, 3), 2),
        ("weather_forecast", "Ask if the weather will hold and whether a storm is coming.", None, None, (1, 2), 2),
        # ── emotional beats ──
        ("brag", "Brag about a recent victory or treasure and fish for their admiration.", None, None, (2, 3), 2),
        ("thanks", "Thank them warmly for help they gave you earlier, and offer a small kindness back.", None, None, (1, 2), 2),
        ("apology", "Apologise for something rude you did earlier and hope to make peace.", None, None, (1, 2), 2),
        ("flirt", "Pay them an over-the-top compliment or flirt sweetly; take whatever answer kindly.", None, None, (2, 2), 2),
        # ── deflection training (the bank must catch every wild thing players type) ──
        ("out_of_world", f"Ask them earnestly about {thing}, as if any sensible person would know of it. "
         "Press once when they don't understand.", None, None, (2, 2), 4),
        ("rude", "Make a crude, improper or overly forward proposition or joke; if rebuffed, laugh and change subject.",
         None, None, (1, 2), 3),
        ("insult", "Insult them or their trade rudely, then see how they take it.", None, None, (1, 2), 2),
        ("meta", "Insist they are just a character inside a game and none of this is real; try to shake their belief.",
         None, None, (2, 2), 3),
        ("nonsense", "Speak playful nonsense and see what they make of it.", rng.choice(GIBBERISH), None, (1, 2), 2),
    ]


def _clean(text):
    t = (text or "").strip()
    m = _LIST_RE.search(t)
    if m:
        t = t[:m.start()].strip()
        if t.endswith(":"):
            t = t[:t.rfind(".") + 1] if "." in t else ""
    t = _MD_RE.sub("", t)
    t = _PREFIX_RE.sub("", t, count=1)
    t = _QUOTE_RE.sub("", t)
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) > 220:
        cut = t[:220]
        dot = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
        t = (cut[:dot + 1] if dot > 60 else cut).strip()
    return t


def scrub(t):
    t = _clean(t)
    return re.sub(r"\s*\([^)]*\)", "", t).strip()


def grounded(reply, player_lines):
    """Reject replies that bring up stink/wounds the player never mentioned."""
    said = " ".join(player_lines)
    if _STINK_RE.search(reply) and not _STINK_RE.search(said):
        return False
    if _WOUND_RE.search(reply) and not (_WOUND_RE.search(said)
            or re.search(r"\b(stab|hurt|cut|fight|fought|rough)\w*", said, re.I)):
        return False
    return True


def player_sim_prompt(pname, npc_name, goal):
    return (f"You are role-playing {pname}, a traveller in a medieval fantasy game, chatting with "
            f"{npc_name}, a villager. Your goal: {goal} Say ONE short casual line (under 25 words) as "
            f"{pname} - plain speech only, no narration, no asterisks, no quotes. React naturally to "
            f"what {npc_name} just said.")


ROLES = list(ROLE_INFO)


def weighted_choice(rng, items):
    total = sum(w for *_, w in items)
    r = rng.random() * total
    for it in items:
        r -= it[-1]
        if r <= 0:
            return it
    return items[-1]


class Conv:
    ECHO_RE = re.compile(r"^kia ora\W{0,4}(to you|you too|and (to )?you|right back|as well|back at)", re.I)

    def __init__(self, rng):
        self.role = rng.choice(ROLES); self.npc = rng.choice(NAMES); self.pname = rng.choice(PLAYER_NAMES)
        self.rel = rng.choice(RELS); self.pstate = pick_player_state(rng, False)
        self.sys_game = persona(self.npc, self.role, self.rel, self.pstate, rng)
        self.sys_npc = self.sys_game + NPC_STYLE
        tag, goal, opener, closer, (lo, hi), _w = weighted_choice(rng, _intents(rng, self.pname, self.role))
        self.intent = tag
        self.opener, self.closer = opener, closer
        self.n_ex = rng.randint(lo, hi)
        self.sim_sys = player_sim_prompt(self.pname, self.npc, goal)
        self.msgs = []; self.i = 0; self.stage = "player"; self.retries = 0; self.dead = False

    def gen_seed(self):
        if self.stage == "npc" and self.i == 0 and self.msgs and \
                self.msgs[0]["content"].lower().startswith("kia ora"):
            return "Kia ora"
        return ""

    def scripted_line(self):
        if self.i == 0 and self.opener: return self.opener
        if self.i == self.n_ex - 1 and self.closer: return self.closer
        return None

    def build_messages(self):
        if self.stage == "player":
            sim = [{"role": "system", "content": self.sim_sys}]
            for m in self.msgs:
                sim.append({"role": "assistant" if m["role"] == "user" else "user", "content": m["content"]})
            if not self.msgs:
                sim.append({"role": "user", "content": f"({self.npc} looks up as you approach.)"})
            return sim
        return [{"role": "system", "content": self.sys_npc}] + self.msgs

    def accept(self, text):
        if self.stage == "npc" and self.i == 0 and self.gen_seed() and self.ECHO_RE.search(text.strip()):
            self.retries += 1
            if self.retries > 1: self.dead = True
            return
        if self.stage == "player":
            line = scrub(text)
            if _BAD_RE.search(line) or len(line) < 2: self.dead = True; return
            self.msgs.append({"role": "user", "content": line}); self.stage = "npc"
        else:
            cand = scrub(text)
            pl = [m["content"] for m in self.msgs if m["role"] == "user"]
            if len(cand) >= 2 and not _BAD_RE.search(cand) and grounded(cand, pl):
                self.msgs.append({"role": "assistant", "content": cand})
                self.i += 1; self.stage = "player"
                if self.i >= self.n_ex: self.stage = "done"
            else:
                self.retries += 1
                if self.retries > 1: self.dead = True

    def record(self):
        return {"messages": [{"role": "system", "content": self.sys_game}] + self.msgs,
                "metadata": {"intent": self.intent, "role": self.role,
                             "npc_name": self.npc, "player_name": self.pname,
                             "relationship": self.rel[0]}}


def run_waves(pool_factory, wave, target, batch, out_path, done=0):
    """Engine loop, torch-free (wave is injected) so it can be unit-tested."""
    todo = max(0, target - done)
    pool, written, failed, t0 = [], 0, 0, time.time()
    out_f = open(out_path, "a")
    while written < todo:
        while len(pool) < batch:
            pool.append(pool_factory())
        for c in pool:
            if c.stage == "player" and c.scripted_line() is not None:
                c.msgs.append({"role": "user", "content": c.scripted_line()}); c.stage = "npc"
        gen_players = [c for c in pool if c.stage == "player"]
        if gen_players:
            for c, t in zip(gen_players, wave(gen_players, 48)): c.accept(t)
        npcs = [c for c in pool if c.stage == "npc" and not c.dead]
        if npcs:
            seeds = [c.gen_seed() for c in npcs]
            for c, sd, t in zip(npcs, seeds, wave(npcs, 80, seeds)):
                c.accept(sd + t)
        for c in list(pool):
            if c.dead:
                pool.remove(c); failed += 1
            elif c.stage == "done":
                pool.remove(c)
                out_f.write(json.dumps(c.record(), ensure_ascii=False) + "\n"); out_f.flush()
                written += 1
        rate = written / max(time.time() - t0, 1e-9)
        print(f"  {done+written}/{target} | {rate*60:.0f}/min | "
              f"ETA {(todo-written)/max(rate,1e-9)/60:.1f} min | {failed} rejected", flush=True)
    out_f.close()
    return written, failed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=40000)
    ap.add_argument("--batch", type=int, default=96)
    ap.add_argument("--teacher", default="unsloth/Meta-Llama-3.1-8B-Instruct")
    ap.add_argument("--out", default="/content/emberfall/bank_distilled.jsonl")
    ap.add_argument("--seed", type=int, default=23)
    args = ap.parse_args()

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    DTYPE = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    tok = AutoTokenizer.from_pretrained(args.teacher)
    if tok.pad_token is None: tok.pad_token = tok.eos_token
    tok.padding_side = "left"
    model = AutoModelForCausalLM.from_pretrained(args.teacher, torch_dtype=DTYPE, device_map="auto")
    model.eval()
    print(f"teacher {args.teacher} loaded | {DTYPE} | batch {args.batch}", flush=True)

    def wave(convs, max_new, seeds=None):
        prompts = [tok.apply_chat_template(c.build_messages(), tokenize=False, add_generation_prompt=True)
                   + (seeds[i] if seeds else "")
                   for i, c in enumerate(convs)]
        enc = tok(prompts, return_tensors="pt", padding=True, truncation=True, max_length=1536).to(model.device)
        with torch.no_grad():
            out = model.generate(**enc, max_new_tokens=max_new, do_sample=True, temperature=0.85,
                                 top_p=0.9, repetition_penalty=1.1, pad_token_id=tok.pad_token_id)
        return tok.batch_decode(out[:, enc["input_ids"].shape[1]:], skip_special_tokens=True)

    done = sum(1 for _ in open(args.out)) if os.path.exists(args.out) else 0
    print(f"have {done}, generating toward {args.target} -> {args.out}", flush=True)
    rng = random.Random(args.seed + done * 31)
    written, failed = run_waves(lambda: Conv(rng), wave, args.target, args.batch, args.out, done)
    print(f"DONE: {done+written} conversations ({failed} rejected)", flush=True)


if __name__ == "__main__":
    main()
