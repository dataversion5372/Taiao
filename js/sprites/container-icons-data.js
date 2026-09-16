// ===== Taiao - bucket/pail item icons (generated) =====
// Real art for the two dairy-container items, repointed over the tinted
// placeholder sprites set in js/skills/husbandry-animals.js. Loads after
// item-icons-data.js so this wins. Sheet key "bp".
"use strict";
const CONTAINER_ICON_SHEET = "assets/sheet-src/bp-container-icons.webp";
const CONTAINER_ICON_MAP = {"bucket":[0,0,64,64],"pail":[64,0,64,64]};
(function(){
  if (typeof ASSET_DATA !== "undefined") ASSET_DATA.bp = CONTAINER_ICON_SHEET;
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("bp")) SHEET_KEYS.push("bp");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE.bp = 64;
  if (typeof SPR === "undefined") return;
  for (const id in CONTAINER_ICON_MAP){ const r = CONTAINER_ICON_MAP[id];
    SPR["ic_"+id] = ["bp",0,0,{sx:r[0],sy:r[1],sw:r[2],sh:r[3]}];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = "ic_"+id; }
})();
