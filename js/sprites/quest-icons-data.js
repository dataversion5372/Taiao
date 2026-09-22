// ===== Taiao — bespoke icons for the last tinted-placeholder items =====
// Real PixelLab art for the quest items, dream-realm items, late rubber goods
// and stray one-offs that still rendered as hue-tinted copies of other icons.
// Registers the "qd" sheet (a 7×4 64px atlas); tools/pack_sheets.py folds it
// into the shared icon-pack atlas and repoints it. Items created at module
// load are repointed here; lazily-created items (quests.js ensureItems,
// dream.js registerContent) keep their icon keys — those files skip their
// defineIcon tint when the bespoke SPR entry below already exists.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["qd"] = "assets/sheet-src/qd-quest-icons.webp";
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("qd")) SHEET_KEYS.push("qd");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["qd"] = 64;
  // cell order (7 per row) — must match tools' qd sheet assembly
  var ORDER = ["quail_egg", "hard_rubber", "rubber_tubing", "rubber_bands", "eraser",
    "rubber_seal", "gasket_set", "snorkel", "dyed_leather", "festival_loaf", "spyglass",
    "quench_oil", "fine_quench_oil", "forge_ember", "leviathan_resin",
    "quest_key", "quest_letter", "quest_relic", "quest_parcel", "quest_charm",
    "moonflax", "dream_amber", "moth_lantern", "bottled_lullaby", "dreamwood_charm",
    "rubber_hose", "diving_fins", "bellows_kit", "abyss_rebreather"];
  // items whose icon key uses a non-"i_" prefix
  var PREFIX = { quench_oil: "ir_", fine_quench_oil: "ir_", forge_ember: "ir_", leviathan_resin: "ir_",
    quest_key: "iq_", quest_letter: "iq_", quest_relic: "iq_", quest_parcel: "iq_", quest_charm: "iq_" };
  for (var i = 0; i < ORDER.length; i++) {
    var id = ORDER[i];
    var key = (PREFIX[id] || "i_") + id;
    SPR[key] = ["qd", 0, 0, { sx: (i % 7) * 64, sy: Math.floor(i / 7) * 64, sw: 64, sh: 64 }];
    if (typeof ITEMS !== "undefined" && ITEMS[id]) ITEMS[id].icon = key;
  }
})();
