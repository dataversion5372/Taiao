// ===== Taiao - boat inventory-icon sheet (auto-generated) =====
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["bi"] = "assets/sheet-src/bi-boat-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("bi")) SHEET_KEYS.push("bi");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["bi"] = 64;
  var S = { "boat_coracle":{"sx": 0, "sy": 0, "sw": 64, "sh": 64}, "raft_logs":{"sx": 64, "sy": 0, "sw": 64, "sh": 64}, "raft_planks":{"sx": 128, "sy": 0, "sw": 64, "sh": 64}, "skiff":{"sx": 192, "sy": 0, "sw": 64, "sh": 64}, "boat_dinghy":{"sx": 256, "sy": 0, "sw": 64, "sh": 64}, "boat_dory":{"sx": 320, "sy": 0, "sw": 64, "sh": 64}, "boat_catboat":{"sx": 384, "sy": 0, "sw": 64, "sh": 64}, "boat_barge":{"sx": 448, "sy": 0, "sw": 64, "sh": 64}, "ship_smack":{"sx": 0, "sy": 64, "sw": 64, "sh": 64}, "ship_cutter":{"sx": 64, "sy": 64, "sw": 64, "sh": 64}, "ship_dhow":{"sx": 128, "sy": 64, "sw": 64, "sh": 64}, "ship_schooner":{"sx": 192, "sy": 64, "sw": 64, "sh": 64}, "ship_longship":{"sx": 256, "sy": 64, "sw": 64, "sh": 64}, "ship_junk":{"sx": 320, "sy": 64, "sw": 64, "sh": 64}, "ship_caravel":{"sx": 384, "sy": 64, "sw": 64, "sh": 64}, "ship_brig":{"sx": 448, "sy": 64, "sw": 64, "sh": 64}, "ship_brigantine":{"sx": 0, "sy": 128, "sw": 64, "sh": 64}, "ship_galley":{"sx": 64, "sy": 128, "sw": 64, "sh": 64}, "ship_barque":{"sx": 128, "sy": 128, "sw": 64, "sh": 64}, "ship_carrack":{"sx": 192, "sy": 128, "sw": 64, "sh": 64}, "ship_clipper":{"sx": 256, "sy": 128, "sw": 64, "sh": 64}, "ship_frigate":{"sx": 320, "sy": 128, "sw": 64, "sh": 64}, "ship_galleon":{"sx": 384, "sy": 128, "sw": 64, "sh": 64}, "ship_manofwar":{"sx": 448, "sy": 128, "sw": 64, "sh": 64} };
  for (var key in S) {
    var e = S[key];
    SPR["i_"+key] = ["bi", 0, 0, {sx:e.sx, sy:e.sy, sw:e.sw, sh:e.sh}];
    if (typeof ITEMS !== "undefined" && ITEMS[key]) ITEMS[key].icon = "i_"+key;
  }
})();
