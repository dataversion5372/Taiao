// ===== Taiao — Ropemaking =====
// Twisting spun bast twine (hemp/jute/sisal/… from Spinning) into cordage:
// cord → rope → cable → hawser, plus tarred marine rope and ship's rigging, and
// a wide range of finished rope goods (nets — including the Fishing tools —
// cargo nets, climbing ropes, ladders, whips, moorings, anchor cables …).
// Feeds Sailmaking (rope + rigging), Fishing (nets), Sawing (ladders need boards)
// and Tanning (whips/leashes need leather). Loaded after cheesemaking.js.
"use strict";

(function () {
  if (!SKILLS.includes("Ropemaking")) SKILLS.push("Ropemaking");
  SKILL_CATEGORY.Ropemaking = "Textiles & Leather";
  RECIPE_VERB.Ropemaking = "Laid";

  let ri = 130;
  const ico = (key, base, extra) => defineIcon(key, base, ri++, extra || "");
  const NAMES = {
    rope: "Rope", cord: "Cord", cable: "Cable", hawser: "Hawser", tarred_rope: "Tarred rope",
    standing_rigging: "Standing rigging", running_rigging: "Running rigging",
    cargo_net: "Cargo net", net_bag: "Net bag", hammock: "Hammock", climbing_rope: "Climbing rope",
    rope_ladder: "Rope ladder", well_rope: "Well rope", bell_rope: "Bell rope", lasso: "Lasso",
    snare: "Snare", bullwhip: "Bullwhip", dog_leash: "Dog leash", halter: "Halter", rope_mat: "Rope mat",
    rope_fender: "Rope fender", mooring_line: "Mooring line", tow_line: "Tow line",
    cargo_sling: "Cargo sling", anchor_cable: "Anchor cable", master_hawser: "Master hawser",
  };
  const mkItem = (id, kind, req) => {
    if (ITEMS[id]) return; // reuse existing (small_net/big_net)
    const name = NAMES[id] || id;
    ico("i_" + id, kind === "c" ? "i_logs" : "i_shafts", kind === "c" ? " brightness(0.9) saturate(0.6)" : " brightness(1.1) saturate(0.5)");
    ITEMS[id] = kind === "c"
      ? { name, icon: "i_" + id, stack: true, value: 8 + req, prov: "batch" }
      : { name, icon: "i_" + id, value: 20 + req * 4, finished: true };
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, "ropemaking good — tinted placeholder");
  };
  // resolve a fibre's spun twine id (matches textiles.js yarn ids)
  const twineOf = nm => { const c = Object.values(CROPS).find(c => c.name === nm); return c ? "yarn_" + c.item : null; };

  // [recipeId, out, displayName, family, req, inputs, outQty, kind]
  // kind: c=commodity(stackable, consumed downstream)  f=finished good  x=reuse existing item
  const R = [
    // --- laying rope from spun twine (5 fibre sources → generic `rope`) ---
    ["lay_hemp_rope",  "rope", "Lay hemp rope",  "cordage", 1,  { [twineOf("hemp")]: 3 },  2, "c"],
    ["lay_jute_rope",  "rope", "Lay jute rope",  "cordage", 3,  { [twineOf("jute")]: 3 },  2, "c"],
    ["lay_sisal_rope", "rope", "Lay sisal rope", "cordage", 5,  { [twineOf("sisal")]: 3 }, 2, "c"],
    ["lay_kenaf_rope", "rope", "Lay kenaf rope", "cordage", 7,  { [twineOf("kenaf")]: 3 }, 2, "c"],
    ["lay_ramie_rope", "rope", "Lay ramie rope", "cordage", 9,  { [twineOf("ramie")]: 3 }, 2, "c"],
    // --- heavier / processed cordage ---
    ["twist_cord",     "cord",        "Twist light cord",  "cordage", 2,  { rope: 1 },            2, "c"],
    ["lay_cable",      "cable",       "Lay heavy cable",   "cordage", 12, { rope: 3 },            1, "c"],
    ["lay_hawser",     "hawser",      "Lay a hawser",      "cordage", 18, { cable: 2 },           1, "c"],
    ["tar_rope",       "tarred_rope", "Tar rope",          "marine",  10, { rope: 2, tallow: 1 }, 2, "c"],
    ["standing_rig",   "standing_rigging", "Make standing rigging", "rigging", 16, { tarred_rope: 2 }, 1, "c"],
    ["running_rig",    "running_rigging",  "Make running rigging",  "rigging", 14, { rope: 3 },        1, "c"],
    // --- nets (the Fishing tools + cargo/utility nets) ---
    ["knot_small_net", "small_net",  "Knot a small fishing net", "nets", 4,  { cord: 3 },          1, "x"],
    ["knot_big_net",   "big_net",    "Knot a big fishing net",   "nets", 13, { cord: 5, rope: 1 }, 1, "x"],
    ["weave_cargo_net","cargo_net",  "Weave a cargo net",        "nets", 8,  { rope: 3 },          1, "f"],
    ["make_net_bag",   "net_bag",    "Knot a net bag",           "nets", 6,  { cord: 3 },          1, "f"],
    // --- utility & ship goods ---
    ["weave_hammock",  "hammock",      "Weave a hammock",     "utility", 6,  { cord: 4 },              1, "f"],
    ["make_climb_rope","climbing_rope","Make a climbing rope","utility", 11, { rope: 2 },              1, "f"],
    ["make_rope_ladder","rope_ladder", "Make a rope ladder",  "utility", 15, { rope: 3, boards: 2 },   1, "f"],
    ["make_well_rope", "well_rope",    "Make a well rope",    "utility", 5,  { rope: 2 },              1, "f"],
    ["make_bell_rope", "bell_rope",    "Make a bell rope",    "utility", 7,  { rope: 2 },              1, "f"],
    ["make_lasso",     "lasso",        "Braid a lasso",       "utility", 9,  { cord: 2 },              1, "f"],
    ["make_snare",     "snare",        "Set up a snare",      "utility", 3,  { cord: 1 },              1, "f"],
    ["make_bullwhip",  "bullwhip",     "Plait a bullwhip",    "utility", 14, { cord: 2, leather: 1 },  1, "f"],
    ["make_dog_leash", "dog_leash",    "Braid a leash",       "utility", 6,  { cord: 2, leather: 1 },  1, "f"],
    ["make_halter",    "halter",       "Make a halter",       "utility", 10, { rope: 2 },              1, "f"],
    ["make_rope_mat",  "rope_mat",     "Coil a rope mat",     "utility", 13, { cord: 4 },              1, "f"],
    ["make_fender",    "rope_fender",  "Make a rope fender",  "marine",  12, { tarred_rope: 2 },       1, "f"],
    ["make_mooring",   "mooring_line", "Lay a mooring line",  "marine",  17, { cable: 2 },             1, "f"],
    ["make_tow_line",  "tow_line",     "Lay a tow line",      "marine",  19, { cable: 1, rope: 2 },    1, "f"],
    ["make_cargo_sling","cargo_sling", "Make a cargo sling",  "marine",  16, { rope: 4 },              1, "f"],
    ["make_anchor_cable","anchor_cable","Lay an anchor cable","marine",  20, { hawser: 1 },            1, "f"],
    ["make_master_hawser","master_hawser","Lay a master hawser","marine",32, { hawser: 2, tarred_rope: 4 }, 1, "f"],
  ];
  RECIPES.ropemaking = R.map(([id, out, name, family, req, inp, qty, kind]) => {
    mkItem(out, kind, req);
    return { id, out, qty, name, skill: "Ropemaking", req, xp: 20 + req * 4, in: inp,
      tick: 1400 + req * 20, family, stations: ["ropewalk", "workbench", "loom"] };
  });

  STATIONS.ropewalk = { name: "Ropewalk", spr: "workbench", action: "Lay rope", lists: ["ropemaking"], quality: 55 };
  STATIONS.workbench.lists.push("ropemaking");
  STATIONS.loom.lists.push("ropemaking");

  Object.assign(PROD_SKILL_INTRO, {
    Ropemaking: "Twist spun bast twine into cord, rope, cable and hawser at a ropewalk, tar it for the sea, and knot everything from fishing nets and hammocks to ship's rigging, anchor cables and moorings. Supplies Sailmaking's rigging and the Fishing nets.",
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
