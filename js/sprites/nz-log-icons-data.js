// ===== Isle of Emberfall - NZ tree log icons (auto-generated) =====
// Dedicated per-species log sprites (log_shapes template recoloured to NZ timber
// tones), overriding the hue-filtered generic log SPR set in nz-extra-trees.js.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["nl"] = "assets/sheets/01bb7294e3228ff4.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("nl")) SHEET_KEYS.push("nl");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["nl"] = 32;
  var P = {"rakau_wheki": {"sx": 0, "sy": 0}, "rakau_kawakawa": {"sx": 32, "sy": 0}, "rakau_rewarewa": {"sx": 64, "sy": 0}, "rakau_matai": {"sx": 96, "sy": 0}, "rakau_kauri": {"sx": 128, "sy": 0}, "rakau_kahikatea": {"sx": 160, "sy": 0}, "rakau_rata_n": {"sx": 192, "sy": 0}, "rakau_rangiora": {"sx": 224, "sy": 0}, "rakau_houhere": {"sx": 0, "sy": 32}, "rakau_koru": {"sx": 32, "sy": 32}, "rakau_horoeka": {"sx": 64, "sy": 32}, "rakau_hinau": {"sx": 96, "sy": 32}, "rakau_tanekaha": {"sx": 128, "sy": 32}, "rakau_karaka": {"sx": 160, "sy": 32}, "rakau_kowhai": {"sx": 192, "sy": 32}, "rakau_ponga": {"sx": 224, "sy": 32}, "rakau_kamahi": {"sx": 0, "sy": 64}, "rakau_tawa": {"sx": 32, "sy": 64}, "rakau_kotukutuku": {"sx": 64, "sy": 64}, "rakau_rimu": {"sx": 96, "sy": 64}, "rakau_mamaku": {"sx": 128, "sy": 64}, "rakau_tikouka": {"sx": 160, "sy": 64}, "rakau_pohutukawa": {"sx": 192, "sy": 64}, "rakau_karo": {"sx": 224, "sy": 64}, "rakau_puriri": {"sx": 0, "sy": 96}, "rakau_ngaio": {"sx": 32, "sy": 96}, "rakau_toetoe": {"sx": 64, "sy": 96}, "rakau_wharariki": {"sx": 96, "sy": 96}, "rakau_manuka": {"sx": 128, "sy": 96}, "rakau_akeake": {"sx": 160, "sy": 96}, "rakau_pukatea": {"sx": 192, "sy": 96}};
  for (var log in P) {
    var e = P[log];
    SPR["i_"+log] = ["nl", 0, 0, {sx:e.sx, sy:e.sy, sw:32, sh:32}];
    if (typeof ITEMS !== "undefined" && ITEMS[log]) ITEMS[log].icon = "i_"+log;
  }
})();
