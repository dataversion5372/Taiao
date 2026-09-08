#!/usr/bin/env python3
"""Slice the 2026-09 stations.png (6x4 grid, prompt order) into single-view
world objects: each station gets assets/objects_source/station_<key>/base/
rotations/<dir>.png with the SAME image for all 8 directions (symmetric
objects need no rotation set), plus an objects.json entry. Then run
tools/build_object_sheet.py to repack objects-data.js.

Run: python3 tools/build_station_objects.py "<art folder>"
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(sys.argv[1], "stations.png")
DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]
KEYS = ["sawmill", "cooperage", "malthouse", "fulling_mill", "masons_yard", "assay_furnace",
        "drawbench", "leather_bench", "cobblers_bench", "saddlers_bench", "toolsmith",
        "locksmith_bench", "paper_mill", "bindery", "soap_works", "seasoning_yard",
        "charcoal_clamp", "lime_kiln", "ropewalk", "shipyard", "barn", "creamery",
        "tailors_bench", "altar_rune"]

im = Image.open(SRC).convert("RGBA")
W, H = im.size
a = np.asarray(im)
mapping = json.loads(open(os.path.join(ROOT, "assets", "objects.json")).read())
for i, key in enumerate(KEYS):
    c, r = i % 6, i // 6
    x0, x1 = round(c * W / 6), round((c + 1) * W / 6)
    y0, y1 = round(r * H / 4), round((r + 1) * H / 4)
    cell = a[y0:y1, x0:x1]
    fg = cell[:, :, 3] > 40
    lab, n = ndimage.label(fg)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        fg = np.isin(lab, list(np.where(sizes >= 80)[0] + 1))
    ys, xs = np.where(fg)
    crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    crop[:, :, 3] = np.where(fg[ys.min():ys.max() + 1, xs.min():xs.max() + 1], crop[:, :, 3], 0)
    folder = os.path.join(ROOT, "assets", "objects_source", "station_" + key, "base", "rotations")
    os.makedirs(folder, exist_ok=True)
    img = Image.fromarray(crop)
    for d in DIRS:
        img.save(os.path.join(folder, d + ".png"))
    mapping["station_" + key] = key
with open(os.path.join(ROOT, "assets", "objects.json"), "w") as f:
    json.dump(mapping, f, indent=0, sort_keys=True)
print(f"wrote {len(KEYS)} station objects + objects.json entries")
