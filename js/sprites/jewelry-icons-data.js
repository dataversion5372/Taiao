// ===== Isle of Emberfall — tiered jewelry inventory icons (auto-generated) =====
// The 16 jewelry metals (js/skills/geartiers.js) had no reference sheet (no
// jewelry.png was ever supplied) and were using an arbitrary insertion-order
// hue-rotate placeholder — e.g. an Iron necklace could come out blue and a
// Gold one green, unrelated to the metal's real colour. Replaced with real
// per-metal art: the base game's generic "i_ring" (sheet x, 16px) and
// "i_amulet" (sheet t, 16px) shapes, recoloured per metal using each metal's
// TRUE average colour (same source data as bar-icons-data.js's ingots and
// alloy-icons-data.js's blends — a bar's jewelry colour matches its own bar
// icon), same hue-lock + sat/val-scale recipe throughout this project,
// upscaled 16->64 with nearest-neighbour (no resampling blur). Ring and
// bracelet share the ring-shape tile per metal (bracelet has never had its
// own shape in this game — metalcraft.js's gold_bracelet/beaded_bracelet
// already reuse i_ring too); necklace uses the amulet-shape tile. Packed
// into an 8x4, 64px-tile sheet, key "jw".
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("jw")) SHEET_KEYS.push("jw");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["jw"] = 64;
  ASSET_DATA["jw"] = "assets/sheets/7835172694e1ac13.webp";
  var S = {"ring_bar_1": {"sx": 0, "sy": 0, "sw": 64, "sh": 64}, "ring_bar_5": {"sx": 64, "sy": 0, "sw": 64, "sh": 64}, "ring_gold_bar": {"sx": 128, "sy": 0, "sw": 64, "sh": 64}, "ring_bar_9": {"sx": 192, "sy": 0, "sw": 64, "sh": 64}, "ring_bar_27": {"sx": 256, "sy": 0, "sw": 64, "sh": 64}, "ring_bar_28": {"sx": 320, "sy": 0, "sw": 64, "sh": 64}, "ring_bar_29": {"sx": 384, "sy": 0, "sw": 64, "sh": 64}, "ring_bar_31": {"sx": 448, "sy": 0, "sw": 64, "sh": 64}, "ring_brass_bar": {"sx": 0, "sy": 64, "sw": 64, "sh": 64}, "ring_pewter_bar": {"sx": 64, "sy": 64, "sw": 64, "sh": 64}, "ring_sterling_silver_bar": {"sx": 128, "sy": 64, "sw": 64, "sh": 64}, "ring_rose_gold_bar": {"sx": 192, "sy": 64, "sw": 64, "sh": 64}, "ring_giltsilver_bar": {"sx": 256, "sy": 64, "sw": 64, "sh": 64}, "ring_white_gold_bar": {"sx": 320, "sy": 64, "sw": 64, "sh": 64}, "ring_skysteel_bar": {"sx": 384, "sy": 64, "sw": 64, "sh": 64}, "ring_chronesteel_bar": {"sx": 448, "sy": 64, "sw": 64, "sh": 64}, "amulet_bar_1": {"sx": 0, "sy": 128, "sw": 64, "sh": 64}, "amulet_bar_5": {"sx": 64, "sy": 128, "sw": 64, "sh": 64}, "amulet_gold_bar": {"sx": 128, "sy": 128, "sw": 64, "sh": 64}, "amulet_bar_9": {"sx": 192, "sy": 128, "sw": 64, "sh": 64}, "amulet_bar_27": {"sx": 256, "sy": 128, "sw": 64, "sh": 64}, "amulet_bar_28": {"sx": 320, "sy": 128, "sw": 64, "sh": 64}, "amulet_bar_29": {"sx": 384, "sy": 128, "sw": 64, "sh": 64}, "amulet_bar_31": {"sx": 448, "sy": 128, "sw": 64, "sh": 64}, "amulet_brass_bar": {"sx": 0, "sy": 192, "sw": 64, "sh": 64}, "amulet_pewter_bar": {"sx": 64, "sy": 192, "sw": 64, "sh": 64}, "amulet_sterling_silver_bar": {"sx": 128, "sy": 192, "sw": 64, "sh": 64}, "amulet_rose_gold_bar": {"sx": 192, "sy": 192, "sw": 64, "sh": 64}, "amulet_giltsilver_bar": {"sx": 256, "sy": 192, "sw": 64, "sh": 64}, "amulet_white_gold_bar": {"sx": 320, "sy": 192, "sw": 64, "sh": 64}, "amulet_skysteel_bar": {"sx": 384, "sy": 192, "sw": 64, "sh": 64}, "amulet_chronesteel_bar": {"sx": 448, "sy": 192, "sw": 64, "sh": 64}};
  var shortBar = function(barId) { return barId.replace(/^bar_/, "m").replace(/_bar$/, ""); };
  for (var key in S) {
    var e = S[key];
    var m = key.match(/^(ring|amulet)_(.+)$/);
    if (!m) continue;
    var shape = m[1], barId = m[2];
    var sb = shortBar(barId);
    var sprKey = "i_" + key + "_jw";
    SPR[sprKey] = ["jw", 0, 0, {sx:e.sx, sy:e.sy, sw:e.sw, sh:e.sh}];
    if (typeof ITEMS === "undefined") continue;
    if (shape === "ring") {
      if (ITEMS["ring_" + sb]) ITEMS["ring_" + sb].icon = sprKey;
      if (ITEMS["bracelet_" + sb]) ITEMS["bracelet_" + sb].icon = sprKey;
      // anklets are the same band shape — they had no real art and were
      // showing arbitrary hue-rotated i_ring placeholders; give them the
      // per-metal ring-shape tile too.
      if (ITEMS["anklet_" + sb]) ITEMS["anklet_" + sb].icon = sprKey;
    } else if (ITEMS["necklace_" + sb]) {
      ITEMS["necklace_" + sb].icon = sprKey;
    }
  }
})();
