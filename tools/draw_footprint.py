#!/usr/bin/env python3
"""Append the moa-footprint tile to the "wt" world-tiles sheet (column 5).

The footprint is the chunks.js easter-egg trail's flat decor (render3d
FLAT_DECOR draws it as a ground quad). It's drawn procedurally: a top-down
three-toed impression — three long splayed toes ahead of a broad pad —
composed on a 16x16 pixel grid and scaled x4 nearest-neighbour so it sits in
the same chunky pixel language as the painted tiles. Semi-transparent earth
tones read as pressed turf on any grass ground colour.

Idempotent: always rebuilds column 5 from scratch; columns 0-4 are copied
from the sheet as-is (re-running never stacks prints). Run from repo root:

    python3 tools/draw_footprint.py
"""
from PIL import Image, ImageDraw

SHEET = "assets/sheet-src/wt-world-tiles.webp"
COL, TILE = 5, 64

src = Image.open(SHEET).convert("RGBA")
w = max(src.width, (COL + 1) * TILE)
out = Image.new("RGBA", (w, TILE), (0, 0, 0, 0))
out.paste(src.crop((0, 0, min(src.width, COL * TILE), TILE)), (0, 0))

# --- draw at 16x16, upscale x4 ---
g = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
d = ImageDraw.Draw(g)

DARK = (44, 34, 22, 175)     # deep pressed earth
MID = (58, 46, 30, 140)      # impression body
EDGE = (74, 62, 40, 90)      # bruised-turf rim

def blob(px, alpha_ring=True):
    """A toe/pad from a pixel list: dark core, mid ring drawn first."""
    for (x, y) in px:
        g.putpixel((x, y), DARK)

# broad heel pad (bottom-centre), slightly irregular
pad = [(7, 11), (8, 11), (6, 12), (7, 12), (8, 12), (9, 12), (7, 13), (8, 13)]
# centre toe: longest, straight up
toe_c = [(7, 3), (8, 3), (7, 4), (8, 4), (7, 5), (8, 5), (7, 6), (8, 6), (7, 7), (8, 7), (7, 8), (8, 8)]
# left toe: splayed
toe_l = [(3, 5), (4, 5), (4, 6), (5, 6), (5, 7), (5, 8), (6, 8), (6, 9)]
# right toe: splayed
toe_r = [(11, 5), (12, 5), (11, 6), (10, 6), (10, 7), (10, 8), (9, 8), (9, 9)]
# claw tips (single dark pixels past each toe)
claws = [(7, 2), (2, 4), (13, 4)]

core = pad + toe_c + toe_l + toe_r
# mid ring: every empty neighbour of a core pixel
ring = set()
for (x, y) in core:
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            p = (x + dx, y + dy)
            if 0 <= p[0] < 16 and 0 <= p[1] < 16 and p not in core:
                ring.add(p)
# outer edge: neighbours of the ring
edge = set()
for (x, y) in ring:
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            p = (x + dx, y + dy)
            if 0 <= p[0] < 16 and 0 <= p[1] < 16 and p not in core and p not in ring:
                edge.add(p)

for p in edge:
    g.putpixel(p, EDGE)
for p in ring:
    g.putpixel(p, MID)
for p in core:
    g.putpixel(p, DARK)
for p in claws:
    g.putpixel(p, (38, 30, 20, 190))

big = g.resize((TILE, TILE), Image.NEAREST)
out.paste(big, (COL * TILE, 0))
out.save(SHEET, lossless=True)
print(f"wrote {SHEET} {out.size} (footprint at column {COL})")
