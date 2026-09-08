// ===== Isle of Emberfall — data definitions =====
// Sheets: Kenney roguelike packs (CC0) + custom.png (hand-drawn pixel items).
// 16x16 tiles, 1px margin.
"use strict";

// Callers (35):
//  main/state.js:22 render3d.js:98,321
//  world/map.js:151,152,278,375,378,442,454,506,508,595,597,600,604,605,606,608,609,611,613,617,618,623,625,627,630,632,634,637,643,649,650,660
const TILE = 16, PAD = 17, SCALE = 3;

// [sheet, col, row, {filter, rot}] — "t" tiles.png, "c" chars.png, "x" custom.png
// Callers (273):
//  
//  biome-tiles.js:6,8,10,12,14,16,19,21,23,25,27,29,32,34,36,38,40,42,45,47,49,51,53,55,58,60,62,64,66,68,71,73,75,77,79,81,84,86,88,90,92,94,97,99,101,103,105,107,110,112,114,116,118,120,123,125,127,129,131,133,136,138,140,142,144,146,149,151,153,155,157,159,162,164,166,168,170,172,175,177,179,181,183,185,188,190,192,194,196,198,201,203,205,207,209,211,214,216,218,220,222,224,227,229,231,233,235,237,240,242,244,246,248,250,253,255,257,259,261,263,266,268,270,272,274,276,279,281,283,285,287,289,292,294,296,298,300,302,305,307,309,311,313,315,318,320,322,324,326,328,331,333,335,337,339,341,344,346,348,350,352,354,357,359,361,363,365,367,370,372,374,376,378,380,383,385,387,389,391,393,396,398,400,402,404,406,409,411,413,415,417,419,422,424,426,428,430,432,435,437,439,441,443,445,448,450,452,454,456,458,461,463,465,467,469,471,474,476,478,480,482,484,491
//  content.js:6,19,20,34,35,55,59,94,380,534,535,536,537,538,539,540,541,542,543,544,545,546,547,548,549,550,551,552,553,554,559,560,561,577,578,579,580,581,582,585,586
//  custom-mobs.js:7,68 data.js:195,197,249,250 main/assets.js:46 render3d.js:23,78
const SPR = {
  // terrain
  grass:      ["t", 5, 0],
  grass2:     ["t", 5, 1],
  water:      ["t", 0, 0],
  water2:     ["t", 1, 0],
  sand:       ["t", 8, 0],
  sand2:      ["t", 8, 1],
  dirt:       ["t", 6, 0],
  dirt2:      ["t", 6, 1],
  stone:      ["t", 7, 0],
  stone2:     ["t", 7, 1],
  gravel:     ["t", 9, 0],
  farm:       ["t", 3, 19],
  // decor
  flower_blue:   ["t", 28, 9],
  flower_orange: ["t", 29, 9],
  flower_purple: ["t", 30, 9],
  flower_white:  ["t", 31, 9],
  mushroom:      ["t", 48, 3],
  bush:          ["t", 25, 9],
  bush2:         ["t", 26, 9],
  lily:          ["t", 28, 10],
  lily2:         ["t", 28, 11],
  torch:         ["t", 17, 7],
  gravestone:    ["t", 51, 10],
  cart_gold:     ["t", 49, 21],
  cart:          ["t", 49, 18],
  tent_l:        ["t", 46, 10],
  tent_r:        ["t", 47, 10],
  tent2_l:       ["t", 48, 10],
  tent2_r:       ["t", 49, 10],
  barrel:        ["t", 22, 0],
  crate:         ["t", 37, 9],
  skull:         ["t", 49, 9],
  sign:          ["t", 19, 0],
  goldpile:      ["t", 41, 11],
  boulder:       ["t", 54, 21],
  stepstone:     ["t", 56, 21],
  // nodes / stations — trees & ores from items32.png (32px tiles, better quality)
  tree:         ["i", 2, 2],   // green oak
  tree_orange:  ["i", 8, 2],   // orange/autumn tree
  tree_apple:   ["i", 6, 2],   // cherry blossom (pink)
  tree_pine:    ["i", 4, 2],   // tall pine
  stump:        ["t", 27, 10],
  rock_copper:  ["i", 6, 4],   // orange ore pile
  rock_iron:    ["i", 1, 4],   // blue-grey rocks
  rock_gold:    ["i", 5, 4],   // gold ore pile
  rock_essence: ["i", 4, 4],   // blue crystal cluster
  rock_dead:    ["i", 0, 4],   // grey depleted rock
  ripple:       ["t", 0, 2],
  berrybush:    ["i", 0, 5],   // red berry cluster
  herb_plant:   ["i", 7, 6],   // herb/plant cluster
  sprout:       ["t", 22, 10],
  wheat_plant:  ["x", 0, 0],
  furnace:      ["t", 13, 0],
  anvil:        ["t", 15, 0],
  campfire:     ["t", 15, 8],
  bankchest:    ["t", 38, 10],
  stall_awn:    ["t", 10, 0],
  stall_bar:    ["t", 10, 1],
  workbench:    ["t", 16, 1],
  loom:         ["t", 51, 13],
  tanrack:      ["t", 52, 14],
  mill:         ["t", 44, 0],
  cauldron:     ["t", 51, 16],
  alchtable:    ["t", 24, 3],
  altar:        ["t", 50, 10],
  // item icons
  i_coins:    ["t", 45, 11],
  i_logs:     ["i", 0, 8],   // items32 row 8 = logs, tier-indexed by column
  i_pinelogs: ["i", 4, 8],   // pine = tree tier 4
  i_rawfish:  ["t", 56, 12],
  i_fish:     ["t", 55, 13],
  i_burnt:    ["t", 56, 12, { filter: "brightness(0.3)" }],
  i_copper:   ["i", 0, 4],   // items32 rows 4-5 = ores, tier-indexed by column
  i_iron:     ["i", 2, 4],   // iron = metal tier 2
  i_gold:     ["i", 8, 4],   // gold = metal tier 8
  i_bar_bz:   ["t", 14, 7, { filter: "hue-rotate(-25deg) saturate(1.2) brightness(0.85)" }],
  i_bar_fe:   ["t", 14, 7, { filter: "grayscale(1) brightness(1.05)" }],
  i_bar_au:   ["t", 14, 7],
  i_bread:    ["t", 54, 13],
  i_axe:      ["c", 47, 3],
  i_pick:     ["c", 49, 3],
  i_rod:      ["t", 53, 17],
  i_sw_bz:    ["c", 42, 6],
  i_sw_fe:    ["c", 44, 6],
  i_sw_au:    ["c", 47, 6],
  i_shield:   ["c", 34, 2],
  i_bow:      ["c", 52, 0],
  i_pinebow:  ["c", 53, 2],
  // wands from the shaft bundle, staves from the fishing rod — hue-shifted
  i_wand:      ["x", 5, 0,   { filter: "hue-rotate(215deg) saturate(1.7)" }],
  i_pinewand:  ["x", 5, 0,   { filter: "hue-rotate(275deg) saturate(1.8) brightness(1.1)" }],
  i_staff:     ["t", 53, 17, { filter: "hue-rotate(215deg) saturate(1.5)" }],
  i_pinestaff: ["t", 53, 17, { filter: "hue-rotate(275deg) saturate(1.6) brightness(1.1)" }],
  i_arrows:   ["x", 4, 0],
  i_shafts:   ["x", 5, 0],
  i_wheat:    ["x", 0, 0],
  i_seeds_w:  ["x", 1, 0],
  i_seeds_c:  ["x", 1, 0, { filter: "hue-rotate(150deg)" }],
  i_seeds_h:  ["x", 1, 0, { filter: "hue-rotate(70deg)" }],
  i_flour:    ["x", 2, 0],
  i_rawmeat:  ["x", 3, 0],
  i_meat:     ["x", 3, 0, { filter: "sepia(0.9) saturate(1.6) brightness(0.85)" }],
  i_burntmeat:["x", 3, 0, { filter: "brightness(0.3)" }],
  i_rune_air: ["x", 6, 0],
  i_rune_fire:["x", 7, 0],
  i_essence:  ["x", 8, 0],
  i_ring:     ["x", 9, 0],
  i_hide:     ["x", 10, 0],
  i_leather:  ["x", 11, 0],
  i_cloth:    ["x", 12, 0],
  i_cotton:   ["t", 31, 9],
  i_herb:     ["t", 44, 23],
  i_berries:  ["t", 54, 16],
  i_vial:     ["t", 56, 11],
  i_pot_hp:   ["t", 55, 11],
  i_pot_atk:  ["t", 54, 11],
  i_pot_def:  ["t", 54, 11, { filter: "hue-rotate(170deg)" }],
  i_gem:      ["t", 34, 9],
  i_amulet:   ["t", 50, 9],
  i_planks:   ["t", 38, 13],
  i_chair:    ["t", 19, 2],
  i_table:    ["t", 26, 3],
  i_body:     ["c", 11, 5],
  i_robe:     ["c", 16, 2],
  // character layers
  body_player: ["c", 1, 0],
  shirt_green: ["c", 7, 5],
  hair_brown:  ["c", 20, 1],
  body_npc:    ["c", 0, 0],
  shirt_orange:["c", 6, 0],
  hat_white:   ["c", 28, 0],
  body_goblin: ["c", 0, 3],
  armor_dark:  ["c", 14, 9],
  armor_orange:["c", 6, 2],
  body_bandit: ["c", 0, 2],
  // tiny-creatures mobs (Clint Bellanger, CC0)
  m_slime:    ["m", 4, 8],
  m_zombie:   ["m", 0, 0],
  m_skeleton: ["m", 1, 0],
  m_wolf:     ["m", 3, 2],
  m_bear:     ["m", 3, 16],
  m_ogre:     ["m", 4, 1],
  m_troll:    ["m", 2, 4],
  m_dragon:   ["m", 4, 3],
  m_chicken:  ["m", 0, 15],
  m_cow:      ["m", 1, 15],
  m_sheep:    ["m", 3, 15],
  m_deer:     ["m", 1, 16],
  m_boar:     ["m", 0, 16],
};

