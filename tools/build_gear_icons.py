#!/usr/bin/env python3
"""Pack the 2026-09 AI art drop (tiered gear, jewelry, bars, ammo, consumable
ladders) into one 64px-cell sheet embedded in js/sprites/gear-icons-data.js
(sheet key "ga", same self-registering pattern as "gi"/"ru").

Every packed cell gets a fresh SPR key ga_<itemId> and the item's .icon is
repointed at load — no shared-key hazards. Cell -> item mapping happens AT
RUNTIME by rank (wieldReq/wearReq/toolPower/value sort), so the script never
hardcodes the metal->bar tables.

Run: python3 tools/build_gear_icons.py "<art folder>"
"""
import base64, io, json, os, sys, unicodedata
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
CELL = 64

def find(name):
    want = unicodedata.normalize("NFC", name)
    for f in os.listdir(SRC):
        if unicodedata.normalize("NFC", f) == want:
            return os.path.join(SRC, f)
    raise SystemExit("missing sheet: " + name)

def strip_lines(a):
    """Zero the alpha of near-white grid/separator lines (rows/cols that are
    mostly bright pixels spanning the sheet — tools.png's block dividers)."""
    rgb = a[:, :, :3].astype(int)
    bright = (rgb.min(axis=2) > 215) & (a[:, :, 3] > 40)
    for axis in (0, 1):
        frac = bright.mean(axis=1 - axis)
        for i in np.where(frac > 0.5)[0]:
            if axis == 0:
                a[i, bright[i], 3] = 0
            else:
                a[bright[:, i], i, 3] = 0
    return a

def cells_of(path, cols, rows, inset=0, row_cols=None, force_bg=False, lines=False):
    """Uniform grid slice -> list of RGBA cell arrays (row-major).
    row_cols overrides the column count per row (arrows_magic's 7-wide row).
    force_bg always runs border-flood background removal; lines strips
    near-white separator lines first."""
    im = Image.open(path).convert("RGBA")
    W, H = im.size
    a = np.asarray(im).copy()
    if lines:
        a = strip_lines(a)
    opaque = force_bg or (a[:, :, 3] > 40).mean() > 0.95  # no real alpha: needs bg removal
    out = []
    for r in range(rows):
        rc = row_cols[r] if row_cols else cols
        for c in range(rc):
            x0, x1 = round(c * W / rc) + inset, round((c + 1) * W / rc) - inset
            y0, y1 = round(r * H / rows) + inset, round((r + 1) * H / rows) - inset
            cell = a[y0:y1, x0:x1].copy()
            if opaque:
                rgb = cell[:, :, :3].astype(int)
                border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
                bg = np.median(border, axis=0)
                bglike = np.abs(rgb - bg).sum(axis=2) < 70
                lab, n = ndimage.label(bglike)
                edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
                outside = np.isin(lab, list(edge)) if edge else np.zeros(bglike.shape, bool)
                cell[:, :, 3] = np.where(outside, 0, 255)
            out.append(cell)
    return out

