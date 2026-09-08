#!/usr/bin/env python3
"""GPU-batched self-play distillation (standalone twin of the Colab notebook engine).
Run on the A100: python3 distill_gpu.py --target 3000 --batch 96 --teacher unsloth/Meta-Llama-3.1-8B-Instruct
Resumable: appends to --out; re-run continues toward --target."""
import argparse, json, os, random, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_npc_data_v2 import ROLE_INFO, RELS, NAMES, persona, pick_player_state  # noqa

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

PLAYER_NAMES = ["Finn", "Ash", "Rowan", "Tama", "Isla", "Bren", "Kea", "Moss", "Aroha", "Silas"]
NPC_STYLE = (" Speak plainly in 1-3 short sentences, only words said aloud. No asterisks, no stage "
             "directions, no lists, no quotation marks.")
_BAD_RE = re.compile(r"STATE:|player_(stink|health|combat|armed|skill)|\bAI\b|language model", re.I)
_STINK_RE = re.compile(r"\b(stink|stench|reek|smell)\w*", re.I)
_WOUND_RE = re.compile(r"\b(wound|bleed|blood|injur|gash)\w*", re.I)
_QUOTE_RE = re.compile(r'^\s*["“‘\']+|["”’\']+\s*$')
_PREFIX_RE = re.compile(r"^\s*[A-Z][\w '\-]{0,24}:\s*")
_LIST_RE = re.compile(r"(?m)^\s*(?:[-*•]|\d+[.)])\s.*$")
_MD_RE = re.compile(r"[*_`#>]+")


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


def grounded(reply, pstate, player_lines):
    """Reject replies that bring up stink/wounds the player never mentioned —
    unprompted body-commentary is hallucination now that no state fields exist."""
    said = " ".join(player_lines)
    if _STINK_RE.search(reply) and not _STINK_RE.search(said):
        return False
    if _WOUND_RE.search(reply) and not (_WOUND_RE.search(said)
            or re.search(r"\b(stab|hurt|cut|fight|fought|rough)\w*", said, re.I)):
        return False
    return True


def scenarios(rng, pname, role):
    off_stock = rng.choice(["a meat pie", "a sword", "a map of the isle", "a healing potion",
                            "a pair of boots", "some ale", "arrows", "a lantern"])
    greet = rng.choice(["Kia ora.", "Kia ora!", "Kia ora, friend."])
    return [
        # personality-forward conversations (the NPC as a PERSON, not a shopkeeper)
        (f"Greet them and make small talk — let your personality lead; only mention your trade if it comes up.",
         greet, None, (2, 3)),
        ("Share a piece of village gossip and see what they think of it.", greet, None, (2, 3)),
        ("You're curious about the traveller — ask THEM questions about where they've been.", greet, None, (2, 3)),
        ("Grumble good-naturedly about something in your life (weather, neighbours, aches) and chat.",
         greet, None, (2, 3)),
        ("Tell a short memory or story from your life when the chance arises.", None, None, (2, 3)),
        ("Tease or banter with the traveller in a friendly way.", None, None, (2, 3)),
        ("Introduce yourself by name early. Later, casually test whether they remember your name.",
         f"Hello! I'm {pname} - good to meet you.", "Heh - do you even remember my name?", (3, 4)),
        ("You want local news or rumours. When they mention something, ask a follow-up about that exact thing.",
         None, None, (2, 3)),
        (f"You want to buy {off_stock} - which they may not sell. If they don't have it, chat anyway.",
         None, None, (2, 3)),
        ("You're hurt after a rough journey and mention it, hoping for sympathy or advice.", None, None, (2, 3)),
        ("You're lost and need directions to somewhere in town.", None, None, (1, 2)),
        ("Make small talk about the weather, then ask about their life here.", None, None, (2, 3)),
    ]


def player_sim_prompt(pname, npc_name, role, goal, pstate):
    return (f"You are role-playing {pname}, a traveller in a medieval fantasy game, chatting with "
            f"{npc_name}, a villager. Your goal: {goal} Say ONE short casual line (under 25 words) as "
            f"{pname} - plain speech only, no narration, no asterisks, no quotes. React naturally to "
            f"what {npc_name} just said.")


ROLES = list(ROLE_INFO)


class Conv:
    def __init__(self, rng):
        self.role = rng.choice(ROLES); self.npc = rng.choice(NAMES); self.pname = rng.choice(PLAYER_NAMES)
        self.rel = rng.choice(RELS); self.pstate = pick_player_state(rng, rng.random() < 0.45)
        self.sys_game = persona(self.npc, self.role, self.rel, self.pstate, rng)
        self.sys_npc = self.sys_game + NPC_STYLE
        goal, opener, closer, (lo, hi) = rng.choice(scenarios(rng, self.pname, self.role))
        self.opener, self.closer = opener, closer
        self.n_ex = rng.randint(lo, hi)
        self.sim_sys = player_sim_prompt(self.pname, self.npc, self.role, goal, self.pstate)
        self.msgs = []; self.i = 0; self.stage = "player"; self.retries = 0; self.dead = False

    def gen_seed(self):
        """Force the NPC's reply to a greeting to open with Kia ora."""
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

    ECHO_RE = re.compile(r"^kia ora\W{0,4}(to you|you too|and (to )?you|right back|as well|back at)", re.I)

    def accept(self, text):
        if self.stage == "npc" and self.i == 0 and self.gen_seed() and self.ECHO_RE.search(text.strip()):
            self.retries += 1                      # reads as an echo-reply — regenerate
            if self.retries > 1: self.dead = True
            return
        if self.stage == "player":
            line = scrub(text)
            if _BAD_RE.search(line) or len(line) < 2: self.dead = True; return
            self.msgs.append({"role": "user", "content": line}); self.stage = "npc"
        else:
            cand = scrub(text)
            pl = [m["content"] for m in self.msgs if m["role"] == "user"]
            if len(cand) >= 2 and not _BAD_RE.search(cand) and grounded(cand, self.pstate, pl):
                self.msgs.append({"role": "assistant", "content": cand})
                self.i += 1; self.stage = "player"
                if self.i >= self.n_ex: self.stage = "done"
            else:
                self.retries += 1
                if self.retries > 1: self.dead = True

    def record(self):
        return {"messages": [{"role": "system", "content": self.sys_game}] + self.msgs}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=3000)
    ap.add_argument("--batch", type=int, default=96)
    ap.add_argument("--teacher", default="unsloth/Meta-Llama-3.1-8B-Instruct")
    ap.add_argument("--out", default="/content/emberfall/emberfall_npc_distilled.jsonl")
    ap.add_argument("--seed", type=int, default=23)
    args = ap.parse_args()

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
    todo = max(0, args.target - done)
    print(f"have {done}, generating {todo} -> {args.out}", flush=True)
    rng = random.Random(args.seed + done * 31)
    pool, written, failed, t0 = [], 0, 0, time.time()
    out_f = open(args.out, "a")
    while written < todo:
        while len(pool) < args.batch:
            pool.append(Conv(rng))
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
        print(f"  {done+written}/{args.target} | {rate*60:.0f}/min | ETA {(todo-written)/max(rate,1e-9)/60:.1f} min | {failed} rejected", flush=True)
    out_f.close()
    print(f"DONE: {done+written} conversations ({failed} rejected)", flush=True)


if __name__ == "__main__":
    main()
