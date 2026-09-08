// ===== Isle of Emberfall — content-arrow icon repoint =====
// The simple 32-tier arrows from content.js (`arrows`, `arrows_1`..`arrows_31`)
// shipped with a placeholder "bundle of arrows" icon (tinted i_arrows) that did
// not match the fletched-arrow / arrowhead art used by the geartiers ammo. Point
// them at the same matched arrow sheet ("aw", registered by arrow-icons-data.js):
// the 16 arrow sprites are spread tier-proportionally across the 32 metals so the
// look ramps low→high and every arrow reads as a real arrow, matching the
// arrowhead design. Loads AFTER content.js (items exist) and arrow-icons-data.js
// (the "aw" sheet + i_arrow_*_aw SPR keys exist).
"use strict";
(function () {
  if (typeof ITEMS === "undefined" || typeof SPR === "undefined") return;
  // the 16 "aw" arrow sprite keys in tier order (Iron … Stormsteel)
  const AW_BARS = ["iron_bar", "bar_7", "tool_steel_bar", "bar_10", "ferrotitanium_bar",
    "bar_14", "bar_15", "bar_16", "damasteel_bar", "bar_17", "bar_18", "dragonsteel_bar",
    "bar_19", "bar_21", "bar_23", "bar_24"];
  const keys = AW_BARS.map(b => "i_arrow_" + b + "_aw").filter(k => SPR[k]);
  if (!keys.length) return; // arrow-icons-data.js not loaded / sheet missing — leave placeholders
  for (let i = 0; i < 32; i++) {
    const id = i === 0 ? "arrows" : "arrows_" + i;
    if (!ITEMS[id]) continue;
    const t = Math.min(keys.length - 1, Math.floor(i * keys.length / 32));
    ITEMS[id].icon = keys[t];
  }
})();
