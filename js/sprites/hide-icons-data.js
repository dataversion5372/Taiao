// ===== Isle of Emberfall - Animal hide/pelt inventory-icon sheet (32 hides) =====
// Slices a hand-made 8x4 hide spritesheet into per-hide icons on the "hi" sheet and
// repoints every hide item's icon (index i -> cell i, matching HIDE_NAMES order in
// js/content.js; i===4 is the bare id "hide", the rest are "hide_"+i). Replaces the
// tinted i_hide placeholders. Dropped-on-ground hides read the same icon so they
// upgrade too.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("hi")) SHEET_KEYS.push("hi");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["hi"] = 64;
  ASSET_DATA["hi"] = "assets/sheets/2cca3643805a471a.webp";
  for (let i = 0; i < 32; i++) {
    const col = i % 8, row = (i / 8) | 0;
    SPR["i_hidep" + i] = ["hi", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    const id = i === 4 ? "hide" : "hide_" + i;
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = "i_hidep" + i;
  }
})();
