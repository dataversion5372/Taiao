// ===== Isle of Emberfall — NZ bird species (additive content) =====
// Adds 25 native/extinct NZ birds as new monsters alongside the existing
// fantasy bestiary (nothing removed). Three moa are renamed per request
// (Kuraiti/Kurauta/Kuranui) and drop a new "raw moa" carcass item; Kuihi Nui
// is renamed to Tarepo.
"use strict";

ITEMS.raw_moa = { name: "Raw moa", icon: "i_rawmeat", stack: true, value: 14 };
ITEMS.cooked_moa = { name: "Cooked moa", icon: "i_meat", stack: true, value: 28, heals: 12 };
EXAMINE.raw_moa = "A hefty cut of moa meat."; EXAMINE.cooked_moa = "Rich roast moa. Heals 12 HP.";
RECIPES.cook.push({ out: "cooked_moa", name: "Roast moa", skill: "Cooking", req: scaleLevel(10), xp: 90, in: { raw_moa: 1 }, tick: 1600, burnUntil: 22, burnt: "burnt_meat" });

// Real-world-proportional size for each bird, keyed by display name.
for (const [nm, sc] of Object.entries({
  "Kiwi": 0.55,
  "Titipounamu": 0.12,
  "Pīwakawaka": 0.18,
  "Tīeke": 0.32,
  "Kōtātā": 0.32,
  "Tūī": 0.4,
  "Kākā": 0.5,
  "Kea": 0.5,
  "Ruru": 0.4,
  "Koreke": 0.28,
  "Weka": 0.55,
  "Pūkeko": 0.55,
  "Pūtangitangi": 0.55,
  "Whio": 0.5,
  "Kererū": 0.55,
  "Kākāpō": 0.7,
  "Tākapu": 0.55,
  "Huia": 0.42,
  "Kārearea": 0.45,
  "Hakawai": 1.3,
  "Pouākai": 2.3,
  "Tarepo": 0.75,
  "Kuraiti": 1.0,
  "Kurauta": 1.6,
  "Kuranui": 2.8,
})) SIZE[nm] = sc;

const NZ_EXTRA_BIRDS = [
  ["kiwi", "Kiwi", 4, false, null, 0],
  ["titipounamu", "Titipounamu", 1, false, null, 0],
  ["piwakawaka", "Pīwakawaka", 1, false, null, 0],
  ["tieke", "Tīeke", 3, false, null, 0],
  ["kotata", "Kōtātā", 3, false, null, 0],
  ["tui", "Tūī", 4, false, null, 0],
  ["kaka", "Kākā", 5, false, null, 0],
  ["kea", "Kea", 6, true, null, 0],
  ["ruru", "Ruru", 4, false, null, 0],
  ["koreke", "Koreke", 2, false, null, 0],
  ["weka", "Weka", 6, true, "raw_meat", 2],
  ["pukeko", "Pūkeko", 5, false, "raw_meat", 2],
  ["putangitangi", "Pūtangitangi", 5, false, "raw_meat", 2],
  ["whio", "Whio", 6, false, null, 0],
  ["kereru", "Kererū", 5, false, "raw_meat", 2],
  ["kakapo", "Kākāpō", 8, false, null, 0],
  ["takapu", "Tākapu", 6, false, null, 0],
  ["huia", "Huia", 5, false, null, 0],
  ["karearea", "Kārearea", 7, true, null, 0],
  ["hakawai", "Hakawai", 14, true, null, 0],
  ["pouakai", "Pouākai", 22, true, null, 0],
  ["kuihinui", "Tarepo", 8, false, null, 0],
  ["moaiti", "Kuraiti", 8, false, "raw_moa", 4],
  ["moauta", "Kurauta", 11, false, "raw_moa", 5],
  ["moanui", "Kuranui", 16, false, "raw_moa", 8],
];

// killMonster()'s auto butcher-drop reads b.item (falling back to "raw_meat" if
// unset) so moa yield "raw_moa" on death instead of the generic meat item.
for (const [key, name, lvl, aggro, meat, qty] of NZ_EXTRA_BIRDS) {
  defineCreature(key, name, 0, 0, lvl, "m");
  const def = MONSTERS[key];
  def.aggro = aggro;
  def.drops = [{ id: "coins", min: 1, max: Math.max(2, lvl * 2), ch: 0.6 }];
  if (meat) {
    def.butcher = { meat: qty, hide: 0, item: meat === "raw_moa" ? "raw_moa" : undefined };
  }
  MONSTER_THEME[key] = "m";
}

// Add into the existing biome spawn lists (push, not replace) so NZ birds
// mix into the current fantasy world instead of taking it over. Keyed by
// internal bird key directly (not display name) — safe since slugify()
// strips macrons and these keys are already plain ASCII.
const NZ_BIRD_BIOME_ADDS = {
  FOREST: ["tui", "kaka", "kea", "kereru", "ruru", "tieke", "huia", "kiwi", "kakapo", "piwakawaka", "titipounamu", "karearea", "weka", "moaiti", "moanui", "kuihinui"],
  SWAMP:  ["pukeko", "putangitangi", "kotata", "whio"],
  WETLAND:["pukeko", "putangitangi", "kotata", "whio", "kuihinui"],
  GRASS:  ["koreke", "pukeko", "kuihinui"],
  MEADOW: ["koreke", "piwakawaka"],
  FARM:   ["pukeko", "weka", "koreke"],
  ROCK:   ["kea", "karearea"],
  ROCKY:  ["karearea", "takapu"],
  SNOW:   ["kea"],
  VOLCANO:["kea", "karearea"],
  SAND:   ["takapu"],
  REEF:   ["takapu"],
  WATER:  ["takapu"],
  WILD:   ["hakawai", "pouakai", "moanui", "moaiti"],
  MOOR:   ["kea", "karearea"],
  STEPPE: ["kea", "karearea", "koreke"],
  CANYON: ["karearea", "kea"],
};
for (const [bname, keys] of Object.entries(NZ_BIRD_BIOME_ADDS)) {
  if (!BIOME_MOB_NAMES[bname]) BIOME_MOB_NAMES[bname] = [];
  for (const key of keys) {
    if (!BIOME_MOB_NAMES[bname].includes(key)) BIOME_MOB_NAMES[bname].push(key);
  }
}
