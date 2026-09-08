#!/usr/bin/env python3
"""Emit Emberfall_NPC_distill.ipynb — GPU-batched self-play distillation on Colab.

Generates the same conversations as gen_npc_distill.py (same personas, scenarios,
scrubbing, grounding filter) but with the teacher on a Colab GPU and 16
conversations advancing in lockstep generation waves — ~30-60 min for 1500
conversations instead of ~8-10 h on the local CPU.

The persona/STATE machinery is embedded VERBATIM from gen_npc_data_v2.py at build
time, so the training schema cannot drift from the game. Run: python3 build_distill_notebook.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
MD, CODE = "markdown", "code"

# ── embed the real persona machinery (tables + persona() + pick_player_state) ──
V2_SRC = open(os.path.join(HERE, "gen_npc_data_v2.py")).read()
# strip its CLI main() so exec'ing the cell has no side effects
V2_SRC = V2_SRC.split("def one_example(", 1)[0]

ENGINE_SRC = r'''# ── distillation engine: scenario logic + quality gates (mirrors gen_npc_distill.py) ──
import json, random, re, time, torch

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
    stink, health, _c, _a = pstate
    said = " ".join(player_lines)
    if stink in ("fresh", "whiffy") and _STINK_RE.search(reply) and not _STINK_RE.search(said):
        return False
    if health in ("hale", "hurt") and _WOUND_RE.search(reply) and not (
            _WOUND_RE.search(said) or re.search(r"\b(stab|hurt|cut|fight|fought)\w*", said, re.I)):
        return False
    return True

def scenarios(rng, pname, role):
    stock = ROLE_INFO[role][4]
    off_stock = rng.choice(["a meat pie", "a sword", "a map of the isle", "a healing potion",
                            "a pair of boots", "some ale", "arrows", "a lantern"])
    return [
        (f"You want to buy {off_stock} - which they may not sell. If they don't have it, ask what they DO sell.",
         None, None, (2, 3)),
        ("You want local news or rumours. When they mention something, ask a follow-up question about that exact thing.",
         None, None, (2, 3)),
        ("Introduce yourself by name early. Later, casually test whether they remember your name.",
         f"Hello! I'm {pname} - good to meet you.", "Heh - do you even remember my name?", (3, 4)),
        ("You're hurt and want advice or help with your wounds.", None, None, (2, 3)),
        ("You reek from hard work. Apologise for the smell and try to do business anyway.", None, None, (2, 3)),
        ("You just survived a dangerous fight and want to tell someone about it.", None, None, (2, 3)),
        ("You're lost and need directions to somewhere in town.", None, None, (1, 2)),
        ("Make small talk about the weather, then ask them about their trade and how business is.", None, None, (2, 3)),
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
    cond_s = ("Your own condition (speak of it in FIRST person - it is you, not them): "
              + "; ".join(cond) + ". ") if cond else ""
    return (f"You are role-playing {pname}, a player adventurer in a medieval fantasy game, chatting with "
            f"{npc_name}, the local {role}. {cond_s}Your goal: {goal} Say ONE short casual line (under 25 "
            f"words) as {pname} - plain speech only, no narration, no asterisks, no quotes. React naturally "
            f"to what {npc_name} just said.")

ROLES = list(ROLE_INFO)

class Conv:
    """One self-play conversation as a state machine (stages: player -> npc -> ... -> done)."""
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
print("engine ready:", len(ROLES), "roles")'''

RUN_SRC = r'''# ── batched self-play: 16 conversations advance in lockstep GPU waves ──
def wave(convs, max_new):
    prompts = [tok.apply_chat_template(c.build_messages(), tokenize=False, add_generation_prompt=True)
               for c in convs]
    enc = tok(prompts, return_tensors="pt", padding=True, truncation=True, max_length=1536).to(model.device)
    with torch.no_grad():
        out = model.generate(**enc, max_new_tokens=max_new, do_sample=True, temperature=0.85,
                             top_p=0.9, repetition_penalty=1.1, pad_token_id=tok.pad_token_id)
    return tok.batch_decode(out[:, enc["input_ids"].shape[1]:], skip_special_tokens=True)

import os
done = sum(1 for _ in open(OUT)) if os.path.exists(OUT) else 0
todo = max(0, TARGET - done)
print(f"have {done}, generating {todo} more -> {OUT}")
rng = random.Random(SEED + done * 31)
pool, written, failed, t0 = [], 0, 0, time.time()
out_f = open(OUT, "a")
while written < todo:
    while len(pool) < BATCH:
        pool.append(Conv(rng))
    # scripted player lines are trusted (no generation needed)
    for c in pool:
        if c.stage == "player" and c.scripted_line() is not None:
            c.msgs.append({"role": "user", "content": c.scripted_line()}); c.stage = "npc"
    gen_players = [c for c in pool if c.stage == "player"]
    if gen_players:
        for c, t in zip(gen_players, wave(gen_players, 48)): c.accept(t)
    npcs = [c for c in pool if c.stage == "npc" and not c.dead]
    if npcs:
        for c, t in zip(npcs, wave(npcs, 80)): c.accept(t)
    for c in list(pool):
        if c.dead:
            pool.remove(c); failed += 1
        elif c.stage == "done":
            pool.remove(c)
            out_f.write(json.dumps(c.record(), ensure_ascii=False) + "\n"); out_f.flush()
            written += 1
    if written and written % 25 < 2:
        rate = written / (time.time() - t0)
        print(f"  {done + written}/{TARGET} | {rate*60:.0f}/min | ETA {(todo-written)/max(rate,1e-9)/60:.0f} min "
              f"| {failed} rejected", flush=True)
out_f.close()
print(f"DONE: {done + written} conversations in {OUT} ({failed} rejected)")'''

cells = [
 (MD, """# 🏰 Emberfall NPC — GPU distillation (self-play conversations)

