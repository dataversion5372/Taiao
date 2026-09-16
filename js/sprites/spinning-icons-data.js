// ===== Taiao - spun-yarn (Spinning) inventory-icon sheet (auto-generated) =====
// 8x4 grid of 64px cells: one distinct spun yarn per fibre, in tier order. All 32
// Spinning tiers now produce a DISTINCT yarn item (fillout.js full split), so we
// repoint data-drivenly: sort RECIPES.spinning by req and point each output item's
// icon at cell N (0..31). Background was a lit gradient, removed with an edge-
// stopping + texture-aware region grow (pack_grad2.py). See docs/consumable-icon-
// sprite-prompts.txt (SHEET: Spun Yarns & Threads).
"use strict";
(function(){
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["sp"] = "assets/sheet-src/sp-spinning-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("sp")) SHEET_KEYS.push("sp");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["sp"] = 64;
  if (typeof SPR !== "undefined") for (let k = 0; k < 32; k++) SPR["i_sp" + k] = ["sp", k % 8, Math.floor(k / 8)];
  if (typeof RECIPES !== "undefined" && RECIPES.spinning && typeof ITEMS !== "undefined") {
    const spins = RECIPES.spinning
      .map(r => ({ out: (r.outputs && r.outputs[0] && r.outputs[0].id) || r.out, req: r.req }))
      .filter(r => r.out)
      .sort((a, b) => a.req - b.req);
    spins.forEach((s, k) => { if (k < 32 && ITEMS[s.out]) ITEMS[s.out].icon = "i_sp" + k; });
  }
})();
