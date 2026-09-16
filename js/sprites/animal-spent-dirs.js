// ===== Taiao — per-DIRECTION spent frames for husbandry animals =====
// A tended ("spent"/recovering) animal used to swap to its single fixed spent
// pose while it kept wandering — so half the time it appeared to WALK
// BACKWARDS. Each animal's sheet only bakes ONE spent frame, so here we derive
// a full 8-direction spent set instead: clone the corrected mcd_ walk frames
// (must load AFTER animal-dir-fix.js, which rewrites those) and stack the
// spent recolour filter on top — buildAtlas applies crop + filter together.
// render3d then picks "<spentKey>_<dir>" for directional monsters.
"use strict";
(function () {
  if (typeof SPR === "undefined" || typeof DIR8 === "undefined" ||
      typeof window === "undefined" || !window.HUSB_SPENT_SPR) return;
  const DEFAULT_FILTER = "brightness(0.85) saturate(0.55)";
  for (const base in window.HUSB_SPENT_SPR) {
    const spentKey = window.HUSB_SPENT_SPR[base];
    // the spent LOOK: reuse the curated single-frame filter where one exists
    // (chicken/cow/bee), else the generic drained tint. (m_sheep_shorn is real
    // shorn art with no filter — its dir frames get the generic tint, which
    // reads as "pale, docked sheep" and beats a wool-flickering fixed pose.)
    const single = SPR[spentKey];
    const filter = (single && single[3] && single[3].filter) || DEFAULT_FILTER;
    for (const d of DIR8) {
      const dk = spentKey + "_" + d;
      if (SPR[dk]) continue;
      const e = SPR["mcd_" + base + "_" + d];
      if (!e) continue;                        // non-directional animal: keep the single pose
      const opts = Object.assign({}, e[3]);
      // a base frame that is itself a recolour keeps its filter, spent on top
      opts.filter = opts.filter ? opts.filter + " " + filter : filter;
      SPR[dk] = [e[0], e[1], e[2], opts];
    }
  }
})();