// ===== tinted variants =====
// Hue/brightness-shifted copies of terrain and vegetation sprites, so the
// landscape varies from region to region. Variant keys are "<base>#<i>";
// world.js picks them with smooth noise. Baked once into the sprite atlas.
// ORDERED gradients: index i and i+1 are visually adjacent shades, so when a
// smooth noise field picks the index, terrain colours blend gradually across
// the map instead of jumping. The identity filter sits mid-list.
// Callers (7):
//  data.js:176,177,178,179,180,181 world/chunks.js:102
function gradient(steps, hueLo, hueHi, satCurve = 0, briCurve = 0) {
  const out = [];
  for (let i = 0; i < steps; i++) {
    const f = i / (steps - 1);
    const hue = Math.round(hueLo + (hueHi - hueLo) * f);
    const sat = (1 + satCurve * (f - 0.5)).toFixed(2);
    const bri = (1 + briCurve * (f - 0.5)).toFixed(2);
    out.push(`hue-rotate(${hue}deg) saturate(${sat}) brightness(${bri})`);
  }
  return out;
}
// Callers (1):
//  data.js:183
const GRASS_G = gradient(12, -48, 60, -0.5, 0.12);   // deep cool green -> golden savanna
// Callers (1):
//  data.js:184
const DIRT_G = gradient(8, -20, 26, 0.3, 0.12);
// Callers (1):
//  data.js:185
const SAND_G = gradient(8, -14, 18, 0.5, 0.06);
// Callers (1):
//  data.js:186
const GRAVEL_G = gradient(6, -8, 24, 0.25, 0.2);
// Callers (1):
//  data.js:187
const WATER_G = gradient(6, -14, 16, 0.2, 0.1);
// Callers (2):
//  data.js:188,189
const TREE_G = gradient(10, -34, 48, -0.35, 0.1);
// Callers (2):
//  data.js:194,196
const TINTS = {
  grass: GRASS_G, grass2: GRASS_G,
  dirt: DIRT_G, dirt2: DIRT_G,
  sand: SAND_G, sand2: SAND_G,
  gravel: GRAVEL_G,
  water: WATER_G, water2: WATER_G,
  tree: TREE_G, tree_orange: TREE_G, tree_apple: TREE_G, tree_pine: TREE_G,
  bush: TREE_G, bush2: TREE_G,
  berrybush: ["hue-rotate(-20deg)", "hue-rotate(150deg) saturate(0.9)", "brightness(0.9)"],
  mushroom:  ["hue-rotate(40deg)", "hue-rotate(180deg) saturate(0.8)", "brightness(1.15)"],
  boulder:   ["brightness(0.85)", "brightness(1.12)", "hue-rotate(25deg) saturate(1.2)"],
};
for (const base in TINTS) {
  const [sheet, c, r, extra] = SPR[base];
  TINTS[base].forEach((filter, i) => {
    SPR[base + "#" + i] = [sheet, c, r, { ...(extra || {}), filter }];
  });
}
// strip a "#i" tint suffix to recover the logical tile/sprite name
// Callers (1):
//  gameplay/world.js:677
const baseKey = k => {
  const i = k.indexOf("#");
  return i < 0 ? k : k.slice(0, i);
};

