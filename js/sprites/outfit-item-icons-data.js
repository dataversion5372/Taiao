// ===== Taiao — outfit-item inventory icons (auto-generated) =====
// One self-registering sheet "oi": a 12-col grid of 96px cells holding the 114
// icons from docs/player-character-outfit-items.txt (6 source sheets, prompts in
// docs/outfit-items-sprite-prompts.txt). Row-major order matches OUTFIT_ITEM_ORDER
// in js/skills/outfit-items.js, which repoints/creates each item's i_<id>.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("oi")) SHEET_KEYS.push("oi");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["oi"] = 96;
  window.OI_COLS = 12; window.OI_CELL = 96;
  ASSET_DATA["oi"] = "assets/sheets/oi-outfit-item-icons.5a1cd592.webp";
})();
