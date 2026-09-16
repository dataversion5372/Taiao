// ===== Taiao — custom mob sprites & bestiary expansion =====
// 18 new regular mobs + 33 unique bosses using hand-crafted pixel art sprites.
// Loaded after content.js (so MONSTERS/BIOME_MOB_NAMES exist) and before world.js
// (so resolveBiomeMobs picks up the extended spawn lists).
"use strict";

// ── SPR registrations ─────────────────────────────────────────────────────────
// Custom mob art is baked into assets/mobs.png and addressed by source rectangle.
// Callers (1):
//  custom-mobs.js:68
const CM_SPRITES = {
  cms_tide_lurker: ["m", 0, 0, { sx: 0, sy: 306, sw: 16, sh: 16 }],
  cms_sea_spirit: ["m", 0, 0, { sx: 17, sy: 306, sw: 16, sh: 16 }],
  cms_frost_pup: ["m", 0, 0, { sx: 34, sy: 306, sw: 16, sh: 16 }],
  cms_swamp_creep: ["m", 0, 0, { sx: 51, sy: 306, sw: 16, sh: 16 }],
  cms_deep_shade: ["m", 0, 0, { sx: 68, sy: 306, sw: 16, sh: 16 }],
  cms_ember_skull: ["m", 0, 0, { sx: 85, sy: 306, sw: 16, sh: 16 }],
  cms_lava_imp: ["m", 0, 0, { sx: 102, sy: 306, sw: 16, sh: 16 }],
  cms_bone_crawler: ["m", 0, 0, { sx: 119, sy: 306, sw: 16, sh: 16 }],
  cms_frost_spirit: ["m", 0, 0, { sx: 136, sy: 306, sw: 16, sh: 16 }],
  cms_blazesprite: ["m", 0, 0, { sx: 153, sy: 306, sw: 16, sh: 16 }],
  cms_shadow_pirate: ["m", 0, 0, { sx: 170, sy: 306, sw: 16, sh: 16 }],
  cms_ember_gnome: ["m", 0, 0, { sx: 187, sy: 306, sw: 16, sh: 16 }],
  cms_rust_automaton: ["m", 0, 0, { sx: 204, sy: 306, sw: 16, sh: 16 }],
  cms_shade_walker: ["m", 0, 0, { sx: 221, sy: 306, sw: 16, sh: 16 }],
  cms_frostpaw: ["m", 0, 0, { sx: 238, sy: 306, sw: 16, sh: 16 }],
  cms_void_creep: ["m", 0, 0, { sx: 255, sy: 306, sw: 16, sh: 16 }],
  cms_bog_toad: ["m", 0, 0, { sx: 272, sy: 306, sw: 16, sh: 16 }],
  cms_void_gobbet: ["m", 0, 0, { sx: 289, sy: 306, sw: 16, sh: 16 }],
  cmb_frost_lord: ["m", 0, 0, { sx: 0, sy: 323, sw: 160, sh: 160 }],
  cmb_phoenix: ["m", 0, 0, { sx: 161, sy: 323, sw: 160, sh: 160 }],
  cmb_hydra_queen: ["m", 0, 0, { sx: 322, sy: 323, sw: 160, sh: 160 }],
  cmb_earth_titan: ["m", 0, 0, { sx: 483, sy: 323, sw: 160, sh: 160 }],
  cmb_brood_mother: ["m", 0, 0, { sx: 644, sy: 323, sw: 160, sh: 160 }],
  cmb_death_mage: ["m", 0, 0, { sx: 805, sy: 323, sw: 160, sh: 160 }],
  cmb_fire_drake: ["m", 0, 0, { sx: 0, sy: 484, sw: 160, sh: 160 }],
  cmb_elder_beholder: ["m", 0, 0, { sx: 161, sy: 484, sw: 160, sh: 160 }],
  cmb_sea_wyrm: ["m", 0, 0, { sx: 322, sy: 484, sw: 160, sh: 160 }],
  cmb_demon_eye: ["m", 0, 0, { sx: 483, sy: 484, sw: 160, sh: 160 }],
  cmb_dwarf_king: ["m", 0, 0, { sx: 644, sy: 484, sw: 160, sh: 160 }],
  cmb_ice_queen: ["m", 0, 0, { sx: 805, sy: 484, sw: 160, sh: 160 }],
  cmb_plague_doctor: ["m", 0, 0, { sx: 0, sy: 645, sw: 160, sh: 160 }],
  cmb_demon_king: ["m", 0, 0, { sx: 161, sy: 645, sw: 160, sh: 160 }],
  cmb_deep_one: ["m", 0, 0, { sx: 322, sy: 645, sw: 160, sh: 160 }],
  cmb_bone_wyrm: ["m", 0, 0, { sx: 483, sy: 645, sw: 160, sh: 160 }],
  cmb_abyssal_overlord: ["m", 0, 0, { sx: 644, sy: 645, sw: 160, sh: 160 }],
  cmb_tentacle_horror: ["m", 0, 0, { sx: 805, sy: 645, sw: 160, sh: 160 }],
  cmb_death_seraph: ["m", 0, 0, { sx: 0, sy: 806, sw: 160, sh: 160 }],
  cmb_lava_king: ["m", 0, 0, { sx: 161, sy: 806, sw: 160, sh: 160 }],
  cmb_void_lich: ["m", 0, 0, { sx: 322, sy: 806, sw: 160, sh: 160 }],
  cmb_stone_giant: ["m", 0, 0, { sx: 483, sy: 806, sw: 160, sh: 160 }],
  cmb_fallen_seraph: ["m", 0, 0, { sx: 644, sy: 806, sw: 160, sh: 160 }],
  cmb_bog_king: ["m", 0, 0, { sx: 805, sy: 806, sw: 160, sh: 160 }],
  cmb_shadow_drake: ["m", 0, 0, { sx: 0, sy: 967, sw: 160, sh: 160 }],
  cmb_spider_empress: ["m", 0, 0, { sx: 161, sy: 967, sw: 160, sh: 160 }],
  cmb_naga_queen: ["m", 0, 0, { sx: 322, sy: 967, sw: 160, sh: 160 }],
  cmb_vampire_lord: ["m", 0, 0, { sx: 483, sy: 967, sw: 160, sh: 160 }],
  cmb_world_treant: ["m", 0, 0, { sx: 644, sy: 967, sw: 160, sh: 160 }],
  cmb_void_maw: ["m", 0, 0, { sx: 805, sy: 967, sw: 160, sh: 160 }],
  cmb_mountain_king: ["m", 0, 0, { sx: 0, sy: 1128, sw: 160, sh: 160 }],
  cmb_thorned_devourer: ["m", 0, 0, { sx: 161, sy: 1128, sw: 160, sh: 160 }],
  cmb_yeti_alpha: ["m", 0, 0, { sx: 322, sy: 1128, sw: 160, sh: 160 }],
};
// Callers (0):
//  none found
const CM_SMALL_KEYS = [
  "cms_tide_lurker","cms_sea_spirit","cms_frost_pup","cms_swamp_creep","cms_deep_shade","cms_ember_skull","cms_lava_imp","cms_bone_crawler","cms_frost_spirit","cms_blazesprite","cms_shadow_pirate","cms_ember_gnome","cms_rust_automaton","cms_shade_walker","cms_frostpaw","cms_void_creep","cms_bog_toad","cms_void_gobbet",
];
// Callers (0):
//  none found
const CM_BOSS_KEYS = [
  "cmb_frost_lord","cmb_phoenix","cmb_hydra_queen","cmb_earth_titan","cmb_brood_mother","cmb_death_mage","cmb_fire_drake","cmb_elder_beholder","cmb_sea_wyrm","cmb_demon_eye","cmb_dwarf_king","cmb_ice_queen","cmb_plague_doctor","cmb_demon_king","cmb_deep_one","cmb_bone_wyrm","cmb_abyssal_overlord","cmb_tentacle_horror","cmb_death_seraph","cmb_lava_king","cmb_void_lich","cmb_stone_giant","cmb_fallen_seraph","cmb_bog_king","cmb_shadow_drake","cmb_spider_empress","cmb_naga_queen","cmb_vampire_lord","cmb_world_treant","cmb_void_maw","cmb_mountain_king","cmb_thorned_devourer","cmb_yeti_alpha",
];
for (const [k, def] of Object.entries(CM_SPRITES)) SPR[k] = def;

