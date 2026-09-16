# Taiao — small-sheet atlas packer.
#
# The js/sprites/*-data.js files register dozens of icon sheets, many holding
# only a handful of sprites. This tool packs every SMALL sheet (both dimensions
# <= 512px, non-core) whole — layout intact — into one shared atlas webp, so
# the game fetches/decodes one image instead of ~40, and assets/sheets stays
# browsable.
#
#   python3 tools/pack_sheets.py
#
# What it does, idempotently:
#   1. Scans js/**/*.js for ASSET_DATA["k"] = "<path>.webp" registrations
#      (also the const-indirection form: const X = "<path>"; ASSET_DATA.k = X).
#   2. Picks the packable keys (<=512x512, not a core boot sheet).
#   3. Moves each packed source sheet to assets/sheet-src/<key>-<slug>.webp
#      (readable name from its data file) and rewrites the path string in the
#      registering js file. sheet-src files are the pack INPUTS — they are not
#      fetched by the game (sheet-pack-data.js repoints every packed key), but
#      the in-file paths still resolve if the pack layer is ever removed.
#   4. Shelf-packs the images (2px gutter) into assets/sheets/icon-pack.<hash8>.webp
#      (lossless webp; older icon-pack.*.webp files are deleted).
#   5. Generates js/sprites/sheet-pack-data.js: repoints ASSET_DATA[key] at the
#      atlas and records each sheet's corner in SHEET_OFFSET (main/assets.js).
#      That file must load AFTER every sheet-registering data file
#      (tools/bundle.list keeps it as the last js/sprites entry).
#
# Re-run after editing any packed source sheet or adding a new small sheet,
# then `node tools/build.mjs`.
import glob
import hashlib
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORE = {"t", "c", "x", "m", "b", "i", "n", "ta", "tb", "a", "md"}
MAX_W = MAX_H = 512      # pack sheets no bigger than this
ATLAS_W = 2048           # fixed atlas width; height grows as needed
GUTTER = 2               # transparent px between packed sheets (smoothing bleed)
SRC_DIR = "assets/sheet-src"
PACK_DATA = "js/sprites/sheet-pack-data.js"

# ---- 1. scan registrations -------------------------------------------------
# key -> (path, registering js file)
direct_pat = re.compile(
    r'ASSET_DATA(?:\[\s*"(?P<k1>\w+)"\s*\]|\.(?P<k2>\w+))\s*=\s*\n?\s*"(?P<p>assets/sheet(?:s|-src)/[^"]+\.webp)"')
const_pat = re.compile(
    r'const\s+(?P<name>[A-Z_0-9]+)\s*=\s*\n?\s*"(?P<p>assets/sheet(?:s|-src)/[^"]+\.webp)"')
indirect_pat = re.compile(
    r'ASSET_DATA(?:\[\s*"(?P<k1>\w+)"\s*\]|\.(?P<k2>\w+))\s*=\s*(?P<name>[A-Z_0-9]+)\s*;')

sheets = {}
for f in sorted(glob.glob(os.path.join(ROOT, "js", "**", "*.js"), recursive=True)):
    rel = os.path.relpath(f, ROOT)
    if rel.startswith("js/sprites/sheet-pack-data"):
        continue
    src = open(f).read()
    consts = {m.group("name"): m.group("p") for m in const_pat.finditer(src)}
    for m in direct_pat.finditer(src):
        k = m.group("k1") or m.group("k2")
        sheets.setdefault(k, (m.group("p"), rel))
    for m in indirect_pat.finditer(src):
        k = m.group("k1") or m.group("k2")
        if m.group("name") in consts:
            sheets.setdefault(k, (consts[m.group("name")], rel))

