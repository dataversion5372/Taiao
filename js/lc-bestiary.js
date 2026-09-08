// ===== retired prototype bestiary for Isle of Emberfall =====
// Temporarily replaces the IoE bestiary with monsters from the retired prototype
// (legacy-2004) NPC roster: each entry names its retired prototype NPC (model +
// animations come from the imported cache), an IoE-scale combat level,
// a theme (drives drops via creatureDrops) and the biomes it spawns in.
// applyLcBestiary() must run BEFORE genWorld() so chunk spawn tables and
// camps use the new list. Only called when the retired prototype engine is active.
"use strict";

// [key, display name, [npc pack-name candidates], level(1-99 old scale), theme, [biomes], scale]
// themes: b beast, h humanoid, u undead, d dragon, m magical, e elemental
// biomes use the BIOME_MOB_NAMES region keys.
const LC_BESTIARY = [
  // --- farmyard & lowland critters ---
  ["rat", "Rat", ["rat"], 1, "b", ["GRASS", "FARM", "RUINSB", "SWAMP"], 0.7],
  ["chicken", "Chicken", ["chicken"], 1, "b", ["GRASS", "FARM"], 0.7],
  ["duck", "Duck", ["duck"], 1, "b", ["WETLAND", "MEADOW"], 0.7],
  ["seagull", "Seagull", ["gull1", "gull2"], 2, "b", ["SAND", "REEF"], 0.7],
  ["spider", "Spider", ["spider"], 1, "b", ["GRASS", "FOREST", "MEADOW"], 0.6],
  ["cow", "Cow", ["cow"], 2, "b", ["GRASS", "FARM", "MEADOW"], 1.3],
  ["sheep", "Sheep", ["sheepunsheered", "sheepsheered"], 1, "b", ["GRASS", "FARM", "MEADOW"], 1.0],
  ["dog", "Wild dog", ["dog"], 4, "b", ["FARM", "GRASS", "BADLANDS"], 1.0],
  ["monkey", "Monkey", ["monkey"], 3, "b", ["JUNGLE", "BAMBOO"], 0.7],
  ["penguin", "Penguin", ["penguin"], 2, "b", ["SNOW", "GLACIER", "TUNDRA"], 0.7],
  ["camel", "Camel", ["camel"], 5, "b", ["DESERT", "OASIS"], 1.4],
  ["terrorbird", "Terrorbird", ["terrorbird"], 8, "b", ["SAVANNA", "STEPPE"], 1.2],
  ["oomlie_bird", "Oomlie bird", ["oomlie_bird"], 4, "b", ["JUNGLE"], 0.9],
  ["dungeon_rat", "Dungeon rat", ["dungeon_rat"], 9, "b", ["LABYRINTH", "RUINSB"], 0.9],
  ["giant_rat", "Giant rat", ["giantrat", "giantrat1"], 6, "b", ["GRASS", "SWAMP", "RUINSB", "MOOR"], 1.0],
  ["unicorn", "Unicorn", ["unicorn"], 12, "b", ["MEADOW", "DREAM", "CHERRY"], 1.4],
  ["snake", "Snake", ["snake"], 8, "b", ["SWAMP", "DESERT", "JUNGLE", "OASIS", "WETLAND"], 0.9],
  ["sea_snake", "Sea snake", ["snake"], 15, "b", ["WATER", "DEEP", "REEF"], 1.1],
  ["bat", "Giant bat", ["bat"], 6, "b", ["MOOR", "RUINSB", "BONE", "ASH", "LABYRINTH"], 0.8],
  // --- wilds & woodland beasts ---
  ["wolf", "Wolf", ["wolf"], 11, "b", ["FOREST", "TAIGA", "TUNDRA", "SNOW", "MOOR", "STEPPE"], 1.1],
  ["white_wolf", "White wolf", ["wolfpack_leader_whiter", "wolf"], 24, "b", ["SNOW", "GLACIER", "TAIGA"], 1.2],
  ["bear", "Brown bear", ["brownbear"], 15, "b", ["FOREST", "TAIGA"], 1.4],
  ["black_bear", "Black bear", ["darkbear", "brownbear"], 19, "b", ["FOREST", "MOOR", "TAIGA"], 1.4],
  ["yeti", "Yeti", ["yeti"], 42, "b", ["SNOW", "GLACIER", "TUNDRA"], 1.7],
  // --- spiders & crawlers ---
  ["giant_spider", "Giant spider", ["giantspider1", "giantspider2"], 13, "b", ["FOREST", "LABYRINTH", "MOOR"], 1.1],
  ["jungle_spider", "Jungle spider", ["jungle_spider"], 18, "b", ["JUNGLE", "BAMBOO"], 1.1],
  ["deadly_red_spider", "Deadly red spider", ["deadly_red_spider"], 25, "b", ["JUNGLE", "SWAMP", "LABYRINTH", "VOLCANO"], 1.2],
  ["poison_spider", "Poison spider", ["poisonspider"], 31, "b", ["SWAMP", "JUNGLE"], 1.3],
  ["ice_spider", "Ice spider", ["ice_spider"], 28, "b", ["SNOW", "GLACIER", "TUNDRA", "CRYSTAL"], 1.2],
  ["scorpion", "Scorpion", ["scorpion"], 14, "b", ["DESERT", "REDDESERT", "SALT", "CANYON"], 1.0],
  ["poison_scorpion", "Poison scorpion", ["poison_scorpion"], 20, "b", ["DESERT", "REDDESERT"], 1.0],
  ["king_scorpion", "King scorpion", ["kingscorpion"], 32, "b", ["DESERT", "CANYON", "REDDESERT"], 1.6],
  // --- humanoid rabble ---
  ["gnome", "Gnome", ["gnome"], 3, "h", ["FOREST", "MEADOW", "CHERRY"], 0.8],
  ["goblin", "Goblin", ["goblin", "goblin_armed", "goblin_helmet"], 5, "h", ["GRASS", "FOREST", "BADLANDS"], 0.9],
  ["hobgoblin", "Hobgoblin", ["hobgoblin_armed", "hobgoblin_unarmed"], 16, "h", ["ROCKY", "BADLANDS", "CANYON", "SALT"], 1.1],
  ["mugger", "Mugger", ["mugger"], 6, "h", ["GRASS", "BADLANDS", "WILD"], 1.0],
  ["highwayman", "Highwayman", ["highwayman"], 9, "h", ["GRASS", "STEPPE"], 1.0],
  ["thug", "Thug", ["thug"], 8, "h", ["BADLANDS", "WILD"], 1.0],
  ["rogue", "Rogue", ["rogue"], 12, "h", ["BADLANDS", "WILD", "CANYON"], 1.0],
  ["pirate", "Pirate", ["pirate1", "pirate2"], 12, "h", ["SAND", "REEF"], 1.0],
  ["barbarian", "Barbarian", ["barbarian"], 10, "h", ["STEPPE", "TAIGA"], 1.0],
  ["dwarf", "Dwarf", ["dwarf_normal", "dwarf_mountain"], 7, "h", ["ROCKY", "ROCK", "CANYON"], 0.85],
  ["chaos_dwarf", "Chaos dwarf", ["dwarf_chaos"], 24, "h", ["ROCK", "WILD", "ASH"], 0.9],
  ["skavid", "Skavid", ["skavid"], 14, "h", ["CANYON", "LABYRINTH"], 0.9],
  ["jungle_savage", "Jungle savage", ["jungle_savage"], 35, "h", ["JUNGLE"], 1.0],
  ["lizardman", "Lizardman", ["lizardman"], 16, "h", ["SWAMP", "JUNGLE", "WETLAND"], 1.1],
  ["black_knight", "Black knight", ["black_knight", "aggressive_black_knight"], 33, "h", ["WILD", "BADLANDS"], 1.05],
  ["renegade_knight", "Renegade knight", ["renegade_knight"], 37, "h", ["WILD", "RUINSB"], 1.05],
  // --- brutes ---
  ["ogre", "Ogre", ["ogre", "ogre2"], 30, "h", ["ROCKY", "BADLANDS", "CANYON", "STEPPE"], 1.5],
  ["jogre", "Jogre", ["jogre"], 26, "h", ["JUNGLE"], 1.5],
  ["troll", "Troll", ["troll"], 28, "h", ["ROCK", "CANYON", "TUNDRA"], 1.5],
  ["hill_giant", "Hill giant", ["giant"], 24, "h", ["ROCKY", "FOREST", "CANYON", "LABYRINTH"], 1.8],
  ["moss_giant", "Moss giant", ["mossgiant"], 40, "h", ["SWAMP", "FOREST", "WETLAND", "JUNGLE"], 1.9],
  ["ice_giant", "Ice giant", ["icegiant"], 48, "h", ["SNOW", "GLACIER", "TUNDRA"], 1.9],
  ["fire_giant", "Fire giant", ["firegiant"], 62, "h", ["VOLCANO", "REDDESERT", "ASH"], 1.9],
  // --- undead ---
  ["zombie", "Zombie", ["zombie_unarmed", "zombie_armed", "zombie2"], 13, "u", ["SWAMP", "RUINSB", "BONE", "ASH", "MOOR"], 1.0],
  ["skeleton", "Skeleton", ["skeleton_armed", "skeleton_unarmed", "skeleton_unagressive"], 15, "u", ["RUINSB", "BONE", "LABYRINTH", "MOOR"], 1.0],
  ["skeleton_mage", "Skeleton mage", ["skeletonmage"], 26, "u", ["BONE", "RUINSB"], 1.0],
  ["ghost", "Ghost", ["ghost", "ghostx"], 19, "u", ["RUINSB", "BONE", "MOOR", "DREAM", "ASH"], 1.1],
  ["shade", "Shade", ["macro_shade1", "ghost"], 38, "u", ["BONE", "MOOR", "ASH"], 1.1],
  ["mummy", "Mummy", ["mummy"], 30, "u", ["DESERT", "SALT", "LABYRINTH", "RUINSB"], 1.0],
  ["souless", "Souless", ["souless"], 22, "u", ["ASH", "MOOR", "WILD"], 1.0],
  ["vampire", "Vampire", ["count_draynor"], 44, "u", ["MOOR", "RUINSB", "BONE"], 1.1],
  // --- mages, cults & magic ---
  ["imp", "Imp", ["imp"], 2, "m", ["GRASS", "VOLCANO", "ASH", "DESERT"], 0.7],
  ["dark_wizard", "Dark wizard", ["bearded_dark_wizard", "young_dark_wizard"], 20, "m", ["WILD", "MOOR", "STEPPE", "CRYSTAL"], 1.0],
  ["necromancer", "Necromancer", ["necromancer", "invrigar_the_necromancer"], 34, "m", ["BONE", "WILD"], 1.0],
  ["witch", "Witch", ["witch1", "witch2"], 25, "m", ["SWAMP", "MOOR"], 1.0],
  ["chaos_druid", "Chaos druid", ["chaos_druid"], 17, "m", ["SWAMP", "MOOR", "WILD"], 1.0],
  ["chaos_druid_warrior", "Chaos druid warrior", ["chaos_druid_warrior"], 26, "m", ["WILD", "MOOR"], 1.0],
  ["otherworldly_being", "Otherworldly being", ["otherworldly_being"], 40, "m", ["DREAM", "CRYSTAL"], 1.1],
  ["hellhound", "Hellhound", ["hellhound"], 52, "m", ["VOLCANO", "ASH", "REDDESERT", "WILD"], 1.3],
  // --- elemental warriors ---
  ["earth_warrior", "Earth warrior", ["earthwarrior"], 33, "e", ["SWAMP", "CANYON", "RUINSB", "MUSHROOM"], 1.1],
  ["ice_warrior", "Ice warrior", ["icewarrior"], 37, "e", ["SNOW", "GLACIER", "TUNDRA", "CRYSTAL"], 1.1],
  ["ice_queen", "Ice queen", ["icewarrior_queen"], 55, "e", ["GLACIER"], 1.2],
  // --- demons ---
  ["lesser_demon", "Lesser demon", ["lesser_demon"], 58, "m", ["VOLCANO", "WILD", "ASH"], 1.6],
  ["greater_demon", "Greater demon", ["greater_demon"], 68, "m", ["VOLCANO", "WILD"], 1.8],
  ["black_demon", "Black demon", ["black_demon"], 80, "m", ["WILD", "ASH", "VOLCANO"], 1.9],
  // --- dragons ---
  ["baby_blue_dragon", "Baby blue dragon", ["babybluedragon"], 26, "d", ["CANYON", "GLACIER"], 1.2],
  ["baby_dragon", "Baby red dragon", ["babydragon"], 30, "d", ["CANYON", "REDDESERT"], 1.2],
  ["green_dragon", "Green dragon", ["green_dragon"], 55, "d", ["SWAMP", "WILD", "WETLAND"], 2.0],
  ["blue_dragon", "Blue dragon", ["blue_dragon"], 65, "d", ["ROCK", "GLACIER", "CRYSTAL", "CANYON"], 2.0],
  ["red_dragon", "Red dragon", ["red_dragon"], 75, "d", ["VOLCANO", "REDDESERT"], 2.1],
  ["black_dragon", "Black dragon", ["black_dragon"], 88, "d", ["WILD", "BONE", "ASH", "CANYON"], 2.2],
  ["king_dragon", "King dragon", ["king_dragon"], 99, "d", ["VOLCANO", "WILD"], 2.4],
  // --- mushroom / oddball fill so every biome has natives ---
  ["ant", "Ant", ["spider"], 7, "b", ["MUSHROOM", "GRASS"], 0.9],
  ["cave_slime", "Cave crawler", ["giantrat"], 12, "b", ["MUSHROOM", "LABYRINTH"], 1.0],
];

