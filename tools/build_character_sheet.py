#!/usr/bin/env python3
"""Pack all 94 default (Idle) characters x 8 directions into one sprite sheet and
embed it (data URI) plus a manifest into js/sprites/characters-data.js for the
Taiao game.

Characters are normalized to a common body height and foot baseline so they all
stand consistently in-world. Frame order in the sheet is charIndex*8 + dirIndex,
with charIndex following CHAR_LIST (alphabetical by name).
"""
import base64
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent          # ~/RPG
ASSETS = ROOT / "assets"
SRC = ASSETS / "families_source"
NAMES = json.loads((ASSETS / "names.json").read_text())

DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]
CELL = 96
COLS = 24
TARGET_H = 74            # body bbox height within the cell
BASELINE = 92            # feet sit near the bottom of the cell
ALPHA = 10

OUT_PNG = ASSETS / "game_characters.png"
OUT_JS = ROOT / "js" / "sprites" / "characters-data.js"


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def bbox(a):
    ys, xs = np.where(a[:, :, 3] > ALPHA)
    if len(ys) == 0:
        return None
    return ys.min(), ys.max(), xs.min(), xs.max()


def idle_dir(folder, d):
    p = SRC / folder / "Idle" / "rotations" / f"{d}.png"
    return np.array(Image.open(p).convert("RGBA")) if p.exists() else None


def place_frame(folder, d, scale):
    """Return a CELLxCELL RGBA of one direction, scaled by `scale`, foot-anchored."""
    arr = idle_dir(folder, d)
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    if arr is None:
        return cell
    im = Image.fromarray(arr, "RGBA")
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((nw, nh), Image.NEAREST)
    a = np.array(im)
    bb = bbox(a)
    if bb is None:
        return cell
    y0, y1, x0, x1 = bb
    cx = (x0 + x1) / 2
    off_x = round(CELL / 2 - cx)
    off_y = round(BASELINE - y1)
    cv = np.zeros((CELL, CELL, 4), np.uint8)
    for sy in range(a.shape[0]):
        ty = sy + off_y
        if ty < 0 or ty >= CELL:
            continue
        for sx in range(a.shape[1]):
            tx = sx + off_x
            if tx < 0 or tx >= CELL or a[sy, sx, 3] <= ALPHA:
                continue
            cv[ty, tx] = a[sy, sx]
    return Image.fromarray(cv, "RGBA")


def main():
    folders = sorted(NAMES.keys(), key=lambda f: NAMES[f].lower())
    char_list = [{"name": NAMES[f], "folder": f} for f in folders]
    n_frames = len(folders) * len(DIRS)
    rows = (n_frames + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))

    for ci, folder in enumerate(folders):
        south = idle_dir(folder, "south")
        bb = bbox(south) if south is not None else None
        scale = TARGET_H / (bb[1] - bb[0] + 1) if bb else 1.0
        for di, d in enumerate(DIRS):
            frame = place_frame(folder, d, scale)
            idx = ci * len(DIRS) + di
            sheet.paste(frame, ((idx % COLS) * CELL, (idx // COLS) * CELL), frame)

    sheet.save(OUT_PNG)
    b64 = base64.b64encode(OUT_PNG.read_bytes()).decode()
    js = (
        "// ===== Taiao — playable character sheet (auto-generated) =====\n"
        '"use strict";\n'
        f"const CHAR_CELL = {CELL};\n"
        f"const CHAR_COLS = {COLS};\n"
        f"const CHAR_DIRS = {json.dumps(DIRS)};\n"
        f"const CHAR_LIST = {json.dumps(char_list)};\n"
        f'const CHAR_SHEET = "data:image/png;base64,{b64}";\n'
    )
    OUT_JS.write_text(js)
    print(f"sheet {sheet.width}x{sheet.height}px, {len(folders)} chars x {len(DIRS)} dirs")
    print(f"PNG {OUT_PNG.stat().st_size//1024} KB, JS {OUT_JS.stat().st_size//1024} KB")


if __name__ == "__main__":
    main()
