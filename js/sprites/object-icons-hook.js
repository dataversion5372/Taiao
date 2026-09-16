// ===== Taiao — objects sheet as an icon source =====
// Registers the packed 8-directional world-object sheet (objects-data.js)
// as icon sheet "ob", so furniture/placeable items can use their in-game
// object's south frame as their inventory icon (SPR "fo_*" rects created in
// js/skills/furniture.js). Must load after main/assets.js defines
// ASSET_DATA/SHEET_KEYS/SHEET_TILE and before main.js calls loadAssets().
"use strict";
if (typeof ASSET_DATA !== "undefined" && typeof OBJ_SHEET !== "undefined") {
  ASSET_DATA.ob = OBJ_SHEET;
  if (!SHEET_KEYS.includes("ob")) SHEET_KEYS.push("ob");
  SHEET_TILE.ob = OBJ_CELL;
}
// Re-stamp furniture icons LAST: the generated icon-data files repoint any
// item id they know (a few furniture ids overlap trade goods), but furniture
// must look like its in-game world object.
if (typeof FURNITURE_OBJ_ICONS !== "undefined" && typeof ITEMS !== "undefined")
  for (const id in FURNITURE_OBJ_ICONS)
    if (ITEMS[id]) ITEMS[id].icon = FURNITURE_OBJ_ICONS[id];
