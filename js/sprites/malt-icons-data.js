// ===== Isle of Emberfall — Malting per-grain malt inventory icons =====
// The 32 malts (js/skills/fillout.js -> ids malt_0 .. malt_31, "Wheat malt" ..
// "Celestial quinoa malt"), one kilned malt per Cerealiculture grain, used
// hue-tinted i_wheat placeholders. This 8x4 64px sheet ("ml") gives each its own
// art: a heap of roasted kernels, roast deepening with tier, the fantastical
// grains glowing. Cell index i (row-major) = GRAINS[i]'s malt, matching
// GRAIN_NAMES order (Wheat=0 .. Celestial quinoa=31). Loads after fillout.js so
// the malt ITEMS exist; the repoint overrides the placeholder tints.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["ml"] = "assets/sheets/532b8aedb192fe9b.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ml")) SHEET_KEYS.push("ml");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["ml"] = 64;
  if (typeof SPR === "undefined") return;
  for (var i = 0; i < 32; i++) {
    var id = "malt_" + i, spr = "i_maltico_" + i;
    var col = i % 8, row = (i / 8) | 0;
    SPR[spr] = ["ml", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = spr;
  }
})();
