#!/usr/bin/env python3
"""Crop AI-generated spritesheets into individual item icons and pack them into
one sheet embedded in js/sprites/item-icons-data.js (registered as sprite sheet
"gi"; each item's ITEMS[id].icon is repointed to it).

Inputs:
  - a directory of 39 ChatGPT spritesheets (default ~/Downloads/images), one per
    trade, matching docs/sprite-generation-prompts.txt
  - placeholders.json: dump of window.PLACEHOLDER_SPRITES ({id,name,note}) — the
    ordered items each sheet should contain. Generate by loading the skill
    modules and JSON.stringify(PLACEHOLDER_SPRITES) (see git history / scratchpad).

Sheets are identified by index (files sorted by name) via INDEX_MAP below. Icons
are segmented per-row/col (whichever separates cleaner); FORCE lists sheets that
need a fixed uniform grid. Run: python3 tools/build_item_icons.py [imagesdir] [placeholders.json]
"""
import base64, json, math, os, sys, glob
sys.path.insert(0, os.path.dirname(__file__))
from _icon_segment import grid_cells, _uniform, fg_mask
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMGDIR = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/images")
PH = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "tools", "placeholders.json")
CELL = 64

# image index (files sorted by name) -> sheet key  (see docs/sprite-generation-prompts.txt)
INDEX_MAP = ["veg_crop","seeds_cerealiculture","seeds_pomiculture","seeds_olericulture",
 "seeds_herbiculture","seeds_fibriculture","fibre_crop","cheese","baking","brewing","cooperage",
 "fruit_crop","spun","dye","fulled","garment","footwear","tack","leather","sailmaking","rope",
 "carpentry","tool","lockwork","wire","smithed","assay","jewellery","pottery","glassware","masonry",
 "quarried","candle","soap","book","paper","vessel","intermediate","raw"]
FORCE = {"seeds_pomiculture":(8,4),"footwear":(8,4),"sailmaking":(8,4),"tool":(8,4),
         "wire":(8,4),"book":(8,4),"vessel":(8,4),"cooperage":(8,4)}

def classify(p):
    nid, note = p["id"], (p.get("note") or "")
    n = note.split("—")[0].split(" - ")[0].strip().lower()
    if nid.startswith("seed_"):
        import re; m = re.match(r"seed_([a-z]+)_", nid)
        return "seeds_" + (m.group(1) if m else "cerealiculture")
    t = {"footwear":"footwear","tack":"tack","lockwork":"lockwork","book":"book","garment":"garment",
     "candle":"candle","sailmaking good":"sailmaking","leather good":"leather","soap":"soap","cheese":"cheese",
     "jewellery":"jewellery","baking good":"baking","vessel":"vessel","carpentry good":"carpentry",
     "pottery ware":"pottery","brewing good":"brewing","smithed good":"smithed","masonry good":"masonry",
     "glassware":"glassware","quarried stone":"quarried","ropemaking good":"rope","tool":"tool",
     "fibre crop":"fibre_crop","veg crop":"veg_crop","fruit crop":"fruit_crop","fulled cloth":"fulled","tool handle":"tool"}
    if n in t: return t[n]
    if n.startswith("cooperage"): return "cooperage"
    if n.startswith("wire"): return "wire"
    if n.startswith("dye") or n.startswith("dyed"): return "dye"
    if n in ("spun yarn/thread","spun wool","raw wool","waxed thread"): return "spun"
    if n in ("fine metal","cut gem"): return "assay"
    if n in ("paper stock","ink","parchment","vellum","papyrus","glue","sealing wax","quill","quill pen"): return "paper"
    if n in ("reused tinted sprite of an existing item","trade good"): return "intermediate"
    return "raw"

def fit_square(im, box, S=CELL):
    crop = im.crop(box); a = np.array(crop); ys, xs = np.where(a[:, :, 3] > 20)
    if len(xs) == 0: return None
    crop = crop.crop((xs.min(), ys.min(), xs.max()+1, ys.max()+1))
    w, h = crop.size; s = min((S-4)/w, (S-4)/h)
    crop = crop.resize((max(1, round(w*s)), max(1, round(h*s))), Image.LANCZOS)
    cell = Image.new("RGBA", (S, S), (0,0,0,0)); cell.alpha_composite(crop, ((S-crop.width)//2, (S-crop.height)//2))
    return cell

def main():
    ph = json.load(open(PH))
    sheet_items = {}
    for p in ph: sheet_items.setdefault(classify(p), []).append(p)
    files = sorted(glob.glob(os.path.join(IMGDIR, "*.png")))
    assert len(files) == len(INDEX_MAP), f"expected {len(INDEX_MAP)} images, found {len(files)}"
    mapping = {}
    for idx, key in enumerate(INDEX_MAP):
        im = Image.open(files[idx]).convert("RGBA")
        cells = _uniform(fg_mask(im), *FORCE[key]) if key in FORCE else grid_cells(im)[0]
        for i, it in enumerate(sheet_items.get(key, [])):
            box = cells[i] if i < len(cells) else None
            if box is None: continue
            c = fit_square(im, box)
            if c: mapping[it["id"]] = c
    ids = [it["id"] for k in INDEX_MAP for it in sheet_items.get(k, []) if it["id"] in mapping]
    COLS = 32; rows = math.ceil(len(ids)/COLS)
    master = Image.new("RGBA", (COLS*CELL, rows*CELL), (0,0,0,0)); man = {}
    for n, i in enumerate(ids):
        c, r = n % COLS, n // COLS
        master.alpha_composite(mapping[i], (c*CELL, r*CELL)); man[i] = [c*CELL, r*CELL, CELL, CELL]
    master.save(os.path.join(ROOT, "assets", "item_icons.png"))
    b64 = base64.b64encode(open(os.path.join(ROOT, "assets", "item_icons.png"), "rb").read()).decode()
    js = ('// ===== Taiao - generated item-icon sheet (auto-generated) =====\n'
          '"use strict";\n'
          f'const ITEM_ICON_SHEET = "data:image/png;base64,{b64}";\n'
          f'const ITEM_ICON_MAP = {json.dumps(man, separators=(",",":"))};\n'
          '(function(){\n'
          '  if (typeof ASSET_DATA !== "undefined") ASSET_DATA.gi = ITEM_ICON_SHEET;\n'
          '  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("gi")) SHEET_KEYS.push("gi");\n'
          '  if (typeof SHEET_TILE !== "undefined") SHEET_TILE.gi = 64;\n'
          '  if (typeof SPR === "undefined") return;\n'
          '  for (const id in ITEM_ICON_MAP){ const r=ITEM_ICON_MAP[id];\n'
          '    SPR["ic_"+id]=["gi",0,0,{sx:r[0],sy:r[1],sw:r[2],sh:r[3]}];\n'
          '    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon="ic_"+id; }\n'
          '})();\n')
    open(os.path.join(ROOT, "js", "sprites", "item-icons-data.js"), "w").write(js)
    print(f"packed {len(ids)} icons -> js/sprites/item-icons-data.js ({master.size[0]}x{master.size[1]})")

if __name__ == "__main__":
    main()
