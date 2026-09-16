// ===== Taiao — Copper bar inventory icon (auto-generated) =====
// Copper had no pure bar (its ore only ever fed Bronze), so it never got a
// tile from the ingots.png pass (bar-icons-data.js). This crops the same
// sheet's "Copper" cell WITHOUT the bronze recolor bar-icons-data.js applies
// (same border-flood-fill background removal, no recolor) for the new
// copper_bar item added in geartiers-era Smelting (js/data.js). One-tile
// sheet key "cb", same structural pattern as bar-icons-data.js.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("cb")) SHEET_KEYS.push("cb");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["cb"] = 64;
  ASSET_DATA["cb"] = "assets/sheet-src/cb-copper-bar-icon.webp";
  SPR["i_copper_bar_cb"] = ["cb", 0, 0, {sx:0, sy:0, sw:64, sh:64}];
  if (typeof ITEMS !== "undefined" && ITEMS["copper_bar"]) ITEMS["copper_bar"].icon = "i_copper_bar_cb";
})();
