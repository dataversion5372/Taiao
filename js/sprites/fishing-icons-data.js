// ===== Taiao — fishing-tool inventory icons =====
// The five Fishing tools (fishing_rod, small_net, big_net, harpoon,
// lobster_cage) previously all shared the placeholder i_rod sprite. This 5-cell
// 64px sheet ("ft") gives each its own art; loads after the tool-icon sheets so
// its repoint of ITEMS[id].icon wins. (Key is "ft" — "fi" is the fruit sheet.)
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["ft"] = "assets/sheet-src/ft-fishing-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ft")) SHEET_KEYS.push("ft");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["ft"] = 64;
  var COL = { fishing_rod: 0, small_net: 1, big_net: 2, harpoon: 3, lobster_cage: 4 };
  if (typeof SPR === "undefined") return;
  for (var id in COL) {
    var spr = "i_fish_" + id;
    SPR[spr] = ["ft", 0, 0, { sx: COL[id] * 64, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = spr;
  }
})();
