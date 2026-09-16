// ===== Taiao - Pomiculture seed inventory-icon sheet (32 fruit seeds + alfalfa) =====
// Slices a hand-made 8x5 seed spritesheet into per-seed icons on the "fs" sheet
// and repoints each seed item's icon: cells 0-31 -> the Pomiculture crop seeds in
// FRUIT order (CROPS["farm_pomiculture_"+i].seed), cell 32 -> "alfalfa_seeds".
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("fs")) SHEET_KEYS.push("fs");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["fs"] = 64;
  ASSET_DATA["fs"] = "assets/sheet-src/fs-seed-icons.webp";
  if (typeof SPR === "undefined") return;
  const repoint = (i, id) => {
    const col = i % 8, row = (i / 8) | 0;
    SPR["i_seed" + i] = ["fs", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && id && ITEMS[id]) ITEMS[id].icon = "i_seed" + i;
  };
  if (typeof CROPS !== "undefined")
    for (let i = 0; i < 32; i++) { const c = CROPS["farm_pomiculture_" + i]; repoint(i, c && c.seed); }
  repoint(32, "alfalfa_seeds");
})();
