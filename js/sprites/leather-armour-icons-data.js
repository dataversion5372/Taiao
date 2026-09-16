// ===== Taiao — tiered leather-armour icons (2 sheets) =====
// The 32-tier, 5-piece leather-armour set (js/skills/leathercraft.js). Two
// 16x5 matrices of 64px icons: rows = piece (coif/body/chaps/gloves/bracers),
// columns = leather tier. la1 = tiers 1..16 (Rabbit..Croc), la2 = tiers 17..32
// (Ape..Leviathan) — matching content.js/HIDES order. Repoints each item's
// placeholder icon (i_<kind>_<leatherId>, made by leathercraft.js's defineIcon)
// to its real cell. Loads after leathercraft.js; sheets self-register in
// SHEET_KEYS/SHEET_TILE so loadAssets() pulls them into IMGS.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined") for (var k of ["la1", "la2"]) { if (!SHEET_KEYS.includes(k)) SHEET_KEYS.push(k); }
  if (typeof SHEET_TILE !== "undefined") { SHEET_TILE["la1"] = 64; SHEET_TILE["la2"] = 64; }
  ASSET_DATA["la1"] = "assets/sheets/la1-leather-armour-icons.56179e7c.webp";
  ASSET_DATA["la2"] = "assets/sheets/la2-leather-armour-icons.9aedf9db.webp";
  if (typeof SPR === "undefined") return;
  var ROWS = ["coif", "body", "chaps", "gloves", "bracers"];   // top -> bottom
  function wire(sheet, baseTier) {
    for (var r = 0; r < ROWS.length; r++)
      for (var c = 0; c < 16; c++) {
        var i = baseTier + c;                                  // leather tier index 0..31
        var lid = i === 4 ? "leather" : "leather_" + i;        // content.js/HIDES id scheme
        SPR["i_" + ROWS[r] + "_" + lid] = [sheet, 0, 0, { sx: c * 64, sy: r * 64, sw: 64, sh: 64 }];
      }
  }
  wire("la1", 0);    // columns = tiers 1..16
  wire("la2", 16);   // columns = tiers 17..32
})();
