// ===== Taiao - husbandry animal 8-dir sprites (PixelLab) =====
// quail/duck/goat/rabbit/pig/griffon: 8 directional frames + a hue-shifted
// "spent" frame each, registered as mcd_<kind>_<dir> / <kind>_spent so the
// monster renderer (dirSpr) and husbSpriteKey pick them up.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["aa"] = "assets/sheets/aa-animal-sprites.fd702fc2.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("aa")) SHEET_KEYS.push("aa");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["aa"] = 64;
  if (typeof SPR !== "undefined") {
  SPR["mcd_quail_south"] = ["aa", 0, 0, {sx:0, sy:0, sw:64, sh:64}];
  SPR["mcd_quail_south-east"] = ["aa", 0, 0, {sx:64, sy:0, sw:64, sh:64}];
  SPR["mcd_quail_east"] = ["aa", 0, 0, {sx:128, sy:0, sw:64, sh:64}];
  SPR["mcd_quail_north-east"] = ["aa", 0, 0, {sx:192, sy:0, sw:64, sh:64}];
  SPR["mcd_quail_north"] = ["aa", 0, 0, {sx:256, sy:0, sw:64, sh:64}];
  SPR["mcd_quail_north-west"] = ["aa", 0, 0, {sx:320, sy:0, sw:64, sh:64}];
  SPR["mcd_quail_west"] = ["aa", 0, 0, {sx:384, sy:0, sw:64, sh:64}];
  SPR["mcd_quail_south-west"] = ["aa", 0, 0, {sx:448, sy:0, sw:64, sh:64}];
  SPR["quail_spent"] = ["aa", 0, 0, {sx:512, sy:0, sw:64, sh:64}];
  SPR["mcd_duck_south"] = ["aa", 0, 0, {sx:0, sy:64, sw:64, sh:64}];
  SPR["mcd_duck_south-east"] = ["aa", 0, 0, {sx:64, sy:64, sw:64, sh:64}];
  SPR["mcd_duck_east"] = ["aa", 0, 0, {sx:128, sy:64, sw:64, sh:64}];
  SPR["mcd_duck_north-east"] = ["aa", 0, 0, {sx:192, sy:64, sw:64, sh:64}];
  SPR["mcd_duck_north"] = ["aa", 0, 0, {sx:256, sy:64, sw:64, sh:64}];
  SPR["mcd_duck_north-west"] = ["aa", 0, 0, {sx:320, sy:64, sw:64, sh:64}];
  SPR["mcd_duck_west"] = ["aa", 0, 0, {sx:384, sy:64, sw:64, sh:64}];
  SPR["mcd_duck_south-west"] = ["aa", 0, 0, {sx:448, sy:64, sw:64, sh:64}];
  SPR["duck_spent"] = ["aa", 0, 0, {sx:512, sy:64, sw:64, sh:64}];
  SPR["mcd_goat_south"] = ["aa", 0, 0, {sx:0, sy:128, sw:64, sh:64}];
  SPR["mcd_goat_south-east"] = ["aa", 0, 0, {sx:64, sy:128, sw:64, sh:64}];
  SPR["mcd_goat_east"] = ["aa", 0, 0, {sx:128, sy:128, sw:64, sh:64}];
  SPR["mcd_goat_north-east"] = ["aa", 0, 0, {sx:192, sy:128, sw:64, sh:64}];
  SPR["mcd_goat_north"] = ["aa", 0, 0, {sx:256, sy:128, sw:64, sh:64}];
  SPR["mcd_goat_north-west"] = ["aa", 0, 0, {sx:320, sy:128, sw:64, sh:64}];
  SPR["mcd_goat_west"] = ["aa", 0, 0, {sx:384, sy:128, sw:64, sh:64}];
  SPR["mcd_goat_south-west"] = ["aa", 0, 0, {sx:448, sy:128, sw:64, sh:64}];
  SPR["goat_spent"] = ["aa", 0, 0, {sx:512, sy:128, sw:64, sh:64}];
  SPR["mcd_rabbit_south"] = ["aa", 0, 0, {sx:0, sy:192, sw:64, sh:64}];
  SPR["mcd_rabbit_south-east"] = ["aa", 0, 0, {sx:64, sy:192, sw:64, sh:64}];
  SPR["mcd_rabbit_east"] = ["aa", 0, 0, {sx:128, sy:192, sw:64, sh:64}];
  SPR["mcd_rabbit_north-east"] = ["aa", 0, 0, {sx:192, sy:192, sw:64, sh:64}];
  SPR["mcd_rabbit_north"] = ["aa", 0, 0, {sx:256, sy:192, sw:64, sh:64}];
  SPR["mcd_rabbit_north-west"] = ["aa", 0, 0, {sx:320, sy:192, sw:64, sh:64}];
  SPR["mcd_rabbit_west"] = ["aa", 0, 0, {sx:384, sy:192, sw:64, sh:64}];
  SPR["mcd_rabbit_south-west"] = ["aa", 0, 0, {sx:448, sy:192, sw:64, sh:64}];
  SPR["rabbit_spent"] = ["aa", 0, 0, {sx:512, sy:192, sw:64, sh:64}];
  SPR["mcd_pig_south"] = ["aa", 0, 0, {sx:0, sy:256, sw:64, sh:64}];
  SPR["mcd_pig_south-east"] = ["aa", 0, 0, {sx:64, sy:256, sw:64, sh:64}];
  SPR["mcd_pig_east"] = ["aa", 0, 0, {sx:128, sy:256, sw:64, sh:64}];
  SPR["mcd_pig_north-east"] = ["aa", 0, 0, {sx:192, sy:256, sw:64, sh:64}];
  SPR["mcd_pig_north"] = ["aa", 0, 0, {sx:256, sy:256, sw:64, sh:64}];
  SPR["mcd_pig_north-west"] = ["aa", 0, 0, {sx:320, sy:256, sw:64, sh:64}];
  SPR["mcd_pig_west"] = ["aa", 0, 0, {sx:384, sy:256, sw:64, sh:64}];
  SPR["mcd_pig_south-west"] = ["aa", 0, 0, {sx:448, sy:256, sw:64, sh:64}];
  SPR["pig_spent"] = ["aa", 0, 0, {sx:512, sy:256, sw:64, sh:64}];
  SPR["mcd_griffon_south"] = ["aa", 0, 0, {sx:0, sy:320, sw:64, sh:64}];
  SPR["mcd_griffon_south-east"] = ["aa", 0, 0, {sx:64, sy:320, sw:64, sh:64}];
  SPR["mcd_griffon_east"] = ["aa", 0, 0, {sx:128, sy:320, sw:64, sh:64}];
  SPR["mcd_griffon_north-east"] = ["aa", 0, 0, {sx:192, sy:320, sw:64, sh:64}];
  SPR["mcd_griffon_north"] = ["aa", 0, 0, {sx:256, sy:320, sw:64, sh:64}];
  SPR["mcd_griffon_north-west"] = ["aa", 0, 0, {sx:320, sy:320, sw:64, sh:64}];
  SPR["mcd_griffon_west"] = ["aa", 0, 0, {sx:384, sy:320, sw:64, sh:64}];
  SPR["mcd_griffon_south-west"] = ["aa", 0, 0, {sx:448, sy:320, sw:64, sh:64}];
  SPR["griffon_spent"] = ["aa", 0, 0, {sx:512, sy:320, sw:64, sh:64}];
  }
})();
