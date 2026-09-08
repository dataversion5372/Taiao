#!/usr/bin/env python3
"""Pack every NON-Idle outfit state (from OUTFIT_STATES / families_source) into a
SMALL NUMBER of embedded data-URI sheets in js/sprites/outfit-sheet-data.js — so
the game renders alternate outfits with NO runtime fetch (works over file://).

There are ~700 states; a single sheet would exceed the GPU max texture size, so we
split into several sheets, each capped at MAX_ROWS rows (< the 8192px GPU limit),
and we keep every state's 8 frames on one sheet and each character's states
together (so opening a character only needs to load one sheet). Frames use the
SAME 96px foot-anchored normalisation as build_character_sheet.py (padding trimmed
via bbox), so an outfit lines up with the Idle sprite.

Emits:
  OUTFIT_SHEET_CELL (96), OUTFIT_SHEET_COLS (24)
  OUTFIT_SHEETS   = [dataURI, ...]                        (one per sheet)
  OUTFIT_FRAME    = {"<folder>|<state>": [sheetIndex, baseFrame]}   base = south; +dirIndex for others
"""
import base64, json, re
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "families_source"
DIRS = ["south","south-east","east","north-east","north","north-west","west","south-west"]
CELL, COLS, TARGET_H, BASELINE, ALPHA = 96, 24, 74, 92, 10
MAX_ROWS = 80                       # 80*96 = 7680px < 8192 GPU limit
FRAMES_PER_SHEET = MAX_ROWS * COLS  # 1920

man = ROOT / "js" / "sprites" / "outfit-manifest.js"
STATES = json.loads(re.search(r"OUTFIT_STATES\s*=\s*(\{.*\});", man.read_text(), re.S).group(1))

def arr(folder, state, d):
    p = SRC/folder/state/"rotations"/f"{d}.png"
    return np.array(Image.open(p).convert("RGBA")) if p.exists() else None
def bbox(a):
    ys, xs = np.where(a[:, :, 3] > ALPHA)
    return None if len(ys) == 0 else (ys.min(), ys.max(), xs.min(), xs.max())
def place(folder, state, d, scale):
    a0 = arr(folder, state, d)
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    if a0 is None: return cell
    im = Image.fromarray(a0, "RGBA")
    im = im.resize((max(1, round(im.width*scale)), max(1, round(im.height*scale))), Image.NEAREST)
    a = np.array(im); bb = bbox(a)
    if bb is None: return cell
    y0, y1, x0, x1 = bb
    ox, oy = round(CELL/2 - (x0+x1)/2), round(BASELINE - y1)
    cv = np.zeros((CELL, CELL, 4), np.uint8)
    for sy in range(a.shape[0]):
        ty = sy+oy
        if 0 <= ty < CELL:
            for sx in range(a.shape[1]):
                tx = sx+ox
                if 0 <= tx < CELL and a[sy, sx, 3] > ALPHA: cv[ty, tx] = a[sy, sx]
    return Image.fromarray(cv, "RGBA")

# ---- layout: assign each (folder,state) a (sheet, baseFrame), keeping a state's 8
#      frames on one sheet and a character's states together on one sheet ----
frame_map = {}      # "folder|state" -> (sheet, base)
layout = []         # list per sheet: [(folder,state,base), ...]
sheets = []         # current-frame counter per sheet
def ensure(n):
    while len(sheets) < n: sheets.append(0); layout.append([])
si = 0; ensure(1)
for folder, states in STATES.items():
    non_idle = [s for s in states if s != "Idle"]
    if not non_idle: continue
    need = len(non_idle) * 8
    # keep this character's whole block on one sheet
    if sheets[si] + need > FRAMES_PER_SHEET:
        si += 1; ensure(si+1)
    for st in non_idle:
        base = sheets[si]
        frame_map[f"{folder}|{st}"] = (si, base)
        layout[si].append((folder, st, base))
        sheets[si] += 8

# ---- render each sheet ----
data_uris = []
for idx, items in enumerate(layout):
    if not items: continue
    n_frames = max((b + 8) for (_, _, b) in items)
    rows = (n_frames + COLS - 1)//COLS
    sheet = Image.new("RGBA", (COLS*CELL, rows*CELL), (0, 0, 0, 0))
    for folder, st, base in items:
        south = arr(folder, "Idle", "south")
        bb = bbox(south) if south is not None else None
        scale = TARGET_H/(bb[1]-bb[0]+1) if bb else 1.0
        for di, d in enumerate(DIRS):
            fr = base + di
            cell = place(folder, st, d, scale)
            sheet.paste(cell, ((fr % COLS)*CELL, (fr//COLS)*CELL), cell)
    out_png = ROOT/"assets"/f"game_outfits_{idx}.png"
    sheet.save(out_png)
    data_uris.append("data:image/png;base64," + base64.b64encode(out_png.read_bytes()).decode())
    print(f"sheet {idx}: {sheet.width}x{sheet.height}, {len(items)} states, {out_png.stat().st_size//1024} KB")

fm = {k: [v[0], v[1]] for k, v in frame_map.items()}
js = ('// ===== Isle of Emberfall — alternate-outfit sprite sheets (auto-generated) =====\n'
      '// Every non-Idle outfit state, packed into a few embedded data-URI sheets (no\n'
      '// runtime fetch → works over file://), each kept under the GPU texture-size\n'
      '// limit. OUTFIT_FRAME["<folder>|<state>"] = [sheetIndex, baseFrame]; the 8\n'
      '// directions follow at base+dirIndex (CHAR_DIRS order). tools/build_outfit_sheet.py\n'
      '"use strict";\n'
      f"const OUTFIT_SHEET_CELL = {CELL};\n"
      f"const OUTFIT_SHEET_COLS = {COLS};\n"
      f"const OUTFIT_FRAME = {json.dumps(fm, ensure_ascii=False)};\n"
      f"const OUTFIT_SHEETS = [\n" + ",\n".join(f'  "{u}"' for u in data_uris) + "\n];\n")
(ROOT/"js"/"sprites"/"outfit-sheet-data.js").write_text(js)
print(f"{len(fm)} states across {len(data_uris)} sheets; JS {(ROOT/'js'/'sprites'/'outfit-sheet-data.js').stat().st_size//1024} KB")