// ===== biome grounds (Endless Scape map port) =====
// dedicated ground tiles for the exotic biomes, built as filtered variants
// Callers (3):
//  content.js:576 data.js:247,248
const BIOME_TILES = {
  g_snow:    ["sand", "saturate(0.08) brightness(1.5)"],
  g_glacier: ["sand", "hue-rotate(160deg) saturate(0.3) brightness(1.45)"],
  g_tundra:  ["grass", "saturate(0.3) brightness(1.18)"],
  g_taiga:   ["grass", "hue-rotate(-45deg) saturate(0.55) brightness(1.02)"],
  g_ash:     ["grass", "saturate(0.12) brightness(0.72)"],
  g_moor:    ["grass", "hue-rotate(-110deg) saturate(0.45) brightness(0.98)"],
  g_salt:    ["sand", "saturate(0.12) brightness(1.42)"],
  g_reddes:  ["dirt", "hue-rotate(-16deg) saturate(1.8) brightness(1.02)"],
  g_canyon:  ["dirt", "hue-rotate(-8deg) saturate(1.5) brightness(1.06)"],
  g_mush:    ["dirt", "hue-rotate(230deg) saturate(0.55) brightness(1.05)"],
  g_bone:    ["sand", "saturate(0.28) brightness(1.28)"],
  g_dream:   ["grass", "hue-rotate(62deg) saturate(0.75) brightness(1.05)"],
  g_crystal: ["gravel", "hue-rotate(235deg) saturate(0.6) brightness(1.28)"],
  g_volcano: ["gravel", "saturate(0.3) brightness(0.5)"],
  g_wild:    ["dirt", "saturate(0.5) brightness(0.68)"],
  g_jungle:  ["grass", "hue-rotate(-28deg) saturate(1.35) brightness(0.78)"],
  g_swamp:   ["grass2", "hue-rotate(-15deg) saturate(0.8) brightness(0.82)"],
  g_ruins:   ["gravel", "saturate(0.5) brightness(1.05)"],
  mushroom_big:  ["mushroom", "saturate(1.2)"],
  mushroom_big2: ["mushroom", "hue-rotate(180deg) saturate(0.9)"],
  crystal_shard: ["boulder", "hue-rotate(210deg) saturate(1.6) brightness(1.35)"],
  // forest ground tiles
  g_forest:    ["grass2",        "hue-rotate(-22deg) saturate(0.50) brightness(0.54)"],
  g_forest2:   ["grass2",        "hue-rotate(-6deg) saturate(0.72) brightness(0.68)"],
  g_moss:      ["grass",         "hue-rotate(-42deg) saturate(0.58) brightness(0.56)"],
  leaflitter:  ["flower_orange", "hue-rotate(14deg) saturate(0.42) brightness(0.76)"],
  fallen_log:  ["stump",         "hue-rotate(14deg) saturate(0.52) brightness(0.60)"],
  moss_rock:   ["boulder",       "hue-rotate(-55deg) saturate(0.92) brightness(0.50)"],
  // beach overhaul
  g_sand_wet:  ["sand",          "hue-rotate(-10deg) saturate(0.65) brightness(0.78)"],
  seashell:    ["flower_white",  "hue-rotate(28deg) saturate(0.30) brightness(1.32)"],
  driftwood:   ["stump",         "saturate(0.12) brightness(1.26)"],
  // farm overhaul — base farm tile is pure red; use dirt as base for natural brown tones
  g_croprow:   ["dirt",          "hue-rotate(-8deg) saturate(0.70) brightness(0.72)"],
  farm_soil:   ["dirt",          "saturate(0.55) brightness(0.84)"],
  // the raw "farm" ground tile itself is that same pure-red placeholder —
  // override it with tilled-soil brown (this loop runs after the SPR table)
  farm:        ["dirt",          "hue-rotate(-10deg) saturate(0.62) brightness(0.82)"],
  haybale:     ["barrel",        "hue-rotate(-28deg) saturate(2.4) brightness(1.22)"],
  scarecrow:   ["sign",          "hue-rotate(-16deg) saturate(0.62) brightness(1.04)"],
};
for (const key in BIOME_TILES) {
  const [base, filter] = BIOME_TILES[key];
  const [sheet, c, r, extra] = SPR[base];
  SPR[key] = [sheet, c, r, { ...(extra || {}), filter }];
}


// biome ids (matching Map.html)
// Callers (143):
//  world/chunks.js:16,228,235,237,744
//  world/features.js:297,301,310,311,329,331,332,346,347,349,351,353,466,467,472,638,639,640,771,772,773,774,775,862,868,869,871,872,873,939,940,941,942,943,944,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064
//  world/map.js:476,479,486,487,490,520,521,522,523,524,525,526,527,528,531,532,534,535,536,539,540,541,542,543,544,547,548,549,553,554,555,558,561,564,567,568,571
//  world/terrain.js:122,123,125,128,129,130,131,135,136,137,138,139,143,144,145,146,148,150,151,152,155,156,157,158,159,162,163,164,165,166,167,168
const B = { DEEP:0, WATER:1, SAND:2, GRASS:3, FOREST:4, SWAMP:5, DESERT:6,
            ROCK:7, SNOW:8, TUNDRA:9, FARM:10, BADLANDS:11, JUNGLE:12,
            MEADOW:13, SAVANNA:14, ROCKY:15, LABYRINTH:16, VOLCANO:17,
            WILD:18, TAIGA:19, OASIS:20, REEF:21, RUINSB:22, SALT:23,
            WETLAND:24, CANYON:25, STEPPE:26, REDDESERT:27, MUSHROOM:28,
            BONE:29, DREAM:30, ASH:31, MOOR:32, GLACIER:33, BAMBOO:34,
            CHERRY:35, CRYSTAL:36 };
// Callers (0):
//  none found
const BIOME_NAME = ["Deep Sea","Sea","Beach","Plains","Forest","Swamp",
  "Desert","Mountains","Snowy Peaks","Frozen Wastes","Farmland",
  "Badlands","Jungle","Meadow","Savanna","Rockyland","Labyrinth",
  "Volcano","Wilderness","Taiga","Oasis","Coral Reef","Ruins",
  "Salt Flats","Wetlands","Canyon","Steppe","Red Desert",
  "Giant Mushroom Forest","Bone Fields","Dream Forest","Ashen Forest",
  "Heather Moor","Glacier","Bamboo Grove","Blossom Grove","Crystal Fields"];

// ===== skills =====
// Callers (2):
//  main/ui.js:108 storage.js:60
// Mining, Farming, Textiles and Crafting were split into specialised trades
// (Ore-mining/Gem-mining, the 5 agriculture skills, Spinning/Weaving/
// Dyeing/Fulling/Tailoring, Leatherworking/Candlemaking/…) and removed here.
// Their old saved XP is migrated to a successor in storage.js loadGame().
const SKILLS = [
  "Melee", "Strength", "Defence", "Archery", "Magic", "Health",
  "Smelting", "Weaponsmithing", "Armoursmithing", "Woodcutting", "Firemaking", "Carpentry",
  "Fletching", "Fishing", "Cooking", "Foraging", "Potionmaking",
  "Alchemy", "Runecrafting", "Tanning",
  "Milling", "Jewelry", "Agility", "Sailing",
];
// Levels are compressed 3.09375x from the original 99-level curve (99/32)
// so that XP amounts stay the same "size" but the level cap is now 32.
// scaleLevel() maps any old-scale (1-99+) level number used elsewhere in the
// content tables (skill/recipe reqs, monster levels) onto this new scale.
const MAX_LEVEL = 32;
const LEVEL_SCALE = MAX_LEVEL / 99;
const scaleLevel = l => Math.max(1, Math.ceil(l * LEVEL_SCALE));
// Resource-node respawn time (ms) as a function of the node's required level,
// interpolating these anchor points (level → seconds): 1→7, 8→30, 16→60,
// 24→120, 32→300. Piecewise-linear between anchors, clamped outside the range.
// Used by trees, ores and gem veins (data.js/content.js/mining-split.js/
// nz-extra-trees.js) so every gathered node shares one respawn curve.
const RESPAWN_ANCHORS = [[1, 7], [8, 30], [16, 60], [24, 120], [32, 300]];
const respawnFor = (req) => {
  const L = Math.max(1, Math.min(MAX_LEVEL, req));
  const A = RESPAWN_ANCHORS;
  for (let i = 0; i < A.length - 1; i++) {
    const [l0, s0] = A[i], [l1, s1] = A[i + 1];
    if (L <= l1) return Math.round((s0 + (s1 - s0) * (L - l0) / (l1 - l0)) * 1000);
  }
  return A[A.length - 1][1] * 1000;
};
// Callers (4):
//  data.js:288 main/ui.js:112 storage.js:61,87
const XP_TABLE = (() => {
  const old = [0, 0]; let pts = 0;
  for (let l = 1; l < 100; l++) {
    pts += Math.floor(l + 300 * Math.pow(2, l / 7));
    old.push(Math.floor(pts / 4));
  }
  const t = [0, 0];
  for (let l = 2; l <= MAX_LEVEL; l++) t.push(old[Math.ceil(l * 99 / MAX_LEVEL)]);
  return t;
})();
// Callers (2):
//  main/state.js:24 storage.js:99
function levelFromXp(xp) {
  let l = 1;
  while (l < MAX_LEVEL && xp >= XP_TABLE[l + 1]) l++;
  return l;
}

