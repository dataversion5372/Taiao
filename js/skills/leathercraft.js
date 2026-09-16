// ===== Taiao — Leatherworking · Cordwaining · Saddlery =====
// Deepens the hide branch downstream of Tanning.
//
//   Husbandry hides → Tanning → leather ─┬─ Leatherworking → belts, bags, armour
//                                        ├─ Cordwaining    → shoes & boots
//                                        └─ Saddlery       → saddles, tack, harness
//
// Leatherworking also makes the shared sub-materials `waxed_thread` (linen thread
// + beeswax) and `dyed_leather` (leather + dye) that the cobbler and saddler
// stitch with — pulling in Spinning, Husbandry, Dyeing, Wire-drawing (hobnail
// tacks), Smelting (iron fittings), Textiles (felt padding) and Assaying (luxury
// gold/gems). Loaded in the early data group after metalcraft.js.
"use strict";

(function () {
  const CATS = { Leatherworking: "Textiles & Leather", Cordwaining: "Textiles & Leather", Saddlery: "Textiles & Leather" };
  for (const s in CATS) if (!SKILLS.includes(s)) SKILLS.push(s);
  Object.assign(SKILL_CATEGORY, CATS);
  Object.assign(RECIPE_VERB, { Leatherworking: "Stitched", Cordwaining: "Cobbled", Saddlery: "Saddled" });
  const THREAD = "yarn_" + ((Object.values(CROPS).find(c => c.name === "flax") || {}).item || "");
  const LINEN_THREAD = ITEMS[THREAD] ? THREAD : "wool_yarn";

  let pi = 420;
  const mk = (id, name, base, extra, props, note) => {
    if (ITEMS[id]) return;
    defineIcon("i_" + id, base, pi++, extra || "");
    ITEMS[id] = Object.assign({ name, icon: "i_" + id }, props);
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, note || "leather good — tinted placeholder");
  };
  // build inputs from a flag string: t=waxed thread d=dyed leather f=felt pad
  // i=iron fitting k=tacks g=gold+gem luxury w=boards r=rope
  const inputs = (req, flags) => {
    const inp = { leather: 1 + Math.floor(req / 8) };
    if (flags.includes("t")) inp.waxed_thread = 1;
    if (flags.includes("d")) inp.dyed_leather = 1;
    if (flags.includes("f")) inp.fulled_8 = 1;
    if (flags.includes("i")) inp.iron_bar = 1;
    if (flags.includes("k")) inp.tacks = 1;
    if (flags.includes("g")) { inp.fine_gold = 1; inp.cut_gem = 1; }
    if (flags.includes("w")) inp.boards = 1;
    if (flags.includes("r")) inp.rope = 1;
    return inp;
  };

  // ====================================================================
  // LEATHERWORKING — worked leather goods + light armour
  // ====================================================================
  mk("waxed_thread", "Waxed thread", "i_shafts", " sepia(0.7) brightness(0.9)", { stack: true, value: 8, prov: "batch" }, "waxed thread — tinted placeholder");
  mk("dyed_leather", "Dyed leather", "i_leather", " hue-rotate(-20deg) saturate(1.5)", { stack: true, value: 26, prov: "batch" }, "dyed leather — tinted placeholder");
  // Worn leather ARMOUR is no longer a handful of one-off curated pieces here —
  // it's a full 5-piece set per leather TIER, generated below (see "TIERED
  // LEATHER ARMOUR"). This list keeps only the worked leather TRADE GOODS
  // (straps, belts, bags, pouches, sheaths, cases, musical/tool leather…).
  // [id, name, req, flags, null]  (block/slots stay null: goods, not armour)
  const LW = [
    ["strap",         "Leather strap",    1,  "",   null],
    ["belt",          "Leather belt",     2,  "i",  null],
    ["pouch",         "Leather pouch",    3,  "t",  null],
    ["sheath",        "Knife sheath",     4,  "t",  null],
    ["coin_purse",    "Coin purse",       4,  "t",  null],
    ["waterskin",     "Waterskin",        5,  "t",  null],
    ["scabbard",      "Scabbard",         6,  "ti", null],
    ["satchel",       "Satchel",          7,  "t",  null],
    ["quiver",        "Quiver",           9,  "t",  null],
    ["book_cover",    "Leather book cover",9, "td", null],
    ["apron",         "Leather apron",    6,  "t",  null],
    ["backpack",      "Backpack",         11, "ti", null],
    ["tool_roll",     "Tool roll",        8,  "t",  null],
    ["holster",       "Holster",          10, "t",  null],
    ["map_case",      "Map case",         12, "td", null],
    ["flask_jack",    "Leather jack",     11, "tw", null],
    ["bellows",       "Bellows",          13, "tw", null],
    ["leather_drum",  "Leather drum",     15, "tw", null],
    ["fine_pouch",    "Fine dyed pouch",  19, "td", null],
    ["tooled_belt",   "Tooled belt",      22, "tdi",null],
    ["embossed_case", "Embossed case",    24, "tdg",null],
  ];
  RECIPES.leatherworking = [
    { id: "wax_thread", out: "waxed_thread", qty: 2, name: "Wax stitching thread", skill: "Leatherworking", req: 1, xp: 16, in: { [LINEN_THREAD]: 1, beeswax: 1 }, tick: 1300, family: "materials", stations: ["leather_bench", "tanrack", "workbench"] },
    { id: "dye_leather", out: "dyed_leather", qty: 2, name: "Dye leather", skill: "Leatherworking", req: 6, xp: 34, in: { leather: 2, woad_dye: 1 }, tick: 1500, family: "materials", stations: ["leather_bench", "tanrack"] },
  ];
  for (const [id, name, req, flags, block, slots] of LW) {
    if (!ITEMS[id]) {
      const isBag = /pouch|purse|satchel|backpack|holster|case|quiver|tool_roll|waterskin|flask/.test(id);
      // The crafted "Quiver" good here is a decorative container, not the
      // mechanical quiver slot — that's populated by arrows themselves
      // (equip:"quiver" on the arrow items, content.js/geartiers.js), so
      // this stays a plain sellable trade good like the other bags/pouches.
      mk(id, name, block != null ? "i_body" : isBag ? "i_leather" : "i_leather", ` hue-rotate(${(req * 11) % 40 - 15}deg) saturate(1.1) brightness(${1 - req * 0.004})`,
        block != null ? { value: 60 + req * 14, equip: slots || "torso", block } : { value: 30 + req * 8, finished: true }, "leather good — tinted placeholder");
    } else if (!ITEMS[id].equip && !ITEMS[id].finished) ITEMS[id].finished = true;
    RECIPES.leatherworking.push({ id: "lw_" + id, out: id, name: "Stitch " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Leatherworking", req, xp: 24 + req * 4, in: inputs(req, flags), tick: 1700 + req * 30,
      family: block != null ? "leather_armour" : "leather_goods", stations: ["leather_bench", "tanrack", "workbench"] });
  }

  // book_cover feeds Bookbinding — a stackable component, not a one-off good
  if (ITEMS.book_cover) ITEMS.book_cover.stack = true;

  // ====================================================================
  // TIERED LEATHER ARMOUR — a full 5-piece set for EACH of the 32 leather
  // tiers (Rabbit fur → Leviathan hide, from content.js/HIDES). One tier per
  // level: leather tier i unlocks its whole set at level i+1, so the 32 sets
  // fill Leatherworking levels 1..32 (MAX_LEVEL). Each piece covers a distinct
  // anatomical slot span, so an entire set is worn at once (feet stay with
  // Cordwaining boots). Mirrors the metal-armour generator in geartiers.js:
  // each piece's block = a light-armour totalBlock curve × the piece's share.
  // ====================================================================
  // [kind, label, block share of the set, leather qty, waxed-thread qty, slots]
  const LEATHER_SET = [
    ["coif",    "coif",    0.16, 1, 1, ["hair", "face", "back_of_head"]],
    ["body",    "body",    0.40, 3, 2, ["torso", "pauldron1", "pauldron2", "left_arm", "right_arm"]],
    ["chaps",   "chaps",   0.24, 2, 1, ["left_leg", "right_leg"]],
    ["gloves",  "gloves",  0.10, 1, 1, ["left_hand", "right_hand"]],
    ["bracers", "bracers", 0.10, 1, 1, ["bracelet1", "bracelet2"]],
  ];
  for (let i = 0; i < 32; i++) {
    const leatherId = i === 4 ? "leather" : "leather_" + i;
    const leatherDef = ITEMS[leatherId];
    if (!leatherDef) continue;
    const lname = leatherDef.name;                 // e.g. "Rabbit leather"
    const req = i + 1, p = req - 1;
    const totalBlock = 0.03 + p * 0.009;           // lighter than metal plate (0.04 + p*0.011)
    for (const [kind, label, share, lqty, tqty, slots] of LEATHER_SET) {
      const id = `${kind}_${leatherId}`;
      const name = `${lname} ${label}`;            // "Rabbit leather body"
      const iconKey = "i_" + id;
      defineIcon(iconKey, kind === "body" ? "i_body" : "i_leather", pi++,
        ` hue-rotate(${(i * 11) % 60 - 25}deg) saturate(1.1) brightness(${1 - p * 0.006})`);
      const block = Math.round(totalBlock * share * 1000) / 1000;
      if (!ITEMS[id]) {
        ITEMS[id] = { name, icon: iconKey, value: 20 + Math.round(tierVal(p) * 2.0), equip: slots, block, wearReq: req };
        EXAMINE[id] = `${name} — part of a full leather armour set.`;
        registerPlaceholder(id, name, "leather armour — tinted placeholder");
      }
      RECIPES.leatherworking.push({
        id: "lw_" + id, out: id,
        name: `Stitch ${/^[aeiou]/i.test(lname) ? "an" : "a"} ${name.toLowerCase()}`,
        skill: "Leatherworking", req, xp: tierXp(p, 34),
        in: { [leatherId]: lqty, waxed_thread: tqty },
        tick: 1700 + req * 30, family: "leather_armour",
        stations: ["leather_bench", "tanrack", "workbench"],
      });
    }
  }

  // ====================================================================
  // CORDWAINING — footwear (finished trade goods)
  // ====================================================================
  const CW = [
    ["sandals", "Sandals", 1, "t"], ["slippers", "Slippers", 2, "t"], ["moccasins", "Moccasins", 3, "t"],
    ["clogs", "Clogs", 3, "tw"], ["espadrilles", "Espadrilles", 4, "tr"], ["shoes", "Shoes", 5, "t"],
    ["buskins", "Buskins", 6, "t"], ["brogues", "Brogues", 7, "tk"], ["ankle_boots", "Ankle boots", 8, "tk"],
    ["work_boots", "Work boots", 9, "tki"], ["walking_boots", "Walking boots", 10, "tk"], ["court_shoes", "Court shoes", 11, "td"],
    ["hobnail_boots", "Hobnail boots", 12, "tki"], ["riding_boots", "Riding boots", 13, "tki"], ["dancing_shoes", "Dancing shoes", 12, "td"],
    ["thigh_boots", "Thigh boots", 15, "tki"], ["sea_boots", "Sea boots", 14, "tki"], ["snow_boots", "Snow boots", 16, "tkf"],
    ["hunting_boots", "Hunting boots", 17, "tki"], ["marching_boots", "Marching boots", 18, "tki"], ["jester_shoes", "Jester's shoes", 14, "td"],
    ["noble_shoes", "Noble shoes", 19, "tdi"], ["cavalier_boots", "Cavalier boots", 20, "tdi"], ["knee_boots", "Knee boots", 21, "tki"],
    ["ranger_boots", "Ranger boots", 22, "tki"], ["fur_boots", "Fur-lined boots", 23, "tkf"], ["dress_boots", "Dress boots", 24, "tdi"],
    ["riding_tall_boots", "Tall riding boots", 26, "tdi"], ["ceremonial_shoes", "Ceremonial shoes", 27, "tdg"],
    ["courtly_boots", "Courtly boots", 29, "tdig"], ["royal_slippers", "Royal slippers", 30, "tdg"], ["master_boots", "Master's boots", 32, "tdkig"],
  ];
  RECIPES.cordwaining = CW.map(([id, name, req, flags]) => {
    mk(id, name, "i_leather", ` hue-rotate(${(req * 17) % 50 - 20}deg) sepia(0.3) brightness(${1 - req * 0.004})`, { value: 40 + req * 10, finished: true }, "footwear — tinted placeholder");
    return { id: "cw_" + id, out: id, name: "Cobble " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Cordwaining", req, xp: 26 + req * 4, in: inputs(req, flags), tick: 1900 + req * 30, family: /boots/.test(id) ? "boots" : "shoes", stations: ["cobblers_bench", "leather_bench", "tanrack"] };
  });

  // ====================================================================
  // SADDLERY — saddles, tack & harness (finished trade goods)
  // ====================================================================
  const SD = [
    ["halter_leather", "Leather halter", 1, "ti"], ["lead_rein", "Lead rein", 2, "tr"], ["reins", "Reins", 3, "ti"],
    ["bridle", "Bridle", 5, "ti"], ["girth", "Saddle girth", 4, "t"], ["stirrup_leathers", "Stirrup leathers", 6, "ti"],
    ["saddle_blanket", "Saddle blanket", 5, "tf"], ["saddlebag", "Saddlebag", 7, "t"], ["crupper", "Crupper", 8, "ti"],
    ["breastplate_horse", "Horse breastplate", 9, "ti"], ["martingale", "Martingale", 10, "ti"], ["harness", "Draft harness", 11, "tir"],
    ["pack_saddle", "Pack saddle", 12, "tif"], ["riding_saddle", "Riding saddle", 13, "tif"], ["collar", "Horse collar", 10, "tif"],
    ["cart_harness", "Cart harness", 14, "tir"], ["plough_harness", "Plough harness", 15, "tir"], ["hunting_saddle", "Hunting saddle", 16, "tif"],
    ["side_saddle", "Side saddle", 18, "tidf"], ["cavalry_saddle", "Cavalry saddle", 19, "tif"], ["war_saddle", "War saddle", 20, "tifd"],
    ["barding", "Leather barding", 21, "tif"], ["racing_saddle", "Racing saddle", 22, "tif"], ["dressage_saddle", "Dressage saddle", 24, "tidf"],
    ["caparison", "Caparison", 23, "tdf"], ["parade_harness", "Parade harness", 25, "tidg"], ["jousting_saddle", "Jousting saddle", 26, "tifg"],
    ["gilded_bridle", "Gilded bridle", 27, "tidg"], ["royal_saddle", "Royal saddle", 29, "tidfg"], ["ceremonial_barding", "Ceremonial barding", 30, "tidg"],
    ["state_harness", "State harness", 31, "tidg"], ["master_saddle", "Master's saddle", 32, "tidfg"],
  ];
  RECIPES.saddlery = SD.map(([id, name, req, flags]) => {
    mk(id, name, "i_leather", ` hue-rotate(${(req * 13) % 45 - 18}deg) sepia(0.5) brightness(${1 - req * 0.004})`, { value: 60 + req * 16, finished: true }, "tack — tinted placeholder");
    return { id: "sd_" + id, out: id, name: "Make " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Saddlery", req, xp: 30 + req * 5, in: inputs(req, flags), tick: 2100 + req * 40, family: /saddle/.test(id) ? "saddles" : "harness", stations: ["saddlers_bench", "leather_bench", "tanrack"] };
  });

  // ---------- workstations ----------
  Object.assign(STATIONS, {
    leather_bench:  { name: "Leatherworker's bench", spr: "workbench", action: "Work leather", lists: ["leatherworking"], quality: 58 },
    cobblers_bench: { name: "Cobbler's bench",       spr: "workbench", action: "Cobble",       lists: ["cordwaining"], quality: 58 },
    saddlers_bench: { name: "Saddler's bench",       spr: "workbench", action: "Make tack",    lists: ["saddlery"], quality: 60 },
  });
  STATIONS.tanrack.lists.push("leatherworking", "cordwaining", "saddlery");
  STATIONS.workbench.lists.push("leatherworking");

  Object.assign(PROD_SKILL_INTRO, {
    Leatherworking: "Cut and stitch tanned leather into belts, pouches, bags, quivers, scabbards and light armour — waxing your own thread and dyeing leather for the finer pieces. The hub of the hide trades.",
    Cordwaining: "The cobbler's craft: stitch and last leather into every kind of footwear, from sandals and slippers to hobnailed work boots, tall riding boots and a master's dress boots.",
    Saddlery: "Stitch heavy leather, iron fittings and felt padding into saddles, bridles, harness and barding — plough tack for the farm up to a royal parade saddle.",
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
