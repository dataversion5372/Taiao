// ===== Isle of Emberfall - Milling grain-flour inventory-icon sheet (auto-generated) =====
// 32 milled grain flours, 8x4 grid of 64px cells, in LEVEL order (req 1..32:
// wheat Flour -> Celestial quinoa flour). Repoint by the sorted Milling FLOUR
// ladder (the 2 malt grists keep their own icons). Must load AFTER the recipe/
// item defs. See docs/consumable-icon-sprite-prompts.txt (SHEET: Grain Flours).
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["ml"] = "assets/sheets/33c411904da5c8d5.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("ml")) SHEET_KEYS.push("ml");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["ml"] = 64;
  if (typeof SPR !== "undefined") for (let k = 0; k < 32; k++) SPR["i_ml" + k] = ["ml", k % 8, Math.floor(k / 8)];
  if (typeof RECIPES !== "undefined" && RECIPES.milling && typeof ITEMS !== "undefined") {
    const flours = RECIPES.milling
      .map(r => ({ out: (r.outputs && r.outputs[0] && r.outputs[0].id) || r.out, req: r.req }))
      .filter(r => r.out && r.out !== "malt_grist" && r.out !== "dark_grist")
      .sort((a, b) => a.req - b.req);
    flours.forEach((f, k) => { if (k < 32 && ITEMS[f.out]) ITEMS[f.out].icon = "i_ml" + k; });
  }
})();
