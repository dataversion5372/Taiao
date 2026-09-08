// ===== Isle of Emberfall — fill thin production skills to 32 =====
// Pads under-contented production trades to a full 32 progression, cross-feeding
// so nothing becomes a dead output:
//   Sawing → boards/planks (+beam/lath) → Carpentry
//   Seasoning → seasoned boards/planks/beam → Carpentry
//   Malting → malts → Brewing        Spinning → rough/fine yarn → Weaving → Tailoring
//   Brewing/Baking → food·drink   Carpentry/Smithing/Tailoring → finished/equip
// Loaded after all trade modules, before market.js.
"use strict";

(function () {
  let pi = 1000;
  const mk = (id, name, base, extra, props, note) => {
    if (ITEMS[id]) return;
    defineIcon("i_" + id, base, pi++, extra || "");
    ITEMS[id] = Object.assign({ name, icon: "i_" + id }, props);
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, note || "trade good — tinted placeholder");
  };
  const has = id => typeof id === "string" && ITEMS[id];
  const grains = typeof GRAINS !== "undefined" ? GRAINS : [];
  const trees = typeof TREES !== "undefined" ? TREES : [];

  // ---- shared new intermediates ----
  mk("beam", "Timber beam", "i_planks", " brightness(0.9)", { stack: true, value: 12, prov: "batch" });
  mk("lath", "Laths", "i_planks", " brightness(1.1) saturate(0.7)", { stack: true, value: 6, prov: "batch" });
  mk("seasoned_boards", "Seasoned boards", "i_planks", " sepia(0.4) brightness(0.85)", { stack: true, value: 16, prov: "batch" });
  mk("seasoned_planks", "Seasoned planks", "i_planks", " sepia(0.5) brightness(0.8)", { stack: true, value: 18, prov: "batch" });
  mk("seasoned_beam", "Seasoned beam", "i_planks", " sepia(0.6) brightness(0.75)", { stack: true, value: 22, prov: "batch" });
  // (rough_yarn / fine_yarn removed — deprecated, in no recipe; superseded by the
  // Spinning wool_yarn / per-fibre yarns. Old saves fold them onto wool_yarn via
  // DEPRECATED_MIGRATE in storage.js.)
  mk("rough_cloth", "Rough cloth", "i_cloth", " brightness(0.9) saturate(0.8)", { stack: true, value: 16, prov: "batch" });
  mk("fine_cloth_x", "Fine woven cloth", "i_cloth", " brightness(1.15)", { stack: true, value: 30, prov: "batch" });

  // helper: push a recipe (creating a simple item if needed) into a category
  const R = (cat, r) => { RECIPES[cat] = RECIPES[cat] || []; RECIPES[cat].push(r); };
  const has32 = cat => (RECIPES[cat] || []).length >= 32;

  // ---------- SAWING → 32 (saw many species into boards/planks + beam/lath) ----------
  const sawOut = ["boards", "boards", "planks", "beam", "boards", "planks", "lath"];
  for (let i = 0; i < trees.length && !has32("sawing"); i++) {
    const log = trees[i].log; if (!has(log)) continue;
    const out = sawOut[i % sawOut.length], req = Math.min(32, i + 1);
    R("sawing", { id: "saw_species_" + i, out, qty: out === "lath" ? 6 : 2, byproducts: [{ id: "wood_offcuts", qty: 1, chance: 0.5 }],
      name: "Saw " + (ITEMS[log] ? ITEMS[log].name.toLowerCase() : "logs"), skill: "Sawing", req, xp: 22 + req * 3,
      in: { [log]: 1 }, tick: 1300 + i * 10, family: "boards", stations: ["sawmill", "workbench"] });
  }

  // ---------- SEASONING → 32 (air/kiln-dry sawn timber) ----------
  const seasonPairs = [["boards", "seasoned_boards"], ["planks", "seasoned_planks"], ["beam", "seasoned_beam"], ["oak_staves", "seasoned_staves"]];
  // 8 techniques × 4 timbers = 32 unique seasoning recipes (distinct labels)
  const seasonMethods = ["Air-dry", "Kiln-dry", "Steam-cure", "Bake-dry", "Stack-dry", "Weather", "Cure", "Rack-dry"];
  let sc = 0;
  outer: for (const method of seasonMethods) for (const [src, out] of seasonPairs) {
    if (has32("seasoning")) break outer;
    if (!has(src)) continue;
    const req = Math.min(32, 1 + sc); // starts at 1 — every skill has a first rung
    R("seasoning", { id: "season_x_" + sc, out, qty: 2, name: method + " " + ITEMS[src].name.toLowerCase(),
      skill: "Seasoning", req, xp: 24 + req * 3, in: { [src]: 2 }, passive: true, time: 16000 + sc * 400, tick: 16000 + sc * 400,
      family: "seasoning", stations: ["seasoning_yard", "tanrack", "workbench"] });
    sc++;
  }

  // ---------- MALTING → 32 distinct per-grain malts ("Wheat malt" .. "Celestial quinoa malt") ----------
  // Each grain kilns into its OWN malt item (malt_0..malt_31) so all 32 carry a
  // distinct icon / progression rung / value — mirroring the 32 grain flours.
  // The brew chain is still fed by the pale & dark barley malts (economy.js
  // malt/dark_malt -> grist -> ale) plus the handful of grain malts a few brews
  // call for directly (repointed in the `brews` table below). Roast deepens with
  // tier via the placeholder tint until the dedicated malt art sheet is wired in.
  const maltTint = i => i >= 21
    ? ` hue-rotate(${(i * 24) % 360}deg) saturate(1.15) brightness(0.9)`      // fantastical grains glow
    : ` sepia(${(0.15 + i * 0.04).toFixed(2)}) brightness(${(0.95 - i * 0.02).toFixed(2)})`; // pale -> dark roast
  for (let i = 0; i < grains.length && i < 32; i++) {
    const g = grains[i].grain; if (!has(g)) continue;
    const id = "malt_" + i, req = Math.min(32, i + 1);
    mk(id, grains[i].name.replace(/s$/, "") + " malt", "i_wheat", maltTint(i), { stack: true, value: 12 + i, prov: "batch" });
    R("malting", { id: "malt_species_" + i, out: id, qty: 2, name: "Malt " + grains[i].name.toLowerCase(), skill: "Malting", req, xp: 24 + req * 3,
      in: { [g]: 2 }, passive: true, time: 14000 + i * 300, tick: 14000 + i * 300, family: "malts", stations: ["malthouse", "furnace"] });
    // any grain malt can be milled to grist where a recipe asks for pale "malt"
    if (typeof window !== "undefined") (window.ITEM_FAMILY = window.ITEM_FAMILY || {})[id] = "malt";
  }

  // ---------- SPINNING → 32 (spin each new fibre crop into its OWN distinct yarn) ----------
  // Every high-tier fibre gets a distinct spun product (so all 32 Spinning tiers
  // carry a unique item/icon/value), and each yarn is consumed by its own woven
  // cloth below — no dead-end goods. (rough_yarn/fine_yarn item defs are kept
  // above only for save-compat; nothing produces or consumes them any more.)
  const spunFibres = new Set(RECIPES.spinning.map(r => Object.keys(r.in)[0]));
  const newFibres = Object.values(CROPS).filter(c => c.skill === "Fibriculture" && !spunFibres.has(c.item));
  const yarnName = fib => {
    const nm = ITEMS[fib] ? ITEMS[fib].name : fib, b = nm.replace(/ fibre$/i, "");
    if (/silk/i.test(nm)) return b + " thread";
    if (/flax|lotus|pi[ñn]a/i.test(nm)) return b + " thread";
    if (/hemp|jute|sisal|kenaf|ramie|coir|abaca|yucca|agave|raffia/i.test(nm)) return b + " twine";
    return b + " yarn";
  };
  const newYarns = [];
  for (let i = 0; i < newFibres.length && !has32("spinning"); i++) {
    const fib = newFibres[i].item, yid = "yarn_" + fib, req = Math.min(32, RECIPES.spinning.length + 1);
    const yn = yarnName(fib);
    mk(yid, yn, "i_cloth", " saturate(0.9)", { stack: true, value: 8 + req, prov: "batch" }, "spun yarn — tinted placeholder");
    R("spinning", { id: "spin_new_" + i, out: yid, qty: 2, name: "Spin " + newFibres[i].name.toLowerCase() + " into " + yn.toLowerCase(),
      skill: "Spinning", req, xp: 20 + req * 3, in: { [fib]: 2 }, tick: 1400, family: "yarn", stations: ["spinning_wheel", "loom"] });
    newYarns.push({ yid, yn, req });
  }

  // ---------- WEAVING → a distinct cloth per new yarn (every yarn has a consumer) ----------
  const clothName = yn => yn.replace(/ (yarn|thread|twine)$/i, "") + " cloth";
  for (const { yid, yn, req } of newYarns) {
    const cid = "cloth_" + yid, cn = clothName(yn);
    mk(cid, cn, "i_cloth", ` hue-rotate(${(req * 23) % 360}deg) saturate(1.1) brightness(1.03)`, { stack: true, value: 20 + req * 2, prov: "batch" }, "woven cloth — tinted placeholder");
    R("textiles", { id: "weave_" + yid, out: cid, name: "Weave " + cn.toLowerCase(), skill: "Weaving", req: Math.min(32, req + 1), xp: 40 + req * 3,
      in: { [yid]: 2 }, tick: 1600, family: "cloth", stations: ["loom"] });
    // any specialty cloth can stand in where a recipe asks for plain "cloth"
    if (typeof window !== "undefined") (window.ITEM_FAMILY = window.ITEM_FAMILY || {})[cid] = "cloth";
  }

  // rough_cloth / fine_cloth_x are consumed by the garment tables below (and
  // garments.js) — weave them from yarn so those recipes are actually craftable.
  const flaxFib = (Object.values(CROPS).find(c => c.skill === "Fibriculture" && c.name === "flax") || {}).item;
  const linenThread = flaxFib && ITEMS["yarn_" + flaxFib] ? "yarn_" + flaxFib : null;
  R("textiles", { id: "weave_rough_cloth", out: "rough_cloth", name: "Weave rough cloth", skill: "Weaving", req: 3, xp: 34,
    in: { wool_yarn: 2 }, tick: 1500, family: "cloth", stations: ["loom"] });
  R("textiles", { id: "weave_fine_cloth", out: "fine_cloth_x", name: "Weave fine cloth", skill: "Weaving", req: 5, xp: 46,
    in: linenThread ? { wool_yarn: 1, [linenThread]: 2 } : { wool_yarn: 3 }, tick: 1700, family: "cloth", stations: ["loom"] });

  // ---------- generic table filler for finished-goods skills ----------
  // rows: [id, name, req, inputs, props]  props → item def (equip/heals/finished)
  const fillFinished = (cat, skill, stations, base, rows) => {
    for (const [id, name, req, inp, props] of rows) {
      if (has32(cat)) break;
      mk(id, name, base, ` hue-rotate(${(req * 17) % 360}deg) saturate(1.05) brightness(1.05)`, props, cat + " good — tinted placeholder");
      R(cat, { id: cat + "_x_" + id, out: id, name: name, skill, req, xp: 24 + req * 5, in: inp, tick: 1600 + req * 30, family: props.equip ? "equipment" : props.heals ? "food" : "goods", stations });
    }
  };

  // ---------- BREWING → 32 (ales, ciders, wines from grist/fruit/honey) ----------
  const B = (n, req, inp, heal) => [n.toLowerCase().replace(/[^a-z]+/g, "_"), n, req, inp, { stack: true, value: 24 + req * 4, heals: heal, prov: "batch" }];
  const cider = has("pomiculture_crop_0") ? "pomiculture_crop_0" : null; // apple (created by agriculture) if new
  const appleId = (Object.values(CROPS).find(c => c.skill === "Pomiculture" && c.name === "apple") || {}).item;
  const grapeId = (Object.values(CROPS).find(c => c.skill === "Pomiculture" && c.name === "grape") || {}).item;
  const brews = [
    B("Pale ale", 3, { malt_grist: 2 }, 4), B("Brown ale", 5, { malt_grist: 2 }, 4), B("Bitter", 6, { malt_grist: 2 }, 5),
    B("Mild", 4, { malt_grist: 2 }, 4), B("Wheat beer", 7, { malt_0: 2 }, 5), B("Lager", 8, { malt_grist: 2 }, 5),
    B("Porter", 10, { dark_grist: 2 }, 6), B("Stout", 12, { dark_grist: 2 }, 7), B("Imperial stout", 22, { dark_grist: 3, malt_1: 1 }, 9),
    B("Barley wine", 18, { malt_grist: 3, malt_1: 1 }, 8), B("Small beer", 2, { malt_grist: 1 }, 2),
    B("Spiced ale", 11, { malt_grist: 2, herb: 1 }, 6), B("Cherry ale", 13, { malt_grist: 2, berries: 2 }, 6),
    B("Ginger beer", 9, { malt_grist: 1, herb: 1 }, 4), B("Winter ale", 16, { dark_grist: 2, honey: 1 }, 7),
    B("Harvest ale", 14, { malt_grist: 2, malt_0: 1 }, 6), B("Festival beer", 17, { malt_grist: 2, malt_1: 1 }, 7),
    B("Smoked ale", 15, { malt_20: 2 }, 6), B("Rye beer", 12, { malt_2: 2 }, 6), B("Amber ale", 9, { malt_1: 2 }, 5),
    B("Grog", 6, { malt_grist: 1, dark_grist: 1 }, 5), B("Honey mead", 10, { honey: 3 }, 6), B("Metheglin", 20, { honey: 3, herb: 1 }, 8),
    B("Cider", 8, appleId ? { [appleId]: 3 } : { berries: 3 }, 5), B("Fruit wine", 15, { berries: 4 }, 7),
    B("Red wine", 19, grapeId ? { [grapeId]: 4 } : { berries: 4 }, 8), B("White wine", 20, grapeId ? { [grapeId]: 4 } : { berries: 4 }, 8),
    B("Sparkling wine", 26, grapeId ? { [grapeId]: 5, honey: 1 } : { berries: 5 }, 9), B("Dwarven stout", 24, { dark_grist: 3, malt_20: 1 }, 9),
    B("Elven wine", 28, grapeId ? { [grapeId]: 6 } : { berries: 6 }, 10), B("King's ale", 30, { malt_1: 3, honey: 2 }, 11),
    B("Ambrosia brew", 32, { malt_1: 4, honey: 3, herb: 2 }, 12),
  ];
  fillFinished("brewing", "Brewing", ["brewery", "cauldron"], "i_ale", brews);

  // ---------- BAKING → 32 (breads, pastries, pies, cakes) ----------
  const K = (n, req, inp, heal) => [n.toLowerCase().replace(/[^a-z]+/g, "_"), n, req, inp, { stack: true, value: 12 + req * 3, heals: heal }];
  const bakes = [
    K("White loaf", 2, { flour: 1 }, 5), K("Rye bread", 3, { flour: 1 }, 5), K("Flatbread", 1, { flour: 1 }, 4),
    K("Bread roll", 2, { flour: 1 }, 4), K("Bun", 3, { flour: 1, honey: 1 }, 5), K("Bagel", 4, { flour: 2 }, 5),
    K("Pretzel", 5, { flour: 2 }, 5), K("Biscuit", 4, { flour: 1, butter: 1 }, 5), K("Cookie", 5, { flour: 1, honey: 1 }, 5),
    K("Shortbread", 6, { flour: 1, butter: 1 }, 6), K("Scone", 6, { flour: 2, milk: 1 }, 6), K("Muffin", 7, { flour: 2, egg: 1 }, 6),
    K("Pancake", 5, { flour: 1, egg: 1, milk: 1 }, 5), K("Waffle", 8, { flour: 2, egg: 1, milk: 1 }, 7), K("Doughnut", 9, { flour: 2, honey: 1 }, 7),
    K("Croissant", 10, { flour: 2, butter: 2 }, 8), K("Brioche", 12, { flour: 2, butter: 2, egg: 1 }, 8),
    K("Apple pie", 11, has("pomiculture_crop_apple") ? { flour: 2, egg: 1 } : { flour: 2, berries: 2 }, 8),
    K("Fruit tart", 12, { flour: 2, berries: 2 }, 8), K("Meat pasty", 10, { flour: 2, cooked_meat: 1 }, 9),
    K("Fish pie", 11, { flour: 2, cooked_fish: 1 }, 9), K("Quiche", 13, { flour: 2, egg: 2, cheese: 1 }, 9),
    K("Cheese tart", 14, { flour: 2, cheese: 2 }, 9), K("Gingerbread", 9, { flour: 2, honey: 2 }, 7),
    K("Fruitcake", 16, { flour: 3, egg: 1, berries: 2 }, 10), K("Honey cake", 15, { flour: 2, honey: 2, egg: 1 }, 10),
    K("Sponge cake", 14, { flour: 2, egg: 2, milk: 1 }, 9), K("Pudding", 17, { flour: 2, egg: 2, milk: 2 }, 10),
    K("Custard tart", 18, { flour: 2, egg: 2, milk: 1 }, 10), K("Wedding cake", 26, { flour: 5, egg: 3, butter: 2, honey: 2 }, 14),
    K("Festival loaf", 20, { flour: 3, egg: 1, honey: 1 }, 11), K("Master's gateau", 32, { flour: 4, egg: 3, butter: 3, cheese: 1, berries: 2 }, 16),
  ];
  fillFinished("baking", "Baking", ["bakehouse", "furnace", "campfire"], "i_bread", bakes);

  // ---------- CARPENTRY → 32 (furniture & wood goods) ----------
  const W = (n, req, inp) => [n.toLowerCase().replace(/[^a-z]+/g, "_"), n, req, inp, { value: 40 + req * 12, finished: true }];
  const carp = [
    W("Stool", 2, { planks: 2 }), W("Bench", 4, { planks: 3 }), W("Shelf", 5, { boards: 3 }),
    W("Crate", 3, { boards: 4 }), W("Ladder", 6, { planks: 2, lath: 2 }), W("Bookshelf", 8, { planks: 5 }),
    W("Cupboard", 9, { planks: 6 }), W("Cabinet", 11, { planks: 6, seasoned_boards: 1 }), W("Wardrobe", 13, { seasoned_planks: 4 }),
    W("Desk", 12, { planks: 5, seasoned_boards: 2 }), W("Bed frame", 10, { planks: 6, beam: 1 }), W("Cradle", 9, { boards: 4 }),
    W("Wooden door", 7, { planks: 4 }), W("Window frame", 8, { lath: 4, boards: 1 }), W("Fence panel", 5, { lath: 3, planks: 1 }),
    W("Gate", 9, { planks: 4, beam: 1 }), W("Cartwheel", 14, { seasoned_boards: 2, beam: 1 }), W("Handcart", 16, { seasoned_planks: 4, beam: 2 }),
    W("Birdhouse", 4, { boards: 2 }), W("Beehive box", 6, { boards: 3 }), W("Signpost", 5, { planks: 2, beam: 1 }),
    W("Easel", 10, { lath: 3, boards: 1 }), W("Loom frame", 15, { seasoned_beam: 2, planks: 2 }), W("Spinning wheel", 16, { seasoned_boards: 2, lath: 2 }),
    W("Chest", 12, { seasoned_boards: 4 }), W("Dresser", 18, { seasoned_planks: 5 }), W("Sideboard", 20, { seasoned_planks: 6 }),
    W("Four-poster bed", 22, { seasoned_beam: 3, seasoned_planks: 4 }), W("Grandfather clock case", 26, { seasoned_planks: 6, seasoned_beam: 1 }),
    W("Carved throne", 30, { seasoned_beam: 4, seasoned_planks: 6 }), W("Master's cabinet", 32, { seasoned_planks: 8, seasoned_beam: 2, seasoned_boards: 4 }),
  ];
  fillFinished("carpentry", "Carpentry", ["workbench"], "i_chair", carp);

  // ---------- SMITHING → 32 (weapons, armour, hardware from bars) ----------
  const bar = nm => (typeof METALS !== "undefined" && (METALS.find(m => m.name === nm) || {}).bar) || "iron_bar";
  const STEEL = bar("Titanium"), MITH = bar("Mithril");
  const S = (id, name, req, inp, props) => [id, name, req, inp, props];
  const smith = [
    S("dagger", "Iron dagger", 2, { iron_bar: 1 }, { value: 40, equip: "weapon", power: 1 }),
    S("mace", "Iron mace", 5, { iron_bar: 2 }, { value: 70, equip: "weapon", power: 2 }),
    S("battleaxe", "Battleaxe", 8, { iron_bar: 3 }, { value: 120, equip: "weapon", power: 3 }),
    S("warhammer", "Warhammer", 10, { iron_bar: 3 }, { value: 130, equip: "weapon", power: 3 }),
    S("spear", "Spear", 6, { iron_bar: 2 }, { value: 80, equip: "weapon", power: 2 }),
    S("halberd", "Halberd", 14, { [STEEL]: 2, iron_bar: 1 }, { value: 260, equip: "weapon", power: 4 }),
    S("greatsword", "Greatsword", 16, { [STEEL]: 3 }, { value: 340, equip: "weapon", power: 5 }),
    S("mithril_sword", "Mithril sword", 22, { [MITH]: 2 }, { value: 700, equip: "weapon", power: 7 }),
    S("iron_helm", "Iron helm", 4, { iron_bar: 2 }, { value: 60, equip: ["hair", "face", "back_of_head"], block: 0.05 }),
    S("iron_greaves", "Iron greaves", 6, { iron_bar: 2 }, { value: 80, equip: ["left_leg", "right_leg"], block: 0.06 }),
    S("iron_cuirass", "Iron cuirass", 9, { iron_bar: 4 }, { value: 160, equip: ["torso", "pauldron1", "pauldron2", "left_arm", "right_arm"], block: 0.14 }),
    S("iron_shield", "Iron shield", 7, { iron_bar: 3 }, { value: 100, equip: "shield", block: 0.20 }),
    S("gauntlets_metal", "Steel gauntlets", 12, { [STEEL]: 2 }, { value: 180, equip: ["left_hand", "right_hand"], block: 0.08 }),
    S("plate_armour", "Steel plate armour", 18, { [STEEL]: 5 }, { value: 480, equip: ["torso", "pauldron1", "pauldron2", "left_arm", "right_arm"], block: 0.22 }),
    S("mithril_shield", "Mithril shield", 24, { [MITH]: 3 }, { value: 720, equip: "shield", block: 0.30 }),
    S("nails", "Nails", 1, { iron_bar: 1 }, { stack: true, value: 4, finished: true }),
    S("horseshoe", "Horseshoes", 3, { iron_bar: 1 }, { stack: true, value: 10, finished: true }),
    S("bracket", "Iron bracket", 4, { iron_bar: 1 }, { stack: true, value: 8, finished: true }),
    S("bolt_iron", "Iron bolts", 5, { iron_bar: 1 }, { stack: true, value: 8, finished: true }),
    S("chain_iron", "Iron chain", 7, { iron_bar: 2 }, { stack: true, value: 16, finished: true }),
    S("grille", "Iron grille", 11, { iron_bar: 4 }, { value: 90, finished: true }),
    S("ploughshare", "Ploughshare", 9, { iron_bar: 3 }, { value: 110, finished: true }),
    S("anvil_small", "Anvil", 15, { [STEEL]: 4 }, { value: 300, finished: true }),
    S("cauldron_iron", "Iron cauldron", 12, { iron_bar: 4 }, { value: 140, finished: true }),
    S("brazier_iron", "Iron brazier", 10, { iron_bar: 3 }, { value: 120, finished: true }),
    S("gate_iron", "Iron gate", 16, { iron_bar: 6 }, { value: 260, finished: true }),
    S("weathervane", "Weathervane", 13, { iron_bar: 3 }, { value: 160, finished: true }),
    S("bell_iron", "Iron bell", 20, { [STEEL]: 4 }, { value: 400, finished: true }),
    S("portcullis", "Portcullis", 26, { iron_bar: 10 }, { value: 700, finished: true }),
    S("cannon", "Cannon", 28, { [STEEL]: 8 }, { value: 1200, finished: true }),
    S("mithril_plate", "Mithril plate armour", 30, { [MITH]: 6 }, { value: 1600, equip: ["torso", "pauldron1", "pauldron2", "left_arm", "right_arm"], block: 0.3 }),
    S("masterwork_blade", "Masterwork blade", 32, { [MITH]: 4, [STEEL]: 2, fine_gold: 1 }, { value: 2200, equip: "weapon", power: 9 }),
  ];
  for (const [id, name, req, inp, props] of smith) {
    if (has32("weaponsmithing") && has32("armoursmithing")) break;
    const isWeapon = props.equip === "weapon";
    const cat = isWeapon ? "weaponsmithing" : "armoursmithing";   // armour + hardware → Armoursmithing
    mk(id, name, isWeapon ? "i_sw_fe" : props.equip ? "i_body" : "i_bar_fe", ` hue-rotate(${(req * 13) % 360}deg) saturate(1.05)`, props, "smithed good — tinted placeholder");
    R(cat, { id: "smith_x_" + id, out: id, name: "Smith " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(), skill: isWeapon ? "Weaponsmithing" : "Armoursmithing", req, xp: 26 + req * 6, in: inp, tick: 1900 + req * 30, family: isWeapon ? "weapons" : props.equip ? "armour" : "hardware", stations: ["anvil"] });
  }

  // ---------- TAILORING → 32 (more garments) ----------
  const T = (id, name, req, inp, props) => [id, name, req, inp, props];
  const tail = [
    T("head_scarf", "Head scarf", 3, { cloth: 1 }, { value: 40, finished: true }),
    T("mittens", "Mittens", 4, { rough_cloth: 1 }, { value: 45, finished: true }),
    T("stockings", "Stockings", 5, { fine_cloth_x: 1 }, { value: 55, finished: true }),
    T("shawl", "Shawl", 6, { rough_cloth: 2 }, { value: 70, finished: true }),
    T("waistcoat", "Waistcoat", 9, { fine_cloth_x: 2 }, { value: 140, equip: "torso", block: 0.04 }),
    T("breeches", "Breeches", 8, { rough_cloth: 2 }, { value: 100, finished: true }),
    T("winter_coat", "Winter coat", 15, { fulled_3: 3, fine_cloth_x: 1 }, { value: 280, equip: "torso", block: 0.09 }),
    T("cape", "Cape", 12, { fine_cloth_x: 3 }, { value: 200, equip: "cape", block: 0.06 }),
    T("doublet", "Doublet", 14, { fine_cloth_x: 3 }, { value: 240, equip: "torso", block: 0.07 }),
    T("surcoat", "Surcoat", 16, { fulled_3: 2, dyed_wool_cloth: 1 }, { value: 300, equip: "torso", block: 0.08 }),
    T("ball_gown", "Ball gown", 24, { dyed_silk_cloth: 3, fine_cloth_x: 1 }, { value: 620, finished: true }),
    T("wedding_dress", "Wedding dress", 28, { dyed_silk_cloth: 4, fulled_2: 2 }, { value: 900, finished: true }),
    T("state_robe", "State robe", 32, { dyed_silk_cloth: 4, fulled_25: 2, fine_gold: 1 }, { value: 1400, equip: "torso", block: 0.10 }),
  ];
  for (const [id, name, req, inp, props] of tail) {
    if (has32("tailoring")) break;
    mk(id, name, props.equip ? "i_robe" : "i_body", ` hue-rotate(${(req * 19) % 360}deg) saturate(1.1)`, props, "garment — tinted placeholder");
    R("tailoring", { id: "tailor_x_" + id, out: id, name: "Tailor " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(), skill: "Tailoring", req, xp: 28 + req * 5, in: inp, tick: 2000 + req * 30, family: props.equip ? "outerwear" : "accessories", stations: ["tailors_bench", "loom", "workbench"] });
  }

  // normalise anything new
  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => { if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i; if (!r.family) r.family = cat; });
})();
