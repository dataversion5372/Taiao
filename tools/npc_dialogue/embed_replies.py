#!/usr/bin/env python3
"""Second embedding pass: the REPLY TEXT of every bank line (bank.jsonl must
already match the deduped assets). Retrieval stage 1 matches the player's words
against each line's prompting context; stage 2 re-ranks by whether the reply
itself shares topic with what the player said — this is what stops a direct
question drawing a personality-chatter line that ignores it.

Run with a sentence-transformers Python after build/embed/dedup (see README.md).
Emits assets/npc_dialogue/bank.remb.bin (int8) + bank.rscale.bin (f32).
"""
import json, time, pathlib, re
import numpy as np
from embed_bank import load, embed_batch, OUT_DIR

HERE = pathlib.Path(__file__).resolve().parent
BATCH = 64


def main():
    lines = [json.loads(l) for l in open(HERE / "bank.jsonl")]
    n_emb = (OUT_DIR / "bank.scale.bin").stat().st_size // 4
    assert len(lines) == n_emb, f"bank.jsonl ({len(lines)}) != embedded rows ({n_emb}); rerun the pipeline in order"
    tok, sess = load()
    texts = [re.sub(r"\{(player|name)\}", "friend", e["t"]) for e in lines]
    vecs = np.zeros((len(lines), 384), dtype=np.float32)
    t0 = time.time()
    for i in range(0, len(lines), BATCH):
        vecs[i:i + BATCH] = embed_batch(tok, sess, texts[i:i + BATCH])
        if (i // BATCH) % 40 == 0:
            done = i + BATCH
            rate = done / max(time.time() - t0, 1e-9)
            print(f"{done}/{len(lines)}  {rate:.0f}/s  eta {(len(lines)-done)/max(rate,1e-9):.0f}s", flush=True)
    scale = np.abs(vecs).max(1) / 127.0
    q = np.round(vecs / np.clip(scale[:, None], 1e-12, None)).clip(-127, 127).astype(np.int8)
    q.tofile(OUT_DIR / "bank.remb.bin")
    scale.astype(np.float32).tofile(OUT_DIR / "bank.rscale.bin")
    print(f"done: {len(lines)} reply vecs, {q.nbytes/1e6:.1f}MB, {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
