// ===== Taiao - forageable inventory-icon sheet (auto-generated) =====
// 32 Foraging goods (content.js FORAGE_NAMES / FORAGE), 8x4 grid of 64px cells,
// row-major in FORAGE order (berries, forage_1..forage_31). Built from a
// PixelLab/ChatGPT sheet: black bg flood-filled to transparent (thr 8),
// each cell auto-trimmed + fit into a 64px cell. See docs/consumable-icon-
// sprite-prompts.txt (SHEET: Foraged Goods).
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["fg"] = "assets/sheet-src/fg-forage-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("fg")) SHEET_KEYS.push("fg");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["fg"] = 64;
  var S = { "berries":[0,0], "forage_1":[1,0], "forage_2":[2,0], "forage_3":[3,0], "forage_4":[4,0], "forage_5":[5,0], "forage_6":[6,0], "forage_7":[7,0], "forage_8":[0,1], "forage_9":[1,1], "forage_10":[2,1], "forage_11":[3,1], "forage_12":[4,1], "forage_13":[5,1], "forage_14":[6,1], "forage_15":[7,1], "forage_16":[0,2], "forage_17":[1,2], "forage_18":[2,2], "forage_19":[3,2], "forage_20":[4,2], "forage_21":[5,2], "forage_22":[6,2], "forage_23":[7,2], "forage_24":[0,3], "forage_25":[1,3], "forage_26":[2,3], "forage_27":[3,3], "forage_28":[4,3], "forage_29":[5,3], "forage_30":[6,3], "forage_31":[7,3] };
  for (const id in S) {
    const cr = S[id];
    if (typeof SPR !== "undefined") SPR["i_" + id] = ["fg", cr[0], cr[1]];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = "i_" + id;
  }
})();
