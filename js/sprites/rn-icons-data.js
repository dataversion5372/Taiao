// ===== Isle of Emberfall - Action/State Rune icon sheet (2 icons) =====
// The two monster-dropped raw runes that replaced rune_essence as the Runecrafting input:
// action_rune (gold medallion, kinetic verb-glyph) inscribes the 12 VERB runes; state_rune
// (grey stone octagon, elemental sigil) inscribes the 20 substance/modifier/wildcard runes.
// Slices the hand-made 2x1 sheet into the "rn" sheet and repoints both items.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("rn")) SHEET_KEYS.push("rn");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["rn"] = 64;
  ASSET_DATA["rn"] = "assets/sheets/8573efe5bead3ece.webp";
  if (typeof SPR === "undefined") return;
  SPR["i_action_rune"] = ["rn", 0, 0, { sx: 0, sy: 0, sw: 64, sh: 64 }];
  SPR["i_state_rune"] = ["rn", 0, 0, { sx: 64, sy: 0, sw: 64, sh: 64 }];
  if (typeof ITEMS !== "undefined") {
    if (ITEMS.action_rune) ITEMS.action_rune.icon = "i_action_rune";
    if (ITEMS.state_rune) ITEMS.state_rune.icon = "i_state_rune";
  }
})();
