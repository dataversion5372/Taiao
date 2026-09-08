#!/usr/bin/env python3
"""Scan assets/families_source and emit js/sprites/outfit-manifest.js — a map of
each character folder -> the outfit states it has (a state = an 8-direction
rotations/ folder). "Idle" is listed first (the default, packed in CHAR_SHEET);
the rest are loaded lazily at runtime for the character-select outfit page.
Nude/undressed states are omitted."""
import os, json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "families_source"
DIRS = ["south","south-east","east","north-east","north","north-west","west","south-west"]
EXCLUDE = {"naked","bare_breasts","breasts_no_abs","no_loincloth","without_loincloth"}
def complete(p): return all((p/"rotations"/f"{d}.png").exists() for d in DIRS)
manifest = {}
for folder in sorted(os.listdir(SRC)):
    fp = SRC/folder
    if not fp.is_dir(): continue
    states = [st for st in sorted(os.listdir(fp))
              if (fp/st).is_dir() and st not in EXCLUDE and complete(fp/st)]
    states = (["Idle"] if "Idle" in states else []) + sorted(s for s in states if s != "Idle")
    if states: manifest[folder] = states
hdr = ('// ===== Isle of Emberfall — per-character OUTFIT states (auto-generated) =====\n'
       '// Maps each character folder (CHAR_LIST[i].folder) to the outfit states it has\n'
       '// under assets/families_source/<folder>/<state>/rotations/{8 dirs}.png. Regenerate:\n'
       '// tools/build_outfit_manifest.py\n"use strict";\n')
(ROOT/"js"/"sprites"/"outfit-manifest.js").write_text(
    hdr + "const OUTFIT_STATES = " + json.dumps(manifest, ensure_ascii=False) + ";\n")
print(f"{len(manifest)} chars, {sum(len(v) for v in manifest.values())} states")
if __name__ == "__main__": pass
