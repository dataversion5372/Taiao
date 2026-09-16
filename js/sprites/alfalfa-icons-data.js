// ===== Taiao - alfalfa crop growth-stage + harvest sprites =====
// 5-frame sheet on the "al" sheet: 0-3 = Seedling/Growing/Mature/Ready plant
// billboards (foot-anchored), 4 = the cut alfalfa bundle (harvest item icon).
// Wires CROPS.alfalfa.sprStages (deferred, since husbandry-animals.js registers
// the alfalfa crop on a setTimeout) and ITEMS.alfalfa.icon.
"use strict";
(function () {
  if (typeof ASSET_DATA === "undefined") { try { window.ASSET_DATA = {}; } catch (e) { return; } }
  if (typeof SHEET_KEYS !== "undefined" && !SHEET_KEYS.includes("al")) SHEET_KEYS.push("al");
  if (typeof SHEET_TILE !== "undefined") SHEET_TILE["al"] = 128;
  ASSET_DATA["al"] = "assets/sheets/al-alfalfa-icons.5ba848b4.webp";
  if (typeof SPR === "undefined") return;
  const rect = (i) => ["al", 0, 0, { sx: i * 128, sy: 0, sw: 128, sh: 128 }];
  for (let s = 0; s < 4; s++) SPR["s_farm_cerealiculture_alfalfa_" + s] = rect(s);
  SPR["i_alfalfa"] = rect(4);
  if (typeof ITEMS !== "undefined" && ITEMS.alfalfa) ITEMS.alfalfa.icon = "i_alfalfa";
  // CROPS.alfalfa is created on a setTimeout(0) in husbandry-animals.js — attach
  // the stage sprites once it exists (this timeout is queued after that one).
  const wire = (tries) => {
    if (typeof CROPS !== "undefined" && CROPS.alfalfa) {
      CROPS.alfalfa.sprStages = [0, 1, 2, 3].map((s) => "s_farm_cerealiculture_alfalfa_" + s);
    } else if (tries > 0 && typeof setTimeout === "function") setTimeout(() => wire(tries - 1), 30);
  };
  if (typeof setTimeout === "function") setTimeout(() => wire(20), 0); else wire(0);
})();
