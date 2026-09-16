# NPC retrieval dialogue — bank pipeline

NPCs answer players by **semantic retrieval over pre-written lines** (no LLM at
play time beyond a 23MB embedding model in the browser). Runtime:
`js/gameplay/npc-retrieval.js` (flag `NPC_RETRIEVAL_ENABLED` in npc-chat.js).

## Pipeline (local; needs a Python with sentence-transformers installed)

```
python3 build_bank.py                      # generated/*.jsonl -> bank.jsonl
python3 embed_bank.py          # -> assets/npc_dialogue/{emb,scale,meta}
python3 dedup_bank.py          # drop near-dups (>0.95 cosine per role+intent)
python3 embed_replies.py    # -> {remb,rscale} (AFTER dedup — rows must align)
python3 eval_retrieval.py  # held-out sanity + IN/OOD threshold table
node ../build.mjs                                    # only if js changed
```

Retrieval is two-stage at runtime: stage 1 matches the player's words against
each line's prompting-context embedding (emb); stage 2 re-ranks the top ~150
by reply-text↔player-words similarity (remb) so replies actually address what
was said instead of free-associating.

After a regen, re-check `eval_retrieval.py`'s IN/OOD table and re-tune
`NPCR.thresh` in js/gameplay/npc-retrieval.js (currently 0.45: in-domain
p2=0.55, OOD max≈0.42 on the 31k seed bank).

The bank is built from `generated/*.jsonl` (distill_bank.py output) ONLY —
the old fine-tune datasets in RPG-archive were authored for SFT, not
retrieval, and are excluded by default (user decision 2026-09-11). Pass
`--with-archive` to build_bank.py to fold them back in.

## Growing the bank (Colab A100)

`distill_bank.py` is the scale generator — self-play against a Llama-3.1-8B
teacher with a ~37-intent coverage matrix: personality chatter, mundane life
questions (food/family/fears/romance/festivals…), world help (directions/lore/
dangers/stock/advice), emotional beats (brag/thanks/apology/flirt), and the
**deflection families** that catch anything players type: `out_of_world`
(anachronisms: elections, wifi, aeroplanes…), `rude` (crude propositions),
`insult`, `meta` ("you're an AI"), `nonsense` (gibberish). Records carry
`metadata.intent/role/npc_name/player_name` so build_bank tags and slotifies
({player}/{name}) without parsing prompts.

Test the engine locally (no torch needed): `python3 test_distill_bank.py`.

Colab session recipe (same as the fine-tune era — see the ai-npc-dialogue
memory note for the long version):
1. Fresh A100 VM: run env.sh setup, `pip uninstall -y torchao`,
   `pip install "transformers>=4.57,<5"`.
2. sshd listens on **127.0.0.1:2222** (not 22): `bore local 2222 --to bore.pub`,
   key `~/.ssh/emberfall_colab`. GPU env: `LD_LIBRARY_PATH=/usr/lib64-nvidia`.
3. `scp tools/npc_dialogue/{distill_bank.py,gen_npc_data_v2.py}` up, then
   `python3 distill_bank.py --target 40000 --batch 96 --out /content/bank_a.jsonl`
   — ~150 conv/min ≈ 20k lines/hour; resumable, scp the shard back into
   `tools/npc_dialogue/generated/` whenever you like.
4. Locally: build → embed (~4 min per 30k lines) → dedup → eval → retune thresh.

At 100k+ lines consider sharding bank.emb.bin by role if the single-blob scan
(one 384-dot per line per query) gets slow — ~40ms at 31k today, linear growth.

## Provenance & licensing

The dialogue corpora and the built banks are **not distributed** in this
repository (see .gitignore) — only these pipeline scripts are. The built
runtime set (embedded bank + MiniLM model + ONNX runtime) is published to
the companion **Taiao-cdn** repo by `tools/publish_cdn_assets.sh`, and the
game's service worker (sw.js) lazily streams it in when the served tree
lacks it — so players get full semantic chat without this repo carrying
the ~150 MB.

- The seed lines in `generated/*.jsonl` are produced by `distill_bank.py`
  self-play against a **Llama-3.1-8B-Instruct** teacher. If you build and
  redistribute a bank made with that pipeline, comply with the Llama 3.1
  Community License (including its "Built with Llama" attribution notice).
- Embeddings (build-time and in-browser) use **all-MiniLM-L6-v2**
  (sentence-transformers, Apache-2.0). The model files are not vendored
  here; the runtime fetches them from a local `libs/npcml/` you provide.
- Lines you write yourself and fold in fall under the repo's CC BY-SA
  asset grant like any other authored game text.