// ── Drop helpers ──────────────────────────────────────────────────────────────
// Callers (16):
//  custom-mobs.js:74,102,104,106,110,112,114,117,121,123,125,127,130,132,134,136
function _coinDrop(min, max) { return { id: "coins", min, max, ch: 1 }; }
// Callers (1):
//  custom-mobs.js:238
function _bossDrops(lvl, theme) {
  const tier = Math.min(31, Math.floor(lvl / 3));
  const drops = [_coinDrop(lvl * 5, lvl * 18)];
  drops.push({ id: METALS[tier].bar, min: 1, max: 3, ch: 0.6 });
  drops.push({ id: "gem", min: 1, max: 3, ch: 0.5 });
  if (theme === "d" || theme === "c")
    drops.push({ id: "gem_amulet", min: 1, max: 1, ch: 0.12 });
  if (theme === "u" || theme === "m")
    drops.push({ id: RUNES[tier].id, min: 3, max: 10, ch: 0.45 });
  if (theme === "e")
    drops.push({ id: HERBS[tier].id, min: 2, max: 5, ch: 0.4 });
  if (theme === "g")
    drops.push({ id: METALS[Math.min(31, tier + 2)].ore, min: 2, max: 4, ch: 0.5 });
  if (theme === "q")
    drops.push({ id: "raw_f5", min: 5, max: 15, ch: 0.7 });
  // guaranteed piece of high-tier gear at very low chance
  if (lvl >= 55) drops.push({ id: "gold_sword", min: 1, max: 1, ch: 0.05 });
  if (lvl >= 70) drops.push({ id: "gem_amulet", min: 1, max: 1, ch: 0.06 });
  return drops;
}

