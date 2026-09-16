// ===== Taiao - 8-directional sheep sprite (PixelLab-generated) =====
// Sheep was the one livestock still on the low-res Kenney m_sheep single sprite while
// every other farm animal has an 8-dir sheet. This registers mcd_sheep_<dir> (sheet
// "as", 512x64, 8 dirs x 64px) and points MONSTERS.sheep (+ its _v/_baby, which inherit
// the base sprite scaled via the render composite) at it. Loads after the monster defs.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("as")) SHEET_KEYS.push("as");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["as"] = 64;
  ASSET_DATA["as"] = "assets/sheet-src/as-sheep-dir.webp";
  if (typeof SPR === "undefined") return;
  var DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
  for (var i = 0; i < DIRS.length; i++)
    SPR["mcd_sheep_" + DIRS[i]] = ["as", 0, 0, { sx: i * 64, sy: 0, sw: 64, sh: 64 }];
  if (typeof MONSTERS !== "undefined") {
    for (var k of ["sheep", "sheep_v", "sheep_baby", "sheep_v_baby"]) {
      var m = MONSTERS[k];
      if (m) { m.dirSpr = true; m.spr = [["mcd_sheep_south"]]; }
    }
  }
})();
