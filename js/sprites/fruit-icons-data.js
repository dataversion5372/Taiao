// ===== Taiao - Pomiculture fruit inventory-icon sheet (32 fruits) =====
// Slices a hand-made 8x4 fruit spritesheet into per-fruit icons on the "fi" sheet
// and repoints every Pomiculture crop's harvest item icon (index i -> cell i,
// matching the FRUIT order in js/skills/agriculture.js). The fruit-tree canopy
// overlay in render3d.js reads ITEMS[crop.item].icon, so it picks these up too.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("fi")) SHEET_KEYS.push("fi");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["fi"] = 64;
  ASSET_DATA["fi"] = "assets/sheet-src/fi-fruit-icons.webp";
  if (typeof SPR === "undefined" || typeof CROPS === "undefined") return;
  for (let i = 0; i < 32; i++) {
    const col = i % 8, row = (i / 8) | 0;
    SPR["i_fruit" + i] = ["fi", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    const crop = CROPS["farm_pomiculture_" + i];
    if (crop && typeof ITEMS !== "undefined" && ITEMS[crop.item]) ITEMS[crop.item].icon = "i_fruit" + i;
  }
})();
