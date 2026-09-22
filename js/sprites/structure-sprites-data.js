// ===== Taiao — bespoke structural billboard sprites =====
// Real PixelLab art for the door/gate/ladder/stairs billboards that shipped
// as tinted wall/floor-tile derivatives (content.js "DERIVED PLACEHOLDER"
// block). Registers the "sb" sheet (a 5×1 64px atlas) and overrides the SPR
// entries content.js defined — render3d's syncStructures sizes and swings
// them exactly as before, it just draws real art now. Door sprites are the
// door LEAF alone (no baked archway), since the whole sprite swings open.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["sb"] = "assets/sheet-src/sb-structure-sprites.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("sb")) SHEET_KEYS.push("sb");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["sb"] = 64;
  var ORDER = ["door_wood", "door_stone", "gate_leaf", "ladder", "stairs"];
  for (var i = 0; i < ORDER.length; i++)
    SPR[ORDER[i]] = ["sb", 0, 0, { sx: i * 64, sy: 0, sw: 64, sh: 64 }];
})();
