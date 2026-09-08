// ===== Isle of Emberfall — tiered arrow & arrowhead inventory icons (auto-generated) =====
// Sourced from assets/assorted sprites/arrows.png (16 weapons/tools-roster
// metals x 2 items: Arrow, Arrowhead), a native transparent RGBA PNG (no
// flood-fill needed, unlike the earlier black-background reference sheets).
// Per-cell split of the touching arrow+arrowhead pair used scipy connected-
// component labelling (a fixed pixel split cuts through overlapping
// bounding boxes in some cells; components don't actually touch) rather
// than a column-gap scan. Column 2 in the source sheet is labelled "Steel"
// but sits at the position (and has the blue colour) of "Cobalt" in the
// weapons/tools roster — the generator mislabelled it; mapped by POSITION
// (matching the prompt's exact ordered list), not by its printed text.
// Two sheets: arrows key "aw" (176px tiles), arrowheads key "ah" (152px
// tiles), each 4x4, one tile per metal keyed by that metal's bar id. Repoints
// ITEMS["arrow_"+shortBar(bar)] and ITEMS["arrowhead_"+shortBar(bar)].icon
// (js/skills/geartiers.js creates those items).
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  if (typeof SHEET_KEYS !== "undefined") { if (!SHEET_KEYS.includes("aw")) SHEET_KEYS.push("aw"); if (!SHEET_KEYS.includes("ah")) SHEET_KEYS.push("ah"); }
  if (typeof SHEET_TILE !== "undefined") { SHEET_TILE["aw"] = 176; SHEET_TILE["ah"] = 152; }
  ASSET_DATA["aw"] = "assets/sheets/a941b5e6afcf7194.webp";
  ASSET_DATA["ah"] = "assets/sheets/dc156919c02ba23f.webp";
  var shortBar = function(barId) { return barId.replace(/^bar_/, "m").replace(/_bar$/, ""); };
  var AW = {"iron_bar": {"sx": 0, "sy": 0, "sw": 176, "sh": 176}, "bar_7": {"sx": 176, "sy": 0, "sw": 176, "sh": 176}, "tool_steel_bar": {"sx": 352, "sy": 0, "sw": 176, "sh": 176}, "bar_10": {"sx": 528, "sy": 0, "sw": 176, "sh": 176}, "ferrotitanium_bar": {"sx": 0, "sy": 176, "sw": 176, "sh": 176}, "bar_14": {"sx": 176, "sy": 176, "sw": 176, "sh": 176}, "bar_15": {"sx": 352, "sy": 176, "sw": 176, "sh": 176}, "bar_16": {"sx": 528, "sy": 176, "sw": 176, "sh": 176}, "damasteel_bar": {"sx": 0, "sy": 352, "sw": 176, "sh": 176}, "bar_17": {"sx": 176, "sy": 352, "sw": 176, "sh": 176}, "bar_18": {"sx": 352, "sy": 352, "sw": 176, "sh": 176}, "dragonsteel_bar": {"sx": 528, "sy": 352, "sw": 176, "sh": 176}, "bar_19": {"sx": 0, "sy": 528, "sw": 176, "sh": 176}, "bar_21": {"sx": 176, "sy": 528, "sw": 176, "sh": 176}, "bar_23": {"sx": 352, "sy": 528, "sw": 176, "sh": 176}, "bar_24": {"sx": 528, "sy": 528, "sw": 176, "sh": 176}};
  var AH = {"iron_bar": {"sx": 0, "sy": 0, "sw": 152, "sh": 152}, "bar_7": {"sx": 152, "sy": 0, "sw": 152, "sh": 152}, "tool_steel_bar": {"sx": 304, "sy": 0, "sw": 152, "sh": 152}, "bar_10": {"sx": 456, "sy": 0, "sw": 152, "sh": 152}, "ferrotitanium_bar": {"sx": 0, "sy": 152, "sw": 152, "sh": 152}, "bar_14": {"sx": 152, "sy": 152, "sw": 152, "sh": 152}, "bar_15": {"sx": 304, "sy": 152, "sw": 152, "sh": 152}, "bar_16": {"sx": 456, "sy": 152, "sw": 152, "sh": 152}, "damasteel_bar": {"sx": 0, "sy": 304, "sw": 152, "sh": 152}, "bar_17": {"sx": 152, "sy": 304, "sw": 152, "sh": 152}, "bar_18": {"sx": 304, "sy": 304, "sw": 152, "sh": 152}, "dragonsteel_bar": {"sx": 456, "sy": 304, "sw": 152, "sh": 152}, "bar_19": {"sx": 0, "sy": 456, "sw": 152, "sh": 152}, "bar_21": {"sx": 152, "sy": 456, "sw": 152, "sh": 152}, "bar_23": {"sx": 304, "sy": 456, "sw": 152, "sh": 152}, "bar_24": {"sx": 456, "sy": 456, "sw": 152, "sh": 152}};
  for (var bar in AW) {
    var e = AW[bar];
    var sprKey = "i_arrow_" + bar + "_aw";
    SPR[sprKey] = ["aw", 0, 0, {sx:e.sx, sy:e.sy, sw:e.sw, sh:e.sh}];
    var id = "arrow_" + shortBar(bar);
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = sprKey;
  }
  for (var bar2 in AH) {
    var e2 = AH[bar2];
    var sprKey2 = "i_arrowhead_" + bar2 + "_ah";
    SPR[sprKey2] = ["ah", 0, 0, {sx:e2.sx, sy:e2.sy, sw:e2.sw, sh:e2.sh}];
    var id2 = "arrowhead_" + shortBar(bar2);
    if (typeof ITEMS !== "undefined" && ITEMS[id2]) ITEMS[id2].icon = sprKey2;
  }
})();
