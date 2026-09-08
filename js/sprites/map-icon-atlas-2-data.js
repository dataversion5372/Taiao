// ===== Isle of Emberfall — world-map marker icon atlas #2 (auto-generated) =====
// Dedicated map/minimap icons for shops and specialised crafting stations that
// previously reused a generic glyph (see docs/map-icons-2-sprite-prompt.txt).
// 36 icons: 30 specialised STATION_ICON stations + 6 named SHOP_TYPES shops.
// Same 64px-cell grid + border-alpha extraction as the first "mi" sheet; these
// APPEND to window.MAP_ICON_TYPES so applyMapIconArt() (gameplay/world.js)
// hydrates them alongside the originals.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("mi2")) SHEET_KEYS.push("mi2");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["mi2"] = 64;
  ASSET_DATA["mi2"] = "assets/sheets/01d390e9bbd8bba5.webp";
  SPR["i_mapicon_fletchers_bench"] = ["mi2", 0, 0, {sx:0, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_sawmill"] = ["mi2", 1, 0, {sx:64, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_cooperage"] = ["mi2", 2, 0, {sx:128, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_ropewalk"] = ["mi2", 3, 0, {sx:192, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_sail_loft"] = ["mi2", 4, 0, {sx:256, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_shipyard"] = ["mi2", 5, 0, {sx:320, sy:0, sw:64, sh:64}];
  SPR["i_mapicon_spinning_wheel"] = ["mi2", 0, 1, {sx:0, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_dyeworks"] = ["mi2", 1, 1, {sx:64, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_fulling_mill"] = ["mi2", 2, 1, {sx:128, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_tailors_bench"] = ["mi2", 3, 1, {sx:192, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_leather_bench"] = ["mi2", 4, 1, {sx:256, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_cobblers_bench"] = ["mi2", 5, 1, {sx:320, sy:64, sw:64, sh:64}];
  SPR["i_mapicon_saddlers_bench"] = ["mi2", 0, 2, {sx:0, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_barn"] = ["mi2", 1, 2, {sx:64, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_creamery"] = ["mi2", 2, 2, {sx:128, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_chandlery"] = ["mi2", 3, 2, {sx:192, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_soap_works"] = ["mi2", 4, 2, {sx:256, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_paper_mill"] = ["mi2", 5, 2, {sx:320, sy:128, sw:64, sh:64}];
  SPR["i_mapicon_malthouse"] = ["mi2", 0, 3, {sx:0, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_brewery"] = ["mi2", 1, 3, {sx:64, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_charcoal_clamp"] = ["mi2", 2, 3, {sx:128, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_lime_kiln"] = ["mi2", 3, 3, {sx:192, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_pottery_kiln"] = ["mi2", 4, 3, {sx:256, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_glass_furnace"] = ["mi2", 5, 3, {sx:320, sy:192, sw:64, sh:64}];
  SPR["i_mapicon_assay_furnace"] = ["mi2", 0, 4, {sx:0, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_drawbench"] = ["mi2", 1, 4, {sx:64, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_jewelers_bench"] = ["mi2", 2, 4, {sx:128, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_toolsmith"] = ["mi2", 3, 4, {sx:192, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_locksmith_bench"] = ["mi2", 4, 4, {sx:256, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_masons_yard"] = ["mi2", 5, 4, {sx:320, sy:256, sw:64, sh:64}];
  SPR["i_mapicon_woodcutter"] = ["mi2", 0, 5, {sx:0, sy:320, sw:64, sh:64}];
  SPR["i_mapicon_mining"] = ["mi2", 1, 5, {sx:64, sy:320, sw:64, sh:64}];
  SPR["i_mapicon_fishmonger"] = ["mi2", 2, 5, {sx:128, sy:320, sw:64, sh:64}];
  SPR["i_mapicon_armoury"] = ["mi2", 3, 5, {sx:192, sy:320, sw:64, sh:64}];
  SPR["i_mapicon_seedsman"] = ["mi2", 4, 5, {sx:256, sy:320, sw:64, sh:64}];
  SPR["i_mapicon_timberwright"] = ["mi2", 5, 5, {sx:320, sy:320, sw:64, sh:64}];
  var NEW = ['fletchers_bench', 'sawmill', 'cooperage', 'ropewalk', 'sail_loft', 'shipyard', 'spinning_wheel', 'dyeworks', 'fulling_mill', 'tailors_bench', 'leather_bench', 'cobblers_bench', 'saddlers_bench', 'barn', 'creamery', 'chandlery', 'soap_works', 'paper_mill', 'malthouse', 'brewery', 'charcoal_clamp', 'lime_kiln', 'pottery_kiln', 'glass_furnace', 'assay_furnace', 'drawbench', 'jewelers_bench', 'toolsmith', 'locksmith_bench', 'masons_yard', 'woodcutter', 'mining', 'fishmonger', 'armoury', 'seedsman', 'timberwright'];
  if (typeof window.MAP_ICON_TYPES === "undefined") window.MAP_ICON_TYPES = [];
  for (var i=0;i<NEW.length;i++) if (window.MAP_ICON_TYPES.indexOf(NEW[i])<0) window.MAP_ICON_TYPES.push(NEW[i]);
})();
