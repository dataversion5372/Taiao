// ===== Isle of Emberfall - Mixed item icon sheet (16 icons) =====
// cider, sparkling wine, honey, beeswax, raw/burnt meat, burnt fish, rune essence,
// planks, oar, leather armour, master leather cuirass, and the 4 flowers. Slices a
// hand-made 4x4 sheet into the "mx" sheet and repoints each ITEM icon to a fresh
// "mx_<id>" SPR key. (Sheet key is "mx", NOT "mi" — "mi" is the map-icon atlas
// (map-icon-atlas-data.js); reusing it clobbered every world-map icon.) FLOWER note:
// only the ITEM icon is repointed; the shared SPR["flower_<colour>"] world-decoration
// sprite is left untouched.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("mx")) SHEET_KEYS.push("mx");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["mx"] = 64;
  ASSET_DATA["mx"] = "assets/sheets/6a373b45bc2b0a76.webp";
  if (typeof SPR === "undefined") return;
    SPR["mx_cider"] = ["mx", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["cider"]) ITEMS["cider"].icon = "mx_cider";
    SPR["mx_sparkling_wine"] = ["mx", 0, 0, { sx: 64, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["sparkling_wine"]) ITEMS["sparkling_wine"].icon = "mx_sparkling_wine";
    SPR["mx_honey"] = ["mx", 0, 0, { sx: 128, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["honey"]) ITEMS["honey"].icon = "mx_honey";
    SPR["mx_beeswax"] = ["mx", 0, 0, { sx: 192, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["beeswax"]) ITEMS["beeswax"].icon = "mx_beeswax";
    SPR["mx_raw_meat"] = ["mx", 0, 0, { sx: 0, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["raw_meat"]) ITEMS["raw_meat"].icon = "mx_raw_meat";
    // cooked meat: the new steak art browned/roasted (distinct from the red raw
    // cut and the charred burnt leg) — reuses the raw-meat cell with a warm sepia
    // filter so it reads as cooked.
    SPR["mx_cooked_meat"] = ["mx", 0, 0, { sx: 0, sy: 64, sw: 64, sh: 64, filter: "sepia(0.6) saturate(1.25) brightness(0.82)" }];
    if (typeof ITEMS !== "undefined" && ITEMS["cooked_meat"]) ITEMS["cooked_meat"].icon = "mx_cooked_meat";
    SPR["mx_burnt_meat"] = ["mx", 0, 0, { sx: 64, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["burnt_meat"]) ITEMS["burnt_meat"].icon = "mx_burnt_meat";
    SPR["mx_burnt_fish"] = ["mx", 0, 0, { sx: 128, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["burnt_fish"]) ITEMS["burnt_fish"].icon = "mx_burnt_fish";
    SPR["mx_rune_essence"] = ["mx", 0, 0, { sx: 192, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["rune_essence"]) ITEMS["rune_essence"].icon = "mx_rune_essence";
    SPR["mx_planks"] = ["mx", 0, 0, { sx: 0, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["planks"]) ITEMS["planks"].icon = "mx_planks";
    SPR["mx_oars"] = ["mx", 0, 0, { sx: 64, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["oars"]) ITEMS["oars"].icon = "mx_oars";
    // (the old leather_body / master_cuirass icon hooks were removed — tiered
    //  leather armour now has its own dedicated sheets, leather-armour-icons-data.js)
    SPR["mx_flower_white"] = ["mx", 0, 0, { sx: 0, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["flower_white"]) ITEMS["flower_white"].icon = "mx_flower_white";
    SPR["mx_flower_blue"] = ["mx", 0, 0, { sx: 64, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["flower_blue"]) ITEMS["flower_blue"].icon = "mx_flower_blue";
    SPR["mx_flower_orange"] = ["mx", 0, 0, { sx: 128, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["flower_orange"]) ITEMS["flower_orange"].icon = "mx_flower_orange";
    SPR["mx_flower_purple"] = ["mx", 0, 0, { sx: 192, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["flower_purple"]) ITEMS["flower_purple"].icon = "mx_flower_purple";
})();
