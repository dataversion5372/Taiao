// ===== Isle of Emberfall — New Zealand fish inventory icons (raw + cooked) =====
// Fishing levels 1-24 (content.js indices 0-23) are NZ catches; their icons used
// hue-tinted monster-sheet cells (FISH_SPRS). Two 8x3 64px sheets give each its
// own art: "fr" = the RAW catch, "fk" = the COOKED dish. Cell index i (row-major)
// = FISH[i]; raw -> ITEMS[i?"raw_f"+i:"raw_fish"], cooked -> ITEMS[i?"fish_"+i:
// "cooked_fish"]. Loads after content.js so the fish ITEMS exist. Levels 25-32
// (fantastical fish) are left on their placeholders. (New SPR keys are used, so
// the world "rising fish" sprite i_rawf<i> is untouched.)
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") window.ASSET_DATA = {};
  ASSET_DATA["fr"] = "assets/sheets/8712bbac3faf8543.webp";
  ASSET_DATA["fk"] = "assets/sheets/e7cb83846173a8d4.webp";
  if (typeof SHEET_KEYS !== "undefined") { if (!SHEET_KEYS.includes("fr")) SHEET_KEYS.push("fr"); if (!SHEET_KEYS.includes("fk")) SHEET_KEYS.push("fk"); }
  if (typeof SHEET_TILE !== "undefined") { SHEET_TILE["fr"] = 64; SHEET_TILE["fk"] = 64; }
  if (typeof SPR === "undefined") return;
  for (var i = 0; i < 24; i++) {
    var col = i % 8, row = (i / 8) | 0, rect = { sx: col * 64, sy: row * 64, sw: 64, sh: 64 };
    var rspr = "i_fishraw_" + i, cspr = "i_fishckd_" + i;
    SPR[rspr] = ["fr", 0, 0, rect];
    SPR[cspr] = ["fk", 0, 0, rect];
    if (typeof ITEMS === "undefined") continue;
    var rawId = i === 0 ? "raw_fish" : "raw_f" + i;
    var ckdId = i === 0 ? "cooked_fish" : "fish_" + i;
    if (ITEMS[rawId]) ITEMS[rawId].icon = rspr;
    if (ITEMS[ckdId]) ITEMS[ckdId].icon = cspr;
  }
})();
