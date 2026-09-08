> ## ⏸ PARKED (2026-09-07)
> The AI dialogue system is **disabled on user request** — the game uses the
> original canned `npc.line` conversations. Everything below remains built,
> trained, and verified. **To re-enable (two steps):**
> 1. In `js/gameplay/npc-chat.js`, set `AI_NPC_ENABLED = true` (top of file).
> 2. Start the brain: `python3 tools/npc_brain/npc_brain.py`
>
> Nothing else is needed — the current model (`LFM2.5-1.2B-Emberfall-v5`),
> per-NPC memories (`tools/npc_brain/state/history/`), and all game wiring are
> intact. See the `ai-npc-dialogue` auto-memory for the full build history.

# AI NPC dialogue (self-contained llama.cpp brain)

NPCs in *Isle of Emberfall* hold real conversations, driven by
**`tools/npc_brain/npc_brain.py`** — a fully self-contained llama.cpp stack
(**no Nets framework**): it auto-downloads the official llama.cpp release into
`tools/npc_brain/bin/` on first run, serves the model from
`tools/npc_brain/models/`, and every NPC shares one resident server.

**Serving mode: one-shot worker pool (default)** — 3 pre-warmed single-slot
workers always ready. During a conversation burst workers are reused at full
speed (zero churn — respawning would steal CPU from generation); once the brain
has been **idle ~10 s, the janitor rotates**: served workers are terminated
(memory back to the OS) and fresh ones spawned. Continuity is pure hard storage:
history JSON + a **prompt-only KV snapshot saved *before* generation** — the
hybrid LFM2.5 arch (recurrent conv layers) can't rewind mid-sequence, so a
snapshot is only reusable as an *exact prefix*; saving pre-generation makes every
next turn a pure extension. Result: `prompt_n=4` per turn even across process
rotations — prefill is ~100 ms flat; generation streams — replies
appear in the speech bubble **word-by-word** (SSE from the brain; first word
~0.7 s on a warm NPC, full reply flowing over ~2 s; the final scrubbed text
replaces the stream at the end). Non-streaming JSON remains as fallback. Greetings are linger-gated in the game (~2.5 s in earshot) and
pre-warmed on approach (`/npc/prewarm`). Physical footprint ~517 MB private per
worker + 686 MB weights file-backed/shared/evictable (RSS double-counts them).
`--warm N` sizes the pool; `--mode resident` restores the long-lived server.

Mechanisms shared by both modes:
- **KV-cache snapshots** for fast NPC switching: each slot remembers its last
  NPC; on eviction the old NPC's KV state is saved to `state/kv/` (~2 MB each —
  LFM2.5's hybrid arch has tiny KV) and the newcomer's restored, so switching is
  a disk read, not a re-prefill. Revisit turns run in **0.7-1.0 s**.
- **Low RAM**: 2 slots × 1536 ctx, q8_0 K-cache, mmap'd weights (~1.3 GB resident
  in active use, of which ~700 MB is OS-reclaimable page cache; `--slots 1` for
  the absolute floor).
- **Durable memory**: every NPC's conversation is persisted to `state/history/`
  (atomic writes) — NPCs remember the player **across brain restarts and game
  sessions**. Verified: killed the whole stack, restarted, and the herbalist
  still greeted the player by name.

Old entry point `tools/npc_bridge.py` still works (it forwards here).

**Measured latency** (v2 vs old ephemeral load-per-turn):
- 230M: ~0.3-0.4 s per turn, ~0.1-0.2 s warm (was 5-7 s); 3 NPCs concurrently in ~0.8 s
- 1.2B: ~3.3 s cold / ~1.4 s warm (was 4-15 s); in-game greeting ≈ 0.7 s (230M)

The bridge no longer imports Nets `core` or touches any Nets state at all — model
files are resolved directly from `models/gguf/gguf_index.json` + local
`LFM2.5-<size>-Emberfall*.gguf`. The llama-server child is stopped when the
bridge exits (use `--keep-server` to leave it warm).

