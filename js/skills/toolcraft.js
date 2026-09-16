// ===== Taiao — Toolmaking · Locksmithing =====
// The finished-metalwork end of the metal branch.
//
//   Smelting bars + Sawing boards (handles) + Wire-drawing wire/springs
//     → Toolmaking   → axes, saws, chisels, farm tools (the tools you gather with)
//     → Locksmithing → keys, locks, mechanisms, strongboxes, clockwork
//
// Toolmaking finally lets a player forge their own axe/pickaxe/rod instead of
// only buying them from Sten, and gives bars + handles a sink. Locksmithing
// consumes Wire-drawing's `spring`s and Ropemaking's `cable`. Loaded after
// leathercraft.js, before market.js.
"use strict";

(function () {
  const CATS = { Toolmaking: "Metalworking", Locksmithing: "Metalworking" };
  for (const s in CATS) if (!SKILLS.includes(s)) SKILLS.push(s);
  Object.assign(SKILL_CATEGORY, CATS);
  Object.assign(RECIPE_VERB, { Toolmaking: "Forged", Locksmithing: "Fitted" });
  const MITHRIL = (typeof METALS !== "undefined" && (METALS.find(m => m.name === "Mithril") || {}).bar) || "iron_bar";

  let pi = 460;
  const mk = (id, name, base, extra, props, note) => {
    if (ITEMS[id]) return; // reuse existing tools (axe/pickaxe/fishing_rod/…)
    defineIcon("i_" + id, base, pi++, extra || "");
    ITEMS[id] = Object.assign({ name, icon: "i_" + id }, props);
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, note || "toolcraft good — tinted placeholder");
  };

  // ====================================================================
  // TOOLMAKING — tools from bars + wooden handles + wire
  // ====================================================================
  mk("tool_handle", "Tool handle", "i_logs", " brightness(1.1) saturate(0.6)", { stack: true, value: 5, prov: "batch" }, "tool handle — tinted placeholder");
  // [id, name, req, inputs, reuse?]  reuse tools keep their existing item (tool:"…")
  const TOOLS = [
    ["tool_handle_r", "tool_handle", 1, { boards: 1 }, "handle"], // (handled specially below)
    ["mallet",   "Mallet",       3,  { tool_handle: 1, boards: 1 }],
    ["hammer",   "Hammer",       2,  { iron_bar: 1, tool_handle: 1 }],
    ["knife",    "Knife",        2,  { iron_bar: 1, tool_handle: 1 }],
    // (generic "axe"/"pickaxe" removed — the tiered axe_iron/pickaxe_iron… (geartiers.js,
    //  also forged via Toolmaking) supersede them. Old saves fold axe→axe_iron etc.)
    ["awl",      "Awl",          4,  { iron_bar: 1, tool_handle: 1 }],
    ["chisel",   "Chisel",       5,  { iron_bar: 1, tool_handle: 1 }],
    ["fishing_rod","Fishing rod", 5,  { tool_handle: 2, iron_wire: 1 }],
    ["whetstone","Whetstone",    5,  { building_stone: 1 }],
    ["file",     "File",         6,  { iron_bar: 1 }],
    ["shovel",   "Shovel",       6,  { iron_bar: 1, tool_handle: 1 }],
    ["trowel",   "Trowel",       6,  { iron_bar: 1, tool_handle: 1 }],
    ["saw",      "Saw",          7,  { iron_bar: 2, tool_handle: 1 }],
    ["hoe",      "Hoe",          7,  { iron_bar: 1, tool_handle: 1 }],
    ["shears",   "Shears",       8,  { iron_bar: 1, tool_handle: 1 }],
    ["sickle",   "Sickle",       8,  { iron_bar: 1, tool_handle: 1 }],
    ["tongs",    "Tongs",        9,  { iron_bar: 2 }],
    ["rake",     "Rake",         9,  { iron_bar: 1, tool_handle: 1 }],
    ["pliers",   "Pliers",       10, { iron_bar: 1, iron_wire: 1 }],
    ["plane",    "Plane",        11, { iron_bar: 1, boards: 1 }],
    ["scythe",   "Scythe",       12, { iron_bar: 2, tool_handle: 1 }],
    ["adze",     "Adze",         12, { iron_bar: 2, tool_handle: 1 }],
    ["hand_drill","Hand drill",  13, { iron_bar: 1, tool_handle: 1, iron_wire: 1 }],
    ["lobster_cage","Lobster cage",13,{ iron_wire: 4 }],
    ["mattock",  "Mattock",      14, { iron_bar: 2, tool_handle: 1 }],
    ["harpoon",  "Harpoon",      14, { iron_bar: 2, tool_handle: 1 }],
    ["crowbar",  "Crowbar",      15, { iron_bar: 2 }],
    ["wrench",   "Wrench",       16, { iron_bar: 2 }],
    ["vice",     "Vice",         18, { iron_bar: 3, iron_wire: 1 }],
    ["toolbox",  "Toolbox",      20, { boards: 4, iron_bar: 1, tool_handle: 1 }],
    ["master_tools","Master's tool set",32,{ [MITHRIL]: 2, tool_handle: 2, fine_gold: 1 }],
  ];
  RECIPES.toolmaking = [];
  for (const [id, name, req, inp] of TOOLS) {
    if (id === "tool_handle_r") { // the handle-making recipe
      RECIPES.toolmaking.push({ id: "make_tool_handle", out: "tool_handle", qty: 2, name: "Shape tool handles", skill: "Toolmaking", req: 1, xp: 14, in: inp, tick: 1300, family: "handles", stations: ["toolsmith", "workbench", "anvil"] });
      continue;
    }
    // toolTier (= Toolmaking level) drives how much this tool helps its trade:
    // craft quality (production.js) or gather speed (gathering.js).
    if (!ITEMS[id]) mk(id, name, "i_pick", ` hue-rotate(${(req * 23) % 360}deg) saturate(0.9) brightness(1.05)`, { value: 20 + req * 6, tool: id, toolTier: req }, "tool — tinted placeholder");
    else if (ITEMS[id].toolTier == null) ITEMS[id].toolTier = req;
    RECIPES.toolmaking.push({ id: "forge_" + id, out: id, name: "Forge " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Toolmaking", req, xp: 22 + req * 4, in: inp, tick: 1700 + req * 30, family: /axe|pick|saw|chisel|plane|adze|drill|file/.test(id) ? "craft_tools" : "tools", stations: ["toolsmith", "anvil", "workbench"] });
  }

  // ====================================================================
  // LOCKSMITHING — keys, locks, mechanisms, strongboxes, clockwork
  // ====================================================================
  // [id, name, req, inputs, stack?]  all finished (metal hardware trade goods)
  const LOCKS = [
    ["key",           "Key",             1,  { iron_wire: 1 }, 1],
    ["hinge",         "Hinge",           2,  { iron_bar: 1 }, 1],
    ["keyring",       "Keyring",         2,  { iron_wire: 1 }, 1],
    ["latch",         "Latch",           3,  { iron_bar: 1 }, 1],
    ["bolt_lock",     "Bolt lock",       4,  { iron_bar: 1 }, 1],
    ["hasp",          "Hasp",            4,  { iron_bar: 1 }, 1],
    ["mechanism",     "Lock mechanism",  6,  { spring: 1, iron_wire: 1, iron_bar: 1 }, 1],
    ["birdcage_lock", "Cage lock",       6,  { iron_wire: 2, mechanism: 1 }, 1],
    ["padlock",       "Padlock",         7,  { mechanism: 1, iron_bar: 1 }, 1],
    ["manacles",      "Manacles",        8,  { iron_bar: 2, mechanism: 1 }, 0],
    ["door_lock",     "Door lock",       9,  { mechanism: 1, iron_bar: 2 }, 1],
    ["shackles",      "Shackles",        9,  { iron_bar: 3, mechanism: 1 }, 0],
    ["chest_lock",    "Chest lock",      10, { mechanism: 1, iron_bar: 1 }, 1],
    ["lockbox",       "Lockbox",         11, { boards: 3, chest_lock: 1, iron_bar: 1 }, 0],
    ["warded_lock",   "Warded lock",     12, { mechanism: 1, iron_bar: 2 }, 1],
    ["jewelry_box",   "Jewellery box",   13, { boards: 2, leather: 1, chest_lock: 1, fine_gold: 1 }, 0],
    ["tumbler_lock",  "Tumbler lock",    14, { mechanism: 2, iron_bar: 2 }, 1],
    ["skeleton_key",  "Skeleton key",    15, { fine_wire: 1, iron_bar: 1 }, 1],
    ["strongbox",     "Strongbox",       15, { boards: 4, iron_bar: 3, warded_lock: 1 }, 0],
    ["mantrap",       "Mantrap",         16, { iron_bar: 3, spring: 2, mechanism: 1 }, 0],
    ["gate_lock",     "Gate lock",       17, { mechanism: 1, iron_bar: 3 }, 1],
    ["combination_lock","Combination lock",18,{ mechanism: 2, fine_wire: 1, iron_bar: 2 }, 1],
    ["music_box",     "Music box",       20, { mechanism: 2, boards: 2, fine_wire: 2 }, 0],
    ["warded_chest",  "Warded chest",    21, { boards: 5, warded_lock: 1, iron_bar: 2 }, 0],
    ["safe",          "Safe",            22, { iron_bar: 6, tumbler_lock: 1, mechanism: 1 }, 0],
    ["puzzle_lock",   "Puzzle lock",     23, { mechanism: 2, fine_wire: 2 }, 1],
    ["clockwork",     "Clockwork movement",24,{ mechanism: 3, fine_wire: 2, gold_wire: 1 }, 0],
    ["masterkey",     "Master key",      25, { fine_wire: 2, gold_wire: 1 }, 1],
    ["portcullis_winch","Portcullis winch",26,{ iron_bar: 6, mechanism: 2, cable: 1 }, 0],
    ["treasure_chest","Treasure chest",  27, { boards: 6, tumbler_lock: 1, fine_gold: 2, cut_gem: 1 }, 0],
    ["vault_lock",    "Vault lock",      28, { mechanism: 3, fine_gold: 1, iron_bar: 4 }, 1],
    ["grand_vault",   "Grand vault",     32, { iron_bar: 10, vault_lock: 1, mechanism: 3, gold_wire: 2 }, 0],
  ];
  RECIPES.locksmithing = LOCKS.map(([id, name, req, inp, stack]) => {
    mk(id, name, /box|chest|safe|vault|music/.test(id) ? "i_planks" : "i_bar_fe", ` hue-rotate(${(req * 13) % 60 - 20}deg) saturate(0.7) brightness(${1 - req * 0.004})`,
      stack ? { name, stack: true, value: 20 + req * 6, finished: true } : { name, value: 60 + req * 20, finished: true }, "lockwork — tinted placeholder");
    return { id: "lock_" + id, out: id, name: "Fit " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Locksmithing", req, xp: 24 + req * 5, in: inp, tick: 1800 + req * 40, family: /box|chest|safe|vault/.test(id) ? "strongboxes" : /clock|music|puzzle|combination/.test(id) ? "clockwork" : "locks", stations: ["locksmith_bench", "anvil", "workbench"] };
  });

  // ---------- workstations ----------
  Object.assign(STATIONS, {
    toolsmith:       { name: "Toolsmith",        spr: "anvil", action: "Forge tool", lists: ["toolmaking"], quality: 60 },
    locksmith_bench: { name: "Locksmith's bench", spr: "workbench", action: "Fit lock", lists: ["locksmithing"], quality: 60 },
  });
  STATIONS.anvil.lists.push("toolmaking", "locksmithing");
  STATIONS.workbench.lists.push("toolmaking");

  Object.assign(PROD_SKILL_INTRO, {
    Toolmaking: "Forge tools from bars and turned wooden handles — the very axes, pickaxes, saws, sickles, shears and fishing rods that every other trade relies on. Carry the right hand tool for a craft (a hammer for smithing, a saw for carpentry, an awl for leather…) and the QUALITY of what you make rises; field tools like the mattock and sickle speed your gathering. Better tools help more, and the Master's tool set lifts every craft.",
    Locksmithing: "Fit springs and wire into lock mechanisms, then keys, padlocks, warded and tumbler locks, strongboxes, safes and delicate clockwork — the ironmonger's precision craft.",
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