# ---- 2. pick packable ------------------------------------------------------
packable = []   # (key, abs path, rel path, w, h, registering file)
for k, (p, rel) in sorted(sheets.items()):
    if k in CORE:
        continue
    fp = os.path.join(ROOT, p)
    if not os.path.exists(fp):
        print(f"WARN missing sheet file for {k}: {p}", file=sys.stderr)
        continue
    w, h = Image.open(fp).size
    if w <= MAX_W and h <= MAX_H:
        packable.append((k, fp, p, w, h, rel))

if not packable:
    print("nothing to pack"); sys.exit(0)

# ---- 3. move sources to assets/sheet-src with readable names ---------------
os.makedirs(os.path.join(ROOT, SRC_DIR), exist_ok=True)
moved = {}
for i, (k, fp, p, w, h, rel) in enumerate(packable):
    if p.startswith(SRC_DIR + "/"):
        continue   # already migrated
    slug = re.sub(r"(-data)?\.js$", "", os.path.basename(rel))
    newrel = f"{SRC_DIR}/{k}-{slug}.webp"
    os.replace(fp, os.path.join(ROOT, newrel))
    # rewrite the path string wherever it appears in js/
    for jf in glob.glob(os.path.join(ROOT, "js", "**", "*.js"), recursive=True):
        s = open(jf).read()
        if p in s:
            open(jf, "w").write(s.replace(p, newrel))
    packable[i] = (k, os.path.join(ROOT, newrel), newrel, w, h, rel)
    moved[k] = newrel

# ---- 4. shelf-pack ---------------------------------------------------------
packable.sort(key=lambda t: (-t[4], -t[3], t[0]))   # tallest first, deterministic
pos = {}
x = y = shelf_h = 0
for k, fp, p, w, h, rel in packable:
    if x + w > ATLAS_W:
        y += shelf_h + GUTTER
        x = shelf_h = 0
    pos[k] = (x, y)
    x += w + GUTTER
    shelf_h = max(shelf_h, h)
atlas_h = y + shelf_h
atlas = Image.new("RGBA", (ATLAS_W, atlas_h), (0, 0, 0, 0))
for k, fp, p, w, h, rel in packable:
    atlas.paste(Image.open(fp).convert("RGBA"), pos[k])

import io
buf = io.BytesIO()
atlas.save(buf, "WEBP", lossless=True)
digest = hashlib.sha1(buf.getvalue()).hexdigest()[:8]
atlas_rel = f"assets/sheets/icon-pack.{digest}.webp"
for old in glob.glob(os.path.join(ROOT, "assets/sheets/icon-pack.*.webp")):
    os.remove(old)
open(os.path.join(ROOT, atlas_rel), "wb").write(buf.getvalue())

# ---- 5. emit the repoint data file -----------------------------------------
lines = [
    "// ===== Taiao — packed small-sheet atlas (auto-generated) =====",
    "// Generated by tools/pack_sheets.py — DO NOT EDIT BY HAND; re-run the tool.",
    "// Repoints every small icon sheet at one shared atlas and records each",
    "// sheet's corner in SHEET_OFFSET (see js/main/assets.js). Must load after",
    "// every sheet-registering js/sprites/*-data.js file.",
    '"use strict";',
    "(function () {",
    '  if (typeof ASSET_DATA === "undefined" || typeof SHEET_OFFSET === "undefined") return;',
    f'  var A = "{atlas_rel}";',
]
for k, fp, p, w, h, rel in sorted(packable):
    ox, oy = pos[k]
    lines.append(f'  ASSET_DATA["{k}"] = A; SHEET_OFFSET["{k}"] = {{ ox: {ox}, oy: {oy} }};   // {w}x{h} {p}')
lines.append("})();")
open(os.path.join(ROOT, PACK_DATA), "w").write("\n".join(lines) + "\n")

kb = len(buf.getvalue()) // 1024
print(f"packed {len(packable)} sheets -> {atlas_rel} ({ATLAS_W}x{atlas_h}, {kb}K)")
for k in moved:
    print(f"  moved {k} -> {moved[k]}")
