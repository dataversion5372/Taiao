// ===== Taiao — Rubbermaking =====
// A new gather+craft trade. Rubber trees grow in the wet tropics (jungle,
// swamp, wetland); you TAP them for raw latex (the gather half of the skill),
// then cure the latex into rubber and work it into goods at a curing shed.
// The first finished good is the snorkel mouthpiece, which Glassblowing then
// fits to its blown-glass snorkel (see potteryglass.js). Loaded right after
// ropemaking.js (needs economy.js's SKILL_CATEGORY / RECIPE_VERB /
// PROD_SKILL_INTRO / registerPlaceholder, and content.js's defineIcon).
"use strict";

(function () {
  if (!SKILLS.includes("Rubbermaking")) SKILLS.push("Rubbermaking");
  SKILL_CATEGORY.Rubbermaking = "Textiles & Leather";
  RECIPE_VERB.Rubbermaking = "Cured";

  // ---------- items ----------
  // hero items (latex / rubber / snorkel_mouthpiece) get real PixelLab art from
  // js/sprites/rubber-icons-data.js, which repoints these icons after load; the
  // tinted placeholders here keep the game working before/without that sheet.
  let ri = 300;
  const pico = (key, base, extra) => defineIcon(key, base, ri++, extra || "");
  const NAMES = {
    latex: "Latex", rubber: "Rubber", hard_rubber: "Hard rubber", rubber_tubing: "Rubber tubing",
    rubber_bands: "Rubber bands", eraser: "Eraser", rubber_seal: "Rubber seal",
    snorkel_mouthpiece: "Snorkel mouthpiece", rubber_gloves: "Rubber gloves",
    rubber_boots: "Rubber boots", gasket_set: "Gasket set",
    slingshot: "Slingshot", sling_shot: "Rubber shot", rebreather: "Rubber rebreather",
  };
  // multi-slot presets (EQUIP_SLOTS, main/state.js) — mirror outfit-items.js
  const FEET = ["left_foot", "right_foot"], HANDS = ["left_hand", "right_hand"];
  // kind: c=commodity (stackable, consumed downstream)  f=finished good (sellable)
  const mkItem = (id, kind, base, tint, value) => {
    if (ITEMS[id]) return;
    const name = NAMES[id] || id;
    pico("i_" + id, base, tint);
    ITEMS[id] = kind === "c"
      ? { name, icon: "i_" + id, stack: true, value, prov: "batch" }
      : { name, icon: "i_" + id, stack: true, value, finished: true };
    registerPlaceholder(id, name, "rubbermaking good — tinted placeholder");
  };
  mkItem("latex",       "c", "i_vial",    " brightness(1.6) saturate(0.15)", 6);
  mkItem("rubber",      "c", "i_leather", " brightness(0.42) saturate(0.35)", 18);
  mkItem("hard_rubber", "c", "i_leather", " brightness(0.28) saturate(0.25)", 44);
  mkItem("rubber_tubing","c","i_leather", " brightness(0.5) saturate(0.3)", 30);
  mkItem("rubber_bands","f", "i_leather", " brightness(0.55) saturate(0.5)", 12);
  mkItem("eraser",      "f", "i_leather", " brightness(0.7) saturate(0.6) hue-rotate(300deg)", 16);
  mkItem("rubber_seal", "c", "i_leather", " brightness(0.45) saturate(0.3)", 22);
  mkItem("snorkel_mouthpiece", "c", "i_leather", " brightness(0.38) saturate(0.3)", 48);
  mkItem("sling_shot",  "c", "i_leather", " brightness(0.5) saturate(0.4)", 3);
  mkItem("gasket_set",  "f", "i_leather", " brightness(0.46) saturate(0.3)", 120);
  // sling_shot is quiver ammo for the slingshot (an Archery-style ranged weapon)
  ITEMS.sling_shot.arrowPower = 3;
  ITEMS.sling_shot.equip = "quiver";

  // ---- worn rubber gear (equippable; mirrors leathercraft's slot-array + block) ----
  // A dedicated maker so these are real armour, not stackable flavour. wearReq
  // gates them on Defence like the leather set (they ARE light armour); the
  // rebreather is utility (wearReq 0) so market.js won't stamp it a Defence gate.
  const mkWorn = (id, base, tint, def) => {
    if (ITEMS[id]) return;
    pico("i_" + id, base, tint);
    ITEMS[id] = Object.assign({ name: NAMES[id] || id, icon: "i_" + id }, def);
    registerPlaceholder(id, NAMES[id] || id, "rubbermaking gear — tinted placeholder");
  };
  mkWorn("rubber_boots", "i_leather", " brightness(0.4) saturate(0.3)",
    { value: 84, equip: FEET, block: 0.03, wearReq: 6, diveReach: 0.15 });     // waders: wade deeper
  mkWorn("rubber_gloves", "i_leather", " brightness(0.5) saturate(0.35)",
    { value: 60, equip: HANDS, block: 0.02, wearReq: 4 });
  mkWorn("rebreather", "i_vial", " brightness(0.5) saturate(0.4) hue-rotate(160deg)",
    { value: 240, equip: "cape", wearReq: 0, diveReach: 0.5, diveDrain: 0.3, diveAir: 12 });
  // slingshot — an Archery-style ranged weapon (bowPower → combatStyle "archery")
  mkWorn("slingshot", "i_bow", " brightness(0.55) saturate(0.5)",
    { value: 80, equip: "weapon", bowPower: 2, rangeReq: 1, range: 9, atkTick: 1150 });

  Object.assign(EXAMINE, {
    latex: "Milky sap tapped from a rubber tree. Cure it and it becomes rubber.",
    rubber: "A springy slab of cured rubber — waterproof and airtight. Work it into seals, tubing and mouthpieces.",
    hard_rubber: "Rubber cured long and hard into ebonite — rigid, black and tough.",
    rubber_tubing: "A coil of flexible rubber tubing.",
    rubber_bands: "A handful of stretchy rubber bands.",
    eraser: "A soft block of rubber for rubbing out marks.",
    rubber_seal: "A rubber gasket that keeps water and air where they belong.",
    snorkel_mouthpiece: "A moulded rubber mouthpiece. Fit it to a blown-glass snorkel and it's far kinder on the teeth.",
    rubber_gloves: "Waterproof rubber gloves — light protection, sure grip.",
    rubber_boots: "Tall rubber waders. Worn on the feet, they keep you dry and let you wade a touch deeper before the water reaches your mouth.",
    gasket_set: "A full set of rubber gaskets for the finest watertight work.",
    sling_shot: "A pouch of hard rubber shot — ammunition for a slingshot. Load it in your quiver.",
    slingshot: "A forked slingshot strung with a thick rubber band. A quick, short-range ranged weapon; fire rubber shot with Archery.",
    rebreather: "A rubber breathing bag and tubing worn on the back. Far better than a snorkel — it holds a big reserve of air, so you can stay under much longer.",
  });

  // ---------- the rubber tree: a tappable world node (the gather half) ----------
  // Rendered 8-directional via the packed object `tree_rubber` (render3d.js
  // objForKey generic branch); SPR.tree_rubber is the flat atlas fallback used
  // only in the brief window before the object texture loads. It is TAPPED, not
  // chopped — no axe needed — and yields latex. A low deplete chance makes the
  // cup run dry now and then, refilling on the node respawn curve; the tree
  // stays standing the whole time (deadSpr is the tree itself, never a stump).
  const TREE_BIOMES = [B.JUNGLE, B.SWAMP, B.WETLAND];
  SPR.tree_rubber = ["i", 2, 2, { filter: "hue-rotate(20deg) saturate(1.15) brightness(0.95)" }];
  NODE_TYPES.rubbertree = {
    name: "Rubber tree", spr: "tree_rubber", skill: "Rubbermaking", gatherVerb: "Tap",
    req: 1, xp: 22, item: "latex", tick: 1600, depleteCh: 0.15,
    respawn: respawnFor(6), deadSpr: "tree_rubber", biomes: TREE_BIOMES,
  };
  // Biome-blended picker for world/chunks.js's vegetation scatter: in a matching
  // wet-tropic biome there's a chance to grow a rubber tree instead of the usual
  // fantasy tier tree, so rubber trees are mixed into (not swapped for) the jungle.
  if (typeof window !== "undefined") window.__RUBBER_TREE_BIOMES = TREE_BIOMES;
  globalThis.rubberTreeNode = function (biomeId, rng) {
    if (!TREE_BIOMES.includes(biomeId)) return null;
    return rng() < 0.35 ? "rubbertree" : null;
  };

  // ---------- recipes (the craft half) ----------
  // [recipeId, out, displayName, family, req, inputs, outQty]
  const R = [
    ["cure_latex",        "rubber",             "Cure latex into rubber",   "rubber", 1,  { latex: 3 },               2],
    ["make_rubber_bands", "rubber_bands",       "Cut rubber bands",         "goods",  1,  { rubber: 1 },              3],
    ["make_eraser",       "eraser",             "Mould an eraser",          "goods",  2,  { rubber: 1 },              2],
    ["make_rubber_seal",  "rubber_seal",        "Mould rubber seals",       "goods",  3,  { rubber: 1 },              2],
    ["make_snorkel_mouthpiece", "snorkel_mouthpiece", "Mould a snorkel mouthpiece", "diving", 4, { rubber: 1 }, 1],
    ["make_rubber_tubing","rubber_tubing",      "Extrude rubber tubing",    "goods",  6,  { rubber: 2 },              1],
    ["make_rubber_gloves","rubber_gloves",      "Dip rubber gloves",        "goods",  8,  { rubber: 2 },              1],
    ["cure_hard_rubber",  "hard_rubber",        "Cure hard rubber",         "rubber", 12, { rubber: 3 },              1],
    ["make_rubber_boots", "rubber_boots",       "Mould rubber waders",      "goods",  16, { rubber: 3, hard_rubber: 1 }, 1],
    ["make_gasket_set",   "gasket_set",         "Fit a gasket set",         "diving", 24, { rubber: 2, hard_rubber: 2 }, 1],
    // ---- weapon: the slingshot + its rubber shot ----
    ["make_rubber_shot",  "sling_shot",         "Roll rubber shot",         "weapon", 3,  { rubber: 1 },              10],
    ["make_slingshot",    "slingshot",          "Fit a slingshot",          "weapon", 5,  { rubber: 2, boards: 1 },   1],
    // ---- diving: the rebreather (deeper/longer than a snorkel) ----
    ["make_rebreather",   "rebreather",         "Build a rubber rebreather","diving", 18, { rubber: 3, hard_rubber: 1, rubber_tubing: 1, glass: 1 }, 1],
  ];
  RECIPES.rubbermaking = R.map(([id, out, name, family, req, inp, qty]) => ({
    id, out, qty, name, skill: "Rubbermaking", req, xp: 20 + req * 4, in: inp,
    tick: 1500 + req * 25, family, stations: ["curing_shed"],
  }));

  // ---------- workstation ----------
  // A dedicated specialist so one-skill-per-station.js makes it the canonical
  // (and only) home for rubbermaking. Reuses the tanning-rack sprite/icon
  // (racks of curing rubber sheets) — no new object art needed.
  // (Its world-map marker is registered in gameplay/world.js STATION_ICON, and
  // it's added to CITY_ARTISANS in world/features.js so it spawns in cities.)
  STATIONS.curing_shed = { name: "Curing shed", spr: "tanrack", action: "Cure rubber", lists: ["rubbermaking"], quality: 58 };

  Object.assign(PROD_SKILL_INTRO, {
    Rubbermaking: "Tap rubber trees in the wet tropics for raw latex, cure it into springy waterproof rubber at a curing shed, and work that into seals, tubing, gaskets, waders and gloves, the mouthpiece for a glassblower's snorkel, a diving rebreather that keeps you under far longer, and a slingshot (with rubber shot) for a quick ranged weapon.",
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
