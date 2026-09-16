#!/usr/bin/env python3
"""Eval the retrieval bank: held-out quality + confidence-gate calibration.

Run with ~/pyenv/bin/python after embed_bank.py.

1. Sample held-out bank lines; embed their prompting-context q; retrieve
   top-k (self excluded, same scoring as the browser: int8 dot * scale +
   role/mood/time affinity). Report rank-of-self (sanity), and the cosine
   between the retrieved reply's TEXT and the true reply's TEXT (proxy for
   "is the picked line a sensible answer here").
2. Feed out-of-domain probes (anachronisms, filth, gibberish) and report the
   best raw cosine each gets, so NPCR.thresh can be set to separate them.
"""
import json, random, pathlib
import numpy as np
from embed_bank import load, embed_batch

HERE = pathlib.Path(__file__).resolve().parent
OUT_DIR = HERE.parent.parent / "assets" / "npc_dialogue"
K = 5
N_PROBES = 300
ROLE_BONUS, SCENE_BONUS = 0.06, 0.02

OOD = [
    "Did you vote for Donald Trump?",
    "Would you like to have sex lol",
    "What's your wifi password?",
    "Tell me about the internet and smartphones.",
    "asdf ghjkl qwerty",
    "You're an AI language model in a video game, admit it.",
    "Who won the world cup in 2022?",
    "Can I pay with a credit card?",
]
IND = [
    "What do you have for breakfast?",
    "Kia ora! Lovely morning isn't it?",
    "Where can I find the blacksmith?",
    "What do you sell here?",
    "I'm Finn, good to meet you.",
    "Any rumours going around the village?",
    "This storm looks bad, will it pass soon?",
    "My name is Aroha. Do you remember my name?",
]


def main():
    lines = [json.loads(l) for l in open(HERE / "bank.jsonl")]
    n = len(lines)
    emb = np.fromfile(OUT_DIR / "bank.emb.bin", dtype=np.int8).reshape(n, 384)
    scale = np.fromfile(OUT_DIR / "bank.scale.bin", dtype=np.float32)
    deq = emb.astype(np.float32) * scale[:, None]

    tok, sess = load()
    rng = random.Random(42)
    idxs = rng.sample(range(n), N_PROBES)

    qv = np.vstack([embed_batch(tok, sess, [lines[i]["q"] or lines[i]["t"] for i in idxs[b:b+64]])
                    for b in range(0, N_PROBES, 64)])
    sims = qv @ deq.T                                   # (N_PROBES, n) raw cosine

    # affinity re-rank identical to the browser
    roles = np.array([e["role"] for e in lines])
    moods = np.array([e["mood"] for e in lines])
    times = np.array([e["time"] for e in lines])
    ranks, prox = [], []
    tex_cache = {}
    for r, i in enumerate(idxs):
        s = sims[r].copy()
        s[roles == lines[i]["role"]] += ROLE_BONUS
        s[moods == lines[i]["mood"]] += SCENE_BONUS
        s[times == lines[i]["time"]] += SCENE_BONUS
        order = np.argsort(-s)
        ranks.append(int(np.where(order == i)[0][0]))
        top = [j for j in order[:K + 1] if j != i][:1][0]
        tex_cache.setdefault(i, None); tex_cache.setdefault(top, None)
        prox.append((i, top))
    keys = list(tex_cache)
    tv = np.vstack([embed_batch(tok, sess, [lines[k]["t"] for k in keys[b:b+64]])
                    for b in range(0, len(keys), 64)])
    tmap = {k: tv[j] for j, k in enumerate(keys)}
    tsim = [float(tmap[a] @ tmap[b]) for a, b in prox]

    ranks = np.array(ranks)
    print(f"held-out n={N_PROBES}: self in top-1 {np.mean(ranks==0):.0%}, "
          f"top-5 {np.mean(ranks<5):.0%}, top-20 {np.mean(ranks<20):.0%}")
    print(f"reply-text proximity of best OTHER line: mean {np.mean(tsim):.3f}, "
          f"p10 {np.percentile(tsim,10):.3f}  (1.0 = same meaning)")
    heldout_best = np.array([np.max(np.delete(sims[r], idxs[r])) for r in range(N_PROBES)])
    print(f"held-out best raw cosine: mean {heldout_best.mean():.3f}, "
          f"p10 {np.percentile(heldout_best,10):.3f}, p2 {np.percentile(heldout_best,2):.3f}")

    for tag, probes in (("IN ", IND), ("OOD", OOD)):
        pv = embed_batch(tok, sess, probes)
        ps = pv @ deq.T
        for t, row in zip(probes, ps):
            b = int(row.argmax())
            print(f"{tag} best={row.max():.3f}  {t[:44]!r:46} -> {lines[b]['t'][:70]!r}")


if __name__ == "__main__":
    main()
