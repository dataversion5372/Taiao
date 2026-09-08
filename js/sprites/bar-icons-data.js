// ===== Isle of Emberfall — metal bar inventory-icon sheet (auto-generated) =====
// Sourced from assets/assorted sprites/ingots.png (32 labelled ingot sprites,
// index-matched to METAL_NAMES); bronze_bar has no matching ingot on that sheet
// (it lists "Copper", not "Bronze") so its tile is the Copper ingot recoloured
// to a warm bronze hue.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["mb"] = "assets/sheets/ada275437cb7fac6.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("mb")) SHEET_KEYS.push("mb");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["mb"] = 64;
  var S = {"bronze_bar":{"sx":0,"sy":0,"sw":64,"sh":64},"bar_1":{"sx":64,"sy":0,"sw":64,"sh":64},"iron_bar":{"sx":128,"sy":0,"sw":64,"sh":64},"bar_3":{"sx":192,"sy":0,"sw":64,"sh":64},"bar_4":{"sx":256,"sy":0,"sw":64,"sh":64},"bar_5":{"sx":320,"sy":0,"sw":64,"sh":64},"bar_6":{"sx":384,"sy":0,"sw":64,"sh":64},"bar_7":{"sx":448,"sy":0,"sw":64,"sh":64},"gold_bar":{"sx":0,"sy":64,"sw":64,"sh":64},"bar_9":{"sx":64,"sy":64,"sw":64,"sh":64},"bar_10":{"sx":128,"sy":64,"sw":64,"sh":64},"bar_11":{"sx":192,"sy":64,"sw":64,"sh":64},"bar_12":{"sx":256,"sy":64,"sw":64,"sh":64},"bar_13":{"sx":320,"sy":64,"sw":64,"sh":64},"bar_14":{"sx":384,"sy":64,"sw":64,"sh":64},"bar_15":{"sx":448,"sy":64,"sw":64,"sh":64},"bar_16":{"sx":0,"sy":128,"sw":64,"sh":64},"bar_17":{"sx":64,"sy":128,"sw":64,"sh":64},"bar_18":{"sx":128,"sy":128,"sw":64,"sh":64},"bar_19":{"sx":192,"sy":128,"sw":64,"sh":64},"bar_20":{"sx":256,"sy":128,"sw":64,"sh":64},"bar_21":{"sx":320,"sy":128,"sw":64,"sh":64},"bar_22":{"sx":384,"sy":128,"sw":64,"sh":64},"bar_23":{"sx":448,"sy":128,"sw":64,"sh":64},"bar_24":{"sx":0,"sy":192,"sw":64,"sh":64},"bar_25":{"sx":64,"sy":192,"sw":64,"sh":64},"bar_26":{"sx":128,"sy":192,"sw":64,"sh":64},"bar_27":{"sx":192,"sy":192,"sw":64,"sh":64},"bar_28":{"sx":256,"sy":192,"sw":64,"sh":64},"bar_29":{"sx":320,"sy":192,"sw":64,"sh":64},"bar_30":{"sx":384,"sy":192,"sw":64,"sh":64},"bar_31":{"sx":448,"sy":192,"sw":64,"sh":64}};
  for (var key in S) {
    var e = S[key];
    SPR["i_"+key+"_mb"] = ["mb", 0, 0, {sx:e.sx, sy:e.sy, sw:e.sw, sh:e.sh}];
    if (typeof ITEMS !== "undefined" && ITEMS[key]) ITEMS[key].icon = "i_"+key+"_mb";
  }
})();
