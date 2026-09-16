#!/usr/bin/env python3
"""Embed bank.jsonl prompting-contexts with the vendored MiniLM ONNX model.

Run with a Python that has sentence-transformers installed (see README.md).

Emits into assets/npc_dialogue/:
  bank.emb.bin    int8 embeddings, n x 384 row-major (per-row max-abs quantized)
  bank.scale.bin  float32 per-row dequant scale (score = dot(q_f32, row_i8)*scale)
  bank.meta.json  {model, dim, n, lines:[{t, role, intent, mood, rel, time,
                   weather, slots}]}  (q/context is offline-only, not shipped)
"""
import json, sys, time, pathlib
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
MODEL_DIR = ROOT / "assets" / "models" / "Xenova" / "all-MiniLM-L6-v2"
OUT_DIR = ROOT / "assets" / "npc_dialogue"
BATCH = 64
MAX_LEN = 128


def load():
    tok = Tokenizer.from_file(str(MODEL_DIR / "tokenizer.json"))
    tok.enable_truncation(max_length=MAX_LEN)
    tok.enable_padding(pad_id=0, pad_token="[PAD]")
    sess = ort.InferenceSession(str(MODEL_DIR / "onnx" / "model_quantized.onnx"),
                                providers=["CPUExecutionProvider"])
    return tok, sess


def embed_batch(tok, sess, texts):
    enc = tok.encode_batch(texts)
    ids = np.array([e.ids for e in enc], dtype=np.int64)
    mask = np.array([e.attention_mask for e in enc], dtype=np.int64)
    types = np.zeros_like(ids)
    (hidden,) = sess.run(["last_hidden_state"],
                         {"input_ids": ids, "attention_mask": mask,
                          "token_type_ids": types})
    m = mask[:, :, None].astype(np.float32)
    v = (hidden * m).sum(1) / np.clip(m.sum(1), 1e-9, None)
    v /= np.clip(np.linalg.norm(v, axis=1, keepdims=True), 1e-9, None)
    return v.astype(np.float32)


def main():
    lines = [json.loads(l) for l in open(HERE / "bank.jsonl")]
    tok, sess = load()
    vecs = np.zeros((len(lines), 384), dtype=np.float32)
    t0 = time.time()
    for i in range(0, len(lines), BATCH):
        batch = lines[i:i + BATCH]
        vecs[i:i + len(batch)] = embed_batch(tok, sess, [e["q"] or e["t"] for e in batch])
        if (i // BATCH) % 20 == 0:
            done = i + len(batch)
            rate = done / max(time.time() - t0, 1e-9)
            print(f"{done}/{len(lines)}  {rate:.0f}/s  eta {(len(lines)-done)/max(rate,1e-9):.0f}s",
                  flush=True)
    scale = np.abs(vecs).max(1) / 127.0
    q = np.round(vecs / np.clip(scale[:, None], 1e-12, None)).clip(-127, 127).astype(np.int8)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    q.tofile(OUT_DIR / "bank.emb.bin")
    scale.astype(np.float32).tofile(OUT_DIR / "bank.scale.bin")
    meta = {"model": "Xenova/all-MiniLM-L6-v2", "dim": 384, "n": len(lines),
            "lines": [{k: e[k] for k in
                       ("t", "role", "intent", "mood", "rel", "time", "weather", "slots")}
                      for e in lines]}
    with open(OUT_DIR / "bank.meta.json", "w") as f:
        json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))
    # quantization sanity: f32 and i8 must agree on top-1 (identical q strings
    # exist in the bank, so the winner needn't be the probe itself)
    deq = q.astype(np.float32) * scale[:, None]
    for probe in (7, 4242, 20000):
        a = (vecs @ vecs[probe]).argmax()
        b = (deq @ vecs[probe]).argmax()
        assert a == b, (probe, a, b)
    print(f"done: {len(lines)} vecs, emb {q.nbytes/1e6:.1f}MB, "
          f"meta {(OUT_DIR/'bank.meta.json').stat().st_size/1e6:.1f}MB, "
          f"{time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
