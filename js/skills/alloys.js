// ===== Taiao — Smeltable alloys =====
// Bronze (copper+tin, fixed to be a real alloy in data.js) is the only alloy
// bar in the base 32-tier METALS ladder. This adds 15 more: real-world alloys
// at the low/mid tiers (brass, pewter, cupronickel, tool steel, rose gold,
// sterling silver, nickel silver, white gold, ferrotitanium) and legendary/
// fantasy alloys at the high tiers (Damasteel, Voidforged steel, Dragonsteel,
// Twilight alloy, Skysteel, Chronesteel), each smelted from two (or three)
// of the 32 METALS ores. Loaded after content.js (needs METALS/tierXp/
// defineIcon) and metalcraft.js (shares its "tinted placeholder" convention —
// no unique art exists for these, unlike the 32 base tiers).
"use strict";

(function () {
  const idxByOre = {};
  METALS.forEach((m, i) => { idxByOre[m.ore] = i; });

  let pi = 700;
  const mk = (id, name, comps, extra) => {
    if (ITEMS[id]) return;
    defineIcon("i_" + id, "i_bar_au", pi++, extra || "");
    const totalVal = Object.entries(comps).reduce((s, [oreId, qty]) => s + (ITEMS[oreId] ? ITEMS[oreId].value : 5) * qty, 0);
    const maxIdx = Math.max(...Object.keys(comps).map(o => idxByOre[o] != null ? idxByOre[o] : 0));
    // capped to MAX_LEVEL (32) — a stale higher-scale constant here would make
    // the top alloys permanently uncraftable, same bug fixed below for Tin
    const req = Math.min(MAX_LEVEL, maxIdx + 2);
    const xp = Math.round(tierXp(maxIdx, 35));
    ITEMS[id] = { name, icon: "i_" + id, stack: true, value: Math.round(totalVal * 1.6), alloyTier: maxIdx };
    const compNames = Object.keys(comps).map(o => ITEMS[o].name.replace(/ ore$/, "")).join(" and ");
    EXAMINE[id] = `An alloy bar of ${compNames.toLowerCase()}.`;
    registerPlaceholder(id, name, "alloy bar — tinted placeholder");
    RECIPES.smelt.push({
      id: "smelt_" + id, out: id, name: "Smelt " + name.toLowerCase(), skill: "Smelting",
      req, xp, in: comps, tick: 1700 + req * 12, family: "alloys", stations: ["furnace"],
    });
  };

  // ---- real-world alloys (low/mid tiers) ----
  mk("brass_bar",            "Brass bar",            { copper_ore: 1, ore_3: 1 },              " hue-rotate(35deg) saturate(1.15) brightness(1.05)");
  mk("pewter_bar",           "Pewter bar",           { ore_1: 1, ore_4: 1 },                   " saturate(0.2) brightness(0.95)");
  mk("cupronickel_bar",      "Cupronickel bar",      { copper_ore: 1, ore_6: 1 },              " hue-rotate(-10deg) saturate(0.5) brightness(1.0)");
  mk("tool_steel_bar",       "Tool steel bar",       { iron_ore: 1, ore_7: 1 },                " saturate(0.7) brightness(0.85) hue-rotate(190deg)");
  mk("rose_gold_bar",        "Rose gold bar",        { copper_ore: 1, gold_ore: 1 },           " hue-rotate(-20deg) saturate(1.2) brightness(1.1)");
  mk("sterling_silver_bar",  "Sterling silver bar",  { ore_5: 1, copper_ore: 1 },              " saturate(0.2) brightness(1.25)");
  mk("nickel_silver_bar",    "Nickel silver bar",    { copper_ore: 1, ore_3: 1, ore_6: 1 },    " saturate(0.15) brightness(1.15)");
  mk("white_gold_bar",       "White gold bar",       { gold_ore: 1, ore_9: 1 },                " saturate(0.35) brightness(1.3)");
  mk("ferrotitanium_bar",    "Ferrotitanium bar",    { iron_ore: 1, ore_11: 1 },               " saturate(0.5) brightness(0.95) hue-rotate(160deg)");

  // ---- legendary / fantasy alloys (high tiers) ----
  mk("damasteel_bar",        "Damasteel bar",        { iron_ore: 1, ore_16: 1 },               " saturate(0.6) brightness(0.9) hue-rotate(210deg)");
  mk("voidforged_bar",       "Voidforged steel bar", { ore_15: 1, ore_19: 1 },                 " hue-rotate(260deg) saturate(1.1) brightness(0.8)");
  mk("dragonsteel_bar",      "Dragonsteel bar",      { ore_18: 1, ore_17: 1 },                 " hue-rotate(-30deg) saturate(1.3) brightness(1.0)");
  mk("twilight_bar",         "Twilight alloy bar",   { ore_25: 1, ore_26: 1 },                 " hue-rotate(280deg) saturate(1.2) brightness(1.05)");
  mk("skysteel_bar",         "Skysteel bar",         { ore_27: 1, ore_28: 1 },                 " hue-rotate(190deg) saturate(1.2) brightness(1.2)");
  mk("chronesteel_bar",      "Chronesteel bar",      { ore_30: 1, ore_31: 1 },                 " hue-rotate(45deg) saturate(1.3) brightness(1.25)");
  mk("giltsilver_bar",       "Giltsilver bar",       { gold_ore: 1, ore_5: 1 },                " hue-rotate(-15deg) saturate(0.5) brightness(1.35)");

  // Copper and Tin are Bronze's two alloy-forming ores — both should smelt at
  // level 1, same as Bronze itself (an explicit exception to the linear i+1
  // req every other base metal uses; copper_ore's own bar IS bronze_bar so it
  // needs no separate patch, but Tin gets its own pure bar too).
  const tinSmelt = RECIPES.smelt.find(r => r.out === "bar_1");
  if (tinSmelt) tinSmelt.req = 1;

  // Every smelt FIRING now takes 6× as long (user request 2026-09-15).
  // Applied ONCE here for every bar uniformly (data.js base + content.js
  // tiers + the alloys above). NOTE: bestiary-drops.js later normalizes
  // every Smelting recipe into a SIX-ITEM FURNACE LOAD (inputs sum to 6,
  // out qty 6, xp ×6) — so the tick below is per six-bar FIRING, not per
  // bar; per-bar throughput ends up at the original pace.
  const SMELT_TIME_MULT = 6;
  for (const r of RECIPES.smelt) if (r.tick) r.tick *= SMELT_TIME_MULT;

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
