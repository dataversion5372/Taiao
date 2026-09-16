// ===== Taiao - Limeburning product icon sheet (32 items) =====
// 32 distinct limeburning products (stonework.js lp_<recipeId>, one per recipe, pooled
// into 8 base commodities via ITEM_FAMILY). Slices a hand-made 8x4 sheet into the "lb"
// sheet and repoints each item's icon (was the base commodity's ic_* placeholder).
// Loads after stonework.js so the lp_* items exist.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("lb")) SHEET_KEYS.push("lb");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["lb"] = 64;
  ASSET_DATA["lb"] = "assets/sheet-src/lb-lb-icons.webp";
  if (typeof SPR === "undefined") return;
    SPR["i_lp_burn_quicklime"] = ["lb", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_burn_quicklime"]) ITEMS["lp_burn_quicklime"].icon = "i_lp_burn_quicklime";
    SPR["i_lp_burn_quicklime_kiln"] = ["lb", 0, 0, { sx: 64, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_burn_quicklime_kiln"]) ITEMS["lp_burn_quicklime_kiln"].icon = "i_lp_burn_quicklime_kiln";
    SPR["i_lp_burn_marble_lime"] = ["lb", 0, 0, { sx: 128, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_burn_marble_lime"]) ITEMS["lp_burn_marble_lime"].icon = "i_lp_burn_marble_lime";
    SPR["i_lp_quicklime_industrial"] = ["lb", 0, 0, { sx: 192, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_quicklime_industrial"]) ITEMS["lp_quicklime_industrial"].icon = "i_lp_quicklime_industrial";
    SPR["i_lp_slake_lime"] = ["lb", 0, 0, { sx: 256, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_slake_lime"]) ITEMS["lp_slake_lime"].icon = "i_lp_slake_lime";
    SPR["i_lp_slake_lime_batch"] = ["lb", 0, 0, { sx: 320, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_slake_lime_batch"]) ITEMS["lp_slake_lime_batch"].icon = "i_lp_slake_lime_batch";
    SPR["i_lp_pit_lime"] = ["lb", 0, 0, { sx: 384, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_pit_lime"]) ITEMS["lp_pit_lime"].icon = "i_lp_pit_lime";
    SPR["i_lp_hydraulic_lime"] = ["lb", 0, 0, { sx: 448, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_hydraulic_lime"]) ITEMS["lp_hydraulic_lime"].icon = "i_lp_hydraulic_lime";
    SPR["i_lp_pozzolana"] = ["lb", 0, 0, { sx: 0, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_pozzolana"]) ITEMS["lp_pozzolana"].icon = "i_lp_pozzolana";
    SPR["i_lp_hydraulic_industrial"] = ["lb", 0, 0, { sx: 64, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_hydraulic_industrial"]) ITEMS["lp_hydraulic_industrial"].icon = "i_lp_hydraulic_industrial";
    SPR["i_lp_mortar_sand"] = ["lb", 0, 0, { sx: 128, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_mortar_sand"]) ITEMS["lp_mortar_sand"].icon = "i_lp_mortar_sand";
    SPR["i_lp_mortar_coarse"] = ["lb", 0, 0, { sx: 192, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_mortar_coarse"]) ITEMS["lp_mortar_coarse"].icon = "i_lp_mortar_coarse";
    SPR["i_lp_mortar_ash"] = ["lb", 0, 0, { sx: 256, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_mortar_ash"]) ITEMS["lp_mortar_ash"].icon = "i_lp_mortar_ash";
    SPR["i_lp_mortar_fine"] = ["lb", 0, 0, { sx: 320, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_mortar_fine"]) ITEMS["lp_mortar_fine"].icon = "i_lp_mortar_fine";
    SPR["i_lp_daub"] = ["lb", 0, 0, { sx: 384, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_daub"]) ITEMS["lp_daub"].icon = "i_lp_daub";
    SPR["i_lp_cob"] = ["lb", 0, 0, { sx: 448, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_cob"]) ITEMS["lp_cob"].icon = "i_lp_cob";
    SPR["i_lp_master_mortar"] = ["lb", 0, 0, { sx: 0, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_master_mortar"]) ITEMS["lp_master_mortar"].icon = "i_lp_master_mortar";
    SPR["i_lp_hydraulic_mortar"] = ["lb", 0, 0, { sx: 64, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_hydraulic_mortar"]) ITEMS["lp_hydraulic_mortar"].icon = "i_lp_hydraulic_mortar";
    SPR["i_lp_marine_mortar"] = ["lb", 0, 0, { sx: 128, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_marine_mortar"]) ITEMS["lp_marine_mortar"].icon = "i_lp_marine_mortar";
    SPR["i_lp_tabby"] = ["lb", 0, 0, { sx: 192, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_tabby"]) ITEMS["lp_tabby"].icon = "i_lp_tabby";
    SPR["i_lp_cathedral_mortar"] = ["lb", 0, 0, { sx: 256, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_cathedral_mortar"]) ITEMS["lp_cathedral_mortar"].icon = "i_lp_cathedral_mortar";
    SPR["i_lp_lime_plaster"] = ["lb", 0, 0, { sx: 320, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_lime_plaster"]) ITEMS["lp_lime_plaster"].icon = "i_lp_lime_plaster";
    SPR["i_lp_ash_plaster"] = ["lb", 0, 0, { sx: 384, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_ash_plaster"]) ITEMS["lp_ash_plaster"].icon = "i_lp_ash_plaster";
    SPR["i_lp_fine_plaster"] = ["lb", 0, 0, { sx: 448, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_fine_plaster"]) ITEMS["lp_fine_plaster"].icon = "i_lp_fine_plaster";
    SPR["i_lp_render"] = ["lb", 0, 0, { sx: 0, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_render"]) ITEMS["lp_render"].icon = "i_lp_render";
    SPR["i_lp_stucco"] = ["lb", 0, 0, { sx: 64, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_stucco"]) ITEMS["lp_stucco"].icon = "i_lp_stucco";
    SPR["i_lp_quick_whitewash"] = ["lb", 0, 0, { sx: 128, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_quick_whitewash"]) ITEMS["lp_quick_whitewash"].icon = "i_lp_quick_whitewash";
    SPR["i_lp_whitewash"] = ["lb", 0, 0, { sx: 192, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_whitewash"]) ITEMS["lp_whitewash"].icon = "i_lp_whitewash";
    SPR["i_lp_tinted_whitewash"] = ["lb", 0, 0, { sx: 256, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_tinted_whitewash"]) ITEMS["lp_tinted_whitewash"].icon = "i_lp_tinted_whitewash";
    SPR["i_lp_lime_wash_fine"] = ["lb", 0, 0, { sx: 320, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_lime_wash_fine"]) ITEMS["lp_lime_wash_fine"].icon = "i_lp_lime_wash_fine";
    SPR["i_lp_grout"] = ["lb", 0, 0, { sx: 384, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_grout"]) ITEMS["lp_grout"].icon = "i_lp_grout";
    SPR["i_lp_fine_grout"] = ["lb", 0, 0, { sx: 448, sy: 192, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["lp_fine_grout"]) ITEMS["lp_fine_grout"].icon = "i_lp_fine_grout";
})();
