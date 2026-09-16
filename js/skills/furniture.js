// ===== Taiao — Carpentry furniture (placeable) =====
// Carpentry's boat work moved to Shipwrighting long ago, leaving the trade
// with three recipes. It is now the FURNITURE trade: every wooden furnishing
// that already exists as a world object (objects-data.js) is craftable,
// its inventory icon IS the in-game object (the sheet's south frame,
// registered here as icon sheet "ob"), and every piece can be placed in the
// world and picked back up (gameplay/placing.js). Vessels get the same
// `place`/`ride` treatment so boats live on the water as real objects.
// Loads after shipwrighting.js (vessel items must exist).
"use strict";

(function () {
  // ---- the objects sheet doubles as an icon source ----
  // frame = objIndex*8 + dirIndex; dir 0 is "south" (the natural icon view).
  // The "ob" sheet itself is registered later by sprites/object-icons-hook.js
  // (ASSET_DATA doesn't exist yet when this skill file runs).
  function objIcon(key) {
    const idx = typeof OBJ_MAP !== "undefined" ? OBJ_MAP[key] : null;
    if (idx == null) return null;
    const f = idx * 8; // south frame
    const sx = (f % OBJ_COLS) * OBJ_CELL, sy = Math.floor(f / OBJ_COLS) * OBJ_CELL;
    const spr = "fo_" + key;
    SPR[spr] = ["ob", 0, 0, { sx, sy, sw: OBJ_CELL, sh: OBJ_CELL }];
    return spr;
  }

  // ---- furniture roster: [id, name, objKey, req, inputs, examine] ----
  const F = [
    ["stool",          "Stool",            "stool",          1,  { planks: 1 },            "Three legs, no fuss."],
    ["birdhouse",      "Birdhouse",        "birdhouse",      2,  { planks: 1, logs: 1 },   "Every garden wants one."],
    ["bench",          "Trestle bench",    "bench_trestle",  3,  { planks: 2 },            "Seats the whole crew."],
    ["crate_box",      "Crate",            "crate",          5,  { planks: 2 },            "Holds anything but secrets."],
    ["wallshelf",      "Wall shelf",       "wallshelf",      6,  { planks: 2 },            "For things worth showing."],
    ["bed_frame",      "Bed frame",        "bed_frame",      9,  { planks: 3, rope: 1 },   "The mattress is someone else's trade."],
    ["small_bookshelf","Small bookshelf",  "bookshelf_small",10, { planks: 3 },            "Room for a modest library."],
    ["desk",           "Writing desk",     "desk",           12, { planks: 4 },            "Where letters and ledgers live."],
    ["storage_chest",  "Storage chest",    "chest_storage",  13, { planks: 3, iron_bar: 1 }, "A stout lid and sturdy hinges."],
    ["cradle",         "Cradle",           "cradle",         14, { planks: 3 },            "Rocks gently on curved feet."],
    ["dresser",        "Dresser",          "dresser",        15, { planks: 4 },            "Drawers that almost never stick."],
    ["cupboard",       "Cupboard",         "cupboard",       17, { planks: 4, boards: 2 }, "Deep shelves behind tidy doors."],
    ["bookshelf",      "Bookshelf",        "bookshelf",      18, { planks: 5 },            "A wall of stories."],
    ["easel",          "Easel",            "easel",          20, { planks: 2, logs: 1 },   "Awaiting a masterpiece."],
    ["sideboard",      "Sideboard",        "sideboard",      21, { planks: 5, boards: 2 }, "For the good crockery."],
    ["bed",            "Bed",              "bed",            23, { planks: 4, cloth: 2, rope: 1 }, "A proper night's sleep."],
    ["mirror_dresser", "Mirrored dresser", "dresser_mirror", 25, { planks: 5, boards: 2 }, "The glass came dear."],
    ["wardrobe",       "Wardrobe",         "wardrobe",       27, { planks: 6, boards: 2 }, "Tall enough for winter cloaks."],
    ["fourposter_bed", "Four-poster bed",  "bed_fourposter", 29, { planks: 8, cloth: 4, rope: 2 }, "Fit for a manor's best room."],
  ];
  RECIPES.carpentry = RECIPES.carpentry || [];
  for (const [id, name, objKey, req, inputs, exam] of F) {
    const spr = objIcon(objKey);
    if (!ITEMS[id]) {
      ITEMS[id] = { name, icon: spr || "i_chair", value: 15 + req * 14, finished: true, place: objKey };
      EXAMINE[id] = exam;
    } else {
      if (spr) ITEMS[id].icon = spr;
      ITEMS[id].place = objKey;
    }
    RECIPES.carpentry.push({
      id: "carp_" + id, out: id, name: `Build ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()}`,
      skill: "Carpentry", req, xp: 30 + req * 9, in: inputs,
      tick: 1800 + req * 30, family: "furniture", stations: ["workbench"],
    });
  }
  // the two originals join the family: object icons + placeable
  for (const [id, objKey] of [["chair", "chair"], ["table", "table2"]]) {
    const spr = objIcon(objKey);
    if (ITEMS[id]) { if (spr) ITEMS[id].icon = spr; ITEMS[id].place = objKey; }
  }
  // The later-loading icon-data files (item-icons-data.js et al) repoint any
  // item THEY know to their own art — including a few furniture ids. Record
  // the intended object-icons so object-icons-hook.js (which loads after
  // them all) can re-stamp: furniture must look like its world object.
  window.FURNITURE_OBJ_ICONS = {};
  for (const [id] of F) if (ITEMS[id] && String(ITEMS[id].icon).startsWith("fo_")) FURNITURE_OBJ_ICONS[id] = ITEMS[id].icon;
  for (const id of ["chair", "table"]) if (ITEMS[id] && String(ITEMS[id].icon).startsWith("fo_")) FURNITURE_OBJ_ICONS[id] = ITEMS[id].icon;

  // ---- oars: the small-craft propulsion (gameplay/placing.js canRowBoat) ----
  if (!ITEMS.oars) {
    ITEMS.oars = { name: "Oars", icon: objIcon("staves") || "i_planks", value: 40, tool: true };
    EXAMINE.oars = "A matched pair. The river argues less when you have these.";
    RECIPES.carpentry.push({
      id: "carp_oars", out: "oars", name: "Carve a pair of oars",
      skill: "Carpentry", req: 4, xp: 45, in: { planks: 2 },
      tick: 1800, family: "furniture", stations: ["workbench"],
    });
  }

  // ---- vessels become placeable, rideable world objects ----
  // ride: "oar" needs oars in the pack to steer (else the current decides);
  // "sail" steers itself. rideDur multiplies the water step time.
  const VESSELS = {
    raft: ["raft", "oar", 1.0], log_raft: ["raft_logs", "oar", 1.05], coracle: ["boat_coracle", "oar", 1.0],
    punt: ["raft_planks", "oar", 0.95], skiff: ["skiff", "oar", 0.85], rowboat: ["rowboat", "oar", 0.8],
    dinghy: ["boat_dinghy", "oar", 0.8], dory: ["boat_dory", "oar", 0.8], canoe: ["canoe", "oar", 0.85],
    catboat: ["boat_catboat", "sail", 0.7], fishing_smack: ["ship_smack", "sail", 0.7],
    sloop: ["ship_cutter", "sail", 0.65], barge: ["boat_barge", "oar", 1.1], cutter: ["ship_cutter", "sail", 0.6],
    ketch: ["ship_schooner", "sail", 0.6], sailboat: ["sailboat", "sail", 0.65], cog: ["ship_carrack", "sail", 0.7],
    longship: ["ship_longship", "sail", 0.55], junk: ["ship_junk", "sail", 0.6], caravel: ["ship_caravel", "sail", 0.55],
    schooner: ["ship_schooner", "sail", 0.5], carrack: ["ship_carrack", "sail", 0.55], brig: ["ship_brig", "sail", 0.5],
    brigantine: ["ship_brigantine", "sail", 0.5], galley: ["ship_galley", "sail", 0.5], barque: ["ship_barque", "sail", 0.45],
    galleon: ["ship_galleon", "sail", 0.5], ship: ["ship", "sail", 0.5], frigate: ["ship_frigate", "sail", 0.45],
    clipper: ["ship_clipper", "sail", 0.4], dhow: ["ship_dhow", "sail", 0.55], man_o_war: ["ship_manofwar", "sail", 0.5],
  };
  // Each hull exists under TWO ids: the Shipwrighting item keyed by the map's
  // alias (e.g. `log_raft`), and the legacy Carpentry `boat:` item keyed by the
  // OBJ_MAP object id (e.g. `raft_logs`, content.js). Both must become
  // placeable/rideable — the legacy `boat:` items are excluded from the generic
  // placeable pass below, so without this a crafted Log Raft (raft_logs) had no
  // .place/.ride and couldn't be launched onto water.
  for (const alias in VESSELS) {
    const [objKey, ride, rideDur] = VESSELS[alias];
    for (const id of [alias, objKey]) {
      const it = ITEMS[id];
      if (!it) continue;
      it.place = objKey;
      it.ride = ride;
      it.rideDur = rideDur;
    }
  }

  // ---- generic: any item that IS a world object becomes placeable ----
  // Coopering casks, pottery amphorae and urns, glassware, masonry statuary,
  // ropework mats… wherever a produced item's id matches an OBJ_MAP object
  // it can be set down in the world and picked back up. Ids rarely collide
  // across categories, so this stays naturally conservative; gear, tools
  // and consumables are excluded outright.
  const PLACE_ALIAS = { barrel_of_ale: "barrel_ale" };
  if (typeof OBJ_MAP !== "undefined")
    for (const id in ITEMS) {
      const d = ITEMS[id];
      if (d.place) continue;
      if (d.equip || d.tool || d.heals || d.potion || d.boat) continue;
      const key = PLACE_ALIAS[id] || (OBJ_MAP[id] != null ? id : null);
      if (key && OBJ_MAP[key] != null) d.place = key;
    }
})();
