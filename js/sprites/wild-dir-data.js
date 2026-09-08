// ===== Isle of Emberfall - 8-directional wolf/bear/dragon sprites (PixelLab) =====
// The wild combat beasts that were still on the low-res Kenney m_wolf/m_bear/m_dragon
// singles. Sheet "wd" (512x192): row0 wolf, row1 bear, row2 dragon, 8 dirs x 64px.
// Registers mcd_<kind>_<dir> and sets each MONSTERS def (+ its _v/_baby, which reuse
// the base sprite scaled via the render composite) to dirSpr. Loads after monster defs.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("wd")) SHEET_KEYS.push("wd");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["wd"] = 64;
  ASSET_DATA["wd"] = "assets/sheets/5d1b8ed31c4fa8b0.webp";
  if (typeof SPR === "undefined") return;
  var DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
  var ROWS = ["wolf", "bear", "dragon"];
  for (var r = 0; r < ROWS.length; r++)
    for (var i = 0; i < DIRS.length; i++)
      SPR["mcd_" + ROWS[r] + "_" + DIRS[i]] = ["wd", 0, 0, { sx: i * 64, sy: r * 64, sw: 64, sh: 64 }];
  if (typeof MONSTERS !== "undefined") {
    for (var base of ROWS)
      for (var suf of ["", "_v", "_baby", "_v_baby"]) {
        var m = MONSTERS[base + suf];
        if (m) { m.dirSpr = true; m.spr = [["mcd_" + base + "_south"]]; }
      }
  }
})();