def iconify(cell):
    """bbox-crop by alpha, square-pad, downscale into a 64px tile."""
    fg = cell[:, :, 3] > 40
    lab, n = ndimage.label(fg)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        fg = np.isin(lab, list(np.where(sizes >= 40)[0] + 1))
    if fg.sum() < 40:
        return None
    ys, xs = np.where(fg)
    crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    crop[:, :, 3] = np.where(fg[ys.min():ys.max() + 1, xs.min():xs.max() + 1], crop[:, :, 3], 0)
    h, w = crop.shape[:2]
    s = max(h, w)
    sq = np.zeros((s, s, 4), np.uint8)
    sq[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = crop
    return Image.fromarray(sq).resize((CELL - 4, CELL - 4), Image.LANCZOS)

# ---------------------------------------------------------------- manifest
def ids32(zero, pat, skip=None, count=32):
    out = []
    for i in range(count):
        if skip is not None and i == skip[0]:
            out.append(skip[1])
        elif i == 0:
            out.append(zero)
        else:
            out.append(pat.format(i))
    return out

GROUPS = []  # (mode, payload, [cells])
def kind(fname, k, sort, cols=4, rows=4, filt=None, inset=0, force_bg=False):
    GROUPS.append(({"mode": "kind", "kind": k, "sort": sort, "filt": filt or "equip"},
                   cells_of(find(fname), cols, rows, inset, force_bg=force_bg)))
def ids(fname, idlist, cols, rows, row_cols=None, inset=0):
    GROUPS.append(({"mode": "ids", "ids": idlist},
                   cells_of(find(fname), cols, rows, inset, row_cols)))

for f, k in [("dagger.png", "dagger"), ("shortsword.png", "shortsword"), ("spear.png", "spear"),
             ("mace.png", "mace"), ("longsword.png", "longsword"), ("greatsword.png", "greatsword"),
             ("battleaxe.png", "battleaxe"), ("warhammer.png", "warhammer"), ("halberd.png", "halberd"),
             ("Dao.png", "dao"), ("Katana.png", "katana"), ("Khopesh.png", "khopesh"),
             ("Kilij.png", "kilij"), ("Kris.png", "kris"), ("Kukri.png", "kukri"),
             ("Shamshir.png", "shamshir"), ("Tantō.png", "tanto"), ("Wakizashi.png", "wakizashi"),
             ("scimitar.png", "scimitar")]:
    kind(f, k, "wieldReq")
for f, k in [("med_helm.png", "helm"), ("chainbody.png", "chainbody"), ("pauldrons.png", "pauldrons"),
             ("platearms.png", "platearms"), ("gloves.png", "gloves")]:
    kind(f, k, "wearReq")
kind("rings.png", "ring", "value", filt="jewel")
# bracelets/anklets/necklaces: the generated sheets sit on opaque watercolor
# paper that defeats clean background removal (metallic silver and pale paper
# are the same colours). EXCLUDED until regenerated with transparent
# backgrounds — drop the new PNGs in and re-add these lines:
#   for f, k in [("bracelets.png", "bracelet"), ("anklets.png", "anklet"),
#                ("necklaces.png", "necklace")]:
#       kind(f, k, "value", filt="jewel")
# tools.png: 3x2 blocks of 4x4 (128px cells, white separator lines stripped)
tool_cells = cells_of(find("tools.png"), 12, 8, inset=4, lines=True)
TOOL_ORDER = ["pickaxe", "axe", "hammer", "hoe", "shovel", "sickle"]
for bi, tk in enumerate(TOOL_ORDER):
    bx, by = (bi % 3) * 4, (bi // 3) * 4
    block = [tool_cells[(by + r) * 12 + bx + c] for r in range(4) for c in range(4)]
    GROUPS.append(({"mode": "kind", "kind": tk, "sort": "toolPower", "filt": "tool"}, block))
GROUPS.append(({"mode": "bars"}, cells_of(find("ingots.png"), 8, 4)))
ids("alloys.png", ["bronze_bar", "brass_bar", "pewter_bar", "tool_steel_bar", "damasteel_bar",
    "dragonsteel_bar", "sterling_silver_bar", "rose_gold_bar", "white_gold_bar", "giltsilver_bar",
    "nickel_silver_bar", "cupronickel_bar", "voidforged_bar", "twilight_bar", "skysteel_bar",
    "chronesteel_bar"], 4, 4)
# arrows_magic: rows 1-2 = 16 metal arrows (kind), row 3 = 7 named weapons
am = cells_of(find("arrows_magic.png"), 8, 3, row_cols=[8, 8, 7])
GROUPS.append(({"mode": "kind", "kind": "arrow", "sort": "value", "filt": "quiver"}, am[:16]))
GROUPS.append(({"mode": "ids", "ids": ["shortbow", "longbow", "pine_bow", "wand",
                                        "pine_wand", "staff", "pine_staff"]}, am[16:]))
ids("herbs.png", ids32("herb", "herb_{}"), 8, 4)
ids("potions.png", ["potion_health"] + ["potion_{}".format(i) for i in range(1, 32)], 8, 4)
ids("fish_raw.png", ids32("raw_fish", "raw_f{}"), 8, 4)
ids("fish_cooked.png", ids32("cooked_fish", "fish_{}"), 8, 4)
ids("cloth_bolts.png", ids32("cloth", "cloth_{}"), 8, 4)
ids("foraged.png", ids32("berries", "forage_{}"), 8, 4)
ids("hides.png", ids32("hide_0", "hide_{}", skip=(4, "hide")), 8, 4)
ids("leathers.png", ids32("leather_0", "leather_{}", skip=(4, "leather"), count=24), 6, 4)

# ---------------------------------------------------------------- pack
total = sum(len(c) for _, c in GROUPS)
COLS = 64
rows_needed = (total + COLS - 1) // COLS
sheet = Image.new("RGBA", (COLS * CELL, rows_needed * CELL), (0, 0, 0, 0))
cursor = 0
manifest = []
for meta, cell_list in GROUPS:
    rects = []
    for cell in cell_list:
        ic = iconify(cell)
        sx, sy = (cursor % COLS) * CELL, (cursor // COLS) * CELL
        if ic is not None:
            sheet.paste(ic, (sx + 2, sy + 2), ic)
        rects.append([sx, sy])
        cursor += 1
    manifest.append({**meta, "rects": rects})

buf = io.BytesIO()
sheet.save(buf, "PNG", optimize=True)
sheet.save(os.path.join(ROOT, "assets", "gear-icons.png"))
b64 = base64.b64encode(buf.getvalue()).decode()
print(f"packed {total} icons -> {sheet.size}, {len(b64)//1024}KB base64")

js = """// ===== Taiao - generated gear/consumable icon sheet (auto-generated) =====
// Built by tools/build_gear_icons.py from the 2026-09 AI art drop. Sheet key
// "ga", 64px cells. Cell -> item mapping happens here at load, BY RANK
// (wieldReq/wearReq/toolPower/value sort per kind), so metal rosters never
// need hardcoding. Every mapped item gets a fresh SPR key ga_<id> and its
// ITEMS[id].icon is repointed. Loads after all skill files (index.html).
"use strict";
const GEAR_ICON_SHEET = "data:image/png;base64,%B64%";
const GEAR_ICON_GROUPS = %MANIFEST%;
(function() {
  if (typeof ASSET_DATA === "undefined" || typeof SPR === "undefined" || typeof ITEMS === "undefined") return;
  ASSET_DATA.ga = GEAR_ICON_SHEET;
  if (!SHEET_KEYS.includes("ga")) SHEET_KEYS.push("ga");
  SHEET_TILE.ga = 64;
  const put = (id, r) => {
    if (!id || !ITEMS[id]) return;
    SPR["ga_" + id] = ["ga", 0, 0, { sx: r[0], sy: r[1], sw: 64, sh: 64 }];
    ITEMS[id].icon = "ga_" + id;
  };
  for (const g of GEAR_ICON_GROUPS) {
    if (g.mode === "ids") { g.ids.forEach((id, i) => put(id, g.rects[i])); continue; }
    if (g.mode === "bars") {
      if (typeof METALS !== "undefined") METALS.forEach((m, i) => put(m.bar, g.rects[i]));
      continue;
    }
    // mode "kind": collect the kind's items, sort by rank, map cells in order
    const pre = g.kind + "_";
    const ids2 = Object.keys(ITEMS).filter(id => {
      if (!id.startsWith(pre)) return false;
      const d = ITEMS[id];
      if (g.filt === "tool") return d.tool === g.kind;
      if (g.filt === "quiver") return d.equip === "quiver" && d.arrowPower != null;
      if (g.filt === "jewel") return d.equip === g.kind || d.equip === "neck";
      return d.equip === "weapon" ? d.wieldReq != null : Array.isArray(d.equip) || d.wearReq != null;
    });
    ids2.sort((a, b) => (ITEMS[a][g.sort] || ITEMS[a].value || 0) - (ITEMS[b][g.sort] || ITEMS[b].value || 0));
    ids2.forEach((id, i) => { if (g.rects[i]) put(id, g.rects[i]); });
  }
})();
"""
js = js.replace("%B64%", b64).replace("%MANIFEST%", json.dumps(manifest, separators=(",", ":")))
with open(os.path.join(ROOT, "js", "sprites", "gear-icons-data.js"), "w") as f:
    f.write(js)
print("wrote js/sprites/gear-icons-data.js")
