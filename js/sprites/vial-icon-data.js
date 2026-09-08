// ===== Isle of Emberfall - empty vial inventory icon (auto-generated) =====
// A single hand-made empty-glass-vial icon (transparent bg, translucent glass +
// cork). Self-registers sheet "ev" and repoints ONLY ITEMS.vial.icon -> "ev_vial"
// (the shared SPR["i_vial"] tile is left alone — candles/pottery/glaze derive
// their tinted icons from it). Loads after data.js in index.html.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["ev"] = "assets/sheets/1f9fa78759b27405.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ev")) SHEET_KEYS.push("ev");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["ev"] = 64;
  if (typeof SPR !== "undefined") SPR["ev_vial"] = ["ev", 0, 0];
  if (typeof ITEMS !== "undefined" && ITEMS["vial"]) ITEMS["vial"].icon = "ev_vial";
})();
