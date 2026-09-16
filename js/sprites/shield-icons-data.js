// ===== Taiao — per-metal SHIELD inventory icons =====
// 11 shield kinds (heater/kite/round/buckler/tower + aspis/scutum/targe/
// chimalli/dhal/pavise) x 16 armour metals = 176 icons. geartiers.js forges
// <kind>_<metal> equip:"shield" items (fallback icon i_shield); this 16x11
// 64px sheet ("sh") gives each its own art and repoints ITEMS[id].icon.
// Loads after geartiers.js so ITEMS exist. Columns follow ARMOUR_BARS order
// (the roster the sheets were authored in); rows are the 11 kinds top-to-bottom.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["sh"] = "assets/sheets/sh-shield-icons.303a55f7.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("sh")) SHEET_KEYS.push("sh");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["sh"] = 64;
  var COLS = ['bronze', 'm3', 'm4', 'm6', 'm11', 'm12', 'm13', 'm20', 'm22', 'm25', 'm26', 'm30', 'voidforged', 'twilight', 'nickel_silver', 'cupronickel'];   // sheet column order = ARMOUR_BARS roster (metal shortBar)
  var ROWS = ['heater', 'kite', 'round', 'buckler', 'tower', 'aspis', 'scutum', 'targe', 'chimalli', 'dhal', 'pavise'];   // sheet row order = shield kinds, top to bottom
  if (typeof SPR === "undefined") return;
  for (var r = 0; r < ROWS.length; r++) {
    for (var c = 0; c < COLS.length; c++) {
      var id = ROWS[r] + "_" + COLS[c];
      var spr = "i_" + id;
      SPR[spr] = ["sh", 0, 0, { sx: c * 64, sy: r * 64, sw: 64, sh: 64 }];
      if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = spr;
    }
  }
})();
