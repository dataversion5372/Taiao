#!/usr/bin/env python3
"""Build the NPC retrieval dialogue bank from the archived training datasets.

Reads the jsonl sets in ../RPG-archive/tools/npc_training/ and emits
tools/npc_dialogue/bank.jsonl — one entry per NPC reply:

  {"t": reply (slotified), "q": prompting context (prev NPC line + player msg),
   "role": ..., "intent": ..., "mood": ..., "rel": ..., "time": ...,
   "weather": ..., "loc": ..., "src": ..., "slots": [...]}

Retrieval embeds q (context-to-context matching); t is what the NPC says.
Player names found in the conversation are replaced with {player}; the NPC's
own name with {name} — filled from live state at runtime.
"""
import argparse, json, re, sys, collections, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ARCHIVE = HERE.parent.parent.parent / "RPG-archive" / "tools" / "npc_training"
OUT = HERE / "bank.jsonl"

SOURCES = [
    ("emberfall_npc_dialogue_3000.jsonl", "d3000"),
    ("emberfall_npc_sft_v2.jsonl", "sftv2"),
    ("emberfall_npc_distilled.jsonl", "dv1"),
    ("emberfall_npc_distilled_v3.jsonl", "dv3"),
    ("emberfall_npc_distilled_v4.jsonl", "dv4"),
    ("emberfall_npc_distilled_v5.jsonl", "dv5"),
]
# big-bank runs from distill_bank.py land here (any number of shards)
GENERATED_DIR = HERE / "generated"

NAME_INTRO = re.compile(
    r"\b(?i:my name is|my name's|i'm called|call me|name's|i am|i'?m)\s+([A-Z][a-z]{2,})")
NPC_NAME = re.compile(r"^You are ([A-Z][a-z]+)")
ROLE_KEEP = re.compile(r"You earn your keep as an? ([a-z][a-z ]+?)[,.]")
ROLE_EMBER = re.compile(r"an Emberfall ([a-z][a-z ]+?)\.")
REL_FEEL = re.compile(r"toward this traveller you feel (\w+)")
KV = re.compile(r"\b(location|time|weather|mood|relationship|your mood)=([^;.]+)")

BAD_LINE = re.compile(r"\*\*|^[-*] |<\||^assistant\b|\bSTATE:|\bSCENE:", re.I)
NOT_NAMES = {"The", "But", "And", "Not", "Just", "Here", "Sure", "Well", "Also",
             "Sorry", "Glad", "Off", "Only", "Now", "New", "Old", "All", "One"}


def norm_key(s):
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()


def scene_meta(system):
    meta = {}
    for k, v in KV.findall(system):
        k = "mood" if k == "your mood" else k
        meta[k] = v.strip()
    m = REL_FEEL.search(system)
    if m:
        meta["relationship"] = m.group(1)
    rel = meta.get("relationship", "")
    meta["relationship"] = re.sub(r"\(.*", "", rel).strip()
    m = ROLE_KEEP.search(system) or ROLE_EMBER.search(system)
    if m:
        meta["role"] = m.group(1).strip()
    return meta


def slotify(text, npc_name, player_names):
    slots = set()
    if npc_name and re.search(rf"\b{npc_name}\b", text):
        text = re.sub(rf"\b{npc_name}\b", "{name}", text)
        slots.add("name")
    for pn in player_names:
        if re.search(rf"\b{pn}\b", text):
            text = re.sub(rf"\b{pn}\b", "{player}", text)
            slots.add("player")
    return text, sorted(slots)


def entries_from_record(rec, src):
    msgs = rec["messages"]
    system = msgs[0]["content"] if msgs and msgs[0]["role"] == "system" else ""
    md = rec.get("metadata") or {}
    scene = scene_meta(system)
    npc_name = md.get("npc_name") or (NPC_NAME.search(system) or [None, None])[1]
    base = {
        "role": md.get("role") or scene.get("role") or "villager",
        "intent": md.get("intent") or "",
        "mood": md.get("mood") or scene.get("mood") or "",
        "rel": md.get("relationship") or scene.get("relationship") or "",
        "time": md.get("time") or scene.get("time") or "",
        "weather": md.get("weather") or scene.get("weather") or "",
        "loc": md.get("location") or scene.get("location") or "",
        "src": src,
    }
    player_names = set()
    if md.get("player_name"):
        player_names.add(md["player_name"])
    prev_user, prev_npc = "", ""
    for m in msgs:
        if m["role"] == "user":
            prev_user = m["content"].strip()
            for pm in NAME_INTRO.finditer(prev_user):
                if pm.group(1) not in NOT_NAMES:
                    player_names.add(pm.group(1))
        elif m["role"] == "assistant":
            t = m["content"].strip()
            if len(t) < 3 or BAD_LINE.search(t):
                prev_npc = t
                continue
            t, slots = slotify(t, npc_name, player_names)
            q = (prev_npc[-160:] + "\n" if prev_npc else "") + prev_user
            e = dict(base)
            e.update({"t": t, "q": q.strip(), "slots": slots})
            yield e
            prev_npc = m["content"].strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--with-archive", action="store_true",
                    help="also ingest the old fine-tune datasets from RPG-archive "
                         "(they were authored for SFT, not retrieval — off by default)")
    args = ap.parse_args()
    seen = {}
    counts = collections.Counter()
    dropped = collections.Counter()
    sources = [(ARCHIVE / f, s) for f, s in SOURCES] if args.with_archive else []
    if GENERATED_DIR.is_dir():
        sources += [(p, "gen:" + p.stem) for p in sorted(GENERATED_DIR.glob("*.jsonl"))]
    for path, src in sources:
        if not path.exists():
            print(f"!! missing {path}", file=sys.stderr)
            continue
        for line in open(path):
            rec = json.loads(line)
            for e in entries_from_record(rec, src):
                key = norm_key(e["t"])
                if key in seen:
                    dropped["dup"] += 1
                    continue
                seen[key] = e
                counts[src] += 1
    bank = list(seen.values())
    with open(OUT, "w") as f:
        for e in bank:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"bank: {len(bank)} lines -> {OUT}")
    print("per source:", dict(counts))
    print("dropped:", dict(dropped))
    print("slotted player:", sum(1 for e in bank if "player" in e["slots"]),
          " name:", sum(1 for e in bank if "name" in e["slots"]))
    roles = collections.Counter(e["role"] for e in bank)
    print(f"roles: {len(roles)} distinct; top: {roles.most_common(8)}")


if __name__ == "__main__":
    main()
