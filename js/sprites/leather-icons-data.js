// ===== Taiao - Tanning leather inventory-icon sheet (32 leathers) =====
// Slices a hand-made 8x4 leather spritesheet into per-leather icons on the "lt" sheet and
// repoints every tanning leather's icon (index i -> cell i, matching HIDE_NAMES / tanning
// order in js/content.js; i===4 is the bare id "leather", the rest are "leather_"+i).
// Unifies the old ga_leather_* (0-23) and i_lth* (24-31) placeholders onto one sheet.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("lt")) SHEET_KEYS.push("lt");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["lt"] = 64;
  ASSET_DATA["lt"] = "assets/sheet-src/lt-leather-icons.webp";
  if (typeof SPR === "undefined") return;
  for (let i = 0; i < 32; i++) {
    const col = i % 8, row = (i / 8) | 0;
    SPR["i_leatherp" + i] = ["lt", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    const id = i === 4 ? "leather" : "leather_" + i;
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = "i_leatherp" + i;
  }
})();
