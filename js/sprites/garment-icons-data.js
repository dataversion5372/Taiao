// ===== Taiao — cultural garment icons =====
// Real inventory icons for the 48 Tailoring garments (js/skills/garments.js), the
// soft-cloth wardrobe drawn from the character roster (docs/player-character-
// outfits.txt; sheet prompt docs/garment-sprite-prompt.txt). ONE self-registering
// sheet "ga" — an 8-col x 6-row grid of 64px cells — repointing each item's
// placeholder icon (i_<id>) to its real cell (row-major = garments.js order).
// Loads after garments.js; sheet self-registers in SHEET_KEYS/SHEET_TILE so
// loadAssets() pulls it into IMGS.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("gc")) SHEET_KEYS.push("gc");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["gc"] = 64;
  ASSET_DATA["gc"] = "assets/sheet-src/gc-garment-icons.webp";
  if (typeof SPR === "undefined") return;
  var IDS = [
    "wizard_hat", "flat_cap", "hood", "cowl", "cloth_coif", "turban", "desert_headwrap", "feather_headdress",
    "mage_robe", "sorcerer_robe", "cleric_vestment", "scholar_robe", "travelers_robe", "ceremonial_robe", "djinn_robe", "monk_robe",
    "tunic", "cloth_jerkin", "quilted_vest", "frock_coat", "greatcoat", "linen_dress", "peasant_dress", "tabard",
    "kimono", "hanbok", "hanfu", "poncho", "boubou", "parka", "buckskin_dress", "sari",
    "cloak", "mantle", "stole", "feathered_cloak", "fur_mantle", "moss_cloak", "hooded_cloak", "half_cape",
    "kilt", "skirt", "leggings", "loincloth", "arm_wraps", "sash", "cloth_belt", "cloth_apron"
  ];
  for (var k = 0; k < IDS.length; k++) {
    var c = k % 8, r = Math.floor(k / 8);
    SPR["i_" + IDS[k]] = ["gc", 0, 0, { sx: c * 64, sy: r * 64, sw: 64, sh: 64 }];
  }
  // Alternate-outfit garments (garments.js): no dedicated cells yet, so borrow a
  // fitting garment cell and colour-tint it — coherent art now, swap to real
  // addendum art later. flax_cloak = the "cloak" cell (row5 col0) in golden-tan
  // flax; smallclothes = the "loincloth" cell (row5 col3) in pale linen.
  SPR["i_flax_cloak"]   = ["gc", 0, 0, { sx: 0,   sy: 4 * 64, sw: 64, sh: 64, filter: "sepia(1) saturate(1.7) brightness(1.15) hue-rotate(-12deg)" }];
  SPR["i_smallclothes"] = ["gc", 0, 0, { sx: 192, sy: 5 * 64, sw: 64, sh: 64, filter: "saturate(0.45) brightness(1.28)" }];
})();
