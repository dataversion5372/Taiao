#!/usr/bin/env python3
"""Pack all 8-directional world objects (trees, rocks, crafting stations, walls,
decor) into one sprite sheet and embed it (data URI) plus a manifest into
js/sprites/objects-data.js for Taiao game.

Each object folder holds base/rotations/<dir>.png for the 8 CHAR_DIRS. Objects
are foot-anchored at the bottom of their cell and contain-fit into the cell so
tall trees and short rocks both sit on the ground; the renderer applies a
per-category world scale. Frame order is objIndex*8 + dirIndex.
"""
import base64
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SRC = ASSETS / "objects_source"
MAP = json.loads((ASSETS / "objects.json").read_text())

DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]
CELL = 96
COLS = 64  # keep the sheet square-ish so neither dimension exceeds the 8192 GPU texture cap
FIT = 90                 # contain-fit box within the cell
BASELINE = 94            # feet/base sit near the bottom of the cell
ALPHA = 10

OUT_PNG = ASSETS / "game_objects.png"
OUT_JS = ROOT / "js" / "sprites" / "objects-data.js"


def bbox(a):
    ys, xs = np.where(a[:, :, 3] > ALPHA)
    if len(ys) == 0:
        return None
    return ys.min(), ys.max(), xs.min(), xs.max()


def dir_img(folder, d):
    p = SRC / folder / "base" / "rotations" / f"{d}.png"
    return np.array(Image.open(p).convert("RGBA")) if p.exists() else None


def place_frame(folder, d, scale):
    arr = dir_img(folder, d)
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
    folders = sorted(MAP.keys(), key=lambda f: MAP[f])
    obj_map = {}
    n_frames = len(folders) * len(DIRS)
    rows = (n_frames + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))

    for oi, folder in enumerate(folders):
        obj_map[MAP[folder]] = oi
        # contain-fit using the south view's bbox so every direction shares one scale
        south = dir_img(folder, "south")
        bb = bbox(south) if south is not None else None
        if bb:
            h = bb[1] - bb[0] + 1
            w = bb[3] - bb[2] + 1
            scale = min(FIT / h, FIT / w)
        else:
            scale = 1.0
        for di, d in enumerate(DIRS):
            frame = place_frame(folder, d, scale)
            idx = oi * len(DIRS) + di
            sheet.paste(frame, ((idx % COLS) * CELL, (idx // COLS) * CELL), frame)

    sheet.save(OUT_PNG)
    b64 = base64.b64encode(OUT_PNG.read_bytes()).decode()
    js = (
        "// ===== Taiao - 8-directional world object sheet (auto-generated) =====\n"
        '"use strict";\n'
        f"const OBJ_CELL = {CELL};\n"
        f"const OBJ_COLS = {COLS};\n"
        f"const OBJ_DIRS = {json.dumps(DIRS)};\n"
        f"const OBJ_MAP = {json.dumps(obj_map)};\n"
        f'const OBJ_SHEET = "data:image/png;base64,{b64}";\n'
    )
    OUT_JS.write_text(js)
    print(f"sheet {sheet.width}x{sheet.height}px, {len(folders)} objects x {len(DIRS)} dirs")
    print(f"PNG {OUT_PNG.stat().st_size // 1024} KB, JS {OUT_JS.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
