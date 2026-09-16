// ===== Taiao — Rubbermaking item icons =====
// Real PixelLab art for the rubber items (latex pail, cured-rubber roll, snorkel
// mouthpiece, slingshot, rubber shot, rebreather, rubber waders, rubber gloves),
// overriding the tinted placeholders set in js/skills/rubbermaking.js. Registers
// the "rb" sheet (an 8×1 64px atlas); tools/pack_sheets.py folds it into the
// shared icon-pack atlas and repoints it.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["rb"] = "assets/sheet-src/rb-rubber-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("rb")) SHEET_KEYS.push("rb");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["rb"] = 64;
  var P = { latex: 0, rubber: 64, snorkel_mouthpiece: 128, slingshot: 192,
            sling_shot: 256, rebreather: 320, rubber_boots: 384, rubber_gloves: 448 };
  for (var id in P) {
    SPR["i_" + id] = ["rb", 0, 0, { sx: P[id], sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = "i_" + id;
  }
})();