**Default model: `lfm2.5-1.2b-emberfall` (v2, distilled)** — LFM2.5-1.2B
fine-tuned on **3,021 self-play conversations distilled from Llama-3.1-8B** on an
A100 (not templates — that's what made v1 parrot). It engages with what the player
says, recalls their name, grounds in STATE, and carries context across turns, at
**~1.7 s/turn** resident — beating the previous champion (lfm2-2.6b, 3.9 s) on both
quality and speed. Known soft spot: stink/wound *reactions* fire less reliably than
v1's canned lines (the price of genuine engagement). Alternatives via `--model`:
- `lfm2-2.6b` — previous default; strongest untuned all-rounder (~4-6 s).

- `llama3.2-3b` — best raw engagement and voice, but ~7 s/turn and fond of
  stage directions ("*eyes widen*").
- `gemma3-4b` — good voice/recall but hallucinated player state; slowest (~8 s).
- `LFM2.5-1.2B-Instruct` — fastest acceptable (~2.4 s/turn); sometimes muddles
  who's who in a conversation.
- `lfm2.5-1.2b-emberfall` / `lfm2.5-230m-emberfall` — the Emberfall fine-tunes:
  fast, perfect canned *reactions* (stink/wounds/renown), but they parrot
  training lines instead of engaging with what was said — the templated
  1-2-turn dataset overfit them. A future responsive fine-tune needs real varied
  conversations (e.g. distilled from llama3.2-3b / lfm2-2.6b), not templates.
- `lfm2.5-1.2b-think` — **don't**: burns its whole budget in `<think>` (35 s+, no line).

## Run it

1. Start the bridge (plain python3 — no venv needed any more):

   ```sh
   python3 ~/RPG/tools/npc_bridge.py
   # → [npc-bridge] <model> RESIDENT on http://127.0.0.1:8788 (llm :8790, 3 slots)
   ```

   Flags: `--model <alias>` · `--parallel N` (concurrent NPC generations, default 3)
   · `--llm-port` (llama-server port, default 8790) · `--keep-server` (leave the
   model warm across bridge restarts).

2. Open the game as usual. That's it — the game auto-detects the bridge at
   `http://127.0.0.1:8788`.

**If the bridge isn't running**, the game silently falls back to the old canned
one-liners. Nothing breaks.

## How it plays

- **Walk near a townsperson** → they greet you unprompted (an invisible "hello"
  is sent to their instance; their reply appears as an overhead speech bubble).
- **Type in the chat bar** (bottom-centre, appears when anyone's in earshot;
  press **Enter** to focus it) → every NPC in earshot answers in their own
  voice, each from their own instance.
- **Click an NPC** → focuses the chat bar (traders still open their shop on
  left-click; "Talk" is the extra path).

## Pieces

- `tools/npc_bridge.py` — local HTTP bridge over Nets. Endpoints: `GET /health`,
  `POST /npc/hello|say|leave`. Serialises inference with a lock (one 230M load at
  a time) and reaps idle instances.
- `js/gameplay/npc-chat.js` — earshot scan, personas, chat bar, bridge fetches,
  offline fallback. Hooked into the frame loop via `npcChatTick()` in `main.js`.

## Safety note (important)

The bridge **must never** touch the user's shared `~/Nets/instances.json`. It
points Nets at its own state dir (`~/Nets/.npc_bridge/`) and makes all Nets state
writes **atomic** (temp-file + `os.replace`). This was a hard lesson: an earlier
version let concurrent NPC greetings do non-atomic writes to the shared file and
corrupted it. Keep the isolation + atomic-save monkeypatch at the top of
`npc_bridge.py`.

## Fine-tuning a dedicated Emberfall model

`tools/npc_training/` has a full pipeline to fine-tune the fast **230M** so it
speaks like an Emberfall townsperson (230M speed + tuned voice): a template-based
data generator, 3,500 pre-generated examples, and a **ready-to-run Colab notebook**
(LoRA SFT → merge → Q4_K_M GGUF). See `tools/npc_training/README.md`. Then run the
bridge with `--model lfm2.5-230m-emberfall`.

## Model reality

lfm2.5-230m is tiny. Replies are short and coherent but can drift into a helpful
"how can I help you" register and occasionally rename themselves. The bridge
scrubs markdown/bullet-list "assistant mode" output and trims to a sentence or
two. For richer dialogue, spawn the bridge against a bigger alias — change
`MODEL` in `npc_bridge.py` (e.g. `LFM2.5-1.2B-Instruct`) and download it.
