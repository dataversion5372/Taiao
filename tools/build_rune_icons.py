#!/usr/bin/env python3
"""Slice the AI-generated 8x4 rune spritesheet into 32 icons and pack them
into js/sprites/rune-icons-data.js (registered as sprite sheet "ru", 64px
cells, same self-registering pattern as item-icons-data.js's "gi" sheet).

Cell order is the rune LADDER order (content.js RUNE_NAMES, row-major):
  Air Strike Water Bind Fire Stone Rend Veil / Drain Burst Frost Lava Twin
  Storm Echo Chaos / Bone Law Light Shadow Death Blood Soul Ward / Spirit
  War Time Void Astral Wrath Genesis Eternity
so cell (col,row) -> tier row*8+col, and SPR["i_rune<tier>"] points at it
(plus the two legacy keys i_rune_air / i_rune_fire for tiers 0 and 4).

The source has a solid dark-navy background and NO alpha: background is
removed by flood-fill from the cell borders over background-coloured pixels,
so dark pixels INSIDE the art (outlines, lava cracks) survive.

Run: python3 tools/build_rune_icons.py "<path-to-generated-sheet.png>"
"""
import base64, io, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
COLS, ROWS, CELL = 8, 4, 64

im = Image.open(SRC).convert("RGB")
W, H = im.size
a = np.asarray(im).astype(int)

out = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
for row in range(ROWS):
    for col in range(COLS):
        x0, x1 = round(col * W / COLS), round((col + 1) * W / COLS)
        y0, y1 = round(row * H / ROWS), round((row + 1) * H / ROWS)
        cell = a[y0:y1, x0:x1]
        # background colour = median of the cell's border pixels
        border = np.concatenate([cell[0], cell[-1], cell[:, 0], cell[:, -1]])
        bg = np.median(border, axis=0)
        dist = np.abs(cell - bg).sum(axis=2)
        bglike = dist < 60
        # outside = bg-like components touching the cell border; everything
        # else (including dark pixels enclosed by the art) is foreground
        lab, n = ndimage.label(bglike)
        edge_labels = set(np.unique(np.concatenate(
            [lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        outside = np.isin(lab, list(edge_labels)) if edge_labels else np.zeros_like(bglike)
        fg = ~outside
        # drop tiny specks
        flab, fn = ndimage.label(fg)
        if fn:
            sizes = ndimage.sum(np.ones_like(flab), flab, range(1, fn + 1))
            fg = np.isin(flab, list(np.where(sizes >= 60)[0] + 1))
        if fg.sum() < 100:
            print(f"warn: cell {col},{row} nearly empty"); continue
        ys, xs = np.where(fg)
        bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        crop = cell[by0:by1, bx0:bx1].astype(np.uint8)
        mask = (fg[by0:by1, bx0:bx1] * 255).astype(np.uint8)
        rgba = np.dstack([crop, mask])
        # pad to square so every rune keeps its aspect, then downscale
        h, w = rgba.shape[:2]
        s = max(h, w)
        sq = np.zeros((s, s, 4), np.uint8)
        oy, ox = (s - h) // 2, (s - w) // 2
        sq[oy:oy + h, ox:ox + w] = rgba
        icon = Image.fromarray(sq).resize((CELL - 4, CELL - 4), Image.LANCZOS)
        out.paste(icon, (col * CELL + 2, row * CELL + 2), icon)

png = io.BytesIO()
out.save(png, "PNG", optimize=True)
sheet_path = os.path.join(ROOT, "assets", "rune-icons.png")
out.save(sheet_path)  # reference copy for inspection
b64 = base64.b64encode(png.getvalue()).decode()

js = f"""// ===== Taiao - generated rune-icon sheet (auto-generated) =====
// Built by tools/build_rune_icons.py from the AI-generated 8x4 rune sheet.
// 32 cells in rune LADDER order (content.js RUNE_NAMES), 64px cells, sheet
// key "ru". Loaded after data.js/content.js so these SPR entries override
// the legacy hue-shifted i_rune* icons.
"use strict";
const RUNE_ICON_SHEET = "data:image/png;base64,{b64}";
(function() {{
  if (typeof ASSET_DATA !== "undefined") ASSET_DATA.ru = RUNE_ICON_SHEET;
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ru")) SHEET_KEYS.push("ru");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE.ru = {CELL};
  if (typeof SPR === "undefined") return;
  for (let i = 0; i < 32; i++) {{
    const rect = {{ sx: (i % 8) * {CELL}, sy: Math.floor(i / 8) * {CELL}, sw: {CELL}, sh: {CELL} }};
    SPR["i_rune" + i] = ["ru", 0, 0, rect];
    if (i === 0) SPR.i_rune_air = ["ru", 0, 0, rect];   // Air rune's legacy icon key
    if (i === 4) SPR.i_rune_fire = ["ru", 0, 0, rect];  // Fire rune's legacy icon key
  }}
}})();
"""
with open(os.path.join(ROOT, "js", "sprites", "rune-icons-data.js"), "w") as f:
    f.write(js)
print(f"sheet {out.size}, data file written ({len(b64)//1024}KB base64)")