// ── Regular mobs ──────────────────────────────────────────────────────────────
// [key, name, lvl, hp, maxHit, def, atkTick, aggro, scale, drops, theme, respawn, xp, extraProps]
// Regular mobs span old-scale levels 3-95 (displayed as ~1-31 after the
// 99->32 level compression via scaleLevel()), seeding every depth of the world.
// Stats derived from the same formula as CREATURES: hp = 4 + lvl*3.1, etc.
// Callers (1):
//  custom-mobs.js:139
const CM_MOBS = [
  // ── Near-start (lvl 3–12) ──
  ["bog_toad",      "Bog Toad",       3,  13, 1,  2, 2500, false, 0.75,
    [], "cms_bog_toad", 10000, 34, { butcher: { meat: 1, hide: 0 } }],
  ["swamp_creep",   "Swamp Creep",    5,  19, 2,  4, 2400, false, 0.8,
    [_coinDrop(1,10), { id:"herb",min:1,max:1,ch:0.15 }], "cms_swamp_creep", 12000, 60],
  ["void_gobbet",   "Void Gobbet",    5,  19, 2,  4, 2400, false, 0.65,
    [_coinDrop(1,9)], "cms_void_gobbet", 11000, 58],
  ["ember_gnome",   "Ember Gnome",    6,  22, 2,  5, 2200, false, 0.8,
    [_coinDrop(2,12), { id:"copper_ore",min:1,max:1,ch:0.25 }], "cms_ember_gnome", 13000, 72],
  ["frost_pup",     "Frost Pup",      7,  25, 2,  6, 2300, false, 0.75,
    [], "cms_frost_pup", 14000, 82, { butcher: { meat: 1, hideItem: "hide_1", hide: 1 } }],
  ["void_creep",    "Void Creep",     8,  28, 3,  6, 2400, false, 0.7,
    [_coinDrop(2,12), { id:"herb",min:1,max:1,ch:0.12 }], "cms_void_creep", 14000, 92],
  ["tide_lurker",   "Tide Lurker",    10, 35, 3,  8, 2200, false, 0.9,
    [_coinDrop(3,16), { id:"raw_f5",min:1,max:3,ch:0.5 }], "cms_tide_lurker", 16000, 120],
  ["sea_spirit",    "Sea Spirit",     12, 41, 4, 10, 2400, false, 0.85,
    [_coinDrop(4,18), { id:"air_rune",min:2,max:6,ch:0.35 }], "cms_sea_spirit", 18000, 145],
  // ── Mid range (lvl 18–40) ──
  ["frost_spirit",  "Frost Spirit",   18, 60, 6, 14, 2300, false, 0.75,
    [_coinDrop(6,22), { id:"state_rune",min:1,max:3,ch:0.35 }], "cms_frost_spirit", 22000, 210],
  ["frostpaw",      "Frostpaw",       20, 66, 7, 16, 2200, false, 0.8,
    [], "cms_frostpaw", 24000, 240, { butcher: { meat: 2, hideItem: "hide_0", hide: 1 } }],
  ["shade_walker",  "Shade Walker",   24, 78, 8, 19, 2200, true,  0.9,
    [_coinDrop(10,35), { id:"herb",min:1,max:2,ch:0.25 }], "cms_shade_walker", 26000, 285],
  ["lava_imp",      "Lava Imp",       28, 90, 10, 22, 1800, true,  0.7,
    [_coinDrop(12,40), { id:"fire_rune",min:2,max:6,ch:0.45 }], "cms_lava_imp", 28000, 340],
  ["deep_shade",    "Deep Shade",     32, 103, 11, 26, 2100, true,  0.85,
    [_coinDrop(14,48), { id:"air_rune",min:2,max:5,ch:0.25 }], "cms_deep_shade", 30000, 395],
  ["bone_crawler",  "Bone Crawler",   36, 115, 13, 29, 2100, true,  0.8,
    [_coinDrop(16,55), { id:"arrow_iron",min:8,max:18,ch:0.35 }], "cms_bone_crawler", 32000, 450],
  // ── High range (lvl 45–95) ──
  ["shadow_pirate", "Shadow Pirate",  45, 143, 16, 36, 1900, true,  0.95,
    [_coinDrop(22,75), { id:"iron_ore",min:1,max:3,ch:0.25 }, { id:"arrow_iron",min:6,max:15,ch:0.25 }], "cms_shadow_pirate", 36000, 570],
  ["ember_skull",   "Ember Skull",    55, 174, 19, 44, 2000, true,  0.75,
    [_coinDrop(30,95), { id:"fire_rune",min:4,max:10,ch:0.45 }, { id:"action_rune",min:2,max:5,ch:0.25 }], "cms_ember_skull", 42000, 705],
  ["blazesprite",   "Blazesprite",    70, 221, 25, 56, 1900, true,  0.7,
    [_coinDrop(45,140), { id:"fire_rune",min:6,max:14,ch:0.55 }], "cms_blazesprite", 52000, 910],
  ["rust_automaton","Rust Automaton", 85, 267, 30, 68, 2400, true,  1.0,
    [_coinDrop(60,180), { id:"iron_ore",min:2,max:5,ch:0.5 }, { id:"gold_bar",min:1,max:2,ch:0.25 }], "cms_rust_automaton", 62000, 1110],
];

