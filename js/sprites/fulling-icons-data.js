// ===== Taiao — Fulling per-cloth "fulled cloth" inventory icons =====
// The 32 fulled cloths (js/skills/textiles.js -> ids fulled_0 .. fulled_31,
// "Fulled cotton cloth" .. "Fulled worldweave"), one finished bolt per woven
// cloth, used hue-tinted i_cloth placeholders. This 8x4 64px sheet ("fu") gives
// each its own art: a folded bolt of that fabric, plainer -> opulent/magical by
// tier. Cell index i (row-major) = TEXTILE_NAMES[i]'s fulled cloth, matching
// TEXTILE_NAMES order (Cotton cloth=0 .. Worldweave=31). Loads after textiles.js
// so the fulled ITEMS exist; the repoint overrides the placeholder tints.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["fu"] = "assets/sheet-src/fu-fulling-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("fu")) SHEET_KEYS.push("fu");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["fu"] = 64;
  if (typeof SPR === "undefined") return;
  for (var i = 0; i < 32; i++) {
    var id = "fulled_" + i, spr = "i_fulledico_" + i;
    var col = i % 8, row = (i / 8) | 0;
    SPR[spr] = ["fu", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = spr;
  }
})();
