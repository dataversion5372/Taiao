// ===== Isle of Emberfall — Fisher's soap inventory icon =====
// The fishmonger's basic fish-scrubbing soap (gameplay/stink.js, id fishers_soap)
// used a tinted i_cloth placeholder. This 1-cell 64px sheet ("fp") gives it its
// own art. Overwrites SPR["i_fishers_soap"] (which ITEMS.fishers_soap.icon
// already points at); loads AFTER stink.js so the item exists.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["fp"] = "assets/sheets/a37561f1a93a8bc5.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("fp")) SHEET_KEYS.push("fp");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["fp"] = 64;
  if (typeof SPR !== "undefined") SPR["i_fishers_soap"] = ["fp", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
})();
