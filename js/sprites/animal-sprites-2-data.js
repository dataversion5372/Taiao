// ===== Taiao - husbandry animal 8-dir sprites (PixelLab) =====
// quail/duck/goat/rabbit/pig/griffon: 8 directional frames + a hue-shifted
// "spent" frame each, registered as mcd_<kind>_<dir> / <kind>_spent so the
// monster renderer (dirSpr) and husbSpriteKey pick them up.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["ab"] = "assets/sheets/ab-animal-sprites-2.d969c521.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ab")) SHEET_KEYS.push("ab");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["ab"] = 64;
  if (typeof SPR !== "undefined") {
  SPR["mcd_goose_south"] = ["ab", 0, 0, {sx:0, sy:0, sw:64, sh:64}];
  SPR["mcd_goose_south-east"] = ["ab", 0, 0, {sx:64, sy:0, sw:64, sh:64}];
  SPR["mcd_goose_east"] = ["ab", 0, 0, {sx:128, sy:0, sw:64, sh:64}];
  SPR["mcd_goose_north-east"] = ["ab", 0, 0, {sx:192, sy:0, sw:64, sh:64}];
  SPR["mcd_goose_north"] = ["ab", 0, 0, {sx:256, sy:0, sw:64, sh:64}];
  SPR["mcd_goose_north-west"] = ["ab", 0, 0, {sx:320, sy:0, sw:64, sh:64}];
  SPR["mcd_goose_west"] = ["ab", 0, 0, {sx:384, sy:0, sw:64, sh:64}];
  SPR["mcd_goose_south-west"] = ["ab", 0, 0, {sx:448, sy:0, sw:64, sh:64}];
  SPR["goose_spent"] = ["ab", 0, 0, {sx:512, sy:0, sw:64, sh:64}];
  SPR["mcd_turkey_south"] = ["ab", 0, 0, {sx:0, sy:64, sw:64, sh:64}];
  SPR["mcd_turkey_south-east"] = ["ab", 0, 0, {sx:64, sy:64, sw:64, sh:64}];
  SPR["mcd_turkey_east"] = ["ab", 0, 0, {sx:128, sy:64, sw:64, sh:64}];
  SPR["mcd_turkey_north-east"] = ["ab", 0, 0, {sx:192, sy:64, sw:64, sh:64}];
  SPR["mcd_turkey_north"] = ["ab", 0, 0, {sx:256, sy:64, sw:64, sh:64}];
  SPR["mcd_turkey_north-west"] = ["ab", 0, 0, {sx:320, sy:64, sw:64, sh:64}];
  SPR["mcd_turkey_west"] = ["ab", 0, 0, {sx:384, sy:64, sw:64, sh:64}];
  SPR["mcd_turkey_south-west"] = ["ab", 0, 0, {sx:448, sy:64, sw:64, sh:64}];
  SPR["turkey_spent"] = ["ab", 0, 0, {sx:512, sy:64, sw:64, sh:64}];
  SPR["mcd_buffalo_south"] = ["ab", 0, 0, {sx:0, sy:128, sw:64, sh:64}];
  SPR["mcd_buffalo_south-east"] = ["ab", 0, 0, {sx:64, sy:128, sw:64, sh:64}];
  SPR["mcd_buffalo_east"] = ["ab", 0, 0, {sx:128, sy:128, sw:64, sh:64}];
  SPR["mcd_buffalo_north-east"] = ["ab", 0, 0, {sx:192, sy:128, sw:64, sh:64}];
  SPR["mcd_buffalo_north"] = ["ab", 0, 0, {sx:256, sy:128, sw:64, sh:64}];
  SPR["mcd_buffalo_north-west"] = ["ab", 0, 0, {sx:320, sy:128, sw:64, sh:64}];
  SPR["mcd_buffalo_west"] = ["ab", 0, 0, {sx:384, sy:128, sw:64, sh:64}];
  SPR["mcd_buffalo_south-west"] = ["ab", 0, 0, {sx:448, sy:128, sw:64, sh:64}];
  SPR["buffalo_spent"] = ["ab", 0, 0, {sx:512, sy:128, sw:64, sh:64}];
  SPR["mcd_alpaca_south"] = ["ab", 0, 0, {sx:0, sy:192, sw:64, sh:64}];
  SPR["mcd_alpaca_south-east"] = ["ab", 0, 0, {sx:64, sy:192, sw:64, sh:64}];
  SPR["mcd_alpaca_east"] = ["ab", 0, 0, {sx:128, sy:192, sw:64, sh:64}];
  SPR["mcd_alpaca_north-east"] = ["ab", 0, 0, {sx:192, sy:192, sw:64, sh:64}];
  SPR["mcd_alpaca_north"] = ["ab", 0, 0, {sx:256, sy:192, sw:64, sh:64}];
  SPR["mcd_alpaca_north-west"] = ["ab", 0, 0, {sx:320, sy:192, sw:64, sh:64}];
  SPR["mcd_alpaca_west"] = ["ab", 0, 0, {sx:384, sy:192, sw:64, sh:64}];
  SPR["mcd_alpaca_south-west"] = ["ab", 0, 0, {sx:448, sy:192, sw:64, sh:64}];
  SPR["alpaca_spent"] = ["ab", 0, 0, {sx:512, sy:192, sw:64, sh:64}];
  SPR["mcd_aurochs_south"] = ["ab", 0, 0, {sx:0, sy:256, sw:64, sh:64}];
  SPR["mcd_aurochs_south-east"] = ["ab", 0, 0, {sx:64, sy:256, sw:64, sh:64}];
  SPR["mcd_aurochs_east"] = ["ab", 0, 0, {sx:128, sy:256, sw:64, sh:64}];
  SPR["mcd_aurochs_north-east"] = ["ab", 0, 0, {sx:192, sy:256, sw:64, sh:64}];
  SPR["mcd_aurochs_north"] = ["ab", 0, 0, {sx:256, sy:256, sw:64, sh:64}];
  SPR["mcd_aurochs_north-west"] = ["ab", 0, 0, {sx:320, sy:256, sw:64, sh:64}];
  SPR["mcd_aurochs_west"] = ["ab", 0, 0, {sx:384, sy:256, sw:64, sh:64}];
  SPR["mcd_aurochs_south-west"] = ["ab", 0, 0, {sx:448, sy:256, sw:64, sh:64}];
  SPR["aurochs_spent"] = ["ab", 0, 0, {sx:512, sy:256, sw:64, sh:64}];
  SPR["mcd_wyrmling_south"] = ["ab", 0, 0, {sx:0, sy:320, sw:64, sh:64}];
  SPR["mcd_wyrmling_south-east"] = ["ab", 0, 0, {sx:64, sy:320, sw:64, sh:64}];
  SPR["mcd_wyrmling_east"] = ["ab", 0, 0, {sx:128, sy:320, sw:64, sh:64}];
  SPR["mcd_wyrmling_north-east"] = ["ab", 0, 0, {sx:192, sy:320, sw:64, sh:64}];
  SPR["mcd_wyrmling_north"] = ["ab", 0, 0, {sx:256, sy:320, sw:64, sh:64}];
  SPR["mcd_wyrmling_north-west"] = ["ab", 0, 0, {sx:320, sy:320, sw:64, sh:64}];
  SPR["mcd_wyrmling_west"] = ["ab", 0, 0, {sx:384, sy:320, sw:64, sh:64}];
  SPR["mcd_wyrmling_south-west"] = ["ab", 0, 0, {sx:448, sy:320, sw:64, sh:64}];
  SPR["wyrmling_spent"] = ["ab", 0, 0, {sx:512, sy:320, sw:64, sh:64}];
  }
})();
