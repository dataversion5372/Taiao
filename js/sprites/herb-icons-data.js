// ===== Taiao — Herbiculture harvested-herb inventory icons =====
// The 32 herbs (content.js HERB_NAMES/HERBS -> ids herb, herb_1 .. herb_31) —
// the harvested products Herbiculture grows and Potionmaking brews — all shared
// hue-tinted recolours of one base i_herb sprite, so they were indistinguishable.
// This 8x4 64px sheet ("hb") gives each its own art. Cell index i (row-major)
// maps to HERBS[i]: cell 0 -> "herb", cell i>0 -> "herb_"+i, matching the exact
// HERB_NAMES order (Sageleaf .. Worldroot). Loads after content.js so ITEMS
// exist; the repoint overrides the i_herb<i> fallbacks.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["hb"] = "assets/sheet-src/hb-herb-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("hb")) SHEET_KEYS.push("hb");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["hb"] = 64;
  if (typeof SPR === "undefined") return;
  for (var i = 0; i < 32; i++) {
    var id = i === 0 ? "herb" : "herb_" + i;
    var spr = "i_herbico_" + i;
    var col = i % 8, row = (i / 8) | 0;
    SPR[spr] = ["hb", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = spr;
  }
})();
