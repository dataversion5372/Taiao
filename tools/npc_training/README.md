# Emberfall NPC — fine-tuning LFM2.5-230M

Make the fast tiny model (230M, ~2.5 s/turn) speak like an *Isle of Emberfall*
townsperson instead of a generic assistant. Data is generated locally; training
runs on **Colab GPU** (the Nets venv can't train — torch 2.2 vs transformers 5.12).

## Files

| File | What it is |
|------|-----------|
| `gen_npc_distill.py` | **Distillation generator** — self-play conversations from a teacher model (see below) |
| `emberfall_npc_distilled.jsonl` | Its output — the future primary dataset for a *responsive* fine-tune |
| `emberfall_npc_sft_v2.jsonl` | Templated dataset (7,500) — **caused the parroting fine-tune**; use only as a small garnish |
| `emberfall_npc_reactions.jsonl` | The 4,500 player-reaction examples (`gen_npc_data_v2.py`) |
| `emberfall_npc_dialogue_3000.jsonl` | Your original state-conditioned dataset |
| `Emberfall_NPC_finetune_1.2b.ipynb` / `…_1.2b_nodrive.ipynb` | **1.2B-Instruct** notebooks (Drive / no-Drive) |
| `Emberfall_NPC_finetune.ipynb` / `…_nodrive.ipynb` | 230M notebooks (Drive / no-Drive) |
| `build_notebook.py` | Regenerates the notebooks (`--big` = 1.2B, `--no-drive` = no Drive) |
| `gen_npc_data_v2.py` | Reaction-aware generator (stink/health/combat/armed) |
| `gen_npc_data.py`, `emberfall_npc_sft.jsonl` | Old simpler generator (non-STATE) — reference only |

## Distillation (v3 — the fix for "doesn't respond to what I say")

The templated datasets taught the fine-tunes to *recite* reaction lines regardless
of the question. `gen_npc_distill.py` fixes that with **self-play**: a strong
teacher (default `llama3.2-3b`, the responsiveness shoot-out champion) plays the
NPC with the **exact game persona**, while a player-simulator prompt plays an
adventurer with a randomized goal — buying things they may not stock, probing news
and following up, introducing themselves then testing name recall, apologising for
stink, bragging about fights, haggling. Replies therefore depend on the actual
conversation — the behaviour we want distilled into the fast student.

**Fast path — Colab GPU** (`Emberfall_NPC_distill.ipynb`, built by
`build_distill_notebook.py`): the same engine with the teacher on a T4 and 16
conversations advancing in batched generation waves — **~1500 conversations in
well under an hour**. Teacher: `unsloth/Llama-3.2-3B-Instruct` (ungated mirror);
switch to `LiquidAI/LFM2-2.6B` in the config cell. Resumable within the session
(the generate cell appends; re-run continues toward TARGET). Download the JSONL at
the end and feed it to the 1.2B training notebook.

Local alternative (slow, fully offline):
```sh
python3 gen_npc_distill.py --n 1500                 # llama3.2-3b teacher, ~8-10 h
python3 gen_npc_distill.py --n 1500 --teacher lfm2-2.6b   # ~2x faster
```

Runs its own resident llama-server (port 8793) with 4 slots/workers; safe alongside
the game bridge but hogs CPU — best when not playing. Quality gates: the bridge's
reply scrubber + parenthetical-stage-direction removal + a **grounding filter**
(rejects replies that mention stink/wounds when STATE says the player is clean/hale
— one retry, then the conversation is discarded).

Then train the 1.2B notebook on `emberfall_npc_distilled.jsonl` (optionally
`cat` a few hundred lines of `emberfall_npc_reactions.jsonl` on top for extra
reaction-bank coverage — keep the distilled data dominant).

## Player-reaction fields (v2)

The STATE block now carries live **player signals** the NPC reacts to (game emits them
from `js/gameplay/npc-chat.js → npcPersona`):
- `player_stink` = fresh / whiffy / rank / reeking → NPCs recoil, shops bar the door
- `player_health` = hale / hurt / wounded / bloodied / near death → concern, healer offers aid
- `player_combat` = green / seasoned / veteran / renowned / legendary → deference or dismissal
- `player_armed` = unarmed / armed / armed and armoured → wary of a walking arsenal

Reactions are modulated by the NPC's `relationship`/`mood` (a hostile NPC is meaner about
your stink; a friendly one kinder about your wounds). Regenerate/expand:
`python gen_npc_data_v2.py --n 6000 && <re-merge>` (see the merge snippet in git history).

## The STATE schema (important)

The primary dataset trains the model to read a structured `STATE:` block in the
system prompt:

```
You are Alden, an Emberfall fisher. Voice=weathered; traits=patient, plain-spoken.
Reply naturally in-world in 1-3 short sentences. Stay in character. Use STATE as the
only source for player history … STATE: location=harbour; time=dawn; weather=clear;
mood=calm; relationship=hostile(-55); quest=none; player_skill=novice; shop_open=true;
stock=hooks, line, bait, smoked eel; known_fact=none.
```

**The game already emits this exact shape** — `js/gameplay/npc-chat.js → npcPersona`
builds it from live state (role→location/voice/stock table, `dayPhase()`→time,
per-NPC mood, player level→`player_skill`, etc.). So a model trained on this dataset
gets matching prompts at inference. Keep the two in sync if you change either.

Vocab the model expects: 40 roles, times {dawn,morning,midday,afternoon,dusk,evening},
weather {clear,windy,cold,warm,misty,light rain,steady rain,storm threatening},
mood {busy,calm,tired,curious,concerned,pleased,cheerful,irritated}, relationship
{hostile,wary,unfamiliar,neutral,friendly,trusted,close}, quest {none,offered,accepted,
in_progress,ready_to_turn_in,completed}, player_skill {novice,beginner,competent,skilled,expert}.

## Steps

1. **Train on Colab** — the notebook is **disconnect-resilient**:
   - Open `Emberfall_NPC_finetune.ipynb` in Colab, set runtime → **GPU**.
   - Run top to bottom; upload `emberfall_npc_dialogue_3000.jsonl` **once** (it's
     cached to `MyDrive/emberfall_npc/`, so re-runs skip the upload).
   - Base weights: `LiquidAI/LFM2.5-230M` (non-GGUF, verified to exist w/ chat template).
   - It LoRA-fine-tunes, merges, converts via llama.cpp, quantizes to **Q4_K_M**,
     and saves `LFM2.5-230M-Emberfall-Q4_K_M.gguf` to Drive (+ browser download).

   **If Colab drops:** reconnect and just run all cells again. Everything lives on
   Google Drive — training **checkpoints every 50 steps and auto-resumes** from the
   latest one, and finished stages (merge, GGUF) are skipped. A 230M LoRA on ~3k
   examples is only ~a few minutes on a T4, so most runs finish in one session.

2. **Use it** — drop the GGUF in `~/Nets/models/gguf/`, register an alias, and run
   the bridge against it:
   ```sh
   ~/Nets/.venv/bin/python ~/RPG/tools/npc_bridge.py \
       --model lfm2.5-230m-emberfall
   ```

## `gen_npc_data.py` (alternative generator)

A template-based generator that composes personas/player-lines/NPC-replies from
lore banks. NOTE: it emits a **simpler, non-STATE** system-prompt format, so it does
**not** match the primary dataset or the game's current `npcPersona`. Use it only if
you also revert the game persona to the plain format, or adapt the generator to emit
the STATE schema. Kept for reference / augmentation experiments.
