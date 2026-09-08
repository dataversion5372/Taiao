// ===== Isle of Emberfall — cultural garments (Tailoring) =====
// Turns the clothing seen on the 223-character roster (see docs/player-character-
// outfits.txt) into real, craftable Tailoring goods — the soft-cloth wardrobe that
// sits alongside the generic tailoring line (fillout.js/textiles.js) and the tiered
// metal/leather ARMOUR systems (geartiers.js / leathercraft.js). 48 garments (+2
// alternate-outfit garments from families_source: flax_cloak, smallclothes), each
// equippable in its natural anatomical slot with a light cloth "block", stitched at
// the tailor's bench from woven/fulled/dyed cloth (Spinning→Weaving→Dyeing/Fulling
// feed it). Icons: placeholder tints now; docs/garment-sprite-prompt.txt describes a
// dedicated 8x6 sheet that js/sprites/garment-icons-data.js repoints onto (i_<id>).
// Loaded after textiles.js (tailors_bench + RECIPES.tailoring) and fillout.js, and
// BEFORE bestiary-drops.js so the high-tier garments pick up the celestial
// Tailoring reagent (halo_lace/seraphic_lace) like the rest of the trade.
"use strict";

(function () {
  if (typeof RECIPES === "undefined" || typeof ITEMS === "undefined") return;
  RECIPES.tailoring = RECIPES.tailoring || [];
  let pi = 880;
  // slot presets (EQUIP_SLOTS in main/state.js). null = a finished trade good.
  const HEAD = ["hair", "back_of_head"], LEGS = ["left_leg", "right_leg"], WRIST = ["bracelet1", "bracelet2"];
  // [id, name, req, slot, block, inputs]   block ignored when slot is null (finished good)
  const G = [
    // --- HEADWEAR (head slot) ---
    ["wizard_hat",       "Wizard's hat",        6,  HEAD, 0.02, { fine_cloth_x: 1, wool_yarn: 1 }],
    ["flat_cap",         "Flat cap",            3,  HEAD, 0.02, { cloth: 1 }],
    ["hood",             "Cloth hood",          4,  HEAD, 0.02, { cloth: 1 }],
    ["cowl",             "Cowl",                5,  HEAD, 0.02, { rough_cloth: 1 }],
    ["cloth_coif",       "Cloth coif",          4,  HEAD, 0.02, { cloth: 1 }],
    ["turban",           "Turban",              7,  HEAD, 0.02, { fine_cloth_x: 1 }],
    ["desert_headwrap",  "Desert head-wrap",    6,  HEAD, 0.02, { cloth: 2 }],
    ["feather_headdress","Feathered war-bonnet",16, HEAD, 0.03, { feathers: 6, fine_cloth_x: 1 }],
    // --- ROBES & VESTMENTS (torso) ---
    ["mage_robe",        "Mage's robe",         8,  "torso", 0.04, { fine_cloth_x: 2 }],
    ["sorcerer_robe",    "Sorcerer's robe",     10, "torso", 0.05, { fine_cloth_x: 2, dyed_wool_cloth: 1 }],
    ["cleric_vestment",  "Cleric's vestments",  9,  "torso", 0.04, { fine_cloth_x: 2 }],
    ["scholar_robe",     "Scholar's robe",      8,  "torso", 0.04, { fine_cloth_x: 2 }],
    ["travelers_robe",   "Traveller's robe",    7,  "torso", 0.04, { rough_cloth: 2, cloth: 1 }],
    ["ceremonial_robe",  "Ceremonial robe",     22, "torso", 0.06, { dyed_silk_cloth: 3 }],
    ["djinn_robe",       "Djinn's robe",        20, "torso", 0.06, { dyed_silk_cloth: 2, fine_cloth_x: 1 }],
    ["monk_robe",        "Monk's robe",         6,  "torso", 0.03, { rough_cloth: 2 }],
    // --- TUNICS · COATS · DRESSES (torso) ---
    ["tunic",            "Tunic",               3,  "torso", 0.03, { cloth: 1 }],
    ["cloth_jerkin",     "Cloth jerkin",        5,  "torso", 0.03, { rough_cloth: 2 }],
    ["quilted_vest",     "Quilted vest",        7,  "torso", 0.04, { cloth: 2, wool_yarn: 1 }],
    ["frock_coat",       "Frock coat",          14, "torso", 0.05, { fine_cloth_x: 2, dyed_wool_cloth: 1 }],
    ["greatcoat",        "Greatcoat",           16, "torso", 0.06, { fulled_3: 2, fine_cloth_x: 1 }],
    ["linen_dress",      "Linen dress",         6,  "torso", 0.03, { cloth: 2 }],
    ["peasant_dress",    "Peasant dress",       4,  "torso", 0.03, { rough_cloth: 2 }],
    ["tabard",           "Tabard",              10, "torso", 0.04, { dyed_wool_cloth: 2 }],
    // --- CULTURAL WEAR (torso) ---
    ["kimono",           "Kimono",              18, "torso", 0.05, { dyed_silk_cloth: 3 }],
    ["hanbok",           "Hanbok",              16, "torso", 0.05, { dyed_silk_cloth: 2, fine_cloth_x: 1 }],
    ["hanfu",            "Hanfu",               17, "torso", 0.05, { dyed_silk_cloth: 2, fine_cloth_x: 1 }],
    ["poncho",           "Poncho",              8,  "torso", 0.04, { dyed_wool_cloth: 2 }],
    ["boubou",           "Boubou",              15, "torso", 0.05, { dyed_silk_cloth: 2 }],
    ["parka",            "Fur parka",           18, "torso", 0.07, { fulled_3: 3, feathers: 2 }],
    ["buckskin_dress",   "Buckskin dress",      9,  "torso", 0.05, { leather: 2 }],
    ["sari",             "Sari",                17, "torso", 0.05, { dyed_silk_cloth: 3 }],
    // --- OVER-SHOULDER (cape slot) ---
    ["cloak",            "Cloak",               6,  "cape", 0.03, { rough_cloth: 2 }],
    ["mantle",           "Mantle",              8,  "cape", 0.03, { fine_cloth_x: 1, dyed_wool_cloth: 1 }],
    ["stole",            "Stole",               9,  "cape", 0.02, { dyed_silk_cloth: 1 }],
    ["feathered_cloak",  "Feathered cloak",     20, "cape", 0.05, { feathers: 8, fine_cloth_x: 1 }],
    ["fur_mantle",       "Fur mantle",          12, "cape", 0.05, { fulled_3: 2 }],
    ["moss_cloak",       "Moss cloak",          10, "cape", 0.04, { cloth: 2 }],
    ["hooded_cloak",     "Hooded cloak",        12, "cape", 0.04, { fulled_3: 1, fine_cloth_x: 1 }],
    ["half_cape",        "Half-cape",           7,  "cape", 0.03, { fine_cloth_x: 1 }],
    // --- LOWER · WAIST · WRAPS ---
    ["kilt",             "Kilt",                5,  LEGS, 0.03, { dyed_wool_cloth: 1 }],
    ["skirt",            "Skirt",               4,  LEGS, 0.03, { cloth: 2 }],
    ["leggings",         "Leggings",            5,  LEGS, 0.03, { rough_cloth: 2 }],
    ["loincloth",        "Loincloth",           2,  LEGS, 0.02, { cloth: 1 }],
    ["arm_wraps",        "Arm wraps",           3,  WRIST, 0.02, { cloth: 1 }],
    ["sash",             "Sash",                4,  null, 0,    { dyed_wool_cloth: 1 }],
    ["cloth_belt",       "Cloth belt",          3,  null, 0,    { cloth: 1 }],
    ["cloth_apron",      "Cloth apron",         4,  null, 0,    { rough_cloth: 1 }],
    // --- ALTERNATE-OUTFIT garments (from families_source alt states: the
    //     Patupaiarehe flax cloaks + the base-layer underwear). These are NOT on
    //     the 48-cell "ga" sheet yet — they keep tinted placeholder icons until
    //     the addendum art in docs/garment-sprite-prompt.txt is generated.
    ["flax_cloak",       "Flax cloak",          9,  "cape", 0.04, { rough_cloth: 2, wool_yarn: 1 }],
    ["smallclothes",     "Smallclothes",        2,  "torso", 0.01, { cloth: 1 }],
  ];

  for (const [id, name, req, slot, block, inp] of G) {
    if (!ITEMS[id]) {
      const iconBase = (slot === "torso" || slot === "cape" || /dress|robe|kimono|hanbok|hanfu|sari|boubou/.test(id)) ? "i_robe" : "i_body";
      if (typeof defineIcon === "function") defineIcon("i_" + id, iconBase, pi++, ` hue-rotate(${(req * 17 + name.length * 7) % 360}deg) saturate(1.1) brightness(${1 - req * 0.004})`);
      const props = slot
        ? { name, icon: "i_" + id, value: 45 + req * 11, equip: slot, block, wearReq: req }
        : { name, icon: "i_" + id, value: 30 + req * 8, finished: true };
      ITEMS[id] = props;
      if (typeof EXAMINE !== "undefined") EXAMINE[id] = `${name}.`;
      if (typeof registerPlaceholder === "function") registerPlaceholder(id, name, "garment — tinted placeholder");
    }
    RECIPES.tailoring.push({
      id: "tailor_g_" + id, out: id,
      name: "Tailor " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Tailoring", req, xp: 26 + req * 5, in: inp, tick: 2000 + req * 30,
      family: slot ? "outerwear" : "accessories",
      stations: ["tailors_bench", "loom", "workbench"],
    });
  }

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => { if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i; if (!r.family) r.family = cat; });
})();
