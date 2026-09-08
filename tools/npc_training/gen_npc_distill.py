#!/usr/bin/env python3
"""Distillation generator — real conversations from a teacher model, for training
a fast, RESPONSIVE Emberfall NPC model.

Why: the templated datasets taught the fine-tune to *recite* reaction lines, not
*respond* (asked about pies it answered "rough day on the road"). This generator
fixes that by SELF-PLAY: a strong teacher model plays the NPC with the exact
game persona (STATE-conditioned, from gen_npc_data_v2), while a player-simulator
prompt plays an adventurer pursuing a randomized goal — buying odd things, probing
for news and following up, introducing themselves and later testing name recall,
apologising for their stink, bragging about fights. Replies therefore depend on
the actual conversation, which is precisely the behaviour we want distilled.

Infrastructure: reuses the bridge's Brain class to run its own resident
llama-server (default port 8793, separate from the game bridge) with N parallel
slots and N worker threads. Output is appended per-conversation (crash/stop-safe,
resumes toward --n on re-run).

Usage:
  python3 gen_npc_distill.py --n 1500 [--teacher llama3.2-3b] [--out emberfall_npc_distilled.jsonl]
Then train the 1.2B notebook on the output (optionally cat with a slice of
emberfall_npc_sft_v2.jsonl for extra reaction coverage).
"""
import argparse, atexit, json, os, random, re, sys, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, ".."))          # tools/ for npc_bridge
from npc_bridge import Brain, resolve_model, _clean   # noqa: E402
from gen_npc_data_v2 import (ROLE_INFO, RELS, NAMES, persona,      # noqa: E402
                             pick_player_state)

ROLES = list(ROLE_INFO)
PLAYER_NAMES = ["Finn", "Ash", "Rowan", "Tama", "Isla", "Bren", "Kea", "Moss", "Aroha", "Silas"]

# Style scaffolding for the TEACHER only (the stored training persona stays the
# exact game persona so training matches inference).
NPC_STYLE = (" Speak plainly in 1-3 short sentences, only words said aloud. No asterisks, no stage "
             "directions, no lists, no quotation marks.")

# ── conversation scenarios: (goal for the player-sim, scripted first/last lines or None) ──
def scenarios(rng, pname, role):
    stock = ROLE_INFO[role][4]
    off_stock = rng.choice(["a meat pie", "a sword", "a map of the isle", "a healing potion",
                            "a pair of boots", "some ale", "arrows", "a lantern"])
    return [
        # goal, scripted_open (or None = sim), scripted_close (or None), min-max exchanges
        (f"You want to buy {off_stock} — which they may not sell. If they don't have it, ask what they DO sell.",
         None, None, (2, 3)),
        ("You want local news or rumours. When they mention something, ask a follow-up question about that exact thing.",
         None, None, (2, 3)),
        (f"Introduce yourself by name early. Later, casually test whether they remember your name.",
         f"Hello! I'm {pname} — good to meet you.", "Heh — do you even remember my name?", (3, 4)),
        ("You're hurt and want advice or help with your wounds.", None, None, (2, 3)),
        ("You reek from hard work. Apologise for the smell and try to do business anyway.",
         None, None, (2, 3)),
        ("You just survived a dangerous fight and want to tell someone about it.", None, None, (2, 3)),
        ("You're lost and need directions to somewhere in town.", None, None, (1, 2)),
        ("Make small talk about the weather, then ask them about their trade and how business is.",
         None, None, (2, 3)),
        ("Ask what they're selling and haggle a little over one item.", None, None, (2, 3)),
        (f"Ask the {role} a question about their craft that shows genuine curiosity.", None, None, (2, 3)),
    ]


def player_sim_prompt(pname, npc_name, role, goal, pstate):
    stink, health, combat, armed = pstate
    cond = []
    if stink in ("rank", "reeking"): cond.append("you smell awful from hard work")
    if health in ("wounded", "bloodied", "near death"): cond.append("you are visibly wounded")
    if combat in ("renowned", "legendary"): cond.append("you are a famous warrior")
    if armed == "armed and armoured": cond.append("you are heavily armed and armoured")
    cond_s = ""
    if cond:
        cond_s = ("Your own condition (speak of it in FIRST person — it is you, not them): "
                  + "; ".join(cond) + ". ")
    return (f"You are role-playing {pname}, a player adventurer in a medieval fantasy game, chatting with "
            f"{npc_name}, the local {role}. {cond_s}Your goal: {goal} Say ONE short casual line (under 25 "
            f"words) as {pname} — plain speech only, no narration, no asterisks, no quotes. React naturally "
            f"to what {npc_name} just said.")


_BAD_RE = re.compile(r"STATE:|player_(stink|health|combat|armed|skill)|\bAI\b|language model", re.I)
_STINK_RE = re.compile(r"\b(stink|stench|reek|smell)\w*", re.I)
_WOUND_RE = re.compile(r"\b(wound|bleed|blood|injur|gash)\w*", re.I)


def scrub(t):
    """bridge _clean + drop parenthetical stage directions ('(to himself) ...')."""
    t = _clean(t)
    t = re.sub(r"\s*\([^)]*\)", "", t).strip()
    return t


