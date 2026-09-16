// ===== Taiao — shrimp inventory icons (raw + cooked) =====
// Shrimp (the level-1 shore catch, added in content.js addShrimp) used to point
// at the old monster sheet "m", which was REMOVED in the NZ-fish icon rework —
// so its icons rendered blank. This restores proper art: one 128x64 sheet "sk",
// raw shrimp at cell 0, cooked shrimp at cell 1. Loads after content.js so the
// shrimp ITEMS exist; overrides the dead SPR entries.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["sk"] = "assets/sheet-src/sk-shrimp-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("sk")) SHEET_KEYS.push("sk");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["sk"] = 64;
  if (typeof SPR === "undefined") return;
  SPR.i_rawshrimp = ["sk", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
  SPR.i_ckdshrimp = ["sk", 1, 0, { sx: 64, sy: 0, sw: 64, sh: 64 }];
  if (typeof ITEMS !== "undefined") {
    if (ITEMS.raw_shrimp) ITEMS.raw_shrimp.icon = "i_rawshrimp";
    if (ITEMS.shrimp) ITEMS.shrimp.icon = "i_ckdshrimp";
  }
})();
