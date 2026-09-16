// ===== Taiao — Shipwrighting =====
// The capstone of the wood/textile/metal economy: hulls of boards & planks
// (Sawing/Carpentry) are caulked with tarred oakum (Ropemaking), fitted with
// iron (Smithing), rigged with sails (Sailmaking) and cordage (Ropemaking), and
// anchored with cable — so a finished ship remembers every trade that touched
// it. The three player-sailable boats (canoe/sailboat/ship) are MIGRATED here
// from Carpentry with upgraded recipes; 29 more vessels are a shipyard's
// commissioned trade goods. Loaded after sailmaking.js.
"use strict";

(function () {
  if (!SKILLS.includes("Shipwrighting")) SKILLS.push("Shipwrighting");
  SKILL_CATEGORY.Shipwrighting = "Woodworking";
  RECIPE_VERB.Shipwrighting = "Built";

  // Carpentry is the FURNITURE trade now (furniture.js) — strip every legacy
  // boat recipe content.js still pushes there. Their outs (raft_logs,
  // boat_coracle, ship_*, and the shared canoe/sailboat/ship) are superseded by
  // the Shipwrighting builds below; old saved copies are swapped to the
  // equivalent vessel on load (storage.js BOAT_MIGRATE).
  const LEGACY_BOATS = new Set(typeof BOAT_ORDER !== "undefined" ? BOAT_ORDER : ["canoe", "sailboat", "ship"]);
  if (RECIPES.carpentry) RECIPES.carpentry = RECIPES.carpentry.filter(r => !LEGACY_BOATS.has(r.out));

  let wi = 210;
  const NAMES = {
    raft: "Raft", log_raft: "Log raft", coracle: "Coracle", punt: "Punt", skiff: "Skiff",
    rowboat: "Rowboat", dinghy: "Dinghy", dory: "Dory", catboat: "Catboat", fishing_smack: "Fishing smack",
    sloop: "Sloop", barge: "Barge", cutter: "Cutter", ketch: "Ketch", cog: "Cog", longship: "Longship",
    junk: "Junk", caravel: "Caravel", schooner: "Schooner", carrack: "Carrack", brig: "Brig",
    brigantine: "Brigantine", galley: "Galley", barque: "Barque", galleon: "Galleon", frigate: "Frigate",
    clipper: "Clipper", dhow: "Dhow", man_o_war: "Man-o'-war",
  };
  const mkVessel = (id, req) => {
    if (ITEMS[id]) return; // reuse the sailable boats (canoe/sailboat/ship)
    const name = NAMES[id] || id;
    defineIcon("i_" + id, "i_ship", wi++, ` hue-rotate(${(req * 23) % 360}deg) saturate(1.1) brightness(${1 - req * 0.004})`);
    ITEMS[id] = { name, icon: "i_" + id, value: 200 + req * 80, finished: true };
    EXAMINE[id] = EXAMINE[id] || `${name} — built in a shipyard; ask who laid her keel.`;
    registerPlaceholder(id, name, "vessel — tinted ship-icon placeholder");
  };

  // [recipeId, out, displayName, family, req, inputs]  (out canoe/sailboat/ship reuse existing items)
  const V = [
    ["build_raft",       "raft",          "Lash a raft",          "small_craft", 1,  { boards: 3, rope: 1 }],
    ["build_log_raft",   "log_raft",      "Lash a log raft",      "small_craft", 2,  { logs: 4, rope: 1 }],
    ["build_canoe",      "canoe",         "Carve a dugout canoe", "small_craft", 3,  { boards: 4, rope: 1 }],
    ["build_coracle",    "coracle",       "Build a coracle",      "small_craft", 4,  { boards: 2, hide: 2, rope: 1 }],
    ["build_punt",       "punt",          "Build a punt",         "small_craft", 5,  { boards: 4, rope: 1 }],
    ["build_skiff",      "skiff",         "Build a skiff",        "small_craft", 6,  { boards: 5, rope: 2, iron_bar: 1 }],
    ["build_rowboat",    "rowboat",       "Build a rowboat",      "boats",       7,  { planks: 5, boards: 2, rope: 2, iron_bar: 1 }],
    ["build_dinghy",     "dinghy",        "Build a dinghy",       "boats",       8,  { planks: 4, rope: 2 }],
    ["build_dory",       "dory",          "Build a dory",         "fishing",     9,  { planks: 5, boards: 3, rope: 2 }],
    ["build_catboat",    "catboat",       "Rig a catboat",        "sail_boats",  10, { planks: 6, rope: 3, sail: 1 }],
    ["build_fishing_smack","fishing_smack","Build a fishing smack","fishing",    11, { planks: 7, rope: 3, sail: 1, iron_bar: 1 }],
    ["build_sloop",      "sloop",         "Build a sloop",        "sail_boats",  12, { planks: 8, oak_boards: 2, rope: 3, sail: 1, iron_bar: 2 }],
    ["build_barge",      "barge",         "Build a cargo barge",  "cargo",       13, { planks: 12, boards: 4, rope: 4, iron_bar: 2 }],
    ["build_cutter",     "cutter",        "Build a cutter",       "sail_boats",  14, { planks: 9, rope: 4, sail: 1, iron_bar: 2 }],
    ["build_ketch",      "ketch",         "Build a ketch",        "sail_boats",  15, { planks: 10, oak_boards: 2, rope: 4, sail: 2, iron_bar: 2 }],
    ["build_sailboat",   "sailboat",      "Build a sailboat",     "sail_boats",  16, { planks: 8, boards: 4, rope: 3, sail: 1, iron_bar: 2 }],
    ["build_cog",        "cog",           "Build a cog",          "cargo",       17, { planks: 12, oak_boards: 4, rope: 5, sail: 1, iron_bar: 3, tarred_rope: 1 }],
    ["build_longship",   "longship",      "Build a longship",     "warships",    18, { planks: 14, oak_boards: 4, rope: 5, sail: 1, iron_bar: 3 }],
    ["build_junk",       "junk",          "Build a junk",         "ocean",       19, { planks: 14, oak_boards: 4, rope: 5, sail: 2, iron_bar: 3 }],
    ["build_caravel",    "caravel",       "Build a caravel",      "ocean",       20, { planks: 14, oak_boards: 6, rope: 6, rigged_mainsail: 1, iron_bar: 3, tarred_rope: 1 }],
    ["build_schooner",   "schooner",      "Build a schooner",     "ocean",       21, { planks: 15, oak_boards: 6, rope: 6, rigged_mainsail: 1, iron_bar: 3 }],
    ["build_carrack",    "carrack",       "Build a carrack",      "ocean",       22, { planks: 16, oak_boards: 6, rope: 6, rigged_mainsail: 1, cable: 1, iron_bar: 4, tarred_rope: 2 }],
    ["build_brig",       "brig",          "Build a brig",         "warships",    23, { planks: 16, oak_boards: 6, rope: 7, rigged_mainsail: 1, cable: 1, iron_bar: 4, tarred_rope: 2 }],
    ["build_brigantine", "brigantine",    "Build a brigantine",   "warships",    24, { planks: 17, oak_boards: 6, rope: 7, rigged_mainsail: 1, cable: 1, iron_bar: 4, tarred_rope: 2 }],
    ["build_galley",     "galley",        "Build a galley",       "warships",    25, { planks: 18, oak_boards: 8, rope: 8, rigged_mainsail: 1, cable: 1, iron_bar: 5 }],
    ["build_barque",     "barque",        "Build a barque",       "ocean",       26, { planks: 18, oak_boards: 8, rope: 8, full_ship_rig: 1, cable: 1, iron_bar: 5, tarred_rope: 2 }],
    ["build_galleon",    "galleon",       "Build a galleon",      "ocean",       27, { planks: 20, oak_boards: 10, rope: 8, full_ship_rig: 1, cable: 2, anchor_cable: 1, iron_bar: 6, tarred_rope: 3 }],
    ["build_ship",       "ship",          "Build a ship",         "ocean",       28, { planks: 16, oak_boards: 8, rope: 6, rigged_mainsail: 1, cable: 2, anchor_cable: 1, iron_bar: 4, tarred_rope: 2 }],
    ["build_frigate",    "frigate",       "Build a frigate",      "warships",    29, { planks: 22, oak_boards: 10, rope: 9, full_ship_rig: 1, cable: 2, anchor_cable: 1, iron_bar: 6, tarred_rope: 3 }],
    ["build_clipper",    "clipper",       "Build a clipper",      "ocean",       30, { planks: 22, oak_boards: 12, rope: 10, full_ship_rig: 1, cable: 2, iron_bar: 6, tarred_rope: 3 }],
    ["build_dhow",       "dhow",          "Build a dhow",         "ocean",       31, { planks: 11, oak_boards: 4, rope: 4, sail: 2, iron_bar: 2 }],
    ["build_man_o_war",  "man_o_war",     "Build a man-o'-war",   "warships",    32, { planks: 28, oak_boards: 14, rope: 12, full_ship_rig: 2, cable: 3, anchor_cable: 2, mooring_line: 1, iron_bar: 8, tarred_rope: 4 }],
  ];
  RECIPES.shipwrighting = V.map(([id, out, name, family, req, inp]) => {
    mkVessel(out, req);
    // CONSOLIDATION: every vessel is both boardable/rideable (furniture.js) AND
    // click-to-sailable — bestBoat() (state.js) sails the highest `boat` tier you own
    // and can crew. The old content.js fleet used to carry these props; now the
    // Shipwrighting hull is the single source. tier = build req; bigger hulls need a
    // higher Sailing level and cap a lower top speed. (Overrides the reused
    // skiff/canoe/sailboat/ship so the whole fleet shares one tier scale.)
    const it = ITEMS[out];
    if (it) {
      it.boat = req;
      it.sailReq = scaleLevel(Math.min(99, req * 3));
      it.sailSpeed = Math.max(0.3, +(1.0 - req * 0.022).toFixed(3));
    }
    return { id, out, name, skill: "Shipwrighting", req, xp: 60 + req * 12, in: inp,
      tick: 2600 + req * 60, family, stations: ["shipyard", "workbench"] };
  });

  STATIONS.shipyard = { name: "Shipyard", spr: "workbench", action: "Build ship", lists: ["shipwrighting"], quality: 60 };
  STATIONS.workbench.lists.push("shipwrighting");

  Object.assign(PROD_SKILL_INTRO, {
    Shipwrighting: "Lay keels at a shipyard: plank hulls, caulk them with tarred oakum, fit iron, and rig them with Sailmaking's sails and Ropemaking's cordage. From rafts and coracles up to galleons and men-o'-war — the canoe, sailboat and ship you can sail are built here too, and every hull remembers its makers.",
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