def grounded(reply, pstate, player_lines):
    """Reject replies that hallucinate a player condition STATE doesn't support —
    exactly the anti-grounding we must not distill into the student. EXCEPT when
    the player themselves brought it up ("I got stabbed by a goblin"): responding
    to a player's claim is correct responsiveness, whatever STATE says."""
    stink, health, _c, _a = pstate
    said = " ".join(player_lines)
    if stink in ("fresh", "whiffy") and _STINK_RE.search(reply) and not _STINK_RE.search(said):
        return False
    if health in ("hale", "hurt") and _WOUND_RE.search(reply) and not (
            _WOUND_RE.search(said) or re.search(r"\b(stab|hurt|cut|fight|fought)\w*", said, re.I)):
        return False
    return True


def gen_conversation(brain, rng):
    role = rng.choice(ROLES)
    npc_name = rng.choice(NAMES)
    pname = rng.choice(PLAYER_NAMES)
    rel = rng.choice(RELS)
    pstate = pick_player_state(rng, rng.random() < 0.45)
    sys_game = persona(npc_name, role, rel, pstate, rng)     # exact game/training persona
    sys_npc = sys_game + NPC_STYLE                            # teacher gets the style rider
    goal, opener, closer, (lo, hi) = rng.choice(scenarios(rng, pname, role))
    n_ex = rng.randint(lo, hi)
    sim_sys = player_sim_prompt(pname, npc_name, role, goal, pstate)

    msgs = []          # the NPC-view transcript (user=player, assistant=npc)
    for i in range(n_ex):
        # — player line —
        if i == 0 and opener:
            pline = opener
        elif i == n_ex - 1 and closer:
            pline = closer
        else:
            # sim sees the conversation with roles flipped (its "assistant" = player)
            sim_msgs = [{"role": "system", "content": sim_sys}]
            for m in msgs:
                sim_msgs.append({"role": "assistant" if m["role"] == "user" else "user",
                                 "content": m["content"]})
            if not msgs:
                sim_msgs.append({"role": "user", "content": f"({npc_name} looks up as you approach.)"})
            pline = scrub(brain.chat(sim_msgs, max_tokens=48))
            if _BAD_RE.search(pline) or len(pline) < 2:
                return None
        msgs.append({"role": "user", "content": pline})
        # — npc reply — (one retry on a scrub/grounding rejection)
        reply = None
        player_lines = [m["content"] for m in msgs if m["role"] == "user"]
        for _try in range(2):
            cand = scrub(brain.chat([{"role": "system", "content": sys_npc}] + msgs, max_tokens=80))
            if len(cand) >= 2 and not _BAD_RE.search(cand) and grounded(cand, pstate, player_lines):
                reply = cand
                break
        if reply is None:
            return None
        msgs.append({"role": "assistant", "content": reply})
    return {"messages": [{"role": "system", "content": sys_game}] + msgs}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=1500, help="total conversations in the output file")
    ap.add_argument("--teacher", default="llama3.2-3b",
                    help="teacher model alias (llama3.2-3b = best engagement; lfm2-2.6b = ~2x faster)")
    ap.add_argument("--out", default=os.path.join(HERE, "emberfall_npc_distilled.jsonl"))
    ap.add_argument("--llm-port", type=int, default=8793, help="own llama-server port (bridge keeps 8790)")
    ap.add_argument("--parallel", type=int, default=4, help="server slots = worker threads")
    ap.add_argument("--seed", type=int, default=23)
    args = ap.parse_args()

    model_file = resolve_model(args.teacher)
    if not model_file:
        sys.exit(f"teacher model '{args.teacher}' not found in Nets gguf dir")

    # resume: count what's already there
    done = 0
    if os.path.exists(args.out):
        with open(args.out) as f:
            done = sum(1 for _ in f)
    todo = args.n - done
    if todo <= 0:
        print(f"{args.out} already has {done} >= {args.n} conversations — nothing to do")
        return
    print(f"[distill] teacher={args.teacher} | have {done}, generating {todo} more -> {args.out}")

    brain = Brain(model_file, args.llm_port, args.parallel, ctx_per_slot=2048)
    brain.start()
    atexit.register(brain.stop)

    lock = threading.Lock()
    state = {"written": 0, "failed": 0, "t0": time.time()}
    out_f = open(args.out, "a")

    def worker(wid):
        rng = random.Random(args.seed * 100003 + done * 17 + wid)
        while True:
            with lock:
                if state["written"] >= todo:
                    return
            conv = None
            try:
                conv = gen_conversation(brain, rng)
            except Exception as e:
                with lock:
                    state["failed"] += 1
                time.sleep(1)
            if conv is None:
                with lock:
                    state["failed"] += 1
                continue
            with lock:
                if state["written"] >= todo:
                    return
                out_f.write(json.dumps(conv, ensure_ascii=False) + "\n")
                out_f.flush()
                state["written"] += 1
                w = state["written"]
                if w % 10 == 0 or w == todo:
                    el = time.time() - state["t0"]
                    rate = w / el
                    eta = (todo - w) / rate if rate > 0 else 0
                    print(f"  {done + w}/{args.n} conversations | {rate*60:.1f}/min | "
                          f"ETA {eta/60:.0f} min | {state['failed']} rejected", flush=True)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(args.parallel)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    out_f.close()
    print(f"[distill] done: {done + state['written']} total in {args.out} "
          f"({state['failed']} rejected). Safe to re-run with a higher --n any time.")


if __name__ == "__main__":
    main()