// ===== items =====
// Callers (77):
//  
//  content.js:6,36,37,60,62,63,84,86,88,90,101,103,106,131,132,152,161,164,180,182,208,229,247,248,562,563,564
//  gameplay/input.js:62 gameplay/items.js:8,11,19,47 gameplay/movement.js:68,69,71
//  main/state.js:72,102,109,110,121
//  main/ui.js:54,57,60,65,70,89,91,146,169,196,217,256,258,275,276,294 render3d.js:450,471,496
//  skills/combat.js:10,16,31,32,35,40,51 skills/crafting.js:56,64 skills/farming.js:21,32
//  skills/firemaking.js:6,11 skills/gathering.js:45,46 skills/thieving.js:23 storage.js:95,98
const ITEMS = {
  coins:       { name: "Coins",        icon: "i_coins",   stack: true, value: 1 },
  logs:        { name: "Logs",         icon: "i_logs",    stack: true, value: 4 },
  pine_logs:   { name: "Pine logs",    icon: "i_pinelogs",stack: true, value: 12 },
  planks:      { name: "Planks",       icon: "i_planks",  stack: true, value: 6 },
  chair:       { name: "Chair",        icon: "i_chair",   stack: true, value: 28 },
  table:       { name: "Table",        icon: "i_table",   stack: true, value: 60 },
  raw_fish:    { name: "Raw whitebait", icon: "i_rawfish", stack: true, value: 5 },
  cooked_fish: { name: "Whitebait fritter", icon: "i_fish", stack: true, value: 10, heals: 7 },
  burnt_fish:  { name: "Burnt fish",   icon: "i_burnt",   stack: true, value: 1 },
  raw_meat:    { name: "Raw meat",     icon: "i_rawmeat", stack: true, value: 6 },
  cooked_meat: { name: "Cooked meat",  icon: "i_meat",    stack: true, value: 12, heals: 6 },
  burnt_meat:  { name: "Burnt meat",   icon: "i_burntmeat", stack: true, value: 1 },
  berries:     { name: "Berries",      icon: "i_berries", stack: true, value: 4, heals: 3 },
  // (legacy "bread" removed — superseded by the Baking flatbread/rye_bread/… tiers;
  //  old saves fold bread→flatbread via DEPRECATED_MIGRATE in storage.js.)
  wheat:       { name: "Wheat",        icon: "i_wheat",   stack: true, value: 5 },
  flour:       { name: "Flour",        icon: "i_flour",   stack: true, value: 9 },
  // (deprecated wheat/cotton/herb seeds removed — their CROPS.wheat/cotton/herb were
  //  wiped by the per-skill agriculture redesign; superseded by the seed_<agri>_<i>
  //  system. Old saves fold them onto the matching current seed via DEPRECATED_MIGRATE.)
  cotton:      { name: "Cotton",       icon: "i_cotton",  stack: true, value: 7 },
  cloth:       { name: "Cloth",        icon: "i_cloth",   stack: true, value: 18 },
  herb:        { name: "Herb",         icon: "i_herb",    stack: true, value: 12 },
  vial:        { name: "Empty vial",   icon: "i_vial",    stack: true, value: 4 },
  potion_health: { name: "Health potion",  icon: "i_pot_hp",  stack: true, value: 30, potion: { heal: 10 } },
  potion_attack: { name: "Combat potion",  icon: "i_pot_atk", stack: true, value: 55, potion: { buff: ["Melee", "Strength", "Archery", "Magic"], amt: 3, dur: 90000 } },
  potion_defence:{ name: "Defence potion", icon: "i_pot_def", stack: true, value: 70, potion: { buff: ["Defence"], amt: 4, dur: 120000 } },
  copper_ore:  { name: "Copper ore",   icon: "i_copper",  stack: true, value: 6 },
  copper_bar:  { name: "Copper bar",   icon: "i_bar_bz",  stack: true, value: 10 },
  iron_ore:    { name: "Iron ore",     icon: "i_iron",    stack: true, value: 14 },
  gold_ore:    { name: "Gold ore",     icon: "i_gold",    stack: true, value: 30 },
  bronze_bar:  { name: "Bronze bar",   icon: "i_bar_bz",  stack: true, value: 12 },
  iron_bar:    { name: "Iron bar",     icon: "i_bar_fe",  stack: true, value: 28 },
  gold_bar:    { name: "Gold bar",     icon: "i_bar_au",  stack: true, value: 60 },
  // Rune essence is deprecated (mined ore removed). Runecrafting is now fed by two
  // MONSTER-DROPPED raw runes: Action Rune inscribes the 12 VERB runes, State Rune the
  // 20 substance/modifier/wildcard runes. Icons repointed by js/sprites/rn-icons-data.js.
  action_rune: { name: "Action Rune", icon: "i_essence", stack: true, value: 5 },
  state_rune:  { name: "State Rune",  icon: "i_essence", stack: true, value: 5 },
  air_rune:    { name: "Air rune",     icon: "i_rune_air",stack: true, value: 4, equip: "rune" },
  fire_rune:   { name: "Fire rune",    icon: "i_rune_fire",stack: true, value: 7, equip: "rune" },
  gem:         { name: "Gem",          icon: "i_gem",     stack: true, value: 45 },
  gold_ring:   { name: "Gold ring",    icon: "i_ring",    stack: true, value: 85, equip: "ring" },
  gem_amulet:  { name: "Gem amulet",   icon: "i_amulet",  value: 220, equip: "neck", hitBonus: 1 },
  hide:        { name: "Hide",         icon: "i_hide",    stack: true, value: 8 },
  leather:     { name: "Leather",      icon: "i_leather", stack: true, value: 16 },
  robe:        { name: "Woven robe",   icon: "i_robe",    value: 70, equip: "torso", block: 0.06, wearReq: 1 },
  // (legacy generic "axe"/"pickaxe" removed — superseded by the Toolmaking iron→… tiers
  //  (axe_iron, pickaxe_iron, …); old saves fold them to the iron tier via DEPRECATED_MIGRATE.
  //  The i_axe/i_pick sprite keys are kept — render3d uses them for the held-tool overlay.)
  fishing_rod: { name: "Fishing rod",  icon: "i_rod",     value: 12, tool: "rod" },
  small_net:   { name: "Small fishing net", icon: "i_rod", value: 8,  tool: "net" },
  big_net:     { name: "Big fishing net",   icon: "i_rod", value: 40, tool: "big_net" },
  harpoon:     { name: "Harpoon",           icon: "i_rod", value: 60, tool: "harpoon" },
  lobster_cage:{ name: "Lobster cage",      icon: "i_rod", value: 50, tool: "cage" },
  // (legacy "bronze_sword" removed — superseded by the tiered shortswords (shortsword_iron…);
  //  old saves fold bronze_sword→shortsword_iron via DEPRECATED_MIGRATE in storage.js.)
  iron_sword:  { name: "Iron sword",   icon: "i_sw_fe",   value: 120, equip: "weapon", power: 3, wieldReq: 3 },
  gold_sword:  { name: "Gold sword",   icon: "i_sw_au",   value: 350, equip: "weapon", power: 5, wieldReq: 6 },
  // range: how many tiles the bow can shoot (styleRange); atkTick: ms between
  // shots — the shortbow is the fast skirmish bow, longbow-class bows trade
  // speed for reach and draw weight
  shortbow:    { name: "Shortbow",     icon: "i_bow",     value: 55,  equip: "weapon", bowPower: 1, rangeReq: 1, range: 20, atkTick: 1500 },
  longbow:     { name: "Longbow",      icon: "i_bow",     value: 150, equip: "weapon", bowPower: 2, rangeReq: 3, range: 40, atkTick: 2000 },
  pine_bow:    { name: "Pine bow",     icon: "i_pinebow", value: 260, equip: "weapon", bowPower: 3, rangeReq: 5, range: 40, atkTick: 2000 },
  // magic weapons — the Weave (skills/combat.js): each cast draws the next
  // rune from the pouch and gathers its ASPECTS; at the weapon's `weave`
  // capacity they fuse into a spell composed from the aspect mix. Wands
  // weave 2 aspects fast, staves gather 3 for the big fusions. magicPower
  // feeds fusion damage; magicReq gates equipping on the Magic level.
  wand:        { name: "Wand",         icon: "i_wand",      value: 60,  equip: "weapon", magicPower: 1, magicReq: 1, weave: 2, range: 7,  atkTick: 1400 },
  staff:       { name: "Staff",        icon: "i_staff",     value: 130, equip: "weapon", magicPower: 2, magicReq: 3, weave: 3, range: 9,  atkTick: 2000 },
  pine_wand:   { name: "Pine wand",    icon: "i_pinewand",  value: 290, equip: "weapon", magicPower: 3, magicReq: 5, weave: 2, range: 8,  atkTick: 1400 },
  pine_staff:  { name: "Pine staff",   icon: "i_pinestaff", value: 430, equip: "weapon", magicPower: 4, magicReq: 8, weave: 3, range: 10, atkTick: 2000 },
  arrows:      { name: "Arrows",       icon: "i_arrows",  stack: true, value: 2, equip: "quiver" },
  arrow_shafts:{ name: "Arrow shafts", icon: "i_shafts",  stack: true, value: 1 },
  // (wooden_shield removed 2026-09-06 — superseded by the Bronze Heater shield;
  //  old saves migrate wooden_shield → heater_bronze, see storage.js)
};

