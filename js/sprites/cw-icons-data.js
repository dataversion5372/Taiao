// ===== Taiao - Carpentry wooden-weapon icon sheet (25 icons) =====
// 8 wooden bucklers + 9 taiaha + 8 patu (woodcraft.js wc_buckler_/wc_taiaha_/wc_patu_).
// Slices a hand-made 9x3 sheet into the "cw" sheet and overrides each item's placeholder
// icon (defineIcon i_shield/i_sw_fe/i_staff). Loads after woodcraft.js so the items exist.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("cw")) SHEET_KEYS.push("cw");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["cw"] = 64;
  ASSET_DATA["cw"] = "assets/sheets/cw-cw-icons.0598c85b.webp";
  if (typeof SPR === "undefined") return;
    SPR["i_wc_buckler_2"] = ["cw", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_2"]) ITEMS["wc_buckler_2"].icon = "i_wc_buckler_2";
    SPR["i_wc_buckler_6"] = ["cw", 0, 0, { sx: 64, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_6"]) ITEMS["wc_buckler_6"].icon = "i_wc_buckler_6";
    SPR["i_wc_buckler_10"] = ["cw", 0, 0, { sx: 128, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_10"]) ITEMS["wc_buckler_10"].icon = "i_wc_buckler_10";
    SPR["i_wc_buckler_14"] = ["cw", 0, 0, { sx: 192, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_14"]) ITEMS["wc_buckler_14"].icon = "i_wc_buckler_14";
    SPR["i_wc_buckler_18"] = ["cw", 0, 0, { sx: 256, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_18"]) ITEMS["wc_buckler_18"].icon = "i_wc_buckler_18";
    SPR["i_wc_buckler_22"] = ["cw", 0, 0, { sx: 320, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_22"]) ITEMS["wc_buckler_22"].icon = "i_wc_buckler_22";
    SPR["i_wc_buckler_26"] = ["cw", 0, 0, { sx: 384, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_26"]) ITEMS["wc_buckler_26"].icon = "i_wc_buckler_26";
    SPR["i_wc_buckler_30"] = ["cw", 0, 0, { sx: 448, sy: 0, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_buckler_30"]) ITEMS["wc_buckler_30"].icon = "i_wc_buckler_30";
    SPR["i_wc_taiaha_manuka"] = ["cw", 0, 0, { sx: 0, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_manuka"]) ITEMS["wc_taiaha_manuka"].icon = "i_wc_taiaha_manuka";
    SPR["i_wc_taiaha_karo"] = ["cw", 0, 0, { sx: 64, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_karo"]) ITEMS["wc_taiaha_karo"].icon = "i_wc_taiaha_karo";
    SPR["i_wc_taiaha_kotukutuku"] = ["cw", 0, 0, { sx: 128, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_kotukutuku"]) ITEMS["wc_taiaha_kotukutuku"].icon = "i_wc_taiaha_kotukutuku";
    SPR["i_wc_taiaha_wheki"] = ["cw", 0, 0, { sx: 192, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_wheki"]) ITEMS["wc_taiaha_wheki"].icon = "i_wc_taiaha_wheki";
    SPR["i_wc_taiaha_karaka"] = ["cw", 0, 0, { sx: 256, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_karaka"]) ITEMS["wc_taiaha_karaka"].icon = "i_wc_taiaha_karaka";
    SPR["i_wc_taiaha_rewarewa"] = ["cw", 0, 0, { sx: 320, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_rewarewa"]) ITEMS["wc_taiaha_rewarewa"].icon = "i_wc_taiaha_rewarewa";
    SPR["i_wc_taiaha_tanekaha"] = ["cw", 0, 0, { sx: 384, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_tanekaha"]) ITEMS["wc_taiaha_tanekaha"].icon = "i_wc_taiaha_tanekaha";
    SPR["i_wc_taiaha_rata_n"] = ["cw", 0, 0, { sx: 448, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_rata_n"]) ITEMS["wc_taiaha_rata_n"].icon = "i_wc_taiaha_rata_n";
    SPR["i_wc_taiaha_kauri"] = ["cw", 0, 0, { sx: 512, sy: 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_taiaha_kauri"]) ITEMS["wc_taiaha_kauri"].icon = "i_wc_taiaha_kauri";
    SPR["i_wc_patu_ngaio"] = ["cw", 0, 0, { sx: 0, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_ngaio"]) ITEMS["wc_patu_ngaio"].icon = "i_wc_patu_ngaio";
    SPR["i_wc_patu_tikouka"] = ["cw", 0, 0, { sx: 64, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_tikouka"]) ITEMS["wc_patu_tikouka"].icon = "i_wc_patu_tikouka";
    SPR["i_wc_patu_kowhai"] = ["cw", 0, 0, { sx: 128, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_kowhai"]) ITEMS["wc_patu_kowhai"].icon = "i_wc_patu_kowhai";
    SPR["i_wc_patu_kamahi"] = ["cw", 0, 0, { sx: 192, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_kamahi"]) ITEMS["wc_patu_kamahi"].icon = "i_wc_patu_kamahi";
    SPR["i_wc_patu_tawa"] = ["cw", 0, 0, { sx: 256, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_tawa"]) ITEMS["wc_patu_tawa"].icon = "i_wc_patu_tawa";
    SPR["i_wc_patu_puriri"] = ["cw", 0, 0, { sx: 320, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_puriri"]) ITEMS["wc_patu_puriri"].icon = "i_wc_patu_puriri";
    SPR["i_wc_patu_rimu"] = ["cw", 0, 0, { sx: 384, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_rimu"]) ITEMS["wc_patu_rimu"].icon = "i_wc_patu_rimu";
    SPR["i_wc_patu_pukatea"] = ["cw", 0, 0, { sx: 448, sy: 128, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS["wc_patu_pukatea"]) ITEMS["wc_patu_pukatea"].icon = "i_wc_patu_pukatea";
})();
