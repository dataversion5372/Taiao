// ===== Isle of Emberfall - Gem-mining rough-gem inventory-icon sheet (32 gems) =====
// Slices a hand-made 8x4 gem spritesheet into per-gem icons on the "gm" sheet and
// repoints every tiered rough gem's icon (index i -> cell i, matching GEM_NAMES order
// in js/skills/mining-split.js, which mints ITEMS["gem_"+i] and points gemvein_i at
// it). Loads after mining-split.js so the gem items already exist.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("gm")) SHEET_KEYS.push("gm");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["gm"] = 64;
  ASSET_DATA["gm"] = "assets/sheets/b6755e74d3ff4d36.webp";
  for (let i = 0; i < 32; i++) {
    const col = i % 8, row = (i / 8) | 0;
    SPR["i_gemtier" + i] = ["gm", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["gem_" + i]) ITEMS["gem_" + i].icon = "i_gemtier" + i;
  }
})();