// Callers (5):
//  content.js:565,566,567 main/ui.js:61,71
const EXAMINE = {
  coins: "Shiny! The universal motivator.",
  logs: "A pile of sturdy logs.", pine_logs: "Fragrant pine logs.",
  raw_fish: "Fresh whitebait — bind them with an egg and fry a fritter.", cooked_fish: "A golden whitebait fritter. Heals 7 HP.",
  raw_meat: "Fresh boar meat.", cooked_meat: "Hearty roast meat. Heals 6 HP.",
  berries: "Plump forest berries. Heals 3 HP.",
  burnt_fish: "Oops.", burnt_meat: "Charcoal, essentially.", bread: "Still warm. Heals 4 HP.",
  wheat: "Golden ears of wheat.", flour: "Finely milled flour.",
  herb: "A pungent green herb.", vial: "For potions.",
  potion_health: "Restores 10 HP.", potion_attack: "+3 to combat skills for 90s.",
  potion_defence: "+4 Defence for 2 minutes.",
  action_rune: "A gold rune-medallion crackling with kinetic force — inscribe it into verb runes.", state_rune: "A stone rune-tablet holding a still elemental sigil — inscribe it into substance runes.", air_rune: "A whisper of wind.", fire_rune: "Warm to the touch.",
  gem: "It catches the light beautifully.", gold_ring: "A fine gold ring.", gem_amulet: "It hums with power. +1 max hit.",
  hide: "A rough animal hide.", leather: "Supple tanned leather.",
  robe: "A comfortable woven robe.",
  axe: "For chopping trees.", pickaxe: "For mining rocks.", fishing_rod: "For catching fish.",
  bronze_sword: "A basic but reliable blade.", iron_sword: "A sharp iron blade.",
  gold_sword: "Flashy AND deadly.",
  shortbow: "A simple bow.", longbow: "Long limbs, long reach.", pine_bow: "A springy pine bow.", arrows: "Sharp and straight.",
  wand: "Weaves two rune aspects into a spell.", staff: "Gathers three aspects before the fusion.",
  pine_wand: "Springy pine channels the weave faster.", pine_staff: "A deep reservoir for the grandest weaves.",
  planks: "Sawn timber.", chair: "Sturdy handiwork.", table: "Fine carpentry.",
};

// ===== resource nodes =====
// Callers (22):
//  content.js:6,64,93,95 gameplay/input.js:58,125
//  gameplay/world.js:384,392,396,397,699,700,701,702,731,732,733,734 render3d.js:410,468
//  skills/gathering.js:5,41
const NODE_TYPES = {
  tree:      { name: "Tree",        spr: "tree",        skill: "Woodcutting", req: scaleLevel(1),  xp: 25,  item: "logs",       tool: "axe",     tick: 1300, depleteCh: 0.35, respawn: 9000,  deadSpr: "stump" },
  tree_or:   { name: "Tree",        spr: "tree_orange", skill: "Woodcutting", req: scaleLevel(1),  xp: 25,  item: "logs",       tool: "axe",     tick: 1300, depleteCh: 0.35, respawn: 9000,  deadSpr: "stump" },
  tree_ap:   { name: "Tree",        spr: "tree_apple",  skill: "Woodcutting", req: scaleLevel(1),  xp: 25,  item: "logs",       tool: "axe",     tick: 1300, depleteCh: 0.35, respawn: 9000,  deadSpr: "stump" },
  pine:      { name: "Pine tree",   spr: "tree_pine",   skill: "Woodcutting", req: scaleLevel(15), xp: 68,  item: "pine_logs",  tool: "axe",     tick: 1500, depleteCh: 0.45, respawn: 16000, deadSpr: "stump" },
  copper:    { name: "Copper rock", spr: "rock_copper", skill: "Mining",      req: scaleLevel(1),  xp: 30,  item: "copper_ore", tool: "pickaxe", tick: 1500, depleteCh: 1,    respawn: respawnFor(scaleLevel(1)),  deadSpr: "rock_dead", gemCh: 0.03 },
  iron:      { name: "Iron rock",   spr: "rock_iron",   skill: "Mining",      req: 3,              xp: 65,  item: "iron_ore",   tool: "pickaxe", tick: 1600, depleteCh: 1,    respawn: respawnFor(3), deadSpr: "rock_dead", gemCh: 0.05 },
  goldrock:  { name: "Gold rock",   spr: "rock_gold",   skill: "Mining",      req: scaleLevel(25), xp: 130, item: "gold_ore",   tool: "pickaxe", tick: 1800, depleteCh: 1,    respawn: respawnFor(scaleLevel(25)), deadSpr: "rock_dead", gemCh: 0.08 },
  // DEPRECATED node: rune-essence ore no longer scatters in the world (removed from the
  // mining passes in chunks.js) — runes come from monster drops now. Kept only as a
  // dormant, safe def (item repointed to state_rune) in case a pre-cache-bump chunk still
  // holds one, so mining it never references the removed rune_essence item.
  essence:   { name: "Essence rock",spr: "rock_essence",skill: "Ore-mining", req: scaleLevel(5),  xp: 22,  item: "state_rune", tool: "pickaxe", tick: 1300, depleteCh: 0.4, respawn: 6000, deadSpr: "rock_dead" },
  // fishing spots are per-fish now (NODE_TYPES.fishspot_0..31, generated in
  // content.js after the FISH table — "Cod fishing spot" etc.)
  berrybush: { name: "Berry bush",  spr: "berrybush",   skill: "Foraging",    req: scaleLevel(1),  xp: 30,  item: "berries",    tool: null,      tick: 1400, depleteCh: 0.5,  respawn: 16000, deadSpr: "bush" },
  herbpatch: { name: "Herb patch",  spr: "herb_plant",  skill: "Foraging",    req: scaleLevel(8),  xp: 55,  item: "herb",       tool: null,      tick: 1500, depleteCh: 1,    respawn: 22000, deadSpr: null },
};

