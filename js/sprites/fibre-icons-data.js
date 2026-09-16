// ===== Taiao - fibre-crop (Fibriculture) inventory-icon sheet (auto-generated) =====
// 32 harvested raw fibres, 8x4 grid of 64px cells, in LEVEL order (req 1..32).
// The harvested item ids are NOT a clean sequence (reqs 1-12 reuse base FIBERS
// ids like flax/cotton/hemp; reqs 13-32 are fibriculture_crop_12..31), so we
// repoint by iterating CROPS(skill=Fibriculture) sorted by req -> cell N. Must
// load AFTER agriculture.js (builds CROPS) and crop-item-icons.js (which set the
// harvested icon to the growth-stage sprite; we override it). See docs/
// consumable-icon-sprite-prompts.txt (SHEET: Fibre Crops).
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["fb"] = "assets/sheet-src/fb-fibre-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("fb")) SHEET_KEYS.push("fb");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["fb"] = 64;
  if (typeof SPR !== "undefined") for (let k = 0; k < 32; k++) SPR["i_fb" + k] = ["fb", k % 8, Math.floor(k / 8)];
  if (typeof CROPS !== "undefined" && typeof ITEMS !== "undefined") {
    const fib = Object.values(CROPS).filter(c => c.cat === "Fibriculture").sort((a, b) => a.req - b.req);
    fib.forEach((c, k) => { if (k < 32 && ITEMS[c.item]) ITEMS[c.item].icon = "i_fb" + k; });
  }
})();