Generates the *responsive* training dataset for the Emberfall NPC fine-tune: a
teacher model plays the NPC (exact game persona, STATE-conditioned) while a
player-simulator plays an adventurer with randomized goals — so every reply
depends on what was actually said. **Conversations advance in lockstep GPU
batches** (auto-scaled to your GPU: batch 64 on an A100, 16 on a T4) —
~1500 conversations in **~5-15 min on an A100**, under an hour on a T4.

Output: `emberfall_npc_distilled.jsonl` — feed it to `Emberfall_NPC_finetune_1.2b*.ipynb`.

**Runtime → change runtime type → GPU.** Resumable: re-running the generation
cell continues toward TARGET (output appends per conversation)."""),
 (MD, "## 1 · Install + load the teacher"),
 (CODE, """%pip -q uninstall -y torchao
%pip -q install "transformers>=4.57,<5" accelerate sentencepiece
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
assert torch.cuda.is_available(), "No GPU! Runtime -> change runtime type -> GPU."
GPU = torch.cuda.get_device_properties(0)
VRAM_GB = GPU.total_memory / 1e9
print(f"GPU: {GPU.name} ({VRAM_GB:.0f} GB)")

TEACHER = "unsloth/Llama-3.2-3B-Instruct"        # ungated mirror; best engagement in our shoot-out
# TEACHER = "unsloth/Meta-Llama-3.1-8B-Instruct" # A100 option: smarter teacher (ungated mirror)
# TEACHER = "LiquidAI/LFM2-2.6B"                 # alternative: best STATE fidelity

TARGET = 1500          # total conversations in the output file
# batch auto-scales with VRAM: A100-40GB -> 64, L4/A100-lite -> 32, T4 -> 16
BATCH  = 64 if VRAM_GB > 30 else 32 if VRAM_GB > 20 else 16
SEED   = 23
OUT    = "/content/emberfall_npc_distilled.jsonl"

DTYPE = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
tok = AutoTokenizer.from_pretrained(TEACHER)
if tok.pad_token is None: tok.pad_token = tok.eos_token
tok.padding_side = "left"                    # required for batched decoder-only generate
model = AutoModelForCausalLM.from_pretrained(TEACHER, torch_dtype=DTYPE, device_map="auto")
model.eval()
print("teacher:", TEACHER, "| dtype:", DTYPE, "| batch:", BATCH)"""),
 (MD, "## 2 · Emberfall persona machinery *(embedded verbatim from `gen_npc_data_v2.py` — the training schema matches the game exactly)*"),
 (CODE, V2_SRC + '\nprint("personas ready:", len(ROLE_INFO), "roles")'),
 (MD, "## 3 · Distillation engine (scenarios, scrubbing, grounding filter, conversation state machine)"),
 (CODE, ENGINE_SRC),
 (MD, """## 4 · Generate
Watch the rate line — an **A100 typically does 150-400 conversations/min** (T4:
30-60). Interrupt any time; re-run this cell to continue toward TARGET."""),
 (CODE, RUN_SRC),
 (MD, "## 5 · Inspect samples + quality stats"),
 (CODE, r'''import json, re, random
rows = [json.loads(l) for l in open(OUT)]
bad_paren = bad_ground = 0
for r in rows:
    s = r["messages"][0]["content"]
    stink = re.search(r"player_stink=([^;]+)", s).group(1)
    health = re.search(r"player_health=([^;]+)", s).group(1)
    said = " ".join(m["content"] for m in r["messages"] if m["role"] == "user")
    for m in r["messages"]:
        if m["role"] != "assistant": continue
        if "(" in m["content"]: bad_paren += 1
        if stink in ("fresh","whiffy") and _STINK_RE.search(m["content"]) and not _STINK_RE.search(said): bad_ground += 1
print(f"{len(rows)} conversations | parenthetical leaks: {bad_paren} | stink-grounding violations: {bad_ground}")
random.seed(1)
for r in random.sample(rows, min(3, len(rows))):
    print("\n---", r["messages"][0]["content"].split("Emberfall ")[1].split(".")[0])
    for m in r["messages"][1:]:
        print(f"  {'P' if m['role']=='user' else 'N'}: {m['content'][:150]}")'''),
 (MD, "## 6 · Download the dataset\nThen upload it to `Emberfall_NPC_finetune_1.2b*.ipynb` and train."),
 (CODE, """from google.colab import files
files.download(OUT)"""),
]

nb = {
 "cells": [
   {"cell_type": t, "metadata": {}, "source": src.splitlines(keepends=True),
    **({"outputs": [], "execution_count": None} if t == CODE else {})}
   for (t, src) in cells
 ],
 "metadata": {
   "accelerator": "GPU",
   "colab": {"provenance": [], "gpuType": "A100"},
   "kernelspec": {"display_name": "Python 3", "name": "python3"},
   "language_info": {"name": "python"},
 },
 "nbformat": 4, "nbformat_minor": 0,
}
out = os.path.join(HERE, "Emberfall_NPC_distill.ipynb")
with open(out, "w") as f:
    json.dump(nb, f, indent=1)
print(f"wrote {out} with {len(cells)} cells")