// stations
// Callers (7):
//  gameplay/input.js:50 gameplay/world.js:383 main/ui.js:250 render3d.js:400
//  skills/crafting.js:6,20 world/chunks.js:324
const STATIONS = {
  furnace:  { name: "Furnace",         spr: "furnace",  action: "Smelt",  lists: ["cook", "smelt", "jewelry"] },
  anvil:    { name: "Anvil",           spr: "anvil",    action: "Smith",  lists: ["weaponsmithing", "armoursmithing"] },
  campfire: { name: "Campfire",        spr: "campfire", action: "Cook",   lists: ["cook"] },
  bank:     { name: "Bank chest",      spr: "bankchest",action: "Bank" },
  workbench:{ name: "Carpenter's bench", spr: "workbench", action: "Build", lists: ["carpentry"] },
  fletchers_bench: { name: "Fletcher's bench", spr: "workbench", action: "Fletch", lists: ["fletching"] },
  loom:     { name: "Loom",            spr: "loom",     action: "Weave",  lists: ["textiles"] },
  tanrack:  { name: "Tanning rack",    spr: "tanrack",  action: "Tan",    lists: ["tanning"] },
  mill:     { name: "Millstone",       spr: "mill",     action: "Mill",   lists: ["milling"] },
  cauldron: { name: "Cauldron",        spr: "cauldron", action: "Brew",   lists: ["herblore"] },
  alchtable:{ name: "Alchemy table",   spr: "alchtable",action: "Transmute", alchemy: true },
  altar:    { name: "Runestone altar", spr: "altar",    action: "Craft runes", lists: ["runecraft"] },
};

// ===== recipes =====
// Callers (15):
//  content.js:6,38,91,104,157,170,186,188,212,214,216,252,254,568 skills/crafting.js:8
const RECIPES = {
  cook: [
    { out: "cooked_fish", name: "Cook whitebait fritter",  skill: "Cooking", req: scaleLevel(1),  xp: 42, in: { raw_fish: 1, egg: 1 }, tick: 1400, burnUntil: 14, burnt: "burnt_fish" },
    { out: "cooked_meat", name: "Roast meat",     skill: "Cooking", req: scaleLevel(3),  xp: 48, in: { raw_meat: 1 }, tick: 1400, burnUntil: 16, burnt: "burnt_meat" },
  ],
  smelt: [
    { out: "copper_bar", name: "Smelt copper bar", skill: "Smelting", req: 1,              xp: 20,  in: { copper_ore: 1 }, tick: 1500 },
    { out: "bronze_bar", name: "Smelt bronze bar", skill: "Smelting", req: 2,              xp: 25,  in: { copper_ore: 2, ore_1: 1 }, tick: 1600 },
    { out: "iron_bar",   name: "Smelt iron bar",   skill: "Smelting", req: 3,              xp: 60,  in: { iron_ore: 1 },   tick: 1700 },
    { out: "gold_bar",   name: "Smelt gold bar",   skill: "Smelting", req: scaleLevel(25), xp: 120, in: { gold_ore: 1 },   tick: 1800 },
  ],
  weaponsmithing: [
    { out: "iron_sword",   name: "Smith iron sword",   skill: "Weaponsmithing", req: scaleLevel(14), xp: 130, in: { iron_bar: 2 },   tick: 2000 },
    { out: "gold_sword",   name: "Smith gold sword",   skill: "Weaponsmithing", req: scaleLevel(28), xp: 260, in: { gold_bar: 2 },   tick: 2200 },
  ],
  jewelry: [
    { out: "gold_ring",  name: "Craft gold ring",  skill: "Jewelry", req: scaleLevel(1),  xp: 50,  in: { gold_bar: 1 },         tick: 1800 },
    { out: "gem_amulet", name: "Craft gem amulet", skill: "Jewelry", req: scaleLevel(12), xp: 140, in: { gold_bar: 1, gem: 1 }, tick: 2100 },
  ],
  carpentry: [
    { out: "planks", qty: 2, name: "Saw planks",  skill: "Carpentry", req: scaleLevel(1),  xp: 22,  in: { logs: 1 },   tick: 1400 },
    { out: "chair",  name: "Build chair",         skill: "Carpentry", req: scaleLevel(6),  xp: 55,  in: { planks: 2 }, tick: 1900 },
    { out: "table",  name: "Build table",         skill: "Carpentry", req: scaleLevel(16), xp: 120, in: { planks: 4 }, tick: 2200 },
  ],
  fletching: [
    { out: "arrow_shafts", qty: 15, name: "Cut arrow shafts", skill: "Fletching", req: scaleLevel(1),  xp: 20,  in: { logs: 1 }, tick: 1300 },
    { out: "arrows", qty: 15, name: "Make arrows",            skill: "Fletching", req: 1,              xp: 50,  in: { arrow_shafts: 15, bronze_bar: 1 }, tick: 1600 },
    { out: "shortbow", name: "Carve shortbow",                skill: "Fletching", req: scaleLevel(12), xp: 65,  in: { logs: 2 },      tick: 1900 },
    { out: "longbow",  name: "Carve longbow",                 skill: "Fletching", req: scaleLevel(20), xp: 110, in: { logs: 3 },      tick: 2100 },
    { out: "pine_bow", name: "Carve pine bow",                skill: "Fletching", req: scaleLevel(26), xp: 160, in: { pine_logs: 2 }, tick: 2200 },
    { out: "wand",       name: "Carve wand",       skill: "Fletching", req: scaleLevel(6),  xp: 50,  in: { logs: 1, state_rune: 1 },      tick: 1800 },
    { out: "staff",      name: "Carve staff",      skill: "Fletching", req: scaleLevel(16), xp: 95,  in: { logs: 3, state_rune: 2 },      tick: 2100 },
    { out: "pine_wand",  name: "Carve pine wand",  skill: "Fletching", req: scaleLevel(28), xp: 175, in: { pine_logs: 1, state_rune: 3 }, tick: 2200 },
    { out: "pine_staff", name: "Carve pine staff", skill: "Fletching", req: scaleLevel(34), xp: 240, in: { pine_logs: 3, state_rune: 4 }, tick: 2400 },
  ],
  textiles: [
    { out: "cloth", name: "Weave cloth",  skill: "Textiles", req: scaleLevel(1), xp: 32, in: { cotton: 2 }, tick: 1500 },
    { out: "robe",  name: "Weave robe",   skill: "Textiles", req: scaleLevel(8), xp: 85, in: { cloth: 3 },  tick: 2100 },
  ],
  tanning: [
    { out: "leather", name: "Tan hide", skill: "Tanning", req: scaleLevel(1), xp: 26, in: { hide: 1 }, tick: 1400 },
  ],
  milling: [
    { out: "flour", name: "Mill flour", skill: "Milling", req: scaleLevel(1), xp: 24, in: { wheat: 1 }, tick: 1400 },
  ],
  herblore: [
    { out: "potion_health",  name: "Brew health potion",  skill: "Potionmaking", req: scaleLevel(1),  xp: 45,  in: { herb: 1, vial: 1 },             tick: 1700 },
    { out: "potion_attack",  name: "Brew combat potion",  skill: "Potionmaking", req: scaleLevel(10), xp: 95,  in: { herb: 1, vial: 1, berries: 2 }, tick: 1900 },
    { out: "potion_defence", name: "Brew defence potion", skill: "Potionmaking", req: scaleLevel(18), xp: 150, in: { herb: 2, vial: 1 },             tick: 2100 },
  ],
  runecraft: [
    { out: "air_rune",  name: "Craft air runes",  skill: "Runecrafting", req: scaleLevel(1), xp: 14, in: { rune_essence: 1 }, tick: 1300, scaleYield: 8 },
    { out: "fire_rune", name: "Craft fire runes", skill: "Runecrafting", req: scaleLevel(9), xp: 22, in: { rune_essence: 1 }, tick: 1400, scaleYield: 8 },
  ],
};

