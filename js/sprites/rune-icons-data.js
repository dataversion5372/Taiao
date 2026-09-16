// ===== Taiao - generated rune-icon sheet (auto-generated) =====
// Built by tools/build_rune_icons.py from the AI-generated 8x4 rune sheet.
// 32 cells in rune LADDER order (content.js RUNE_NAMES), 64px cells, sheet
// key "ru". Loaded after data.js/content.js so these SPR entries override
// the legacy hue-shifted i_rune* icons.
"use strict";
const RUNE_ICON_SHEET = "assets/sheet-src/ru-rune-icons.webp";
(function() {
  if (typeof ASSET_DATA !== "undefined") ASSET_DATA.ru = RUNE_ICON_SHEET;
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ru")) SHEET_KEYS.push("ru");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE.ru = 64;
  if (typeof SPR === "undefined") return;
  for (let i = 0; i < 32; i++) {
    const rect = { sx: (i % 8) * 64, sy: Math.floor(i / 8) * 64, sw: 64, sh: 64 };
    SPR["i_rune" + i] = ["ru", 0, 0, rect];
    if (i === 0) SPR.i_rune_air = ["ru", 0, 0, rect];   // Air rune's legacy icon key
    if (i === 4) SPR.i_rune_fire = ["ru", 0, 0, rect];  // Fire rune's legacy icon key
  }
})();
