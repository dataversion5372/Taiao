// ===== Isle of Emberfall — Husbandry (animal production) =====
// Raising livestock as a specialised trade. Husbandry is a PASSIVE profession:
// you commit FEED (bran — the milling by-product — plus grain/forage, or meat
// for carnivores), a wall-clock timer runs while you roam, and you return to
// the barn to collect the animal products. It sits at the head of many chains:
//
//   Husbandry ─┬─ fleece  → Spinning
//              ├─ hide    → Tanning
//              ├─ raw meat→ Cooking
//              ├─ milk    → Cooking (cheese/butter) & Baking (cake)
//              ├─ eggs    → Cooking / Baking
//              ├─ feathers→ Fletching (arrows) & Tailoring (down cloak)
//              ├─ honey   → Brewing (mead)
//              └─ wax/tallow → Crafting (candles)
//
// This finally gives `bran` a real consumer and closes the by-product loop.
// New items use placeholder tinted sprites (registered). Loaded after textiles.js.
"use strict";

(function () {
  if (!SKILLS.includes("Husbandry")) SKILLS.push("Husbandry");
  SKILL_CATEGORY.Husbandry = "Gathering";
  RECIPE_VERB.Husbandry = "Reared";

  let hi = 60; // placeholder hue seed
  const ico = (key, base, extra) => defineIcon(key, base, hi++, extra || "");
  const mk = (id, name, base, extra, props, note) => {
    ico("i_" + id, base, extra);
    ITEMS[id] = Object.assign({ name, icon: "i_" + id }, props);
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, note || "husbandry good — tinted placeholder");
  };

  // ---------- animal products (feed the wider economy) ----------
  mk("milk",     "Milk",      "i_cotton", " brightness(1.45) saturate(0.15)", { stack: true, value: 6, prov: "batch" }, "milk — tinted placeholder");
  mk("egg",      "Egg",       "i_cotton", " brightness(1.2) sepia(0.35)",     { stack: true, value: 5, prov: "batch" }, "egg — tinted placeholder");
  mk("feathers", "Feathers",  "i_shafts", " brightness(1.25)",                { stack: true, value: 4, prov: "batch" }, "feathers — tinted placeholder");
  mk("honey",    "Honey",     "i_pot_hp", " hue-rotate(20deg) saturate(1.7)", { stack: true, value: 12, heals: 3, prov: "batch" }, "honey — tinted placeholder");
  mk("beeswax",  "Beeswax",   "i_bar_au", " hue-rotate(10deg) brightness(1.1)",{ stack: true, value: 14, prov: "batch" }, "beeswax — tinted placeholder");
  mk("tallow",   "Tallow",    "i_bar_au", " saturate(0.25) brightness(1.25)", { stack: true, value: 8, prov: "batch" }, "tallow — tinted placeholder");

  // ---------- downstream goods made from those products ----------
  mk("cheese",     "Cheese",       "i_bread", " hue-rotate(15deg) saturate(1.6)",  { stack: true, value: 22, heals: 5 }, "cheese — tinted placeholder");
  mk("butter",     "Butter",       "i_bread", " hue-rotate(22deg) saturate(1.4) brightness(1.1)", { stack: true, value: 14, heals: 2 }, "butter — tinted placeholder");
  mk("cooked_egg", "Cooked egg",   "i_meat",  " brightness(1.2) saturate(0.6)",    { stack: true, value: 8, heals: 3 }, "cooked egg — tinted placeholder");
  mk("cake",       "Cake",         "i_bread", " hue-rotate(-15deg) saturate(1.3)", { stack: true, value: 30, heals: 8 }, "cake — tinted placeholder");
  mk("mead",       "Mead",         "i_pot_hp"," hue-rotate(25deg) saturate(1.5) brightness(0.95)", { stack: true, value: 26, heals: 5, prov: "batch" }, "mead — tinted placeholder");
  mk("candle",     "Candle",       "i_vial",  " hue-rotate(30deg) brightness(1.2)",{ stack: true, value: 10, light: true }, "candle — tinted placeholder");
  mk("down_cloak", "Down cloak",   "i_robe",  " brightness(1.15)",                 { value: 300, equip: "cape", block: 0.07 }, "down cloak — tinted placeholder");

  // ---------- 32 husbandry tending recipes (passive) ----------
  // [id, name, family, req, feedInputs, timeSec, outputs[], byproducts?]
  const O = (id, qty) => ({ id, qty });
  // NOTE: tending NEVER yields meat/hide/tallow (those come only from killing the
  // animal). "Raise ___" tiers yield a young-animal item (kit/piglet/…); the
  // roaming version of the same tier spawns a physical baby that grows in place.
  const HERD = [
    ["keep_quail",     "Tend quail",              "poultry", 1,  { bran: 1 },            18, [O("egg", 2), O("feathers", 1)]],
    ["keep_hens",      "Tend hens",               "poultry", 2,  { bran: 2 },            20, [O("egg", 3), O("feathers", 1)]],
    ["raise_rabbits",  "Raise rabbits",           "smallstock", 3, { bran: 1 },          18, [O("kit", 1)]],
    ["shear_sheep",    "Shear sheep",             "sheep", 4,  { bran: 2 },              26, [O("fleece", 2)]],
    ["keep_ducks",     "Tend ducks",              "poultry", 5,  { bran: 2, wheat: 1 },  24, [O("egg", 2), O("feathers", 2)]],
    ["keep_bees",      "Tend bees",               "bees", 6,   { berries: 2 },           30, [O("honey", 2), O("beeswax", 1)]],
    ["milk_camels",    "Milk camels",             "camels", 7, { alfalfa: 3 },           24, [O("milk", 2)]],
    ["keep_geese",     "Tend geese",              "poultry", 8,  { bran: 3 },            28, [O("feathers", 3), O("egg", 1)]],
    ["milk_goats",     "Milk goats",              "goats", 9,  { bran: 2 },              24, [O("milk", 2)], [{ id: "kid", qty: 1, chance: 0.3 }]],
    ["raise_pigs",     "Raise pigs",              "pigs", 10,  { bran: 3 },              30, [O("piglet", 1)]],
    ["milk_cows",      "Milk cows",               "cattle", 11, { bran: 3, wheat: 1 },   30, [O("milk", 3)]],
    ["raise_turkeys",  "Raise turkeys",           "poultry", 12, { bran: 3, wheat: 1 },  32, [O("poult", 1)]],
    ["raise_goats",    "Raise goats",             "goats", 13, { bran: 3 },              34, [O("kid", 1)]],
    ["raise_sheep",    "Raise sheep",             "sheep", 14, { bran: 3, wheat: 1 },    34, [O("lamb", 1)]],
    ["apiary",         "Tend an apiary",          "bees", 15, { berries: 3 },            40, [O("honey", 4), O("beeswax", 2)]],
    ["raise_camels",   "Raise camels",            "camels", 16, { alfalfa: 6 },          46, [O("camel_calf", 1)]],
    ["raise_oxen",     "Raise oxen",              "cattle", 17, { bran: 4, wheat: 2 },   44, [O("calf", 1)]],
    ["raise_cattle",   "Raise cattle",            "cattle", 18, { bran: 4, wheat: 2 },   44, [O("calf", 1)]],
    ["raise_boar",     "Raise boar",              "pigs", 19, { bran: 4 },               42, [O("piglet", 1)]],
    ["fine_wool_flock","Tend a fine-wool flock",  "sheep", 20, { bran: 4 },              40, [O("fleece", 4)]],
    ["milk_buffalo",   "Milk buffalo",            "cattle", 21, { bran: 5 },             46, [O("milk", 4)]],
    ["raise_buffalo",  "Raise buffalo",           "cattle", 22, { bran: 5, wheat: 3 },  46, [O("calf", 1)]],
    ["shear_alpaca",   "Shear alpaca",            "sheep", 23, { bran: 4 },              44, [O("fleece", 4)]],
    ["dairy_herd",     "Tend a dairy herd",       "cattle", 24, { bran: 5 },             48, [O("milk", 5)]],
    ["cashmere_goats", "Comb cashmere goats",     "goats", 25, { bran: 5 },             48, [O("fleece", 5)]],
    ["forest_hives",   "Tend forest hives",       "bees", 26, { berries: 4 },            50, [O("honey", 5), O("beeswax", 3)]],
    ["raise_aurochs",  "Raise aurochs",           "cattle", 27, { bran: 6, wheat: 3 },   52, [O("aurochs_calf", 1)]],
    ["pedigree_wool",  "Raise pedigree wool sheep","sheep", 28, { bran: 6 },             54, [O("fleece", 6)]],
    ["keep_griffons",  "Tend griffons",           "exotic", 29, { raw_meat: 3 },         55, [O("feathers", 6)]],
    ["prize_dairy",    "Tend prize dairy cattle", "cattle", 30, { bran: 6, wheat: 3 },   56, [O("milk", 6)]],
    ["tend_wyrmlings", "Tend wyrmlings",          "exotic", 31, { raw_meat: 4 },         60, [O("scales", 2), O("egg", 1)]],
    ["royal_apiary",   "Tend the royal apiary",   "bees", 32, { berries: 5 },            60, [O("honey", 7), O("beeswax", 4)]],
  ];
  const article = w => (/^[aeiou]/i.test(w) ? "an " : "a ");
  // These 32 entries are NO LONGER craftable at any station (the barn was removed
  // — Husbandry is done entirely by tending the roaming animals, js/skills/
  // husbandry-animals.js). They remain purely as the skill's PROGRESSION GUIDE
  // (ui.js reads name/req/xp) and for economy sourcing (production.js/market.js
  // read outputs/inputs so wool/milk/eggs/… stay "sourced"). No `stations`, so no
  // craft window ever lists them.
  RECIPES.husbandry = HERD.map(([id, name, family, req, feed, timeSec, outputs, byproducts]) => ({
    id, out: outputs[0].id, outputs, byproducts: byproducts || [],
    name, skill: "Husbandry", req, xp: 24 + req * 4, in: feed,
    family, stations: [],
  }));

  // ---------- downstream sinks in EXISTING trades (interdependence) ----------
  (RECIPES.cook = RECIPES.cook || []).push(
    { out: "cooked_egg", name: "Fry an egg",   skill: "Cooking", req: scaleLevel(1),  xp: 20, in: { egg: 1 },  tick: 1300, family: "dairy" },
    { out: "butter",     name: "Churn butter", skill: "Cooking", req: scaleLevel(4),  xp: 30, in: { milk: 2 }, tick: 1500, family: "dairy" },
    { out: "cheese",     name: "Make cheese",  skill: "Cooking", req: scaleLevel(8),  xp: 44, in: { milk: 2 }, tick: 1600, family: "dairy" },
  );
  (RECIPES.baking = RECIPES.baking || []).push(
    { out: "cake", name: "Bake a cake", skill: "Baking", req: scaleLevel(10), xp: 70, in: { flour: 2, egg: 1, milk: 1 }, tick: 1800, family: "breads" },
  );
  (RECIPES.brewing = RECIPES.brewing || []).push(
    { out: "mead", name: "Brew mead", skill: "Brewing", req: scaleLevel(6), xp: 50, in: { honey: 2 }, passive: true, time: 22000, tick: 22000, family: "ales" },
  );
  (RECIPES.fletching = RECIPES.fletching || []).push(
    { out: "arrows", qty: 15, name: "Fletch feathered arrows", skill: "Fletching", req: scaleLevel(1), xp: 24, in: { arrow_shafts: 15, feathers: 3, bronze_bar: 1 }, tick: 1500, family: "arrows" },
  );
  (RECIPES.crafting = RECIPES.crafting || []).push(
    { out: "candle", qty: 2, name: "Make tallow candles",  skill: "Crafting", req: scaleLevel(2), xp: 20, in: { tallow: 1 },  tick: 1400, family: "candles" },
    { out: "candle", qty: 2, name: "Make beeswax candles", skill: "Crafting", req: scaleLevel(5), xp: 30, in: { beeswax: 1 }, tick: 1400, family: "candles" },
  );
  if (RECIPES.tailoring) RECIPES.tailoring.push(
    { out: "down_cloak", name: "Tailor a down cloak", skill: "Tailoring", req: 20, xp: 180, in: { feathers: 6, fulled_3: 1 }, tick: 2400, family: "outerwear", stations: ["tailors_bench", "loom"] },
  );

  // ---------- workstation ----------
  // The barn station has been REMOVED — Husbandry is done by tending the roaming
  // animals (husbandry-animals.js), never at a station. No station lists
  // "husbandry", so the craft window never offers it.

  Object.assign(PROD_SKILL_INTRO, {
    Husbandry: "Tend the livestock that roam the pastures — a passive trade: feed an animal (bran, grain or forage; carnivores eat meat), then return for wool, milk, eggs, hides, feathers, honey and wax. Husbandry feeds Spinning, Tanning, Cooking, Baking, Brewing, Fletching and Crafting — and finally gives milling's bran a purpose.",
  });

  // ---------- normalise added recipes ----------
  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