for (const [key, name, lvl, hp, maxHit, def, atkTick, aggro, scale, drops, sprKey, respawn, xp, extra] of CM_MOBS) {
  MONSTERS[key] = {
    name, lvl: scaleLevel(lvl), hp, maxHit, def, atkTick, aggro,
    spr: [[sprKey]], scale,
    drops, respawn, xp,
    ...(extra || {}),
  };
}

// ── Boss monsters ─────────────────────────────────────────────────────────────
// [key, name, lvl, scale, theme, sprKey, extraDrops, extraProps]
// Boss levels span old-scale 110-500 (displayed as ~36-162 after scaleLevel()),
// well above the regular mob ceiling of ~99 (~32 displayed).
// Spread across 5 tiers so players have progression goals deep into the world.
//   Tier 1 (110–150): entry bosses — challenging but approachable
//   Tier 2 (160–220): mid bosses — serious threat, rich loot
//   Tier 3 (240–290): elite bosses — dangerous, best non-unique gear
//   Tier 4 (310–380): apex bosses — require top equipment
//   Tier 5 (400–500): legendary — The Void Maw and peers
// Callers (1):
//  custom-mobs.js:237
const CM_BOSSES = [
  // ── Tier 1 (110–150) ──
  ["mountain_king",    "Mountain King",    110, 2.5, "h", "cmb_mountain_king",
    [{ id:"gold_bar",min:2,max:5,ch:0.6 }, { id:"iron_sword",min:1,max:1,ch:0.2 }]],
  ["dwarf_king",       "Dwarf King",       120, 2.4, "h", "cmb_dwarf_king",
    [{ id:"iron_bar",min:3,max:6,ch:0.6 }, { id:"iron_sword",min:1,max:1,ch:0.25 }]],
  ["thorned_devourer", "Thorned Devourer", 125, 2.4, "m", "cmb_thorned_devourer",
    [{ id:"gem",min:2,max:4,ch:0.55 }]],
  ["bog_king",         "Bog King",         130, 2.5, "m", "cmb_bog_king",
    [{ id:"herb",min:5,max:10,ch:0.7 }, { id:"gem",min:1,max:2,ch:0.4 }]],
  ["yeti_alpha",       "Yeti Alpha",       140, 2.6, "b", "cmb_yeti_alpha",
    [{ id:"gem",min:2,max:4,ch:0.5 }],
    { butcher: { meat: 6, hideItem: "hide_24", hide: 3 } }],
  ["plague_doctor",    "Plague Doctor",    150, 2.4, "u", "cmb_plague_doctor",
    [{ id:"herb",min:5,max:12,ch:0.7 }, { id:"potion_health",min:2,max:4,ch:0.55 }]],

  // ── Tier 2 (160–220) ──
  ["vampire_lord",     "Vampire Lord",     160, 2.6, "u", "cmb_vampire_lord",
    [{ id:"gold_ring",min:1,max:2,ch:0.5 }, { id:"gem",min:2,max:5,ch:0.5 }]],
  ["phoenix",          "Phoenix",          170, 2.6, "c", "cmb_phoenix",
    [{ id:"fire_rune",min:15,max:35,ch:0.85 }, { id:"gem_amulet",min:1,max:1,ch:0.2 }]],
  ["stone_giant",      "Stone Giant",      175, 3.0, "g", "cmb_stone_giant",
    [{ id:"gold_ore",min:4,max:8,ch:0.65 }, { id:"gem",min:2,max:4,ch:0.5 }]],
  ["world_treant",     "World Treant",     180, 3.0, "m", "cmb_world_treant",
    [{ id:"pine_logs",min:8,max:16,ch:0.8 }, { id:"herb",min:3,max:6,ch:0.55 }]],
  ["sea_wyrm",         "Sea Wyrm",         185, 2.7, "q", "cmb_sea_wyrm",
    [{ id:"fish_5",min:8,max:18,ch:0.7 }, { id:"gem",min:2,max:4,ch:0.45 }]],
  ["naga_queen",       "Naga Queen",       195, 2.7, "q", "cmb_naga_queen",
    [{ id:"gold_ring",min:1,max:2,ch:0.45 }, { id:"gem",min:2,max:5,ch:0.5 }]],
  ["lava_king",        "Lava King",        200, 2.8, "e", "cmb_lava_king",
    [{ id:"potion_attack",min:2,max:4,ch:0.6 }, { id:"gem",min:2,max:5,ch:0.5 }]],
  ["earth_titan",      "Earth Titan",      210, 3.0, "g", "cmb_earth_titan",
    [{ id:"gold_ore",min:5,max:10,ch:0.7 }, { id:"gem",min:3,max:6,ch:0.55 }]],
  ["shadow_drake",     "Shadow Drake",     220, 2.9, "d", "cmb_shadow_drake",
    [{ id:"gold_bar",min:3,max:7,ch:0.65 }, { id:"gem_amulet",min:1,max:1,ch:0.18 }]],

  // ── Tier 3 (240–290) ──
  ["frost_lord",       "Frost Lord",       240, 2.9, "e", "cmb_frost_lord",
    [{ id:"potion_defence",min:2,max:4,ch:0.65 }, { id:"gem",min:3,max:7,ch:0.6 }]],
  ["hydra_queen",      "Hydra Queen",      250, 2.8, "q", "cmb_hydra_queen",
    [{ id:"fish_5",min:10,max:25,ch:0.75 }, { id:"gem_amulet",min:1,max:1,ch:0.2 }]],
  ["ice_queen",        "Ice Queen",        255, 2.7, "m", "cmb_ice_queen",
    [{ id:"gold_ring",min:1,max:2,ch:0.55 }, { id:"gem_amulet",min:1,max:1,ch:0.22 }]],
  ["brood_mother",     "Brood Mother",     260, 3.0, "b", "cmb_brood_mother",
    [{ id:"hide_25",min:2,max:4,ch:0.65 }, { id:"gem",min:3,max:7,ch:0.55 }],
    { butcher: { meat: 5, hideItem: "hide_25", hide: 3 } }],
  ["spider_empress",   "Spider Empress",   265, 3.0, "b", "cmb_spider_empress",
    [{ id:"gem",min:4,max:8,ch:0.65 }, { id:"gem_amulet",min:1,max:1,ch:0.22 }]],
  ["tentacle_horror",  "Tentacle Horror",  270, 2.9, "q", "cmb_tentacle_horror",
    [{ id:"raw_f5",min:15,max:30,ch:0.8 }, { id:"gem",min:3,max:7,ch:0.6 }]],
  ["fire_drake",       "Fire Drake",       280, 2.9, "d", "cmb_fire_drake",
    [{ id:"gold_sword",min:1,max:1,ch:0.2 }, { id:"gem_amulet",min:1,max:1,ch:0.2 }]],
  ["bone_wyrm",        "Bone Wyrm",        285, 2.9, "u", "cmb_bone_wyrm",
    [{ id:"arrow_iron",min:25,max:50,ch:0.8 }, { id:"gem_amulet",min:1,max:1,ch:0.22 }]],
  ["demon_eye",        "Demon Eye",        290, 2.8, "m", "cmb_demon_eye",
    [{ id:"gem",min:5,max:10,ch:0.7 }, { id:"gem_amulet",min:1,max:1,ch:0.25 }]],

  // ── Tier 4 (310–380) ──
  ["death_mage",       "Death Mage",       310, 2.7, "u", "cmb_death_mage",
    [{ id:"potion_health",min:4,max:8,ch:0.7 }, { id:"gem_amulet",min:1,max:1,ch:0.28 }]],
  ["abyssal_overlord", "Abyssal Overlord", 330, 3.0, "c", "cmb_abyssal_overlord",
    [{ id:"gem_amulet",min:1,max:1,ch:0.3 }, { id:"gold_sword",min:1,max:1,ch:0.22 }]],
  ["elder_beholder",   "Elder Beholder",   350, 3.0, "m", "cmb_elder_beholder",
    [{ id:"gem",min:6,max:12,ch:0.75 }, { id:"gem_amulet",min:1,max:1,ch:0.3 }]],
  ["void_lich",        "Void Lich",        360, 2.8, "u", "cmb_void_lich",
    [{ id:"gem_amulet",min:1,max:1,ch:0.35 }, { id:"gold_sword",min:1,max:1,ch:0.25 }]],
  ["fallen_seraph",    "Fallen Seraph",    370, 3.0, "c", "cmb_fallen_seraph",
    [{ id:"gem_amulet",min:1,max:1,ch:0.32 }, { id:"gold_sword",min:1,max:1,ch:0.25 }]],
  ["demon_king",       "Demon King",       380, 3.1, "c", "cmb_demon_king",
    [{ id:"gem_amulet",min:1,max:1,ch:0.35 }, { id:"gold_sword",min:1,max:1,ch:0.28 }]],

  // ── Tier 5 (400–500) ──
  ["deep_one",         "The Deep One",     420, 3.0, "q", "cmb_deep_one",
    [{ id:"gem",min:8,max:16,ch:0.8 }, { id:"gem_amulet",min:1,max:1,ch:0.38 }]],
  ["death_seraph",     "Death Seraph",     450, 3.1, "c", "cmb_death_seraph",
    [{ id:"gem_amulet",min:1,max:1,ch:0.4 }, { id:"gold_sword",min:1,max:1,ch:0.35 }]],
  ["void_maw",         "The Void Maw",     500, 3.2, "m", "cmb_void_maw",
    [{ id:"gem_amulet",min:1,max:1,ch:0.5 }, { id:"gold_sword",min:1,max:1,ch:0.4 }, { id:"gem",min:10,max:20,ch:0.85 }]],
];

