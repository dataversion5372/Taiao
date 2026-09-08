// ===== Isle of Emberfall — outfit items (icon upgrade + new wardrobe/gear) =====
// Wires the 114 icons on the "oi" sheet (js/sprites/outfit-item-icons-data.js) —
// the catalogue in docs/player-character-outfit-items.txt — into the game:
//   • REPOINT: ~34 items that already exist (garments.js cloth wardrobe, etc.)
//     get their placeholder i_<id> icon replaced with the new hand-made art.
//   • NEW: ~80 genuinely-new pieces (specific hats, cultural cloaks, armour
//     pieces, weapons, jewellery) are registered as real items + a craft recipe
//     under the natural trade skill, equippable in their anatomical slot.
// OUTFIT_ITEM_ORDER is the SINGLE source of truth for cell order — it MUST match
// the row-major pack order of the "oi" sheet (tools rebuild both together).
// Loads AFTER garments.js / geartiers.js / outfit-item-icons-data.js so existing
// ids exist to repoint and the sheet is registered.
"use strict";

(function () {
  if (typeof SPR === "undefined" || typeof ITEMS === "undefined") return;
  const COLS = (typeof OI_COLS !== "undefined") ? OI_COLS : 12;
  const CELL = (typeof OI_CELL !== "undefined") ? OI_CELL : 96;
  const cellRect = i => ({ sx: (i % COLS) * CELL, sy: Math.floor(i / COLS) * CELL, sw: CELL, sh: CELL });
  const setIcon = (id, i) => { SPR["i_" + id] = ["oi", 0, 0, cellRect(i)]; };

  // slot presets (EQUIP_SLOTS in main/state.js)
  const HEAD = ["hair", "back_of_head"], LEGS = ["left_leg", "right_leg"],
        WRIST = ["bracelet1", "bracelet2"], FEET = ["left_foot", "right_foot"],
        HANDS = ["left_hand", "right_hand"], PAULD = ["pauldron1", "pauldron2"],
        ARMS = ["left_arm", "right_arm"];

  // skill -> recipe category + crafting stations
  const SK = {
    Tailoring:      ["tailoring",      ["tailors_bench", "loom", "workbench"]],
    Leatherworking: ["leatherworking", ["leather_bench", "tanrack", "workbench"]],
    Armoursmithing: ["armoursmithing", ["anvil"]],
    Weaponsmithing: ["weaponsmithing", ["anvil"]],
    Jewelry:        ["jewelry",        ["jewelers_bench", "furnace"]],
    Fletching:      ["fletching",      ["workbench"]],
    Carpentry:      ["carpentry",      ["sawmill", "workbench"]],
    Toolmaking:     ["toolmaking",     ["toolsmith", "anvil", "workbench"]],
  };

  // OUTFIT_ITEM_ORDER rows: [id, name, existing?, slot, skill, req, inputs, block]
  //   existing? true  -> repoint icon only (item + recipe already defined elsewhere)
  //   slot: a slot-preset / EQUIP_SLOTS string / null (finished good, not worn)
  //   skill: null -> no recipe (cosmetic/found flavour item)
  const O = [
    // ---- 1. HEADWEAR & FACE (cells 0-20) ----
    ["hood",            "Cloth hood",            true],
    ["winged_helm",     "Winged helm",           false, HEAD, "Armoursmithing", 18, { iron_bar: 2 }, 0.06],
    ["fur_cap",         "Fur-edged cap",         false, HEAD, "Tailoring", 5, { leather: 1, cloth: 1 }, 0.02],
    ["feather_headdress","Feathered war-bonnet",  true],
    ["brass_goggles",   "Brass goggles",         false, "face", "Toolmaking", 8, { iron_bar: 1, leather: 1 }, 0.01],
    ["desert_headwrap", "Desert head-wrap",      true],
    ["turban",          "Turban",                true],
    ["heather_crown",   "Crown of heather",      false, HEAD, "Tailoring", 6, { cloth: 1 }, 0.01],
    ["headband",        "Woven headband",        false, HEAD, "Tailoring", 3, { cloth: 1 }, 0.01],
    ["wide_brim_hat",   "Wide-brimmed hat",      false, HEAD, "Tailoring", 6, { cloth: 2 }, 0.02],
    ["kabuto",          "Kabuto",                false, HEAD, "Armoursmithing", 20, { iron_bar: 2 }, 0.06],
    ["wolf_cowl",       "Wolf-pelt cowl",        false, HEAD, "Leatherworking", 10, { leather: 2 }, 0.03],
    ["halo",            "Halo",                  false, HEAD, null, 0, null, 0.0],
    ["wizard_hat",      "Wizard's hat",          true],
    ["top_hat",         "Top hat",               false, HEAD, "Tailoring", 9, { fine_cloth_x: 1 }, 0.02],
    ["feathered_visor", "Feathered visor",       false, HEAD, "Armoursmithing", 14, { iron_bar: 1, feathers: 2 }, 0.05],
    ["tricorne",        "Tricorne",              false, HEAD, "Tailoring", 8, { fine_cloth_x: 1 }, 0.02],
    ["straw_hat",       "Conical straw hat",     false, HEAD, "Tailoring", 4, { cloth: 1 }, 0.02],
    ["beret",           "Plumed beret",          false, HEAD, "Tailoring", 5, { fine_cloth_x: 1 }, 0.02],
    ["nemes",           "Nemes headdress",       false, HEAD, "Tailoring", 12, { fine_cloth_x: 1 }, 0.03],
    ["diving_helm",     "Brass diving helm",     false, HEAD, "Armoursmithing", 16, { iron_bar: 2 }, 0.06],
    // ---- 2. UPPER-BODY GARMENTS (cells 21-37) ----
    ["tunic",           "Tunic",                 true],
    ["linen_shirt",     "Linen shirt",           false, "torso", "Tailoring", 3, { cloth: 1 }, 0.03],
    ["sorcerer_robe",   "Sorcerer's robe",       true],
    ["cloth_jerkin",    "Leather jerkin",        true],
    ["cloth_apron",     "Smith's apron",         true],
    ["quilted_vest",    "Quilted vest",          true],
    ["armour_bodysuit", "Armoured bodysuit",     false, "torso", "Armoursmithing", 15, { iron_bar: 2 }, 0.05],
    ["sleeveless_jacket","Sleeveless jacket",     false, "torso", "Tailoring", 7, { dyed_wool_cloth: 1 }, 0.03],
    ["waistcoat",       "Waistcoat",             false, "torso", "Tailoring", 8, { fine_cloth_x: 1 }, 0.03],
    ["leather_coat",    "Leather long coat",     false, "torso", "Leatherworking", 14, { leather: 3 }, 0.05],
    ["pinstripe_suit",  "Pinstripe suit",        false, "torso", "Tailoring", 12, { fine_cloth_x: 2 }, 0.04],
    ["doublet",         "Doublet",               false, "torso", "Tailoring", 11, { fine_cloth_x: 1, dyed_wool_cloth: 1 }, 0.04],
    ["greatcoat",       "Greatcoat",             true],
    ["chest_wrap",      "Wrapped chest band",    false, "torso", "Tailoring", 2, { cloth: 1 }, 0.01],
    ["gambeson",        "Gambeson",              false, "torso", "Tailoring", 9, { cloth: 3 }, 0.05],
    ["hoodie",          "Hooded top",            false, "torso", "Tailoring", 6, { cloth: 2 }, 0.03],
    ["corset",          "Corset-vest",           false, "torso", "Leatherworking", 9, { leather: 2 }, 0.03],
    // ---- 3. ROBES, DRESSES, CULTURAL WEAR & CLOAKS (cells 38-56) ----
    ["mage_robe",       "Mage's robe",           true],
    ["buckskin_dress",  "Buckskin dress",        true],
    ["cleric_vestment", "Cleric's vestments",    true],
    ["gown",            "Gown",                  false, "torso", "Tailoring", 10, { fine_cloth_x: 2 }, 0.04],
    ["tabard",          "Tabard",                true],
    ["kimono",          "Kimono",                true],
    ["hanbok",          "Hanbok",                true],
    ["hanfu",           "Hanfu",                 true],
    ["poncho",          "Poncho",                true],
    ["boubou",          "Boubou",                true],
    ["sari",            "Sari",                  true],
    ["deel",            "Steppe deel-robe",      false, "torso", "Tailoring", 11, { dyed_wool_cloth: 2 }, 0.04],
    ["cloak",           "Cloak",                 true],
    ["mantle",          "Mantle",                true],
    ["half_cape",       "Half-cape",             true],
    ["fur_mantle",      "Fur mantle",            true],
    ["feathered_cloak", "Feathered cloak",       true],
    ["flax_cloak",      "Flax cloak",            true],
    ["stole",           "Stole",                 true],
    // ---- 4. ARMOUR PIECES (cells 57-71) ----
    ["spiked_cuirass",  "Spiked cuirass",        false, "torso", "Armoursmithing", 24, { steel_bar: 3 }, 0.10],
    ["steel_pauldron",  "Steel pauldron",        false, PAULD, "Armoursmithing", 12, { iron_bar: 1 }, 0.04],
    ["ornate_breastplate","Ornate breastplate",   false, "torso", "Armoursmithing", 22, { steel_bar: 2, gold_bar: 1 }, 0.10],
    ["leather_bracers", "Leather bracers",       false, WRIST, "Leatherworking", 6, { leather: 1 }, 0.03],
    ["scale_hauberk",   "Scale hauberk",         false, "torso", "Armoursmithing", 20, { iron_bar: 3 }, 0.09],
    ["lamellar_coat",   "Lamellar coat",         false, "torso", "Armoursmithing", 18, { iron_bar: 2, leather: 1 }, 0.08],
    ["tassets",         "Tassets",               false, LEGS, "Armoursmithing", 16, { steel_bar: 1 }, 0.06],
    ["fur_leather_armour","Fur-collared armour",  false, "torso", "Leatherworking", 14, { leather: 3 }, 0.06],
    ["gauntlets",       "Gauntlets",             false, HANDS, "Armoursmithing", 14, { steel_bar: 1 }, 0.05],
    ["greaves",         "Greaves",               false, LEGS, "Armoursmithing", 16, { steel_bar: 1, gold_bar: 1 }, 0.06],
    ["vambrace",        "Vambraces",             false, ARMS, "Armoursmithing", 10, { iron_bar: 1 }, 0.04],
    ["scaled_plate",    "Scaled plate",          false, "torso", "Armoursmithing", 20, { steel_bar: 2 }, 0.09],
    ["barding",         "Horse barding",         false, null, "Armoursmithing", 22, { steel_bar: 3, gold_bar: 1 }, 0],
    ["shell_armour",    "Shell armour",          false, "torso", "Leatherworking", 12, { leather: 2 }, 0.06],
    ["segmented_chestplate","Segmented chestplate", false, "torso", "Armoursmithing", 18, { steel_bar: 2 }, 0.08],
    // ---- 5. LOWER BODY, FOOTWEAR, BELTS & CONTAINERS (cells 72-91) ----
    ["smallclothes",    "Smallclothes",          true],
    ["trousers",        "Trousers",              false, LEGS, "Tailoring", 4, { cloth: 2 }, 0.03],
    ["skirt",           "Skirt",                 true],
    ["loincloth",       "Loincloth",             true],
    ["leggings",        "Leggings",              true],
    ["cargo_trousers",  "Cargo trousers",        false, LEGS, "Tailoring", 8, { cloth: 2 }, 0.03],
    ["kilt",            "Kilt",                  true],
    ["soft_boots",      "Soft boots",            false, FEET, "Leatherworking", 6, { leather: 1 }, 0.02],
    ["leather_boots",   "Leather boots",         false, FEET, "Leatherworking", 8, { leather: 2 }, 0.03],
    ["sandals",         "Sandals",               false, FEET, "Leatherworking", 3, { leather: 1 }, 0.01],
    ["shoes",           "Shoes",                 false, FEET, "Leatherworking", 5, { leather: 1 }, 0.02],
    ["leather_belt",    "Leather belt",          false, null, "Leatherworking", 4, { leather: 1 }, 0],
    ["chest_harness",   "Chest harness",         false, null, "Leatherworking", 6, { leather: 2 }, 0],
    ["sash",            "Sash",                  true],
    ["belt_pouches",    "Belt pouches",          false, null, "Leatherworking", 5, { leather: 1 }, 0],
    ["gold_belt",       "Gold-buckled belt",     false, null, "Leatherworking", 9, { leather: 1, gold_bar: 1 }, 0],
    ["shell_pack",      "Shell backpack",        false, null, "Leatherworking", 7, { leather: 2 }, 0],
    ["baldric",         "Baldric",               false, null, "Leatherworking", 6, { leather: 1 }, 0],
    ["leather_quiver",  "Leather quiver",        false, "quiver", "Leatherworking", 6, { leather: 2 }, 0.0],
    ["cape_sash",       "Cape-sash",             false, "cape", "Tailoring", 6, { dyed_wool_cloth: 1 }, 0.02],
    // ---- 6. JEWELLERY, TRIM & HELD EQUIPMENT (cells 92-113) ----
    ["feather_trim",    "Feather trim",          false, null, "Tailoring", 6, { feathers: 3 }, 0],
    ["gold_necklace",   "Gold necklace",         false, "neck", "Jewelry", 10, { gold_bar: 1 }, 0.0],
    ["gold_trim",       "Gold trim",             false, null, "Jewelry", 8, { gold_bar: 1 }, 0],
    ["greenstone_pendant","Greenstone pendant",   false, "neck", "Jewelry", 9, { leather: 1 }, 0.0],
    ["fur_trim",        "Fur trim",              false, null, "Leatherworking", 6, { leather: 1 }, 0],
    ["gold_clasp",      "Gold clasp",            false, null, "Jewelry", 7, { gold_bar: 1 }, 0],
    ["usekh_collar",    "Usekh collar",          false, "neck", "Jewelry", 14, { gold_bar: 2 }, 0.0],
    ["taniko_trim",     "Tāniko trim",           false, null, "Tailoring", 8, { dyed_wool_cloth: 1 }, 0],
    ["chest_core",      "Glowing chest-core",    false, null, null, 0, null, 0],
    ["orb_staff",       "Orb-staff",             false, "weapon", "Weaponsmithing", 14, { iron_bar: 1, fine_cloth_x: 1 }, 0],
    ["arming_sword",    "Arming sword",          false, "weapon", "Weaponsmithing", 12, { steel_bar: 1 }, 0],
    ["round_shield",    "Round shield",          false, "shield", "Armoursmithing", 8, { iron_bar: 1, leather: 1 }, 0.04],
    ["composite_bow",   "Composite bow",         false, "weapon", "Fletching", 12, { leather: 1 }, 0],
    ["war_spear",       "Spear",                 false, "weapon", "Weaponsmithing", 8, { iron_bar: 1 }, 0],
    ["twin_daggers",    "Twin daggers",          false, "weapon", "Weaponsmithing", 10, { steel_bar: 1 }, 0],
    ["astrolabe",       "Astrolabe-orb",         false, null, "Jewelry", 16, { gold_bar: 1 }, 0],
    ["katana",          "Katana",                false, "weapon", "Weaponsmithing", 18, { steel_bar: 2 }, 0],
    ["wand",            "Wand",                  false, "weapon", "Weaponsmithing", 6, { leather: 1 }, 0],
    ["lute",            "Lute",                  false, null, "Carpentry", 10, { leather: 1 }, 0],
    ["war_mace",        "Mace",                  false, "weapon", "Weaponsmithing", 10, { iron_bar: 1 }, 0],
    ["trident",         "Trident",               false, "weapon", "Weaponsmithing", 14, { steel_bar: 1 }, 0],
    ["rapier",          "Rapier",                false, "weapon", "Weaponsmithing", 12, { steel_bar: 1 }, 0],
  ];
  window.OUTFIT_ITEM_ORDER = O.map(r => r[0]);

  const RECIPES_ok = (typeof RECIPES !== "undefined");
  O.forEach((row, i) => {
    const [id, name, existing, slot, skill, req, inp, block] = row;
    // 1) icon: repoint the item's i_<id> to this sheet cell (upgrade or new art)
    setIcon(id, i);
    if (existing) {
      // ensure the existing item actually points at i_<id> (garments.js already does)
      if (ITEMS[id] && !ITEMS[id].icon) ITEMS[id].icon = "i_" + id;
      return;
    }
    // 2) new item
    if (!ITEMS[id]) {
      const props = { name, icon: "i_" + id };
      if (slot) { props.equip = slot; props.block = block || 0.02; props.wearReq = req || 0; props.value = 45 + (req || 0) * 11; }
      else { props.finished = true; props.value = 30 + (req || 0) * 8; }
      ITEMS[id] = props;
      if (typeof EXAMINE !== "undefined" && !EXAMINE[id]) EXAMINE[id] = name + ".";
    } else {
      ITEMS[id].icon = "i_" + id; // just upgrade the art if it somehow exists
    }
    // 3) recipe (skip cosmetic/no-skill items)
    if (skill && RECIPES_ok && SK[skill] && inp) {
      const [cat, stations] = SK[skill];
      RECIPES[cat] = RECIPES[cat] || [];
      if (!RECIPES[cat].some(r => r.out === id)) {
        RECIPES[cat].push({
          id: cat + "_oi_" + id, out: id,
          name: "Craft " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
          skill, req, xp: 24 + req * 5, in: inp, tick: 2000 + req * 30,
          family: slot ? "outfititems" : "accessories", stations,
        });
      }
    }
  });

  // keep the recipe-id/family invariant the rest of the engine relies on
  if (RECIPES_ok) for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i; if (!r.family) r.family = cat;
  });
})();
