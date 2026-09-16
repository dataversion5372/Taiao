// ===== Taiao - Dyeing/Weaving/Papermaking icon sheet (auto-generated) =====
// 8x8 grid of 64px cells (58 icons + 6 blank). Replaces placeholder/prototype
// icons across three skills. Content-aware sliced (icons overflow an even grid).
// Order: A) 16 dye pigments  B) 8 dyed textiles  C) 21 fibre cloths (crop_10..30)
// D) 13 paper goods. See docs/consumable-icon-sprite-prompts.txt.
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["tp"] = "assets/sheet-src/tp-textile-paper-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("tp")) SHEET_KEYS.push("tp");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["tp"] = 64;
  if (typeof SPR !== "undefined") for (let k = 0; k < 64; k++) SPR["i_tp" + k] = ["tp", k % 8, Math.floor(k / 8)];
  const fibreCloths = [];
  for (let n = 10; n <= 30; n++) fibreCloths.push("cloth_yarn_fibriculture_crop_" + n);
  const ORDER = [
    // A — 16 dye pigments
    "madder_dye","weld_dye","woad_dye","verdigris_dye","walnut_dye","ochre_dye","crimson_dye","indigo_dye",
    "saffron_dye","tyrian_dye","irongall_dye","scarlet_dye","ember_dye","frost_dye","void_dye","starlight_dye",
    // B — 8 dyed textiles
    "dyed_wool_yarn","dyed_linen_thread","dyed_cotton_yarn","dyed_silk_thread",
    "dyed_wool_cloth","dyed_linen_cloth","dyed_cotton_cloth","dyed_silk_cloth",
    // C — 21 fibre cloths
    ...fibreCloths,
    // D — 13 paper goods
    "pulp","paper","fine_paper","cardstock","parchment","vellum","papyrus",
    "ink","iron_gall_ink","gold_ink","hide_glue","sealing_wax","quill",
  ];
  if (typeof ITEMS !== "undefined") ORDER.forEach((id, k) => { if (ITEMS[id]) ITEMS[id].icon = "i_tp" + k; });
})();
