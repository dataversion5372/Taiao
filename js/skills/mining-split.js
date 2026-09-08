// ===== Isle of Emberfall — specialised mining =====
// Splits Mining into two gathering professions:
//   Ore-mining (metal ores + structural stone) · Gem-mining (gems + decorative stone)
//
// Quarrying was folded back in: its stone deposits are re-tagged to Ore-mining
// (building stone) or Gem-mining (crystalline/decorative stone), and stone also
// drops as a by-product of mining ores or gems (gathering.js). The legacy Mining
// and Quarrying skill ids are kept for save migration.
// Loaded in the early group (after content.js, before world/chunks.js).
"use strict";

(function () {
  const SK = ["Ore-mining", "Gem-mining", "Stone-mining"];
  for (const s of SK) { if (!SKILLS.includes(s)) SKILLS.push(s); SKILL_CATEGORY[s] = "Gathering"; }

  // ---- re-tag every metal ore rock (+ essence) from Mining → Ore-mining ----
  if (typeof METALS !== "undefined") for (const m of METALS) { const nt = NODE_TYPES[m.rock]; if (nt) nt.skill = "Ore-mining"; }
  if (NODE_TYPES.essence) NODE_TYPES.essence.skill = "Ore-mining";

  let pi = 950;
  const mkStone = (id, name) => {
    if (ITEMS[id]) return;
    defineIcon("i_" + id, "i_iron", pi++, " brightness(1.1) saturate(0.2)");
    ITEMS[id] = { name, icon: "i_" + id, stack: true, value: 4 + (pi % 7) };
    EXAMINE[id] = EXAMINE[id] || `A block of ${name.toLowerCase()}.`;
    registerPlaceholder(id, name, "quarried stone — tinted placeholder");
  };
  const mkRockSpr = (key, base, i) => { if (!SPR[key]) SPR[key] = [SPR[base][0], SPR[base][1], SPR[base][2], { filter: `hue-rotate(${(i * 37) % 360}deg) saturate(0.7) brightness(1.05)` }]; };

  // ---- 32 stone deposits (folded into Ore-mining / Gem-mining) ----
  const STONE = [
    ["limestone", "Limestone"], ["building_stone", "Building stone"], ["sandstone", "Sandstone"],
    ["clay", "Clay"], ["sand", "Sand"], ["granite", "Granite"], ["slate", "Slate"], ["flint", "Flint"],
    ["chalk", "Chalk"], ["gravel_stone", "Gravel"], ["basalt", "Basalt"], ["marble", "Marble"],
    ["alabaster", "Alabaster"], ["gneiss", "Gneiss"], ["quartzite", "Quartzite"], ["travertine", "Travertine"],
    ["schist", "Schist"], ["shale", "Shale"], ["dolomite", "Dolomite"], ["soapstone", "Soapstone"],
    ["bluestone", "Bluestone"], ["porphyry", "Porphyry"], ["pumice", "Pumice"], ["tuff", "Tuff"],
    ["obsidian_stone", "Obsidian"], ["greenstone", "Greenstone"], ["redstone", "Red sandstone"],
    ["blackstone", "Blackstone"], ["frostmarble", "Frost marble"], ["emberstone", "Ember stone"],
    ["voidstone", "Voidstone"], ["worldstone", "Worldstone"],
  ];
  // Stone has NO dedicated world nodes — it drops as a random by-product of mining
  // ore or gem rocks, gated by mining level (gathering.js). We just register the
  // stone ITEMS here and export the tier table so the drop scales with level.
  STONE.forEach(([id, name]) => mkStone(id, name));
  // flint is now the tinder for lighting fires (firemaking.js) — stock it at the
  // general store so a spark's always within reach, not only mined.
  if (typeof SHOP_STOCK !== "undefined" && ITEMS.flint && SHOP_STOCK.indexOf("flint") < 0) SHOP_STOCK.push("flint");
  const STONE_TIERS = STONE.map(([id], i) => ({ id, req: i + 1 }));
  // Stone-mining XP per stone id (scales with tier) — collecting any stone from
  // mining (a boulder's yield or the ore/gem by-product) trains Stone-mining.
  const STONE_XP = {};
  STONE_TIERS.forEach(s => { STONE_XP[s.id] = tierXp(s.req - 1, 12); });
  if (typeof window !== "undefined") { window.STONE_TIERS = STONE_TIERS; window.STONE_XP = STONE_XP; }

  // ---- Gem-mining: 32 gem veins (each yields its own tiered "Rough <gem>") ----
  const GEM_NAMES = ["Quartz", "Agate", "Jasper", "Garnet", "Onyx", "Amethyst", "Topaz", "Citrine",
    "Peridot", "Zircon", "Tourmaline", "Beryl", "Aquamarine", "Turquoise", "Jade", "Malachite",
    "Lapis", "Opal", "Moonstone", "Sunstone", "Bloodstone", "Spinel", "Ruby", "Sapphire", "Emerald",
    "Diamond", "Amber", "Star sapphire", "Fire opal", "Voidgem", "Aethergem", "Worldheart"];
  const GEM_NODES = [];
  GEM_NAMES.forEach((name, i) => {
    const key = "gemvein_" + i;
    const gid = "gem_" + i;
    // Each gem tier is its own rough-gem item (own icon via js/sprites/gem-icons-data.js).
    // Any gem_i is spendable exactly like the generic "gem" — see the gem-family shim in
    // production.js (countItemFam/removeItemFam), so mining still feeds every gem recipe.
    const tv = typeof tierVal === "function" ? tierVal(i) : Math.round(4 * Math.pow(1.16, i));
    // "Rough <gem>" so the mined stone reads distinct from the assayer's CUT gem of
    // the same mineral (e.g. rough ruby vs the cut "Ruby"). Vein name stays "<Gem> vein".
    if (typeof ITEMS !== "undefined" && !ITEMS[gid])
      ITEMS[gid] = { name: "Rough " + name.toLowerCase(), icon: "i_gem", stack: true, value: 40 + tv * 3 };
    if (typeof window !== "undefined") { window.ITEM_FAMILY = window.ITEM_FAMILY || {}; window.ITEM_FAMILY[gid] = "gem"; }
    mkRockSpr("s_gem" + i, "rock_essence", i + 5);
    NODE_TYPES[key] = {
      name: name + " vein", spr: "s_gem" + i, skill: "Gem-mining", req: i + 1,
      xp: Math.round(30 * (1 + i * 0.55)), item: gid, tool: "pickaxe",
      tick: 1700 + i * 18, depleteCh: 1, respawn: respawnFor(i + 1), deadSpr: "rock_dead", gemCh: 0,
    };
    GEM_NODES.push(key);
  });

  // exported for chunks.js world-scatter injection
  if (typeof window !== "undefined") window.GEM_NODES = GEM_NODES;

  // The plain `gem` item is folded into the tiered system: it stays only as the
  // family-head TOKEN recipes are written against (production.js family shim),
  // but every gem you actually PICK UP is now a tiered "Rough <gem>". rollGemId
  // rolls a tier for loot (monster drops / ore by-product), weighted toward the
  // common low tiers with the odd rare, optionally capped to `maxTier`.
  if (typeof window !== "undefined") {
    window.GEM_TIER_IDS = GEM_NAMES.map((_, i) => "gem_" + i);
    window.rollGemId = function (maxTier) {
      const ids = window.GEM_TIER_IDS;
      const n = (maxTier == null) ? ids.length : Math.max(1, Math.min(ids.length, (maxTier | 0) + 1));
      const r = Math.random();
      return ids[Math.min(n - 1, Math.floor(r * r * n))];   // quadratic bias → commoner low gems
    };
  }
  // ~12% gem veins, else the caller's default (metal ore rock). Uses the chunk
  // RNG passed in; returns a node key or null to fall through. (Stone has no
  // nodes any more — it drops as a by-product of mining these.)
  // Vein tier is cubic-biased toward the low end: Quartz boulders are the most
  // abundant (~31% of all veins), each tier up rarer, Worldheart ~1%.
  window.mineExtraNode = function (rng) {
    if (rng() < 0.12 && GEM_NODES.length) {
      const r = rng();
      return GEM_NODES[Math.min(GEM_NODES.length - 1, Math.floor(r * r * r * GEM_NODES.length))];
    }
    return null;
  };

  Object.assign(PROD_SKILL_INTRO, {
    "Ore-mining": "Swing a pickaxe at metal ore rocks — copper and tin up through mithril and runite — the ore that feeds Smelting and the metal economy. You also turn up building stone (limestone, sandstone, granite…) as you dig, more valuable stone at higher levels.",
    "Gem-mining": "Work gem veins with a pickaxe — quartz and agate up through rubies, diamonds and worldheart — the rough stones the assayer cuts and the jeweller sets. Digging also yields decorative stone (marble, alabaster, obsidian…), the better sorts at higher levels.",
    "Stone-mining": "The quarrier's craft: every block of stone you dig — whether striking a boulder or turning it up as you mine ore and gem rocks — trains Stone-mining. A higher level lets you recover better stone, from plain limestone up through marble, obsidian and worldstone.",
    Mining: "Mining has specialised into Ore-mining and Gem-mining. Your old Mining levels are kept; new digging trains the successor skills.",
    Quarrying: "Quarrying has been folded into Ore-mining and Gem-mining — stone now comes from mining ore and gem rocks. Your old Quarrying levels carried over to Ore-mining.",
  });
})();
