// ===== Isle of Emberfall - Fletching wooden-weapon icon sheet (25 icons) =====
// 8 bows + 8 staves + 8 kōpere (woodcraft.js wc_bow_/wc_staff_/wc_kopere_) + the generic
// arrow_shafts bundle. Slices a hand-made 9x3 sheet into the "fw" sheet and overrides each
// item's placeholder icon (i_bow/i_staff via defineIcon; i_shafts for arrow_shafts).
// Loads after woodcraft.js so the items exist.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("fw")) SHEET_KEYS.push("fw");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["fw"] = 64;
  ASSET_DATA["fw"] = "assets/sheets/fb1ac688aba8741f.webp";
  if (typeof SPR === "undefined") return;
    SPR["i_wc_bow_0"] = ["fw", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_0"]) ITEMS["wc_bow_0"].icon = "i_wc_bow_0";
    SPR["i_wc_bow_4"] = ["fw", 0, 0, { sx: 64, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_4"]) ITEMS["wc_bow_4"].icon = "i_wc_bow_4";
    SPR["i_wc_bow_8"] = ["fw", 0, 0, { sx: 128, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_8"]) ITEMS["wc_bow_8"].icon = "i_wc_bow_8";
    SPR["i_wc_bow_12"] = ["fw", 0, 0, { sx: 192, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_12"]) ITEMS["wc_bow_12"].icon = "i_wc_bow_12";
    SPR["i_wc_bow_16"] = ["fw", 0, 0, { sx: 256, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_16"]) ITEMS["wc_bow_16"].icon = "i_wc_bow_16";
    SPR["i_wc_bow_20"] = ["fw", 0, 0, { sx: 320, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_20"]) ITEMS["wc_bow_20"].icon = "i_wc_bow_20";
    SPR["i_wc_bow_24"] = ["fw", 0, 0, { sx: 384, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_24"]) ITEMS["wc_bow_24"].icon = "i_wc_bow_24";
    SPR["i_wc_bow_28"] = ["fw", 0, 0, { sx: 448, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_bow_28"]) ITEMS["wc_bow_28"].icon = "i_wc_bow_28";
    SPR["i_arrow_shafts"] = ["fw", 0, 0, { sx: 512, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["arrow_shafts"]) ITEMS["arrow_shafts"].icon = "i_arrow_shafts";
    SPR["i_wc_staff_1"] = ["fw", 0, 0, { sx: 0, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_1"]) ITEMS["wc_staff_1"].icon = "i_wc_staff_1";
    SPR["i_wc_staff_5"] = ["fw", 0, 0, { sx: 64, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_5"]) ITEMS["wc_staff_5"].icon = "i_wc_staff_5";
    SPR["i_wc_staff_9"] = ["fw", 0, 0, { sx: 128, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_9"]) ITEMS["wc_staff_9"].icon = "i_wc_staff_9";
    SPR["i_wc_staff_13"] = ["fw", 0, 0, { sx: 192, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_13"]) ITEMS["wc_staff_13"].icon = "i_wc_staff_13";
    SPR["i_wc_staff_17"] = ["fw", 0, 0, { sx: 256, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_17"]) ITEMS["wc_staff_17"].icon = "i_wc_staff_17";
    SPR["i_wc_staff_21"] = ["fw", 0, 0, { sx: 320, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_21"]) ITEMS["wc_staff_21"].icon = "i_wc_staff_21";
    SPR["i_wc_staff_25"] = ["fw", 0, 0, { sx: 384, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_25"]) ITEMS["wc_staff_25"].icon = "i_wc_staff_25";
    SPR["i_wc_staff_29"] = ["fw", 0, 0, { sx: 448, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_staff_29"]) ITEMS["wc_staff_29"].icon = "i_wc_staff_29";
    SPR["i_wc_kopere_akeake"] = ["fw", 0, 0, { sx: 0, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_akeake"]) ITEMS["wc_kopere_akeake"].icon = "i_wc_kopere_akeake";
    SPR["i_wc_kopere_houhere"] = ["fw", 0, 0, { sx: 64, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_houhere"]) ITEMS["wc_kopere_houhere"].icon = "i_wc_kopere_houhere";
    SPR["i_wc_kopere_ponga"] = ["fw", 0, 0, { sx: 128, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_ponga"]) ITEMS["wc_kopere_ponga"].icon = "i_wc_kopere_ponga";
    SPR["i_wc_kopere_pohutukawa"] = ["fw", 0, 0, { sx: 192, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_pohutukawa"]) ITEMS["wc_kopere_pohutukawa"].icon = "i_wc_kopere_pohutukawa";
    SPR["i_wc_kopere_hinau"] = ["fw", 0, 0, { sx: 256, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_hinau"]) ITEMS["wc_kopere_hinau"].icon = "i_wc_kopere_hinau";
    SPR["i_wc_kopere_matai"] = ["fw", 0, 0, { sx: 320, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_matai"]) ITEMS["wc_kopere_matai"].icon = "i_wc_kopere_matai";
    SPR["i_wc_kopere_mamaku"] = ["fw", 0, 0, { sx: 384, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_mamaku"]) ITEMS["wc_kopere_mamaku"].icon = "i_wc_kopere_mamaku";
    SPR["i_wc_kopere_kahikatea"] = ["fw", 0, 0, { sx: 448, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_kopere_kahikatea"]) ITEMS["wc_kopere_kahikatea"].icon = "i_wc_kopere_kahikatea";
})();
