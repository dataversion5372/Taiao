// ===== Taiao — Sailmaking =====
// The end of the linen-sail chain: flax → linen thread (Spinning) → Canvas
// (Weaving) → SAILMAKING → sails, using rope + rigging from Ropemaking for
// boltropes and rigged sail sets, and tallow/beeswax (Husbandry) to waterproof
// canvas goods. Consumes Canvas as a major sink. The stop-gap `sail` recipe is
// migrated out of Tailoring into this trade. Loaded after ropemaking.js.
"use strict";

(function () {
  if (!SKILLS.includes("Sailmaking")) SKILLS.push("Sailmaking");
  SKILL_CATEGORY.Sailmaking = "Textiles & Leather";
  RECIPE_VERB.Sailmaking = "Sewn";

  // migrate `sail` out of Tailoring
  if (RECIPES.tailoring) RECIPES.tailoring = RECIPES.tailoring.filter(r => r.out !== "sail");

  const CANVAS = (() => { const i = TEXTILE_NAMES.indexOf("Canvas"); return i <= 0 ? "cloth" : "cloth_" + i; })();
  let si = 170;
  const ico = (key, extra) => defineIcon(key, "i_cloth", si++, extra || "");
  const NAMES = {
    lugsail: "Lugsail", lateen_sail: "Lateen sail", gaff_sail: "Gaff sail", square_sail: "Square sail",
    topsail: "Topsail", topgallant: "Topgallant sail", jib: "Jib", staysail: "Staysail", spanker: "Spanker",
    mainsail: "Mainsail", foresail: "Foresail", mizzen_sail: "Mizzen sail", spinnaker: "Spinnaker",
    studding_sail: "Studding sail", storm_jib: "Storm jib", royal_sail: "Royal sail",
    rigged_lugsail: "Rigged lugsail", rigged_mainsail: "Rigged mainsail", rigged_square_rig: "Rigged square rig",
    full_ship_rig: "Full ship rig", tarpaulin: "Tarpaulin", oilcloth: "Oilcloth", canvas_tent: "Canvas tent",
    awning: "Awning", groundsheet: "Groundsheet", cargo_cover: "Cargo cover", kit_bag: "Kit bag",
    sea_sack: "Sea sack", canvas_hammock: "Canvas hammock", boat_cover: "Boat cover", master_mainsail: "Master mainsail",
  };
  const mkItem = (id, req, extra) => {
    if (ITEMS[id]) return; // reuse existing `sail`
    const name = NAMES[id] || id;
    ico("i_" + id, extra);
    ITEMS[id] = { name, icon: "i_" + id, value: 30 + req * 6, finished: true };
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, "sailmaking good — tinted cloth-icon placeholder");
  };

  // [recipeId, out, displayName, family, req, inputs]
  const S = [
    // plain sails from canvas + boltrope
    ["sew_sail",        "sail",          "Sew a sail",           "sails", 1,  { [CANVAS]: 4 }],
    ["sew_lugsail",     "lugsail",       "Sew a lugsail",        "sails", 3,  { [CANVAS]: 3, rope: 1 }],
    ["sew_jib",         "jib",           "Sew a jib",            "sails", 5,  { [CANVAS]: 3, rope: 1 }],
    ["sew_lateen",      "lateen_sail",   "Sew a lateen sail",    "sails", 6,  { [CANVAS]: 4, rope: 1 }],
    ["sew_gaff",        "gaff_sail",     "Sew a gaff sail",      "sails", 7,  { [CANVAS]: 4, rope: 1 }],
    ["sew_staysail",    "staysail",      "Sew a staysail",       "sails", 8,  { [CANVAS]: 3, rope: 1 }],
    ["sew_square",      "square_sail",   "Sew a square sail",    "sails", 9,  { [CANVAS]: 5, rope: 2 }],
    ["sew_topsail",     "topsail",       "Sew a topsail",        "sails", 11, { [CANVAS]: 4, rope: 2 }],
    ["sew_spanker",     "spanker",       "Sew a spanker",        "sails", 12, { [CANVAS]: 4, rope: 2 }],
    ["sew_topgallant",  "topgallant",    "Sew a topgallant",     "sails", 13, { [CANVAS]: 4, rope: 2 }],
    ["sew_foresail",    "foresail",      "Sew a foresail",       "sails", 14, { [CANVAS]: 5, rope: 2 }],
    ["sew_mainsail",    "mainsail",      "Sew a mainsail",       "sails", 15, { [CANVAS]: 6, rope: 3 }],
    ["sew_mizzen",      "mizzen_sail",   "Sew a mizzen sail",    "sails", 16, { [CANVAS]: 5, rope: 2 }],
    ["sew_studding",    "studding_sail", "Sew a studding sail",  "sails", 17, { [CANVAS]: 4, rope: 2 }],
    ["sew_spinnaker",   "spinnaker",     "Sew a spinnaker",      "sails", 18, { [CANVAS]: 5, rope: 2 }],
    ["sew_storm_jib",   "storm_jib",     "Sew a storm jib",      "sails", 19, { [CANVAS]: 3, tarred_rope: 1 }],
    ["sew_royal",       "royal_sail",    "Sew a royal sail",     "sails", 24, { [CANVAS]: 6, rope: 3 }],
    // rigged sail sets (consume Ropemaking's rigging + base sails)
    ["rig_lugsail",     "rigged_lugsail","Rig a lugsail",        "rigged", 16, { lugsail: 1, running_rigging: 1 }],
    ["rig_mainsail",    "rigged_mainsail","Rig a mainsail",      "rigged", 22, { mainsail: 1, standing_rigging: 1, running_rigging: 1 }],
    ["rig_square",      "rigged_square_rig","Rig a square rig",  "rigged", 26, { square_sail: 1, standing_rigging: 1 }],
    ["rig_full_ship",   "full_ship_rig", "Rig a full ship",      "rigged", 30, { mainsail: 1, foresail: 1, mizzen_sail: 1, standing_rigging: 2, running_rigging: 2 }],
    // canvas goods (waterproofed with tallow/beeswax)
    ["make_tarpaulin",  "tarpaulin",     "Make a tarpaulin",     "canvas_goods", 4,  { [CANVAS]: 2, tallow: 1 }],
    ["make_groundsheet","groundsheet",   "Make a groundsheet",   "canvas_goods", 6,  { [CANVAS]: 2, tallow: 1 }],
    ["make_kit_bag",    "kit_bag",       "Sew a kit bag",        "canvas_goods", 5,  { [CANVAS]: 2, cord: 1 }],
    ["make_sea_sack",   "sea_sack",      "Sew a sea sack",       "canvas_goods", 7,  { [CANVAS]: 2 }],
    ["make_oilcloth",   "oilcloth",      "Wax oilcloth",         "canvas_goods", 8,  { [CANVAS]: 2, beeswax: 1 }],
    ["make_canvas_hammock","canvas_hammock","Sew a canvas hammock","canvas_goods", 9, { [CANVAS]: 2, rope: 1 }],
    ["make_awning",     "awning",        "Sew an awning",        "canvas_goods", 10, { [CANVAS]: 3, rope: 1 }],
    ["make_tent",       "canvas_tent",   "Sew a canvas tent",    "canvas_goods", 11, { [CANVAS]: 4, rope: 2 }],
    ["make_cargo_cover","cargo_cover",   "Make a cargo cover",   "canvas_goods", 12, { [CANVAS]: 3 }],
    ["make_boat_cover", "boat_cover",    "Make a boat cover",    "canvas_goods", 13, { [CANVAS]: 4, tarred_rope: 1 }],
    ["make_master_sail","master_mainsail","Sew a master mainsail","luxury",     32, { [CANVAS]: 8, standing_rigging: 1, running_rigging: 1 }],
  ];
  RECIPES.sailmaking = S.map(([id, out, name, family, req, inp]) => {
    mkItem(out, req);
    return { id, out, name, skill: "Sailmaking", req, xp: 26 + req * 5, in: inp,
      tick: 1800 + req * 30, family, stations: ["sail_loft", "loom", "tailors_bench", "workbench"] };
  });

  STATIONS.sail_loft = { name: "Sail loft", spr: "loom", action: "Sew sails", lists: ["sailmaking"], quality: 60 };
  STATIONS.loom.lists.push("sailmaking");
  STATIONS.tailors_bench.lists.push("sailmaking");

  Object.assign(PROD_SKILL_INTRO, {
    Sailmaking: "Cut and sew canvas into sails — lugsails and jibs up to great square-rigged mainsails — bolt-roped with Ropemaking's cordage and finished into fully-rigged sail sets, plus tarpaulins, tents and waxed oilcloth. The linen-sail chain ends here.",
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