for (const [key, name, lvl, scale, theme, sprKey, extraDrops, extra] of CM_BOSSES) {
  const baseDrop = _bossDrops(lvl, theme);
  MONSTERS[key] = {
    name, lvl: scaleLevel(lvl),
    hp: Math.round(lvl * 5),
    maxHit: Math.round(lvl * 0.5),
    def: Math.round(lvl * 1.0),
    atkTick: Math.max(1800, 2400 - Math.min(600, lvl * 6)),
    aggro: true,
    spr: [[sprKey]],
    scale,
    drops: [...baseDrop, ...(extraDrops || [])],
    respawn: Math.round(lvl * 3000),
    xp: Math.round(lvl * 28),
    ...(extra || {}),
  };
}

// ── Biome spawn list extensions ───────────────────────────────────────────────
// Each sub-array is [biome name, [...display names to add]]
// Callers (1):
//  custom-mobs.js:303
const CM_BIOME_ADDS = [
  // small mobs
  ["WATER",    ["Tide Lurker", "Sea Spirit"]],
  ["REEF",     ["Tide Lurker", "Sea Spirit"]],
  ["SAND",     ["Tide Lurker"]],
  ["WETLAND",  ["Tide Lurker", "Sea Spirit", "Bog Toad", "Swamp Creep"]],
  ["SWAMP",    ["Swamp Creep", "Deep Shade", "Shade Walker", "Bog Toad", "Void Creep"]],
  ["MOOR",     ["Deep Shade", "Shade Walker"]],
  ["MUSHROOM", ["Void Creep", "Void Gobbet"]],
  ["SNOW",     ["Frost Pup", "Frost Spirit"]],
  ["GLACIER",  ["Frost Pup", "Frost Spirit"]],
  ["TUNDRA",   ["Frost Pup", "Frostpaw"]],
  ["TAIGA",    ["Frostpaw"]],
  ["VOLCANO",  ["Ember Skull", "Lava Imp", "Blazesprite"]],
  ["ASH",      ["Ember Skull", "Blazesprite"]],
  ["RUINSB",   ["Bone Crawler", "Shadow Pirate"]],
  ["BONE",     ["Bone Crawler", "Shadow Pirate"]],
  ["GRASS",    ["Ember Gnome"]],
  ["MEADOW",   ["Ember Gnome"]],
  ["LABYRINTH",["Rust Automaton", "Shadow Pirate"]],
  // bosses
  ["GLACIER",  ["Frost Lord", "Ice Queen", "Yeti Alpha"]],
  ["SNOW",     ["Frost Lord", "Ice Queen", "Yeti Alpha"]],
  ["VOLCANO",  ["Phoenix", "Fire Drake", "Lava King"]],
  ["ASH",      ["Phoenix", "Shadow Drake", "Fallen Seraph"]],
  ["SWAMP",    ["Hydra Queen", "Bog King", "Tentacle Horror"]],
  ["WETLAND",  ["Hydra Queen", "Bog King", "Naga Queen"]],
  ["REEF",     ["Sea Wyrm", "Naga Queen"]],
  ["WATER",    ["Sea Wyrm", "Deep One"]],
  ["DEEP",     ["Deep One", "Abyssal Overlord"]],
  ["FOREST",   ["Brood Mother", "Spider Empress", "World Treant"]],
  ["JUNGLE",   ["Brood Mother", "Spider Empress", "World Treant"]],
  ["ROCK",     ["Earth Titan", "Stone Giant", "Mountain King", "Dwarf King"]],
  ["ROCKY",    ["Stone Giant", "Mountain King", "Dwarf King"]],
  ["CANYON",   ["Earth Titan", "Stone Giant"]],
  ["DESERT",   ["Thorned Devourer"]],
  ["REDDESERT",["Thorned Devourer"]],
  ["BONE",     ["Death Mage", "Bone Wyrm", "Void Lich", "Vampire Lord"]],
  ["RUINSB",   ["Vampire Lord", "Plague Doctor", "Bone Wyrm"]],
  ["MOOR",     ["Plague Doctor"]],
  ["DREAM",    ["Elder Beholder", "Demon Eye"]],
  ["CRYSTAL",  ["Elder Beholder", "Demon Eye"]],
  ["BADLANDS", ["Shadow Drake"]],
  ["WILD",     ["Death Mage", "Bone Wyrm", "Void Lich", "Demon King", "Fallen Seraph", "Death Seraph", "The Void Maw"]],
];

for (const [bname, names] of CM_BIOME_ADDS) {
  if (!BIOME_MOB_NAMES[bname]) BIOME_MOB_NAMES[bname] = [];
  for (const n of names) {
    if (!BIOME_MOB_NAMES[bname].includes(n)) BIOME_MOB_NAMES[bname].push(n);
  }
}
