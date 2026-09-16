// ===== Taiao — Textiles chain (Phase 3) =====
// Splits the old one-step Textiles skill into a real production chain of
// recognisable trades:
//
//   fibre → Spinning → yarn/thread → Dyeing → dyed yarn ─┐
//                                                        ├→ Weaving → cloth
//                                    (plain yarn) ───────┘        │
//                                                   Fulling → finished cloth
//                                                                 │
//                                                     Tailoring → garments / sails
//
// The legacy `Textiles` skill id is KEPT (save-compat) but its 32 cloth recipes
// are re-tagged to the new `Weaving` skill and now consume YARN instead of raw
// fibre — so existing content keeps working while the chain gains stages.
// Reuses the existing 10 fibre crops + 32 cloth types; adds a real wool line
// (fleece from sheep). New items use placeholder tinted sprites (registered).
"use strict";

(function () {
  const NEW = ["Spinning", "Dyeing", "Weaving", "Fulling", "Tailoring"];
  for (const s of NEW) if (!SKILLS.includes(s)) SKILLS.push(s);
  Object.assign(SKILL_CATEGORY, {
    Spinning: "Textiles & Leather", Dyeing: "Textiles & Leather", Weaving: "Textiles & Leather",
    Fulling: "Textiles & Leather", Tailoring: "Textiles & Leather",
  });
  Object.assign(RECIPE_VERB, {
    Spinning: "Spun", Dyeing: "Dyed", Weaving: "Woven", Fulling: "Fulled", Tailoring: "Tailored",
  });

  let phi = 40; // hue seed for placeholder tints
  const ph = (key, base, extra) => defineIcon(key, base, phi++, extra || "");
  const clothId = name => { const i = TEXTILE_NAMES.indexOf(name); return i < 0 ? null : (i === 0 ? "cloth" : "cloth_" + i); };

  // ---------- Spinning: fibre → yarn/thread ----------
  // One yarn per fibre that the cloth recipes actually use, so the whole weaving
  // table can be migrated onto yarn. Yarn unlocks at its cloth's level.
  const yarnOf = {};
  const fiberMinReq = {};
  for (const r of RECIPES.textiles) {
    if (r.out === "robe") continue;
    const fib = Object.keys(r.in)[0];
    fiberMinReq[fib] = Math.min(fiberMinReq[fib] == null ? 99 : fiberMinReq[fib], r.req);
  }
  const yarnName = fib => {
    const nm = ITEMS[fib] ? ITEMS[fib].name : fib;
    if (/flax/i.test(nm)) return "Linen thread";
    if (/silk/i.test(nm)) return nm.replace(/ vine$/i, "") + " thread";
    if (/hemp|jute|sisal|kenaf|ramie/i.test(nm)) return nm + " twine";
    return nm + " yarn";
  };
  RECIPES.spinning = [];
  for (const fib in fiberMinReq) {
    const yid = "yarn_" + fib; yarnOf[fib] = yid;
    const req = Math.max(1, fiberMinReq[fib]);
    ph("i_" + yid, "i_cloth");
    ITEMS[yid] = { name: yarnName(fib), icon: "i_" + yid, stack: true, value: (ITEMS[fib] ? ITEMS[fib].value : 4) + 4, prov: "batch" };
    EXAMINE[yid] = `${yarnName(fib)} — spun ready for the loom.`;
    registerPlaceholder(yid, ITEMS[yid].name, "spun yarn/thread — tinted cloth-icon placeholder");
    RECIPES.spinning.push({ id: "spin_" + fib, out: yid, qty: 2, name: "Spin " + yarnName(fib).toLowerCase(),
      skill: "Spinning", req, xp: 20 + req * 3, in: { [fib]: 2 }, tick: 1400, family: "yarn", stations: ["spinning_wheel", "loom"] });
  }
  // wool line: fleece (from sheep) → wool yarn → wool cloth (cloth_3)
  ph("i_fleece", "i_cotton", " brightness(1.15) saturate(0.6)");
  ITEMS.fleece = { name: "Fleece", icon: "i_fleece", stack: true, value: 9 };
  EXAMINE.fleece = "A sheared fleece — scour and card it, then spin it into wool yarn.";
  registerPlaceholder("fleece", "Fleece", "raw wool — tinted cotton-icon placeholder");
  ph("i_wool_yarn", "i_cloth", " brightness(1.1) saturate(0.7)");
  ITEMS.wool_yarn = { name: "Wool yarn", icon: "i_wool_yarn", stack: true, value: 14, prov: "batch" };
  EXAMINE.wool_yarn = "Soft-spun wool, ready for weaving.";
  registerPlaceholder("wool_yarn", "Wool yarn", "spun wool — tinted cloth-icon placeholder");
  RECIPES.spinning.push({ id: "spin_wool", out: "wool_yarn", qty: 2, name: "Spin wool yarn",
    skill: "Spinning", req: 2, xp: 26, in: { fleece: 2 }, tick: 1400, family: "yarn", stations: ["spinning_wheel", "loom"] });
  // make fleece obtainable (data-only): sheep/cow/goat drops + Sten stocks it
  if (typeof MONSTERS !== "undefined") {
    for (const k of ["sheep", "cow", "goat"]) if (MONSTERS[k]) (MONSTERS[k].drops = MONSTERS[k].drops || []).push({ id: "fleece", min: 1, max: 2, ch: 0.6 });
  }
  if (typeof SHOP_STOCK !== "undefined") SHOP_STOCK.push("fleece");

  // ---------- Weaving: migrate the 32 cloth recipes onto yarn ----------
  // Re-tag skill Textiles → Weaving and swap fibre inputs for the spun yarn.
  // The legacy Textiles skill keeps its saved XP but no longer has recipes.
  const robe = RECIPES.textiles.find(r => r.out === "robe");
  RECIPES.textiles = RECIPES.textiles.filter(r => r.out !== "robe");
  for (const r of RECIPES.textiles) {
    r.skill = "Weaving";
    r.family = "cloth";
    r.stations = ["loom"];
    const fib = Object.keys(r.in)[0];
    if (yarnOf[fib]) r.in = { [yarnOf[fib]]: 2 };
  }
  // authentic wool line: weave "Wool cloth" (cloth_3) from wool yarn
  const woolCloth = clothId("Wool cloth");
  const wc = RECIPES.textiles.find(r => r.out === woolCloth);
  if (wc) wc.in = { wool_yarn: 2 };

  // ---------- Dyeing: a 32-recipe dyer's craft ----------
  // 16 natural pigments (a full palette sourced from foraging / farming / mining)
  // + 16 dyeing applications that each consume a DISTINCT pigment to colour the
  // four hero yarn lines and four cloth lines. Horizontal breadth: colours, not
  // stronger-and-stronger. Every pigment has a consumer, so the graph stays clean.
  const flaxFib = Object.keys(fiberMinReq).find(f => /flax/i.test(ITEMS[f] && ITEMS[f].name));
  const silkFib = Object.keys(fiberMinReq).find(f => /silk/i.test(ITEMS[f] && ITEMS[f].name));
  const linenYarn = yarnOf[flaxFib] || "wool_yarn";
  const silkYarn = yarnOf[silkFib] || "wool_yarn";
  const cottonYarn = yarnOf.cotton || "wool_yarn";
  // [id, name, req, sourceInputs]  — sources are all gatherable (forage/farm/mine)
  const DYES = [
    ["madder_dye",    "Madder red dye",      1,  { berries: 3 }],
    ["weld_dye",      "Weld yellow dye",     3,  { herb: 2 }],
    ["woad_dye",      "Woad blue dye",       5,  { herb: 2, berries: 1 }],
    ["verdigris_dye", "Verdigris green dye", 7,  { copper_ore: 1, herb: 1 }],
    ["walnut_dye",    "Walnut brown dye",    9,  { forage_14: 2 }],
    ["ochre_dye",     "Ochre dye",           11, { iron_ore: 1, berries: 1 }],
    ["crimson_dye",   "Crimson dye",         13, { berries: 2, forage_1: 2 }],
    ["indigo_dye",    "Indigo dye",          15, { herb: 3 }],
    ["saffron_dye",   "Saffron gold dye",    17, { herb: 2, gold_ore: 1 }],
    ["tyrian_dye",    "Tyrian purple dye",   19, { forage_11: 1, gem: 1 }],
    ["irongall_dye",  "Iron-gall black dye", 21, { iron_ore: 1, herb: 1 }],
    ["scarlet_dye",   "Scarlet dye",         23, { berries: 3, gem: 1 }],
    ["ember_dye",     "Ember dye",           25, { rune_essence: 2 }],
    ["frost_dye",     "Frost dye",           27, { rune_essence: 2, herb: 1 }],
    ["void_dye",      "Void black dye",      29, { rune_essence: 3 }],
    ["starlight_dye", "Starlight dye",       31, { rune_essence: 2, gem: 1 }],
  ];
  const dyeIconBase = id => (/ember|frost|void|starlight/.test(id) ? "i_essence" : /red|crimson|scarlet|madder|ochre|walnut/.test(id) ? "i_berries" : "i_herb");
  RECIPES.dyeing = [];
  for (const [id, name, req, inp] of DYES) {
    ph("i_" + id, dyeIconBase(id));
    ITEMS[id] = { name, icon: "i_" + id, stack: true, value: 10 + req, prov: "batch" };
    EXAMINE[id] = `${name} — a dyer's pigment.`;
    registerPlaceholder(id, name, "dye pigment — tinted forage/essence-icon placeholder");
    RECIPES.dyeing.push({ id: "make_" + id, out: id, qty: 2, name: "Make " + name.toLowerCase(),
      skill: "Dyeing", req, xp: 16 + req * 2, in: inp, tick: 1400, family: "pigments", stations: ["dyeworks", "cauldron", "loom"] });
  }
  // the bounded dyed-yarn output set (dyed cloths are defined in the block below)
  const DYED_YARN = [["dyed_wool_yarn", "Dyed wool yarn"], ["dyed_linen_thread", "Dyed linen thread"],
    ["dyed_cotton_yarn", "Dyed cotton yarn"], ["dyed_silk_thread", "Dyed silk thread"]];
  for (const [id, name] of DYED_YARN) {
    ph("i_" + id, "i_cloth", " saturate(1.6)");
    ITEMS[id] = { name, icon: "i_" + id, stack: true, value: 26, prov: "batch" };
    EXAMINE[id] = `${name} — coloured, ready to weave.`;
    registerPlaceholder(id, name, "dyed yarn — tinted cloth-icon placeholder");
  }
  const woolClothId = clothId("Wool cloth"), linenClothId = clothId("Linen"),
        cottonClothId = "cloth", silkClothId = clothId("Satin");
  // 16 applications, each consuming ONE pigment (so all 16 are used). Two colours
  // per output; the colour lives in the recipe name + provenance, the item id is
  // shared, so there's no per-colour item explosion.
  // [output, material, pigment, req, colourName]
  const DYE_APPS = [
    ["dyed_wool_yarn",    "wool_yarn",    "madder_dye",    2,  "crimson"],
    ["dyed_wool_yarn",    "wool_yarn",    "crimson_dye",   14, "deep crimson"],
    ["dyed_linen_thread", linenYarn,      "woad_dye",      6,  "woad-blue"],
    ["dyed_linen_thread", linenYarn,      "indigo_dye",    16, "indigo"],
    ["dyed_cotton_yarn",  cottonYarn,     "weld_dye",      4,  "yellow"],
    ["dyed_cotton_yarn",  cottonYarn,     "saffron_dye",   18, "saffron"],
    ["dyed_silk_thread",  silkYarn,       "tyrian_dye",    20, "Tyrian purple"],
    ["dyed_silk_thread",  silkYarn,       "scarlet_dye",   24, "scarlet"],
    ["dyed_wool_cloth",   woolClothId,    "verdigris_dye", 8,  "green"],
    ["dyed_wool_cloth",   woolClothId,    "irongall_dye",  22, "black"],
    ["dyed_linen_cloth",  linenClothId,   "walnut_dye",    10, "walnut-brown"],
    ["dyed_linen_cloth",  linenClothId,   "frost_dye",     28, "frost-blue"],
    ["dyed_cotton_cloth", cottonClothId,  "ochre_dye",     12, "ochre"],
    ["dyed_cotton_cloth", cottonClothId,  "starlight_dye", 32, "starlight"],
    ["dyed_silk_cloth",   silkClothId,    "ember_dye",     26, "ember"],
    ["dyed_silk_cloth",   silkClothId,    "void_dye",      30, "void-black"],
  ];
  for (const [out, mat, dye, req, colour] of DYE_APPS) {
    if (!mat) continue;
    const isYarn = /yarn|thread/.test(out);
    RECIPES.dyeing.push({ id: "dye_" + out + "_" + dye, out, qty: 2,
      name: `Dye ${isYarn ? "yarn" : "cloth"} ${colour}`, skill: "Dyeing", req,
      xp: 26 + req * 3, in: { [mat]: 2, [dye]: 1 }, tick: 1500,
      family: isYarn ? "dyed_yarn" : "dyed_cloth", stations: ["dyeworks", "loom"] });
  }

  // ---------- Weaving (coloured cloth from dyed yarn) — into the loom list ----------
  const DYED_CLOTH = [
    ["dyed_wool_cloth", "Dyed wool cloth", "dyed_wool_yarn", 12],
    ["dyed_linen_cloth", "Dyed linen cloth", "dyed_linen_thread", 14],
    ["dyed_cotton_cloth", "Dyed cotton cloth", "dyed_cotton_yarn", 16],
    ["dyed_silk_cloth", "Dyed silk cloth", "dyed_silk_thread", 22],
  ];
  for (const [id, name, yarn, req] of DYED_CLOTH) {
    ph("i_" + id, "i_cloth", " saturate(1.7)");
    ITEMS[id] = { name, icon: "i_" + id, stack: true, value: 40 + req * 3, prov: "batch" };
    EXAMINE[id] = `${name} — vividly coloured.`;
    registerPlaceholder(id, name, "dyed cloth — tinted cloth-icon placeholder");
    RECIPES.textiles.push({ id: "weave_" + id, out: id, name: "Weave " + name.toLowerCase(),
      skill: "Weaving", req, xp: 40 + req * 4, in: { [yarn]: 2 }, tick: 1600, family: "coloured_cloth", stations: ["loom"] });
  }

  // ---------- Fulling: finish woven cloth (32 recipes, one distinct fulled cloth each) ----------
  // Every one of the 32 woven cloths (TEXTILE_NAMES) fulls into its OWN finished
  // cloth item (fulled_0..fulled_31, "Fulled <cloth>"), so each Fulling guide rung
  // has a distinct product & icon — and every base cloth still gets a consumer.
  // A couple of felting recipes make felt / wool cloth straight from fleece/wool.
  // The old 8 material-class outputs (finished_*_cloth) are replaced by these; the
  // few garments that used them are repointed onto the matching fulled cloth
  // (fulled_0->fulled_0, linen->fulled_2, wool->fulled_3,
  //  hemp->fulled_4, felt->fulled_8, silk->fulled_15, tweed->fulled_18,
  //  luxury->fulled_25).
  const weaveReq = {};
  for (const r of RECIPES.textiles) if (r.skill === "Weaving") weaveReq[r.out] = r.req;
  // material-class representative for each fulled cloth — the 8 fulled ids the
  // garment recipes actually name. Registering the other 24 as ITEM_FAMILY
  // variants of their class head means every fulled cloth can be sewn wherever
  // a garment asks for its class (production.js countItemFam/removeItemFam).
  const fulledClass = nm => {
    if (/tweed/i.test(nm)) return "fulled_18";
    if (/felt/i.test(nm)) return "fulled_8";
    if (/wool/i.test(nm)) return "fulled_3";
    if (/silk|satin|taffeta|samite|velvet|damask|brocade|lace|chiffon|moonshroud/i.test(nm)) return "fulled_15";
    if (/gold|silver|ember|aether|world|shadow/i.test(nm)) return "fulled_25";
    if (/linen|gauze/i.test(nm)) return "fulled_2";
    if (/hemp|burlap|jute|sisal|kenaf|ramie|canvas/i.test(nm)) return "fulled_4";
    return "fulled_0";
  };
  RECIPES.fulling = [];
  TEXTILE_NAMES.forEach((nm, i) => {
    const src = i === 0 ? "cloth" : "cloth_" + i;
    if (!ITEMS[src]) return;
    const id = "fulled_" + i, low = nm.toLowerCase();
    const req = Math.max(1, weaveReq[src] || (i + 1));
    ph("i_" + id, "i_cloth", ` hue-rotate(${(i * 37) % 360}deg) saturate(1.1) brightness(0.95)`);
    ITEMS[id] = { name: "Fulled " + low, icon: "i_" + id, stack: true, value: 30 + req * 4, prov: "batch" };
    EXAMINE[id] = `Fulled ${low} — washed and fulled dense and weatherproof.`;
    registerPlaceholder(id, "Fulled " + low, "fulled cloth — tinted cloth-icon placeholder");
    const head = fulledClass(nm);
    if (head !== id && typeof window !== "undefined")
      (window.ITEM_FAMILY = window.ITEM_FAMILY || {})[id] = head;
    RECIPES.fulling.push({ id: "full_" + src, out: id, name: "Full " + low,
      skill: "Fulling", req, xp: 30 + req * 3, in: { [src]: 1 }, tick: 1500 + i * 10,
      family: "fulling", stations: ["fulling_mill", "tanrack", "loom"] });
  });
  // felting — make felt (fulled_8) / wool cloth (fulled_3) straight from fleece/wool
  RECIPES.fulling.push(
    { id: "felt_fleece", out: "fulled_8", qty: 1, name: "Felt raw fleece",
      skill: "Fulling", req: 2, xp: 24, in: { fleece: 3 }, tick: 1500, family: "felting", stations: ["fulling_mill", "loom"] },
    { id: "felt_wool", out: "fulled_3", qty: 1, name: "Boil wool into cloth",
      skill: "Fulling", req: 5, xp: 34, in: { wool_yarn: 3 }, tick: 1500, family: "felting", stations: ["fulling_mill", "loom"] },
  );

  // ---------- Tailoring: garments & sails ----------
  // [id, name, req, value, inputs, equipBlock|null, equipSlots?]  (equipBlock
  // => armour; equipSlots defaults to "torso" when omitted — cloaks/mantles
  // go in the single "cape" slot instead, and a hood also covers the back
  // of the head)
  const C = clothId;
  const GARMENTS = [
    ["cloth_cap", "Cloth cap", 1, 40, { cloth: 1 }, null],
    ["cloth_tunic", "Cloth tunic", 2, 70, { cloth: 2 }, 0.03],
    ["linen_shirt", "Linen shirt", 4, 95, { [C("Linen")]: 2 }, 0.04],
    ["hemp_smock", "Hemp smock", 6, 110, { fulled_4: 2 }, 0.05],
    ["felt_hat", "Felt hat", 8, 90, { fulled_8: 1 }, null],
    ["cotton_dress", "Cotton dress", 10, 150, { fulled_0: 2 }, 0.04],
    ["wool_cloak", "Wool cloak", 12, 160, { fulled_3: 2 }, 0.06, "cape"],
    ["dyed_tunic", "Dyed tunic", 14, 180, { dyed_cotton_cloth: 2 }, 0.05],
    ["travelers_cloak", "Traveller's cloak", 16, 220, { fulled_3: 2, leather: 1 }, 0.07, "cape"],
    ["padded_jerkin", "Padded jerkin", 18, 240, { [C("Hempcloth")]: 2, wool_yarn: 2 }, 0.09],
    ["tweed_coat", "Tweed coat", 20, 260, { fulled_18: 2 }, 0.07],
    ["hooded_robe", "Hooded robe", 22, 280, { dyed_linen_cloth: 2 }, 0.08, ["torso", "back_of_head"]],
    ["dyed_cloak", "Dyed wool cloak", 24, 300, { dyed_wool_cloth: 2 }, 0.07, "cape"],
    ["fine_robe", "Fine robe", 26, 420, { fulled_2: 2, dyed_silk_cloth: 1 }, 0.06],
    ["silk_gown", "Silk gown", 26, 520, { fulled_15: 2 }, null],
    ["embroidered_gown", "Embroidered gown", 30, 640, { dyed_silk_cloth: 2, gem: 1 }, null],
    ["cloth_of_gold_mantle", "Cloth-of-gold mantle", 32, 900, { fulled_25: 2, gold_bar: 1 }, 0.10, "cape"],
    ["sail", "Sail", 15, 260, { [C("Canvas")]: 4 }, null],
  ];
  RECIPES.tailoring = [];
  const article = w => (/^[aeiou]/i.test(w) ? "an " : "a ");
  for (const [id, name, req, value, inp, block, slots] of GARMENTS) {
    if (!ITEMS[id]) {
      const base = block != null ? "i_robe" : /hat|cap/.test(id) ? "i_cloth" : /sail/.test(id) ? "i_cloth" : "i_body";
      ph("i_" + id, base, " saturate(1.1)");
      ITEMS[id] = block != null
        ? { name, icon: "i_" + id, value, equip: slots || "torso", block }
        : { name, icon: "i_" + id, value, finished: true };
      EXAMINE[id] = `${name} — tailored by hand.`;
      registerPlaceholder(id, name, "garment — tinted placeholder");
    }
    RECIPES.tailoring.push({ id: "tailor_" + id, out: id, name: "Tailor " + article(name) + name.toLowerCase(),
      skill: "Tailoring", req, xp: 28 + req * 7, in: inp, tick: 2000 + req * 30, family: block != null ? "outerwear" : "accessories",
      stations: ["tailors_bench", "loom", "workbench"] });
  }
  // migrate the old woven robe into Tailoring
  if (robe) RECIPES.tailoring.push({ id: "tailor_robe", out: "robe", name: "Tailor a robe",
    skill: "Tailoring", req: 5, xp: 85, in: { cloth: 3 }, tick: 2100, family: "outerwear", stations: ["tailors_bench", "loom"] });

  // ---------- workstations ----------
  Object.assign(STATIONS, {
    spinning_wheel: { name: "Spinning wheel", spr: "loom",     action: "Spin",   lists: ["spinning"], quality: 55 },
    dyeworks:       { name: "Dyeworks",       spr: "cauldron", action: "Dye",    lists: ["dyeing"], quality: 60 },
    fulling_mill:   { name: "Fulling mill",   spr: "tanrack",  action: "Full",   lists: ["fulling"], quality: 60 },
    tailors_bench:  { name: "Tailor's bench", spr: "workbench",action: "Tailor", lists: ["tailoring"], quality: 55 },
  });
  // reachable now: host the whole chain on the existing loom + workbench
  STATIONS.loom.lists.push("spinning", "dyeing", "fulling", "tailoring");
  STATIONS.workbench.lists.push("tailoring");

  // ---------- intros ----------
  Object.assign(PROD_SKILL_INTRO, {
    Spinning: "Spin fibre — flax, cotton, hemp, silk and sheared wool — into yarn and thread at a spinning wheel. The first stage of every cloth.",
    Dyeing: "A full dyer's palette: brew 16 natural pigments — madder, woad, weld, walnut, saffron, Tyrian purple, iron-gall black and fantasy ember/void/starlight — from foraged, farmed and mined sources, then dye yarn and cloth. A dyer supplies the whole town's weavers and tailors.",
    Weaving: "Weave yarn into 32 cloths at a loom — from rough burlap to cloth-of-gold. (This is the old Textiles skill, now fed by spun yarn.)",
    Fulling: "Wash, full, felt and finish woven cloth at a fulling mill — any of the 32 cloths becomes a dense, weatherproof finished cloth of its material class, and raw fleece can be felted directly. The finishing every good garment needs.",
    Tailoring: "Cut and sew finished cloth into garments, cloaks and sails. Some are wearable armour; each remembers its tailor.",
    Textiles: "Textiles has been split into specialised trades: Spinning, Dyeing, Weaving, Fulling and Tailoring. Your old Textiles levels are kept; new work trains the successor skills.",
  });

  // ---------- normalise any recipes we added (id + family) ----------
  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
