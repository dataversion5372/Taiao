// ===== Isle of Emberfall — per-metal Pauldron inventory icons =====
// Smithing's 16 tiered pauldrons (geartiers.js -> ids pauldrons_<metal>) all
// shared a hue-tinted i_shield sprite. This 8x2 64px sheet ("pd") gives each its
// own art — a matched pair of shoulder guards — to pair with the chest/legs
// armour. Cell index i (row-major) follows the ARMOUR_BARS roster order; item id
// is "pauldrons_" + that metal shortBar. Loads after geartiers.js / the gear
// icon drop so ITEMS exist and this repoint wins.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["pd"] = "assets/sheets/adc6f9abad8c32bc.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("pd")) SHEET_KEYS.push("pd");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["pd"] = 64;
  var COLS = ['bronze', 'm3', 'm4', 'm6', 'm11', 'm12', 'm13', 'm20', 'm22', 'm25', 'm26', 'm30', 'voidforged', 'twilight', 'nickel_silver', 'cupronickel'];  // ARMOUR_BARS roster order (metal shortBar)
  if (typeof SPR === "undefined") return;
  for (var i = 0; i < COLS.length; i++) {
    var id = "pauldrons_" + COLS[i], spr = "i_pauldronico_" + i;
    var col = i % 8, row = (i / 8) | 0;
    SPR[spr] = ["pd", 0, 0, { sx: col * 64, sy: row * 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = spr;
  }
})();
