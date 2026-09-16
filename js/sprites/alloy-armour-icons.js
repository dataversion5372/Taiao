// ===== Taiao — alloy chestplate/legs icon fill =====
// armor-icons-data.js sources chest/legs art from assets/assorted sprites/
// armour.png, a 32-METAL sheet. Smithing's armour uses a 16-metal roster and 12
// of those metals match the sheet — but the 4 ALLOY armour metals (voidforged,
// twilight, nickel_silver, cupronickel) are NOT among the 32 painted metals, so
// their chestplate & legs fell back to the generic tinted i_body sprite. This
// repoints those 8 items onto the closest-matching UNUSED armour.png tiles
// (their "i_<kind>_<metalIndex>_ag" SPR keys already exist, created by
// armor-icons-data.js for all 32 metals):
//   voidforged   -> Voidsteel  (index 19, purple-black)
//   twilight     -> Darksteel  (index 15, dark dusky)
//   nickel_silver-> Silver     (index 5,  white-silver)
//   cupronickel  -> Eternium   (index 31, pale warm gold)
// Loads after armor-icons-data.js / gear-icons-data.js so it wins.
"use strict";
(function () {
  if (typeof SPR === "undefined" || typeof ITEMS === "undefined") return;
  var MAP = { voidforged: 19, twilight: 15, nickel_silver: 5, cupronickel: 31 };
  ["chest", "legs"].forEach(function (kind) {
    for (var metal in MAP) {
      var id = kind + "_" + metal;
      var spr = "i_" + kind + "_" + MAP[metal] + "_ag";
      if (ITEMS[id] && SPR[spr]) ITEMS[id].icon = spr;
    }
  });
})();