// ===== farming =====
// Callers (10):
//  content.js:6,135,140 gameplay/input.js:54 main/ui.js:271,272 render3d.js:404
//  skills/farming.js:6,15,27
const CROPS = {
  wheat:  { name: "wheat",  seed: "wheat_seeds",  item: "wheat",  req: scaleLevel(1),  plantXp: 12, xp: 45,  time: 70000,  yield: [2, 4], spr: "wheat_plant" },
  cotton: { name: "cotton", seed: "cotton_seeds", item: "cotton", req: scaleLevel(6),  plantXp: 16, xp: 62,  time: 90000,  yield: [2, 4], spr: "flower_white" },
  herb:   { name: "herbs",  seed: "herb_seeds",   item: "herb",   req: scaleLevel(12), plantXp: 22, xp: 90,  time: 110000, yield: [1, 3], spr: "herb_plant" },
};

// ===== magic =====
// Callers (5):
//  content.js:6,190,193,195 skills/combat.js:22
const SPELLS = [
  { name: "Fire bolt",   req: scaleLevel(10), base: 5, rune: "fire_rune" },
  { name: "Wind strike", req: scaleLevel(1),  base: 3, rune: "air_rune" },
];

// ===== agility obstacles =====
// Traversal shortcuts trained by crossing them (a "forced" tile-by-tile walk in
// movement.js). Each type spans a natural barrier (a river/ravine); harder ones
// demand a higher Agility level, grant more XP, and carry a slip risk — a failed
// crossing dunbalances you (a short stun + a little fall/splash damage) and
// denies the XP for that attempt. Slip chance falls as your level climbs past
// the requirement and with the passive Agility bonus (character-stats.js).
// The `decor` key is the flat tile laid along the crossing (js/data.js SPR).
// Callers: gameplay/input.js, skills/agility.js, gameplay/movement.js, main/ui.js,
//          world/chunks.js.
const OBSTACLE_TYPES = {
  stones:   { name: "Stepping stones", req: scaleLevel(1),  xp: 40,  decor: "stepstone", fail: 0.00, dmg: 0 },
  mossy:    { name: "Mossy stones",    req: scaleLevel(10), xp: 85,  decor: "stepstone", fail: 0.20, dmg: 2 },
  scramble: { name: "Rock scramble",   req: scaleLevel(20), xp: 150, decor: "boulder",   fail: 0.24, dmg: 3 },
  ledge:    { name: "Cliff ledge",     req: scaleLevel(30), xp: 240, decor: "boulder",   fail: 0.28, dmg: 5 },
};
// Ordered easiest→hardest, for the UI action list and for tier selection.
const OBSTACLE_ORDER = ["stones", "mossy", "scramble", "ledge"];

// ===== monsters =====
// Callers (27):
//  content.js:7,386,416,419,432,486,487 custom-mobs.js:3,140,239 gameplay/input.js:43,120
//  gameplay/monsters.js:7 gameplay/world.js:13,19,20,404,405 render3d.js:81,428,540,549
//  skills/butchering.js:13 skills/combat.js:27,73,96,116
const MONSTERS = {
  goblin: {
    name: "Goblin", lvl: scaleLevel(2), hp: 12, maxHit: 1, def: 1, atkTick: 2000, aggro: false,
    spr: [["body_goblin"]], scale: 1,
    drops: [
      { id: "coins", min: 2, max: 9, ch: 1 },
      { id: "copper_ore", min: 1, max: 1, ch: 0.2 },
      { id: "flatbread", min: 1, max:1, ch: 0.12 },
      { id: "air_rune", min: 2, max: 6, ch: 0.1 },
    ],
    respawn: 12000, xp: 30,
  },
  boar: {
    name: "Wild Boar", lvl: scaleLevel(3), hp: 14, maxHit: 1, def: 2, atkTick: 2200, aggro: false,
    spr: [["m_boar"]], scale: 0.9, butcher: { meat: 2, hide: 1, hideItem: "hide" },
    drops: [],
    respawn: 15000, xp: 34,
  },
  chicken: {
    name: "Chicken", lvl: scaleLevel(1), hp: 4, maxHit: 0, def: 0, atkTick: 3000, aggro: false,
    spr: [["m_chicken"]], scale: 0.6, butcher: { meat: 1, hide: 0 },
    drops: [], respawn: 10000, xp: 10,
  },
  cow: {
    name: "Cow", lvl: scaleLevel(2), hp: 12, maxHit: 0, def: 1, atkTick: 3000, aggro: false,
    spr: [["m_cow"]], scale: 1.4, butcher: { meat: 3, hide: 2, hideItem: "hide_8" },
    drops: [], respawn: 16000, xp: 20,
  },
  sheep: {
    name: "Sheep", lvl: scaleLevel(2), hp: 10, maxHit: 0, def: 1, atkTick: 3000, aggro: false,
    spr: [["m_sheep"]], scale: 0.8, butcher: { meat: 2, hide: 1, hideItem: "hide_7" },
    drops: [], respawn: 16000, xp: 18,
  },
  deer: {
    name: "Deer", lvl: scaleLevel(3), hp: 12, maxHit: 0, def: 3, atkTick: 3000, aggro: false,
    spr: [["m_deer"]], scale: 1, butcher: { meat: 2, hide: 1, hideItem: "hide_6" },
    drops: [], respawn: 18000, xp: 26,
  },
  slime: {
    name: "Slime", lvl: scaleLevel(1), hp: 7, maxHit: 1, def: 0, atkTick: 2400, aggro: false,
    spr: [["m_slime"]], scale: 0.75,
    drops: [{ id: "coins", min: 1, max: 5, ch: 1 }],
    respawn: 9000, xp: 16,
  },
  zombie: {
    name: "Zombie", lvl: scaleLevel(5), hp: 20, maxHit: 2, def: 3, atkTick: 2400, aggro: false,
    spr: [["m_zombie"]], scale: 1,
    drops: [
      { id: "coins", min: 4, max: 14, ch: 1 },
      { id: "herb", min: 1, max: 1, ch: 0.15 },
      { id: "action_rune", min: 1, max: 3, ch: 0.2 },
    ],
    respawn: 15000, xp: 60,
  },
  skeleton: {
    name: "Skeleton", lvl: scaleLevel(8), hp: 28, maxHit: 3, def: 6, atkTick: 2000, aggro: true,
    spr: [["m_skeleton"]], scale: 1,
    drops: [
      { id: "coins", min: 6, max: 20, ch: 1 },
      { id: "arrows", min: 5, max: 12, ch: 0.25 },
      { id: "air_rune", min: 2, max: 8, ch: 0.2 },
      { id: "fire_rune", min: 1, max: 4, ch: 0.1 },
    ],
    respawn: 18000, xp: 90,
  },
  wolf: {
    name: "Wolf", lvl: scaleLevel(9), hp: 30, maxHit: 3, def: 6, atkTick: 1700, aggro: true,
    spr: [["m_wolf"]], scale: 1, butcher: { meat: 1, hide: 2, hideItem: "hide_10" },
    drops: [],
    respawn: 20000, xp: 100,
  },
  bear: {
    name: "Bear", lvl: scaleLevel(14), hp: 55, maxHit: 5, def: 11, atkTick: 2100, aggro: true,
    spr: [["m_bear"]], scale: 1.6, butcher: { meat: 3, hide: 2, hideItem: "hide_17" },
    drops: [],
    respawn: 26000, xp: 150,
  },
  ogre: {
    name: "Ogre", lvl: scaleLevel(17), hp: 70, maxHit: 6, def: 14, atkTick: 2300, aggro: true,
    spr: [["m_ogre"]], scale: 1.7,
    drops: [
      { id: "coins", min: 30, max: 80, ch: 1 },
      { id: "gold_bar", min: 1, max: 2, ch: 0.2 },
      { id: "iron_sword", min: 1, max: 1, ch: 0.08 },
      { id: "gem", min: 1, max: 1, ch: 0.1 },
    ],
    respawn: 35000, xp: 220,
  },
  troll: {
    name: "Cave Troll", lvl: scaleLevel(22), hp: 90, maxHit: 7, def: 18, atkTick: 2400, aggro: true,
    spr: [["m_troll"]], scale: 1.85,
    drops: [
      { id: "coins", min: 40, max: 110, ch: 1 },
      { id: "gold_ore", min: 1, max: 3, ch: 0.35 },
      { id: "gem", min: 1, max: 2, ch: 0.2 },
    ],
    respawn: 40000, xp: 300,
  },
  dragon: {
    name: "Green Dragon", lvl: scaleLevel(32), hp: 160, maxHit: 10, def: 26, atkTick: 2200, aggro: true,
    spr: [["m_dragon"]], scale: 2.3,
    drops: [
      { id: "coins", min: 100, max: 300, ch: 1 },
      { id: "gold_bar", min: 1, max: 3, ch: 0.5 },
      { id: "gem", min: 1, max: 3, ch: 0.4 },
      { id: "gold_sword", min: 1, max: 1, ch: 0.1 },
      { id: "gem_amulet", min: 1, max: 1, ch: 0.08 },
    ],
    respawn: 60000, xp: 600,
  },
  bandit: {
    name: "Bandit", lvl: scaleLevel(7), hp: 26, maxHit: 3, def: 5, atkTick: 1900, aggro: true,
    spr: [["body_bandit"], ["armor_dark"]], scale: 1,
    drops: [
      { id: "coins", min: 6, max: 22, ch: 1 },
      { id: "flatbread", min: 1, max:2, ch: 0.25 },
      { id: "arrows", min: 4, max: 12, ch: 0.2 },
      { id: "iron_ore", min: 1, max: 1, ch: 0.15 },
    ],
    respawn: 18000, xp: 75,
  },
  orc: {
    name: "Orc Warrior", lvl: scaleLevel(13), hp: 45, maxHit: 5, def: 10, atkTick: 2100, aggro: true,
    spr: [["body_goblin"], ["armor_orange"]], scale: 1.18,
    drops: [
      { id: "coins", min: 15, max: 45, ch: 1 },
      { id: "iron_ore", min: 1, max: 2, ch: 0.3 },
      { id: "fire_rune", min: 2, max: 6, ch: 0.15 },
      { id: "gold_bar", min: 1, max: 1, ch: 0.06 },
      { id: "iron_sword", min: 1, max: 1, ch: 0.04 },
    ],
    respawn: 25000, xp: 160,
  },
};

