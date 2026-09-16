// ===== Taiao — one skill per station =====
// Loaded AFTER every skill file that registers stations/recipe-lists (economy,
// husbandry, chandlery, paper, sailmaking, … all run by index.html:219).
//
// Historically each artisan trade created a dedicated station (bakehouse,
// jewelers_bench, brewery, …) AND ALSO pushed its recipe list onto one or more
// generic hubs (furnace, workbench, loom, tanrack, mill, cauldron, anvil, barn).
// The result: the same item was craftable at several stations, which the player
// found confusing. This pass collapses every recipe list to a SINGLE canonical
// station so each craftable good has exactly one home — and, for all but the
// legacy workbench, each station trains exactly one skill.
//
// Canonical station for a list = the station hosting it that has the FEWEST
// total lists (i.e. the specialist bench, which hosts only that one), ties
// broken by station key. This keeps cook→campfire (not furnace), jewelry→
// jewelers_bench (not furnace), tailoring→tailors_bench (not loom/workbench),
// husbandry→barn, cheesemaking→creamery, and so on. Every specialist is in the
// city artisan roster (features.js CITY_ARTISANS), so nothing becomes
// unreachable. `STATIONS[*].lists` is the single source of truth the crafting
// UI (crafting.js openStation) and world-map tooltip (world.js wmStationSkills)
// read, so fixing it here fixes both.
(function () {
  if (typeof STATIONS === "undefined") return;

  const size = {};
  for (const k in STATIONS) size[k] = (STATIONS[k].lists || []).length;

  // pick the canonical station for every list
  const canon = {};
  for (const k in STATIONS)
    for (const l of (STATIONS[k].lists || [])) {
      const cur = canon[l];
      if (!cur || size[k] < size[cur] || (size[k] === size[cur] && k < cur)) canon[l] = k;
    }

  // rebuild each station's lists: keep only the lists it owns (dedup, order kept)
  let moved = 0;
  for (const k in STATIONS) {
    const L = STATIONS[k].lists;
    if (!L) continue;
    const kept = [];
    for (const l of L) {
      if (canon[l] === k) { if (!kept.includes(l)) kept.push(l); }
      else moved++;
    }
    STATIONS[k].lists = kept;
  }

  if (typeof console !== "undefined" && console.debug)
    console.debug("[one-skill-per-station] collapsed " + moved + " duplicate station→list links");
})();
