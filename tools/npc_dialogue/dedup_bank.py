#!/usr/bin/env python3
"""Embedding near-duplicate filter for the bank — run AFTER embed_bank.py.

Greedy pass per (role, intent) bucket: a line whose reply-context embedding has
cosine > --thresh (default 0.95) against an already-kept line in the same
bucket is dropped. Rewrites bank.jsonl and the assets/npc_dialogue artifacts
in place (originals backed up as *.pre-dedup). At 100k+ lines this is what
keeps the bank from being 5,000 restatements of the same greeting.

Run with a Python that has sentence-transformers installed (see README.md).
"""
import argparse, collections, json, pathlib, shutil
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
OUT_DIR = HERE.parent.parent / "assets" / "npc_dialogue"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--thresh", type=float, default=0.95)
    args = ap.parse_args()

    lines = [json.loads(l) for l in open(HERE / "bank.jsonl")]
    n = len(lines)
    emb = np.fromfile(OUT_DIR / "bank.emb.bin", dtype=np.int8).reshape(n, 384)
    scale = np.fromfile(OUT_DIR / "bank.scale.bin", dtype=np.float32)
    assert len(scale) == n, (len(scale), n)
    deq = emb.astype(np.float32) * scale[:, None]

    buckets = collections.defaultdict(list)
    for i, e in enumerate(lines):
        buckets[(e["role"], e["intent"])].append(i)

    keep = np.ones(n, dtype=bool)
    for key, idxs in buckets.items():
        kept = []
        for i in idxs:
            if kept:
                sims = deq[kept] @ deq[i]
                if sims.max() > args.thresh:
                    keep[i] = False
                    continue
            kept.append(i)
    kept_idx = np.where(keep)[0]
    print(f"{n} -> {len(kept_idx)} lines (dropped {n - len(kept_idx)} near-dups @ >{args.thresh})")

    for f in ("bank.emb.bin", "bank.scale.bin", "bank.meta.json"):
        shutil.copy2(OUT_DIR / f, OUT_DIR / (f + ".pre-dedup"))
    shutil.copy2(HERE / "bank.jsonl", HERE / "bank.jsonl.pre-dedup")

    emb[kept_idx].tofile(OUT_DIR / "bank.emb.bin")
    scale[kept_idx].tofile(OUT_DIR / "bank.scale.bin")
    kept_lines = [lines[i] for i in kept_idx]
    with open(HERE / "bank.jsonl", "w") as f:
        for e in kept_lines:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    meta = json.load(open(OUT_DIR / "bank.meta.json"))
    meta["n"] = len(kept_idx)
    meta["lines"] = [meta["lines"][i] for i in kept_idx]
    with open(OUT_DIR / "bank.meta.json", "w") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))
    print("rewrote bank.jsonl + assets/npc_dialogue artifacts (backups: *.pre-dedup)")


if __name__ == "__main__":
    main()
