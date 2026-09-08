// ===== Isle of Emberfall — specialised agriculture =====
// Splits Farming into five recognisable growing professions, 32 crops each:
//   Cerealiculture (grain) · Olericulture (vegetables) · Pomiculture (fruit)
//   Herbiculture (herbs)   · Fibriculture (fibre crops)
//
// Rebuilds the CROPS table so every crop carries a `skill`. Grain / herb / fibre
// crops REUSE the existing grain/herb/fibre item ids, so all their downstream
// sources are preserved — Cerealiculture feeds Milling & Malting, Herbiculture
// feeds Potionmaking, Fibriculture feeds Spinning (and the fibre-name lookups in
// ropemaking/leathercraft still resolve). Vegetables & fruit reuse existing food
// items by name where they exist, else create new produce. The legacy Farming
// skill id is kept (saved XP preserved); its crops migrate to the five skills.
// Loaded after paper.js, before market.js.
"use strict";

(function () {
  const SK = ["Cerealiculture", "Olericulture", "Pomiculture", "Herbiculture", "Fibriculture"];
  for (const s of SK) { if (!SKILLS.includes(s)) SKILLS.push(s); SKILL_CATEGORY[s] = "Agriculture"; }
  if (typeof SKILL_CATEGORY_ORDER !== "undefined" && !SKILL_CATEGORY_ORDER.includes("Agriculture")) {
    const at = SKILL_CATEGORY_ORDER.indexOf("Food & Drink");
    SKILL_CATEGORY_ORDER.splice(at < 0 ? 2 : at, 0, "Agriculture");
  }

  let pi = 700;
  const cropSpr = { grain: "wheat_plant", herb: "herb_plant", fibre: "flower_white", veg: "wheat_plant", fruit: "berrybush" };
  const findByName = name => { const f = Object.entries(ITEMS).find(([id, d]) => d.name === name); return f ? f[0] : null; };
  // create/link one crop: a seed item + a harvest item + a CROPS entry
  function agriCrop(skill, i, name, fixedItem, kind) {
    const sl = skill.toLowerCase(), lname = name.toLowerCase();
    const seed = "seed_" + sl + "_" + i;
    if (!ITEMS[seed]) {
      defineIcon("i_" + seed, "i_seeds_w", pi++);
      ITEMS[seed] = { name: name + " seeds", icon: "i_" + seed, stack: true, value: 3 + Math.round(i * 0.6) };
      EXAMINE[seed] = `Seeds for growing ${lname}.`;
      registerPlaceholder(seed, name + " seeds", "seed — tinted placeholder");
      if (typeof SHOP_STOCK !== "undefined") SHOP_STOCK.push(seed);
    }
    let item = fixedItem || findByName(name);
    if (!item || !ITEMS[item]) {
      item = item || (sl + "_crop_" + i);
      defineIcon("i_" + item, kind === "fibre" ? "i_cotton" : kind === "fruit" ? "i_berries" : "i_wheat", pi++);
      ITEMS[item] = Object.assign({ name, icon: "i_" + item, stack: true, value: 4 + Math.round(i * 0.8) },
        (kind === "veg" || kind === "fruit") ? { heals: 2 + Math.round(i * 0.4) } : {});
      EXAMINE[item] = EXAMINE[item] || `Fresh ${lname}.`;
    }
    // real per-crop growth-stage art (js/sprites/crop-<skill>-data.js, loaded
    // LATER in index.html so SPR isn't populated yet here — the keys are
    // just names, resolved defensively at render time in render3d.js, which
    // falls back to `spr` below if a specific stage sprite is ever missing).
    // The harvested item's inventory icon is set to sprStages[3] ("Ready to
    // Harvest") too, but NOT here — item-icons-data.js (an older placeholder-
    // art pipeline) loads after this file and would clobber it; that
    // assignment happens in js/sprites/crop-item-icons.js instead, which
    // loads after everything else so it always wins.
    const sprStages = [0, 1, 2, 3].map(stage => "s_farm_" + sl + "_" + i + "_" + stage);
    CROPS["farm_" + sl + "_" + i] = {
      name: lname, seed, item, req: i + 1, plantXp: 8 + i * 2, xp: 40 + i * 8,
      time: 55000 + i * 4500, yield: [2, 4], spr: cropSpr[kind] || "wheat_plant", sprStages, skill,
      // Pomiculture (fruit) grows a barren fruit tree; the fruit appears on it when
      // ripe, and once picked the bare tree can be chopped (Woodcutting) for logs.
      ...(kind === "fruit" ? { tree: true } : {}),
    };
  }

  // wipe the legacy Farming crop table and rebuild it from the five professions
  for (const k in CROPS) delete CROPS[k];

  // Cerealiculture — the 32 grains (reuse grain items → Milling/Malting sources)
  if (typeof GRAINS !== "undefined") GRAINS.forEach((g, i) => agriCrop("Cerealiculture", i, g.name, g.grain, "grain"));
  // Herbiculture — the 32 herbs (reuse herb items → Potionmaking sources)
  if (typeof HERBS !== "undefined") HERBS.forEach((h, i) => agriCrop("Herbiculture", i, h.name, h.id, "herb"));
  // Fibriculture — the existing fibre crops (reused ids → Spinning sources) + more
  const FIB_EXTRA = ["Nettle", "Coir", "Abaca", "Bamboo fibre", "Raffia", "Milkweed", "Yucca", "Agave",
    "Piña", "Banana fibre", "Kapok", "Lotus fibre", "Sea silk", "Nettle silk", "Cloudthread", "Mistcotton",
    "Frostflax", "Emberhemp", "Voidfibre", "Starcotton", "Aetherweave", "Worldsilk"];
  const baseFibres = typeof FIBERS !== "undefined" ? FIBERS : [];
  for (let i = 0; i < 32; i++) {
    if (i < baseFibres.length) agriCrop("Fibriculture", i, ITEMS[baseFibres[i]].name, baseFibres[i], "fibre");
    else agriCrop("Fibriculture", i, FIB_EXTRA[i - baseFibres.length] || ("Fibre " + i), null, "fibre");
  }
  // Olericulture — 32 vegetables (reuse existing veg items by name where present)
  const VEG = ["Potato", "Cabbage", "Onion", "Carrot", "Turnip", "Parsnip", "Radish", "Beetroot", "Leek",
    "Garlic", "Celery", "Lettuce", "Spinach", "Kale", "Broccoli", "Cauliflower", "Peas", "Beans", "Cucumber",
    "Courgette", "Pumpkin", "Squash", "Aubergine", "Pepper", "Sweetcorn", "Artichoke", "Asparagus", "Yam",
    "Okra", "Fennel", "Kohlrabi", "Sweet potato"];
  VEG.forEach((n, i) => agriCrop("Olericulture", i, n, null, "veg"));
  // Pomiculture — 32 fruit
  const FRUIT = ["Apple", "Pear", "Cherry", "Plum", "Peach", "Apricot", "Fig", "Grape", "Orange", "Lemon",
    "Lime", "Strawberry", "Raspberry", "Blackberry", "Blueberry", "Gooseberry", "Melon", "Watermelon",
    "Pomegranate", "Quince", "Mango", "Papaya", "Pineapple", "Kiwi", "Persimmon", "Mulberry", "Elderberry",
    "Dragonfruit", "Starfruit", "Moonberry", "Sunapple", "Worldfruit"];
  FRUIT.forEach((n, i) => agriCrop("Pomiculture", i, n, null, "fruit"));

  Object.assign(PROD_SKILL_INTRO, {
    Cerealiculture: "Grain farming: sow and reap wheat, barley, rye, oats and 28 more cereals — the grain that feeds Milling, Malting and the whole food economy.",
    Olericulture: "Vegetable growing: raise 32 vegetables from potatoes and onions to asparagus and kohlrabi in your farm plots.",
    Pomiculture: "Fruit cultivation: grow 32 fruits, from apples, pears and cherries to dragonfruit and worldfruit.",
    Herbiculture: "Herb farming: cultivate all 32 herbs in tilled beds instead of only foraging them wild — a steady supply for the apothecaries.",
    Fibriculture: "Fibre-crop cultivation: grow flax, cotton, hemp and 29 more fibre crops — the raw material every spinner needs.",
    Farming: "Farming has specialised into Cerealiculture, Olericulture, Pomiculture, Herbiculture and Fibriculture. Your old Farming levels are kept; new planting trains the successor skills.",
  });
})();
