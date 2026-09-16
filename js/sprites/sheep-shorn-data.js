// ===== Taiao - shorn-sheep monster sprite (PixelLab-generated) =====
// A freshly shorn sheep (bare pink skin), shown on a sheep whose wool has been
// sheared (js/skills/husbandry-animals.js). Registered as sprite key
// "m_sheep_shorn" so the monster renderer can swap to it per-animal.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["ms"] = "assets/sheet-src/ms-sheep-shorn.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ms")) SHEET_KEYS.push("ms");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["ms"] = 64;
  if (typeof SPR !== "undefined") SPR["m_sheep_shorn"] = ["ms", 0, 0, {sx:0, sy:0, sw:64, sh:64}];
})();
