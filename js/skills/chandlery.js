// ===== Taiao — Candlemaking · Soapmaking =====
// Household chandlery, downstream of Husbandry and Charcoaling.
//
//   Husbandry tallow/beeswax + Spinning wick + Dyeing/Herbs
//     → Candlemaking → tapers, pillars, scented & coloured candles, chandeliers
//   Husbandry tallow + lye (Charcoaling wood ash) + Husbandry honey/milk
//     → Soapmaking  → lye, castile, honey, milk and luxury soaps
//
// Gives tallow, beeswax and wood ash proper dedicated sinks, and new uses for
// honey/milk (soaps), linen thread (wicks), herbs (scent) and dyes (colour).
// Loaded after agriculture.js, before market.js.
"use strict";

(function () {
  const CATS = { Candlemaking: "Crafts & Arcana", Soapmaking: "Crafts & Arcana" };
  for (const s in CATS) if (!SKILLS.includes(s)) SKILLS.push(s);
  Object.assign(SKILL_CATEGORY, CATS);
  Object.assign(RECIPE_VERB, { Candlemaking: "Dipped", Soapmaking: "Boiled" });
  const LINEN = (function () { const c = Object.values(CROPS).find(c => c.name === "flax"); return c && ITEMS["yarn_" + c.item] ? "yarn_" + c.item : "wool_yarn"; })();

  // migrate the stop-gap candle recipes out of Crafting
  if (RECIPES.crafting) RECIPES.crafting = RECIPES.crafting.filter(r => r.out !== "candle");

  let pi = 900;
  const mk = (id, name, base, extra, props, note) => {
    if (ITEMS[id]) return;
    defineIcon("i_" + id, base, pi++, extra || "");
    ITEMS[id] = Object.assign({ name, icon: "i_" + id }, props);
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, note || "chandlery good — tinted placeholder");
  };
  const inputs = (base, flags) => { // h=herb(scent) d=dye(colour) o=honey e=milk c=charcoal l=clay
    const inp = Object.assign({}, base);
    if (flags.includes("h")) inp.herb = 1;
    if (flags.includes("d")) inp.madder_dye = 1;
    if (flags.includes("o")) inp.honey = 1;
    if (flags.includes("e")) inp.milk = 1;
    if (flags.includes("c")) inp.charcoal = 1;
    if (flags.includes("l")) inp.clay = 1;
    return inp;
  };

  // ====================================================================
  // CANDLEMAKING — wick + wax → candles (all reuse the `candle` light item's kin)
  // ====================================================================
  mk("wick", "Candle wick", "i_shafts", " brightness(1.2) saturate(0.3)", { stack: true, value: 3, prov: "batch" }, "wick — tinted placeholder");
  // [id, name, req, waxItem, waxQty, flags]  (candle already exists: light:true)
  const CANDLES = [
    ["rushlight", "Rushlight", 1, "tallow", 1, ""],
    ["candle", "Tallow candle", 2, "tallow", 1, ""],
    ["taper", "Wax taper", 3, "tallow", 1, ""],
    ["tealight", "Tealight", 3, "tallow", 1, ""],
    ["dinner_candle", "Dinner candle", 4, "tallow", 2, ""],
    ["beeswax_candle", "Beeswax candle", 5, "beeswax", 1, ""],
    ["votive", "Votive candle", 5, "tallow", 1, ""],
    ["pillar_candle", "Pillar candle", 6, "tallow", 3, ""],
    ["scented_candle", "Scented candle", 7, "tallow", 2, "h"],
    ["coloured_candle", "Coloured candle", 8, "tallow", 2, "d"],
    ["floating_candle", "Floating candle", 8, "beeswax", 1, ""],
    ["altar_candle", "Altar candle", 9, "beeswax", 2, ""],
    ["church_candle", "Church candle", 10, "beeswax", 3, ""],
    ["lantern_candle", "Lantern candle", 9, "tallow", 2, ""],
    ["carriage_candle", "Carriage candle", 11, "beeswax", 2, ""],
    ["ship_candle", "Ship's candle", 12, "tallow", 3, ""],
    ["storm_candle", "Storm candle", 13, "beeswax", 2, ""],
    ["signal_candle", "Signal candle", 12, "tallow", 2, "d"],
    ["chime_candle", "Chime candle", 10, "beeswax", 1, ""],
    ["bayberry_candle", "Bayberry candle", 14, "beeswax", 2, "h"],
    ["spiral_candle", "Spiral candle", 15, "beeswax", 2, ""],
    ["three_wick", "Three-wick candle", 16, "beeswax", 4, ""],
    ["perfumed_candle", "Perfumed candle", 17, "beeswax", 2, "h"],
    ["stained_candle", "Stained candle", 18, "beeswax", 2, "d"],
    ["candelabra_set", "Candelabra set", 20, "beeswax", 6, ""],
    ["chandelier_candles", "Chandelier candles", 22, "beeswax", 8, ""],
    ["scrying_candle", "Scrying candle", 24, "beeswax", 3, "hd"],
    ["ember_candle", "Ember candle", 26, "beeswax", 4, "d"],
    ["moon_candle", "Moon candle", 28, "beeswax", 4, "h"],
    ["cathedral_candles", "Cathedral candles", 30, "beeswax", 10, ""],
    ["master_chandler_set", "Master chandler's set", 32, "beeswax", 12, "hd"],
  ];
  RECIPES.candlemaking = [
    { id: "make_wick", out: "wick", qty: 3, name: "Spin candle wicks", skill: "Candlemaking", req: 1, xp: 12, in: { [LINEN]: 1 }, tick: 1200, family: "wicks", stations: ["chandlery", "workbench"] },
  ];
  for (const [id, name, req, wax, waxQty, flags] of CANDLES) {
    // light = brightness tier (1..~9 across req 1..32): higher candles cast more light at night
    if (!ITEMS[id]) mk(id, name, "i_vial", ` hue-rotate(${(req * 21) % 360}deg) saturate(1.1) brightness(1.15)`, { stack: true, value: 8 + req * 3, light: 1 + Math.floor(req / 4) }, "candle — tinted placeholder");
    // the rushlight is the PRE-wick light — a soaked rush, no spun wick —
    // which also makes it Tūhura's first dip (tutorial.js, Miles's goal)
    const cin = id === "rushlight" ? { [wax]: waxQty } : { [wax]: waxQty, wick: 1 };
    RECIPES.candlemaking.push({ id: "dip_" + id, out: id, qty: id === "candle" ? 2 : 1, name: "Dip " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Candlemaking", req, xp: 16 + req * 3, in: inputs(cin, flags), tick: 1400 + req * 20,
      family: wax === "beeswax" ? "beeswax_candles" : "tallow_candles", stations: ["chandlery", "furnace", "workbench"] });
  }

  // ====================================================================
  // SOAPMAKING — tallow + lye (from wood ash) → soaps
  // ====================================================================
  mk("lye", "Lye", "i_flour", " brightness(1.2) saturate(0.1)", { stack: true, value: 6, prov: "batch" }, "lye — tinted placeholder");
  // [id, name, req, tallowQty, lyeQty, flags]
  const SOAPS = [
    ["lye_soap", "Lye soap", 1, 1, 1, ""],
    ["tallow_soap", "Tallow soap", 2, 2, 1, ""],
    ["laundry_soap", "Laundry soap", 3, 2, 1, ""],
    ["bath_soap", "Bath soap", 4, 1, 1, "h"],
    ["oatmeal_soap", "Oatmeal soap", 5, 1, 1, ""],
    ["castile_soap", "Castile soap", 6, 2, 1, ""],
    ["rose_soap", "Rose soap", 7, 1, 1, "hd"],
    ["lavender_soap", "Lavender soap", 8, 1, 1, "h"],
    ["honey_soap", "Honey soap", 9, 1, 1, "o"],
    ["milk_soap", "Goat's-milk soap", 10, 1, 1, "e"],
    ["charcoal_soap", "Charcoal soap", 11, 1, 1, "c"],
    ["clay_soap", "Clay soap", 12, 1, 1, "l"],
    ["fishers_soap", "Fisher's soap", 8, 2, 1, ""],
    ["green_soap", "Green soap", 9, 1, 1, "d"],
    ["black_soap", "Black soap", 12, 1, 1, "c"],
    ["marseille_soap", "Marseille soap", 14, 2, 1, ""],
    ["perfumed_soap", "Perfumed soap", 15, 1, 1, "hd"],
    ["glycerin_soap", "Glycerin soap", 16, 1, 1, ""],
    ["medicinal_soap", "Medicinal soap", 17, 1, 1, "h"],
    ["saddle_soap", "Saddle soap", 13, 2, 1, ""],
    ["scouring_soap", "Scouring soap", 11, 1, 1, "l"],
    ["cream_soap", "Cream soap", 18, 1, 1, "e"],
    ["honeycomb_soap", "Honeycomb soap", 19, 1, 1, "o"],
    ["floral_soap", "Floral soap", 20, 1, 1, "hd"],
    ["luxury_soap", "Luxury soap", 22, 1, 1, "hd"],
    ["salt_soap", "Sea-salt soap", 21, 1, 1, ""],
    ["ember_soap", "Ember soap", 24, 1, 1, "cd"],
    ["moon_soap", "Moon soap", 26, 1, 1, "h"],
    ["royal_soap", "Royal soap", 28, 2, 1, "hd"],
    ["ambergris_soap", "Ambergris soap", 30, 2, 1, "ho"],
    ["master_soap", "Master soaper's bar", 32, 2, 2, "hde"],
  ];
  RECIPES.soapmaking = [
    { id: "make_lye", out: "lye", qty: 2, name: "Leach lye from ashes", skill: "Soapmaking", req: 1, xp: 12, in: { wood_ash: 2 }, tick: 1300, family: "lye", stations: ["soap_works", "cauldron", "furnace"] },
  ];
  for (const [id, name, req, tal, ly, flags] of SOAPS) {
    mk(id, name, "i_cloth", ` hue-rotate(${(req * 27) % 360}deg) saturate(0.7) brightness(1.2)`, { stack: true, value: 12 + req * 4, finished: true }, "soap — tinted placeholder");
    RECIPES.soapmaking.push({ id: "boil_" + id, out: id, name: "Boil " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Soapmaking", req, xp: 18 + req * 3, in: inputs({ tallow: tal, lye: ly }, flags), tick: 1500 + req * 25,
      family: /honey|milk|rose|lavender|floral|luxury|royal|ambergris|perfumed/.test(id) ? "fine_soaps" : "soaps", stations: ["soap_works", "cauldron", "furnace"] });
  }

  // ---------- workstations ----------
  Object.assign(STATIONS, {
    chandlery:  { name: "Chandlery",   spr: "workbench", action: "Dip candles", lists: ["candlemaking"], quality: 58 },
    soap_works: { name: "Soap works",  spr: "cauldron",  action: "Boil soap",   lists: ["soapmaking"], quality: 58 },
  });
  STATIONS.workbench.lists.push("candlemaking");
  STATIONS.cauldron.lists.push("soapmaking");
  STATIONS.furnace.lists.push("candlemaking", "soapmaking");

  Object.assign(PROD_SKILL_INTRO, {
    Candlemaking: "The chandler's trade: spin wicks and dip or mould tallow and beeswax into candles — rushlights and tapers up through scented, coloured, chandelier and cathedral candles. Gives tallow and beeswax a home.",
    Soapmaking: "Leach lye from wood ash and boil it with tallow into soaps — plain lye and laundry bars up through honey, goat's-milk, charcoal and luxury perfumed soaps. The great consumer of wood ash.",
  });

  // ---------- candles are PLACEABLE + OFFHAND-CARRIABLE lights ----------
  // Every candle/lamp (any item with .light) can be set down on the ground or a
  // table (placing.js) where it burns as a world light, be picked back up still
  // lit, and be equipped in the OFFHAND (shield slot) to carry its glow around
  // (daynight.js candleInHand / collectNightLights read these). Runs after
  // husbandry ("candle"), potteryglass ("oil_lamp") and the CANDLES roster above
  // are all defined. `place` is the 8-dir candle world-object it renders as when
  // set down (a lit candle with a flame baked in — assets/objects.json).
  const CANDLE_OBJ = {
    candle: "candle_taper", rushlight: "candle_taper", taper: "candle_taper", tealight: "candle_votive",
    dinner_candle: "candle_dinner", beeswax_candle: "candle_beeswax", votive: "candle_votive",
    pillar_candle: "candle_white", scented_candle: "candle_taper", coloured_candle: "candle_colored",
    floating_candle: "candle_floating", altar_candle: "candle_altar", church_candle: "candle_church",
    lantern_candle: "candle_lantern", carriage_candle: "candle_carriage", ship_candle: "candle_ship",
    storm_candle: "candle_storm", signal_candle: "candle_signal", chime_candle: "candle_chime",
    bayberry_candle: "candle_bayberry", spiral_candle: "candle_taper", three_wick: "candle_threewick",
    perfumed_candle: "candle_taper", stained_candle: "candle_colored", candelabra_set: "candle_cathedral",
    chandelier_candles: "candle_cathedral", scrying_candle: "candle_altar", ember_candle: "candle_ember",
    moon_candle: "candle_white", cathedral_candles: "candle_cathedral", master_chandler_set: "candle_cathedral",
    oil_lamp: "candle_lantern",
  };
  for (const id in ITEMS) {
    const it = ITEMS[id];
    if (!it.light) continue;
    if (!it.place) it.place = CANDLE_OBJ[id] || "candle_taper";
    if (!it.equip) it.equip = "shield";       // carry a lit candle in the offhand
    // a candle is NOT armour: pin wearReq to 0 so equipItem's Defence gate is
    // skipped AND market.js (loads after) won't stamp a Defence req on it.
    it.wearReq = 0;
    if (typeof EXAMINE !== "undefined" && EXAMINE)
      EXAMINE[id] = (it.name || "A candle") + " — set it down to light the room, or hold it in your off-hand to carry the light with you.";
  }

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