// The starter pen at the origin references these exact kinds (world/chunks.js):
// chicken, cow, sheep are present above; "slime" gets a stand-in.
const LC_BESTIARY_ALIASES = { slime: "giant_rat" };

// Replaces the IoE bestiary in place. Requires LC_NAMES (cache data) but not
// the engine itself, so it can run before genWorld().
function applyLcBestiary() {
  if (typeof LC_NAMES === "undefined") return false;
  const npcId = names => {
    for (const n of names) if (LC_NAMES.npc[n] != null) return LC_NAMES.npc[n];
    return -1;
  };

  // wipe the generated IoE bestiary + biome lists
  for (const k of Object.keys(MONSTERS)) delete MONSTERS[k];
  for (const k of Object.keys(MONSTER_THEME)) delete MONSTER_THEME[k];
  for (const k of Object.keys(BIOME_MOB_NAMES)) delete BIOME_MOB_NAMES[k];

  const biomeLists = {};
  let placed = 0;
  for (const [, name, npcs, lvl, theme, biomes, scale] of LC_BESTIARY) {
    // key MUST be the slug of the display name: resolveBiomeMobs maps
    // BIOME_MOB_NAMES display names back to MONSTERS keys by slugifying.
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const id = npcId(npcs);
    if (id < 0) continue;
    const butcher = theme === "b" ? {
      meat: 1 + Math.floor(lvl / 6),
      hideItem: HIDES[Math.min(31, Math.floor(lvl / 3))].id,
      hide: lvl >= 3 ? 1 + Math.floor(lvl / 25) : 0,
    } : null;
    MONSTERS[key] = {
      name,
      lvl: scaleLevel(lvl),
      hp: Math.round(4 + lvl * 3.1),
      maxHit: Math.max(0, Math.round(lvl * 0.35)),
      def: Math.round(lvl * 0.8),
      atkTick: 2400 - Math.min(600, lvl * 8),
      aggro: lvl >= 10 && theme !== "b",
      spr: [[typeof SPR !== "undefined" && SPR.skull ? "skull" : "crate"]],
      dirSpr: false,
      scale: scale || 1,
      drops: creatureDrops(lvl, theme),
      ...(butcher && butcher.meat ? { butcher } : {}),
      respawn: 10000 + lvl * 700,
      xp: Math.max(10, lvl * 13),
      lcNpc: id,
    };
    MONSTER_THEME[key] = theme;
    for (const b of biomes) (biomeLists[b] = biomeLists[b] || []).push(name);
    placed++;
  }
  for (const [alias, target] of Object.entries(LC_BESTIARY_ALIASES)) {
    if (MONSTERS[target]) {
      MONSTERS[alias] = MONSTERS[target];
      MONSTER_THEME[alias] = MONSTER_THEME[target];
    }
  }
  // BIOME_MOB_NAMES entries are display names resolved by slugify -> our keys
  for (const b in biomeLists) BIOME_MOB_NAMES[b] = biomeLists[b];
  console.log(`retired prototype bestiary active: ${placed} monsters.`);
  return placed > 0;
}
