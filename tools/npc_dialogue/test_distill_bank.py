#!/usr/bin/env python3
"""Torch-free unit test for distill_bank.py: drives the Conv/run_waves engine
with a mock teacher, checking record shape, metadata, and rejection gates.
Run: python3 test_distill_bank.py"""
import collections, json, os, random, tempfile

import distill_bank as D


def mock_wave_factory(rng):
    calls = {"n": 0}

    def wave(convs, max_new, seeds=None):
        calls["n"] += 1
        out = []
        for i, c in enumerate(convs):
            if c.stage == "player":
                out.append(rng.choice([
                    "Tell me, what fills your days here?",
                    "Kia ora. Fine weather for it, eh?",
                    "I've walked far today and my feet ache something awful.",
                    "What do you make of the storms lately?",
                ]))
            else:
                seeded = seeds[i] if seeds else ""
                r = rng.random()
                if r < 0.05:
                    out.append("As an AI language model I cannot answer that.")   # _BAD_RE
                elif seeded and r < 0.10:
                    out.append(" to you too, traveller!")                          # echo gate
                elif r < 0.15:
                    out.append("You reek of stench, traveller!")                   # grounded()
                else:
                    out.append(rng.choice([
                        ", stranger! The kiln's been kind today, so it goes." if seeded else
                        "The kiln's been kind today, so it goes.",
                        "Long days, good honest work. And you, what brings you here?",
                        "My old bones say rain before nightfall.",
                    ]))
        return out

    return wave, calls


def main():
    rng = random.Random(7)
    wave, calls = mock_wave_factory(rng)
    out = tempfile.mktemp(suffix=".jsonl")
    written, failed = D.run_waves(lambda: D.Conv(rng), wave, target=60, batch=12, out_path=out)
    recs = [json.loads(l) for l in open(out)]
    os.unlink(out)

    # a final wave can complete several convos at once, so target may overshoot
    assert written >= 60 and len(recs) == written, (written, len(recs))
    assert failed > 0, "adversarial mock lines should trigger some rejections"
    intents = collections.Counter(r["metadata"]["intent"] for r in recs)
    for r in recs:
        md = r["metadata"]
        assert md["role"] in D.ROLE_INFO and md["npc_name"] and md["player_name"]
        msgs = r["messages"]
        assert msgs[0]["role"] == "system" and "Isle of Emberfall" in msgs[0]["content"]
        roles = [m["role"] for m in msgs[1:]]
        assert roles == ["user", "assistant"] * (len(roles) // 2), roles
        for m in msgs[1:]:
            assert not D._BAD_RE.search(m["content"]) or m["role"] == "user"
            assert "AI language model" not in m["content"]
    # the matrix must actually be swept — many distinct intents in a small run
    assert len(intents) >= 10, intents
    # deflection families must appear across a larger sample of Conv draws
    tags = collections.Counter(D.Conv(rng).intent for _ in range(600))
    for must in ("out_of_world", "rude", "meta", "nonsense", "ask_food", "insult"):
        assert tags[must] > 0, (must, tags)
    print(f"OK: 60 records, {failed} rejected by gates, {len(intents)} intents in run, "
          f"{calls['n']} waves; 600-draw tag sweep hits all deflection families")
    print("run intents:", dict(intents.most_common()))


if __name__ == "__main__":
    main()
