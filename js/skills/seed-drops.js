// ===== Isle of Emberfall — every agriculture seed drops from a monster =====
// Invariant (per design): ALL agriculture seeds must appear in at least one
// monster's drop table, so a player can obtain every crop by hunting, not only
// by buying from the general store. Some low-tier seeds already drop (via
// bestiary-drops.js procedural loot); this fills every remaining gap.
//
// Assignment: each still-undropped seed is placed on a base monster whose LEVEL
// is near the seed's crop TIER (tougher monsters → higher-tier crop seeds),
// round-robined across the monsters in that level band so drops spread out.
// Data-driven, so new seeds are covered automatically. Loaded after CROPS
// (agriculture.js) and all monster/drop modules (before main.js).
"use strict";

// Deferred to a macrotask so it runs AFTER husbandry-animals.js's own
// setTimeout(0) that registers CROPS.alfalfa (that timer is scheduled earlier,
// so ours fires after it) — otherwise alfalfa_seeds would be missed.
function _assignSeedDrops() {
  if (typeof MONSTERS === "undefined" || typeof CROPS === "undefined") return;
  const AGRI = new Set(["Cerealiculture", "Olericulture", "Pomiculture", "Herbiculture", "Fibriculture", "Farming"]);

  // agriculture seeds → their crop tier (lowest req if a seed is shared)
  const seedTier = {};
  for (const k in CROPS) {
    const c = CROPS[k];
    if (!c.seed || !AGRI.has(c.skill)) continue;
    const t = c.req || 1;
    if (!(c.seed in seedTier) || t < seedTier[c.seed]) seedTier[c.seed] = t;
  }

  // seeds already reachable from some monster's drop table
  const dropped = new Set();
  for (const kind in MONSTERS) for (const d of (MONSTERS[kind].drops || [])) dropped.add(d.id);

  // candidate monsters: real, huntable base creatures (no husbandry babies, no
  // "_v" elite variants — seeds should come from ordinary encounters)
  const mobs = Object.keys(MONSTERS)
    .filter(k => !/_baby$/.test(k) && !/_v$/.test(k) && MONSTERS[k].lvl != null)
    .map(k => ({ k, lvl: MONSTERS[k].lvl }))
    .sort((a, b) => a.lvl - b.lvl);
  if (!mobs.length) return;
  const maxLvl = mobs[mobs.length - 1].lvl;

  // monsters within an expanding window around a target level (never empty)
  const nearMobs = lvl => {
    for (let win = 3; win <= maxLvl + 1; win *= 2) {
      const list = mobs.filter(m => Math.abs(m.lvl - lvl) <= win);
      if (list.length) return list;
    }
    return [mobs[0]];
  };

  // crop tiers (1..maxTier) span the FULL monster level range, so tier-1 seeds
  // drop from the weakest creatures and the tier-31/32 seeds from the very
  // highest-level monsters in the game (which reach well past level 32).
  const maxTier = Math.max(1, ...Object.values(seedTier));
  const targetLvlFor = tier => maxTier <= 1 ? maxLvl
    : Math.round(1 + (tier - 1) / (maxTier - 1) * (maxLvl - 1));

  const rr = {};            // per-target round-robin counter (spreads drops out)
  let added = 0;
  const missing = Object.keys(seedTier).filter(s => !dropped.has(s)).sort((a, b) => seedTier[a] - seedTier[b]);
  for (const seed of missing) {
    const tgt = Math.min(maxLvl, Math.max(1, targetLvlFor(seedTier[seed])));
    const list = nearMobs(tgt);
    const i = (rr[tgt] = (rr[tgt] || 0) + 1) - 1;
    const def = MONSTERS[list[i % list.length].k];
    def.drops = def.drops || [];
    if (!def.drops.some(d => d.id === seed)) { def.drops.push({ id: seed, min: 1, max: 2, ch: 0.06 }); added++; }
  }
  if (typeof window !== "undefined") window._seedDropsAdded = added;
}
if (typeof setTimeout === "function") setTimeout(_assignSeedDrops, 0);
else _assignSeedDrops();
