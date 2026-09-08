// ===== Isle of Emberfall — world flat-tile sheet (lily pads) =====
// A dedicated 64px NOPAD sheet of top-down FLAT textures used as ground tiles
// (road, pier_wood) and flat water decor (lily/lily2/lily3 — see render3d
// FLAT_DECOR). Registered as sheet "wt"; overrides the old atlas lily tiles.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["wt"] = "assets/sheets/2cc953b87fd0ed57.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("wt")) SHEET_KEYS.push("wt");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["wt"] = 64;
  // sub-rects in the 320x64 sheet, one 64px tile per column
  // (road/pier_wood tiles at columns 0-1 exist in the sheet but are intentionally
  // not registered — roads/piers were reverted; only the lily pads are wired.)
  var T = { lily: 2, lily2: 3, lily3: 4 };
  if (typeof SPR !== "undefined")
    for (var k in T) SPR[k] = ["wt", 0, 0, { sx: T[k] * 64, sy: 0, sw: 64, sh: 64 }];
})();
