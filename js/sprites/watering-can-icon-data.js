// ===== Isle of Emberfall — Watering can inventory icon =====
// Pomiculture re-fruiting tool (js/skills/farming.js, id watering_can). Gives it
// real art in place of the tinted-vial placeholder. Overwrites SPR
// ["i_watering_can"] (ITEMS.watering_can.icon already points at it); loads AFTER
// farming.js so the item exists.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["wc"] = "assets/sheets/d7b7a2ea4b40bc86.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("wc")) SHEET_KEYS.push("wc");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["wc"] = 64;
  if (typeof SPR !== "undefined") SPR["i_watering_can"] = ["wc", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
})();
