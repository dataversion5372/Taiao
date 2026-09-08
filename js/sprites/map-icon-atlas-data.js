// ===== Isle of Emberfall — world-map marker icon atlas (auto-generated) =====
// Replaces the hand-drawn Canvas2D vector glyphs in ICON_TYPES (js/gameplay/
// world.js) with real bitmap art, generated from an AI image-gen pass (see
// docs/map-icons-sprite-prompt.txt) and extracted by fixed 6x5 grid position
// (border-flood-fill alpha from the sheet's magenta background, same
// technique as the other reference-sheet pipelines in this project).
// 29 icons: 26 are 1:1 replacements for the existing hand-drawn icons
// (including 8 — swordshop..foodshop — that no live code path displays yet,
// kept for future use); 3 are new (camp, orchard, seasoning_yard) filling
// real gaps where wildIcon()/POI/station types had no icon at all before.
// gameplay/world.js applies these over the vector iconImgs once IMGS["mi"]
// finishes decoding (see applyMapIconArt(), called from openWorldMap()).
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("mi")) SHEET_KEYS.push("mi");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["mi"] = 64;
  ASSET_DATA["mi"] = "assets/sheets/9b10b6d4ca3ebb25.webp";
  SPR["i_mapicon_bank"] = ["mi", 0, 0, {sx:0, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_store"] = ["mi", 1, 0, {sx:64, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_anvil"] = ["mi", 2, 0, {sx:128, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_furnace"] = ["mi", 3, 0, {sx:192, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_fish"] = ["mi", 4, 0, {sx:256, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_mine"] = ["mi", 5, 0, {sx:320, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_tree"] = ["mi", 0, 1, {sx:0, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_altar"] = ["mi", 1, 1, {sx:64, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_quest"] = ["mi", 2, 1, {sx:128, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_windmill"] = ["mi", 3, 1, {sx:192, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_water"] = ["mi", 4, 1, {sx:256, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_workbench"] = ["mi", 5, 1, {sx:320, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_loom"] = ["mi", 0, 2, {sx:0, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_garden"] = ["mi", 1, 2, {sx:64, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_alchemy"] = ["mi", 2, 2, {sx:128, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_tanning"] = ["mi", 3, 2, {sx:192, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_cauldron"] = ["mi", 4, 2, {sx:256, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_butcher"] = ["mi", 5, 2, {sx:320, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_range"] = ["mi", 0, 3, {sx:0, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_swordshop"] = ["mi", 1, 3, {sx:64, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_bowshop"] = ["mi", 2, 3, {sx:128, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_magicshop"] = ["mi", 3, 3, {sx:192, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_gemshop"] = ["mi", 4, 3, {sx:256, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_herbshop"] = ["mi", 5, 3, {sx:320, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_clothesshop"] = ["mi", 0, 4, {sx:0, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_foodshop"] = ["mi", 1, 4, {sx:64, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_camp"] = ["mi", 2, 4, {sx:128, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_orchard"] = ["mi", 3, 4, {sx:192, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_seasoning_yard"] = ["mi", 4, 4, {sx:256, sy:256, sw:64, sh:64}];
  window.MAP_ICON_TYPES = ['bank', 'store', 'anvil', 'furnace', 'fish', 'mine', 'tree', 'altar', 'quest', 'windmill', 'water', 'workbench', 'loom', 'garden', 'alchemy', 'tanning', 'cauldron', 'butcher', 'range', 'swordshop', 'bowshop', 'magicshop', 'gemshop', 'herbshop', 'clothesshop', 'foodshop', 'camp', 'orchard', 'seasoning_yard'];
})();
