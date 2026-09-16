// ===== Taiao — food & drink practical uses =====
// Gives several "food" trades a real edge beyond a one-off heal, the way
// Soapmaking (wash stink) and Candlemaking (carry light) do:
//   • Cheesemaking & Baking — hearty crafted food leaves you WELL FED: HP
//     regenerates ~3x faster for a while (longer for aged/higher-tier food).
//   • Brewing — ales & beers grant a timed STRENGTH buff; wines & meads a
//     MAGIC buff (like a milder potion, on top of any healing).
// The effects are applied in gameplay/items.js (eatItem); this file just tags
// the items. Loaded after all the food skills have defined their recipes.
"use strict";

(function () {
  if (typeof ITEMS === "undefined" || typeof RECIPES === "undefined") return;

  // WELL FED — hearty crafted food (cheeses, breads, pies, cakes …). Duration
  // scales with the recipe's tier: a basic cheese ~48s, a king's reserve ~2.5min.
  const wellFedSecs = req => 45 + Math.min(32, req || 1) * 3.2;
  ["cheesemaking", "baking"].forEach(cat => {
    (RECIPES[cat] || []).forEach(r => {
      const d = r.out && ITEMS[r.out];
      if (d && d.heals) d.wellFed = Math.round(wellFedSecs(r.req) * 1000);
    });
  });

  // BREWING — a drink's buff: ales/beers/stouts → Strength, wines/meads → Magic.
  // Skip the kegs/barrels (they have no `heals`, they're containers).
  (RECIPES.brewing || []).forEach(r => {
    const d = r.out && ITEMS[r.out];
    if (!d || !d.heals) return;
    const magic = /wine|mead|metheglin|ambrosia/i.test(d.name || r.out);
    d.drinkBuff = {
      skill: magic ? "Magic" : "Strength",
      amt: 1 + Math.min(2, Math.floor((r.req || 1) / 12)),   // +1 .. +3 by tier
      dur: 120000,                                            // 2 minutes
    };
    // a strong drink still fills you a little, but a Well-Fed heal it is not
    if (!d.wellFed && (r.req || 1) >= 18) d.wellFed = 30000;  // top-shelf drinks warm you
  });
})();