// ===== shop =====
// Callers (1):
//  main/ui.js:145
const SHOP_STOCK = [
  "axe_iron", "pickaxe_iron", "shears", "hoe", "fishing_rod", "small_net", "big_net", "harpoon", "lobster_cage",
  "shortsword_iron", "heater_bronze", "bucket",
  "shortbow", "arrows", "wand", "air_rune", "rune_1", // wand + Air/Strike: a first working sentence
  "flatbread", "vial",
  "key", "skeleton_key", // for the locked doors & gates (gameplay/locks.js); masterkey stays craft-only
  // (deprecated wheat/cotton/herb seeds removed from the store — their CROPS.wheat/
  //  cotton/herb were wiped by the per-skill agriculture redesign; seeds come from
  //  the tiered seed_<agri>_<i> system now.)
];

// Callers (1):
//  gameplay/input.js:126
const NODE_EXAMINE = {
  tree: "A leafy tree, good for chopping.", tree_or: "Its leaves are turning.", tree_ap: "An apple tree.",
  pine: "A tall pine. Needs level 5 Woodcutting.",
  copper: "Veins of copper run through it.", iron: "An iron-rich rock. Level 3 Mining.",
  goldrock: "Is that... gold?! Level 9 Mining.",
  essence: "It hums with magical energy. Level 2 Mining.",
  berrybush: "Heavy with ripe berries.", herbpatch: "Wild herbs. Level 3 Foraging.",
  furnace: "Smelt ores, cook, and craft jewelry here.", anvil: "Hammer bars into gear here.",
  campfire: "A crackling fire. Good for cooking.", bank: "Your items are safe in here.",
  workbench: "Sawdust everywhere. Carpentry, fletching and crafting.",
  loom: "For weaving cloth.", tanrack: "Stretched hides dry here.",
  mill: "Grinds wheat into flour.", cauldron: "Something's always bubbling.",
  sawmill: "Saws logs into boards and staves.",
  malthouse: "Barley is steeped and kilned into malt here.",
  brewery: "Vats of ale ferment slowly here.",
  cooperage: "Barrels, casks and tubs take shape here.",
  bakehouse: "The ovens are warm. Bread and pastries.",
  spinning_wheel: "Fibre is spun into yarn and thread here.",
  dyeworks: "Vats of coloured dye for yarn and cloth.",
  fulling_mill: "Woven cloth is washed and fulled here.",
  tailors_bench: "Garments and sails are cut and sewn here.",
  barn: "Livestock are fed and tended here for wool, milk, hides and more.",
  creamery: "Milk is curdled and cheeses are pressed and aged here.",
  ropewalk: "Twine is twisted into rope, cable and rigging here.",
  sail_loft: "Canvas is cut and sewn into sails here.",
  shipyard: "Keels are laid and hulls planked and rigged here.",
  charcoal_clamp: "Wood is charred slowly into charcoal here.",
  lime_kiln: "Limestone is burnt into lime here.",
  masons_yard: "Stone is dressed and built up with mortar here.",
  pottery_kiln: "Clay is thrown and fired into pottery here.",
  glass_furnace: "Sand is melted and blown into glass here.",
  assay_furnace: "Metals are refined and gems cut here.",
  drawbench: "Bars are drawn into wire here.",
  jewelers_bench: "Fine jewellery is set here.",
  leather_bench: "Leather is cut and stitched into goods here.",
  cobblers_bench: "Shoes and boots are cobbled here.",
  saddlers_bench: "Saddles, harness and tack are made here.",
  toolsmith: "Tools are forged and handled here.",
  locksmith_bench: "Keys, locks and mechanisms are fitted here.",
  paper_mill: "Rags and pulp are pressed into paper here.",
  bindery: "Paper and covers are bound into books here.",
  chandlery: "Wicks are dipped into candles here.",
  soap_works: "Ash and tallow are boiled into soap here.",
  alchtable: "Turn items into gold... allegedly.", altar: "Ancient magic radiates from it.",
  farmplot: "A patch of tilled soil.",
};
