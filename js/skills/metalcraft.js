// ===== Taiao — Assaying · Wire-drawing · Jewelry =====
// Deepens the metal branch downstream of Smelting.
//
//   Smelting bars ─┬─ Assaying    → fine gold/silver/platinum, electrum, cut gems
//                  └─ Wire-drawing → wire → chains, jump-rings, findings
//                         ↓                        ↓
//                       Jewelry ← cut gems + fine metals + chain + glass beads
//
// Assaying gives raw `gem` a cutter and refines bars to high purity; Wire-drawing
// turns bars into wire, chain and findings (needles, pins, fish-hooks); Jewelry
// (expanded from 2 to 32) consumes fine metals, cut gems, chain AND Glassblowing's
// glass beads. Loaded in the early data group after potteryglass.js.
"use strict";

(function () {
  const CATS = { Assaying: "Metalworking", "Wire-drawing": "Metalworking", Jewelry: "Metalworking" };
  for (const s in CATS) if (!SKILLS.includes(s)) SKILLS.push(s);
  Object.assign(SKILL_CATEGORY, CATS);
  Object.assign(RECIPE_VERB, { Assaying: "Refined", "Wire-drawing": "Drawn", Jewelry: "Crafted" });
  const bar = nm => (typeof METALS !== "undefined" && (METALS.find(m => m.name === nm) || {}).bar) || null;
  const ore = nm => (typeof METALS !== "undefined" && (METALS.find(m => m.name === nm) || {}).ore) || null;
  const GOLD = "gold_bar", SILVER = bar("Silver") || "gold_bar", PLAT = bar("Platinum") || "gold_bar",
        SILVER_ORE = ore("Silver") || "gold_ore";

  let pi = 350;
  const mk = (id, name, base, extra, props, note) => {
    if (ITEMS[id]) return;
    defineIcon("i_" + id, base, pi++, extra || "");
    ITEMS[id] = Object.assign({ name, icon: "i_" + id }, props);
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, note || "metalcraft good — tinted placeholder");
  };

  // ====================================================================
  // ASSAYING — refine bars to fine metals; cut raw gems into faceted stones
  // ====================================================================
  mk("fine_gold",     "Fine gold",     "i_bar_au", " brightness(1.2) saturate(1.3)", { stack: true, value: 90, prov: "batch" }, "fine metal — tinted placeholder");
  mk("fine_silver",   "Fine silver",   "i_bar_au", " saturate(0.15) brightness(1.5)", { stack: true, value: 70, prov: "batch" }, "fine metal — tinted placeholder");
  mk("fine_platinum", "Fine platinum", "i_bar_au", " saturate(0.1) brightness(1.7)", { stack: true, value: 140, prov: "batch" }, "fine metal — tinted placeholder");
  mk("electrum",      "Electrum",      "i_bar_au", " hue-rotate(15deg) saturate(0.7) brightness(1.3)", { stack: true, value: 110, prov: "batch" }, "fine metal — tinted placeholder");
  mk("cut_gem",       "Cut gem",       "i_gem", " brightness(1.15)", { stack: true, value: 70, prov: "batch" }, "cut gem — tinted placeholder");
  mk("brilliant_gem", "Brilliant gem", "i_gem", " brightness(1.4) saturate(1.3)", { stack: true, value: 150, prov: "batch" }, "cut gem — tinted placeholder");
  for (const [id, nm, hue] of [["diamond", "Diamond", 200], ["ruby", "Ruby", 0], ["sapphire", "Sapphire", 220], ["emerald", "Emerald", 130], ["pearl", "Pearl", 40]])
    mk(id, nm, "i_gem", ` hue-rotate(${hue}deg) saturate(1.4) brightness(1.25)`, { stack: true, value: 220, prov: "batch" }, "cut gem — tinted placeholder");
  // [id, out, name, req, inputs, passive?]
  const A = [
    ["refine_gold",      "fine_gold",     "Refine gold",        3,  { [GOLD]: 1 }, 1],
    ["refine_gold_fine", "fine_gold",     "Cupel fine gold",    12, { [GOLD]: 2 }, 1],
    ["refine_gold_master","fine_gold",    "Master-refine gold", 24, { [GOLD]: 3 }, 1],
    ["refine_silver",    "fine_silver",   "Refine silver",      5,  { [SILVER]: 1 }, 1],
    ["assay_silver_ore", "fine_silver",   "Assay silver ore",   7,  { [SILVER_ORE]: 3 }, 1],
    ["refine_silver_fine","fine_silver",  "Cupel fine silver",  15, { [SILVER]: 2 }, 1],
    ["refine_platinum",  "fine_platinum", "Refine platinum",    18, { [PLAT]: 1 }, 1],
    ["refine_plat_fine", "fine_platinum", "Cupel fine platinum",28, { [PLAT]: 2 }, 1],
    ["alloy_electrum",   "electrum",      "Alloy electrum",     9,  { [GOLD]: 1, [SILVER]: 1 }, 1],
    ["alloy_electrum_fine","electrum",    "Alloy fine electrum",20, { fine_gold: 1, fine_silver: 1 }, 0],
    // gem cutting (raw gem → cut/brilliant/named)
    ["cut_cabochon",     "cut_gem",       "Cut a cabochon",     2,  { gem: 1 }, 0],
    ["cut_rose",         "cut_gem",       "Rose-cut a gem",     6,  { gem: 1 }, 0],
    ["cut_step",         "cut_gem",       "Step-cut a gem",     8,  { gem: 1 }, 0],
    ["cut_facet",        "cut_gem",       "Facet-cut a gem",    10, { gem: 1 }, 0],
    ["cut_princess",     "cut_gem",       "Princess-cut a gem", 13, { gem: 1 }, 0],
    ["cut_brilliant",    "brilliant_gem", "Brilliant-cut a gem",16, { gem: 2 }, 0],
    ["cut_brilliant_fine","brilliant_gem","Master brilliant cut",26, { gem: 3 }, 0],
    ["cut_diamond",      "diamond",       "Cut a diamond",      22, { gem: 3 }, 0],
    ["cut_diamond_fine", "diamond",       "Cut a flawless diamond",30, { gem: 4 }, 0],
    ["cut_ruby",         "ruby",          "Cut a ruby",         19, { gem: 3 }, 0],
    ["cut_sapphire",     "sapphire",      "Cut a sapphire",     19, { gem: 3 }, 0],
    ["cut_emerald",      "emerald",       "Cut an emerald",     21, { gem: 3 }, 0],
    ["polish_pearl",     "pearl",         "Polish a pearl",     14, { gem: 1, sand: 1 }, 0],
    // deeper assays / refines to fill breadth
    ["assay_gold_ore",   "fine_gold",     "Assay gold ore",     4,  { gold_ore: 3 }, 1],
    // (mithril refine removed — Assaying works the JEWELRY metal roster only;
    // the per-metal assays for all 16 jewelry bars live in geartiers.js)
    ["cut_star",         "brilliant_gem", "Star-cut a gem",     23, { gem: 2 }, 0],
    ["cut_marquise",     "cut_gem",       "Marquise-cut a gem", 17, { gem: 1 }, 0],
    ["cut_pear",         "cut_gem",       "Pear-cut a gem",     11, { gem: 1 }, 0],
    ["cut_emerald_step", "emerald",       "Emerald-cut an emerald",27, { gem: 3 }, 0],
    ["cut_black_diamond","diamond",       "Cut a black diamond",29, { gem: 4 }, 0],
    ["grade_crown_gem",  "brilliant_gem", "Grade a crown gem",  31, { gem: 3, fine_gold: 1 }, 0],
    ["master_assay",     "fine_platinum", "Master assay",       32, { [PLAT]: 2, gem: 1 }, 1],
  ];
  RECIPES.assaying = A.map(([id, out, name, req, inp, passive]) => {
    const r = { id, out, name, skill: "Assaying", req, xp: 26 + req * 4, in: inp,
      tick: passive ? (10000 + req * 250) : (1600 + req * 30), family: /gem|cut|cabochon|rose|step|facet|princess|brilliant|diamond|ruby|sapphire|emerald|pearl|star|marquise|pear|grade/.test(id) ? "gem_cutting" : "refining",
      stations: ["assay_furnace", "furnace"] };
    if (passive) { r.passive = true; r.time = 10000 + req * 250; }
    return r;
  });

  // ====================================================================
  // WIRE-DRAWING — bars → wire → chain, jump-rings, findings
  // ====================================================================
  for (const [id, nm, base, hue] of [["copper_wire", "Copper wire", "i_bar_bz", -10], ["iron_wire", "Iron wire", "i_bar_fe", 0],
    ["gold_wire", "Gold wire", "i_bar_au", 0], ["silver_wire", "Silver wire", "i_bar_au", 30], ["fine_wire", "Fine gold wire", "i_bar_au", 10]])
    mk(id, nm, base, ` hue-rotate(${hue}deg) brightness(1.1)`, { stack: true, value: 30, prov: "batch" }, "wire — tinted placeholder");
  for (const [id, nm] of [["chain", "Chain"], ["gold_chain", "Gold chain"], ["silver_chain", "Silver chain"], ["jump_rings", "Jump rings"]])
    mk(id, nm, "i_bar_au", " hue-rotate(20deg) saturate(0.6) brightness(1.0)", { stack: true, value: 40, prov: "batch" }, "wire good — tinted placeholder");
  const WIRE = [
    ["draw_copper_wire", "copper_wire", "Draw copper wire", 1,  { copper_bar: 1 }, "c"],
    ["draw_iron_wire",   "iron_wire",   "Draw iron wire",   3,  { iron_bar: 1 }, "c"],
    ["draw_gold_wire",   "gold_wire",   "Draw gold wire",   6,  { [GOLD]: 1 }, "c"],
    ["draw_silver_wire", "silver_wire", "Draw silver wire", 5,  { [SILVER]: 1 }, "c"],
    ["draw_fine_wire",   "fine_wire",   "Draw fine gold wire",14,{ fine_gold: 1 }, "c"],
    ["make_jump_rings",  "jump_rings",  "Coil jump rings",  2,  { iron_wire: 1 }, "c"],
    ["make_chain",       "chain",       "Link a chain",     4,  { jump_rings: 3 }, "c"],
    ["make_gold_chain",  "gold_chain",  "Link a gold chain",10, { gold_wire: 2 }, "c"],
    ["make_silver_chain","silver_chain","Link a silver chain",8,{ silver_wire: 2 }, "c"],
    // findings & products (finished)
    ["make_needle",   "needle",      "Draw a needle",       2,  { iron_wire: 1 }, "f"],
    ["make_pin",      "pin",         "Make pins",           3,  { iron_wire: 1 }, "f"],
    ["make_fish_hook","fish_hook",   "Bend fish hooks",     4,  { iron_wire: 1 }, "f"],
    ["make_hook",     "wire_hook",   "Bend a hook",         5,  { copper_wire: 1 }, "f"],
    ["make_hairpin",  "hairpin",     "Make a hairpin",      6,  { silver_wire: 1 }, "f"],
    ["make_brooch_pin","brooch_pin", "Make a brooch pin",   7,  { silver_wire: 1 }, "f"],
    ["make_fibula",   "fibula",      "Make a fibula",       9,  { silver_wire: 2 }, "f"],
    ["make_spring",   "spring",      "Coil a spring",       8,  { iron_wire: 2 }, "f"],
    ["make_staple",   "staples",     "Cut staples",         3,  { iron_wire: 1 }, "f"],
    ["make_tack",     "tacks",       "Cut tacks",           2,  { iron_wire: 1 }, "f"],
    ["make_wire_mesh","wire_mesh",   "Weave wire mesh",     11, { iron_wire: 3 }, "f"],
    ["make_mesh_sieve","mesh_sieve", "Make a mesh sieve",   12, { iron_wire: 3 }, "f"],
    ["make_wire_frame","wire_frame", "Bend a wire frame",   13, { iron_wire: 2 }, "f"],
    ["make_birdcage", "birdcage",    "Make a birdcage",     15, { iron_wire: 4 }, "f"],
    ["make_snare_wire","wire_snare", "Make a wire snare",   10, { iron_wire: 2 }, "f"],
    ["make_filigree", "filigree",    "Twist filigree",      16, { gold_wire: 2 }, "c"],
    ["make_gold_mesh","gold_mesh",   "Weave gold mesh",     18, { gold_wire: 3 }, "f"],
    ["make_chain_mail","mail_links", "Rivet mail links",    17, { iron_wire: 4 }, "f"],
    ["make_lock_spring","lock_spring","Coil a lock spring",  14, { fine_wire: 1, iron_wire: 1 }, "f"],
    ["make_clockspring","clock_spring","Coil a clock spring",20, { fine_wire: 2 }, "f"],
    ["make_harpstring","harp_string","Draw a harp string",  22, { silver_wire: 2 }, "f"],
    ["make_platinum_wire","platinum_wire","Draw platinum wire",24,{ fine_platinum: 1 }, "c"],
    ["make_master_chain","master_chain","Link a master chain",32,{ platinum_wire: 2, gold_wire: 1 }, "c"],
  ];
  RECIPES["wire-drawing"] = WIRE.map(([id, out, name, req, inp, kind]) => {
    if (!ITEMS[out]) {
      if (kind === "c") mk(out, name.replace(/^(Draw|Link|Coil|Make|Bend|Cut|Weave|Twist|Rivet) (a |an )?/i, "").replace(/\b\w/, c => c.toUpperCase()), "i_bar_au", " hue-rotate(15deg) saturate(0.6) brightness(1.05)", { stack: true, value: 24 + req * 3, prov: "batch" }, "wire good — tinted placeholder");
      // findings are small bulk goods: stack them, but keep finished so the
      // validator treats them as end-products (they're sold, not consumed)
      else mk(out, name.replace(/^(Draw|Make|Bend|Cut|Weave|Coil|Rivet|Twist) (a |an )?/i, "").replace(/\b\w/, c => c.toUpperCase()), "i_shafts", " brightness(1.1) saturate(0.4)", { value: 20 + req * 4, stack: true, finished: true }, "wire finding — tinted placeholder");
    }
    return { id, out, name, skill: "Wire-drawing", req, xp: 20 + req * 4, in: inp, tick: 1400 + req * 25,
      family: kind === "c" ? "wire" : "findings", stations: ["drawbench", "workbench", "anvil"] };
  });
  // Several drawn findings double as held TOOLS for the trades that use them
  // (see TOOL_SKILLS in production.js / GATHER_HELPERS in gathering.js):
  //   needle  → the sewing tool (tailoring, sailmaking, stitched leather)
  //   pin     → stretch hides on the tanning rack + fasten cloth
  //   fish_hook → speeds fishing (a well-stocked hook box rigs faster)
  if (ITEMS.needle) ITEMS.needle.toolTier = 5;
  if (ITEMS.pin) ITEMS.pin.toolTier = 4;
  if (ITEMS.fish_hook) ITEMS.fish_hook.toolTier = 4;

  // ====================================================================
  // JEWELRY — expanded 2 → 32, consuming fine metals, cut gems, chain, beads
  // ====================================================================
  const AMU = (name, bonus) => ({ name, value: 200 + bonus * 120, equip: "neck", hitBonus: bonus });
  // [id, name, req, inputs, itemProps]  itemProps: AMU(...) for equippable
  // amulets; "ring"/"bracelet"/"anklet" sentinel strings for EQUIP_CHOICES
  // jewelry (see the J.map() below — req is already known here, so these
  // resolve to a real {name,value,equip} object there instead of needing
  // their own AMU-style helper); else null = plain finished good.
  const J = [
    ["gold_ring",     "Gold ring",       1,  { [GOLD]: 1 }, "ring"],
    ["silver_ring",   "Silver ring",     2,  { [SILVER]: 1 }, "ring"],
    ["copper_band",   "Copper band",     1,  { brass_bar: 1 }, "ring"], // brass: jewelry-roster copper alloy
    ["beaded_bracelet","Beaded bracelet",3,  { silver_wire: 1, glass_bead: 2 }, "bracelet"],
    ["signet_ring",   "Signet ring",     5,  { [GOLD]: 1, cut_gem: 1 }, "ring"],
    ["gem_ring",      "Gem ring",        6,  { [GOLD]: 1, cut_gem: 1 }, "ring"],
    ["silver_pendant","Silver pendant",  4,  { silver_chain: 1, cut_gem: 1 }, null],
    ["gem_amulet",    "Gem amulet",      8,  { [GOLD]: 1, cut_gem: 1, gold_chain: 1 }, AMU("Gem amulet", 1)],
    ["glass_necklace","Glass-bead necklace",4,{ silver_chain: 1, glass_bead: 4 }, null],
    ["pearl_earrings","Pearl earrings",  9,  { silver_wire: 1, pearl: 2 }, null],
    ["gold_bracelet", "Gold bracelet",   10, { gold_chain: 1, [GOLD]: 1 }, "bracelet"],
    ["brooch",        "Brooch",          7,  { silver_wire: 1, brooch_pin: 1, cut_gem: 1 }, null],
    ["ruby_pendant",  "Ruby pendant",    12, { gold_chain: 1, ruby: 1 }, null],
    ["sapphire_ring", "Sapphire ring",   12, { [GOLD]: 1, sapphire: 1 }, "ring"],
    ["emerald_brooch","Emerald brooch",  13, { fine_gold: 1, brooch_pin: 1, emerald: 1 }, null],
    ["filigree_pendant","Filigree pendant",14,{ filigree: 1, cut_gem: 1 }, null],
    ["amulet_of_power","Amulet of power",15, { fine_gold: 1, brilliant_gem: 1, gold_chain: 1 }, AMU("Amulet of power", 2)],
    ["torc",          "Gold torc",       11, { gold_wire: 3 }, null],
    ["anklet",        "Silver anklet",   8,  { chain: 1, glass_bead: 2 }, "anklet"],
    ["cufflinks",     "Cufflinks",       9,  { fine_gold: 1, cut_gem: 2 }, null],
    ["locket",        "Locket",          13, { fine_gold: 1, gold_chain: 1 }, null],
    ["circlet",       "Circlet",         16, { fine_gold: 1, cut_gem: 2 }, null],
    ["diadem",        "Diadem",          18, { fine_gold: 2, brilliant_gem: 1 }, null],
    ["diamond_ring",  "Diamond ring",    20, { fine_gold: 1, diamond: 1 }, "ring"],
    ["signet_of_state","Signet of state",17, { fine_gold: 1, brilliant_gem: 1 }, null],
    ["electrum_amulet","Electrum amulet",19, { electrum: 1, brilliant_gem: 1, gold_chain: 1 }, AMU("Electrum amulet", 3)],
    ["tiara",         "Tiara",           22, { fine_silver: 2, diamond: 1, silver_chain: 1 }, null],
    ["chain_of_office","Chain of office",21, { gold_chain: 2, fine_gold: 1, cut_gem: 1 }, null],
    ["platinum_amulet","Platinum amulet",24, { fine_platinum: 1, diamond: 1, gold_chain: 1 }, AMU("Platinum amulet", 4)],
    ["royal_crown",   "Royal crown",     27, { fine_gold: 3, brilliant_gem: 2, diamond: 1 }, null],
    ["imperial_crown","Imperial crown",  30, { fine_platinum: 2, diamond: 2, ruby: 1, sapphire: 1 }, null],
    ["masterwork_amulet","Masterwork amulet",32,{ fine_platinum: 2, diamond: 1, master_chain: 1 }, AMU("Masterwork amulet", 5)],
  ];
  RECIPES.jewelry = J.map(([id, name, req, inp, props]) => {
    if (!ITEMS[id]) {
      defineIcon("i_" + id, /amulet|pendant|necklace|locket|chain/.test(id) ? "i_amulet" : "i_ring", pi++, ` hue-rotate(${(req * 19) % 360}deg) saturate(1.1) brightness(1.1)`);
      const resolvedProps = typeof props === "string" ? { name, value: 120 + req * 20, equip: props, stack: true } : props;
      ITEMS[id] = Object.assign({ icon: "i_" + id }, resolvedProps || { name, value: 120 + req * 20, finished: true });
      if (!ITEMS[id].name) ITEMS[id].name = name;
      EXAMINE[id] = EXAMINE[id] || `${name} — fine jewellery.`;
      registerPlaceholder(id, name, "jewellery — tinted placeholder");
    } else if (!ITEMS[id].equip && !ITEMS[id].finished) {
      ITEMS[id].finished = true; // reused item (e.g. gold_ring) — it's a jewellery end-good
    }
    return { id: "jewel_" + id, out: id, name: "Craft " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Jewelry", req, xp: 30 + req * 6, in: inp, tick: 1800 + req * 40,
      family: (props && props.equip) ? "amulets" : /ring|band/.test(id) ? "rings" : /crown|tiara|circlet|diadem/.test(id) ? "regalia" : "adornments",
      stations: ["jewelers_bench", "furnace"] };
  });

  // ---------- workstations ----------
  Object.assign(STATIONS, {
    assay_furnace:  { name: "Assay furnace",  spr: "furnace", action: "Assay",  lists: ["assaying"], quality: 62 },
    drawbench:      { name: "Draw bench",     spr: "workbench", action: "Draw wire", lists: ["wire-drawing"], quality: 58 },
    jewelers_bench: { name: "Jeweller's bench",spr: "workbench", action: "Craft jewellery", lists: ["jewelry"], quality: 62 },
  });
  STATIONS.furnace.lists.push("assaying");
  STATIONS.workbench.lists.push("wire-drawing");
  STATIONS.anvil.lists.push("wire-drawing");

  Object.assign(PROD_SKILL_INTRO, {
    Assaying: "Refine bars to fine gold, silver and platinum, alloy electrum, and cut raw gems into cabochons, brilliants, diamonds, rubies and pearls — the pure metals and faceted stones a jeweller needs.",
    "Wire-drawing": "Draw metal bars through plates into wire, then coil chains and jump-rings and shape findings — needles, pins, fish-hooks, springs and mesh. Supplies Jewelry's chains and settings. Several findings are also held tools: carry a needle and the sewing trades (tailoring, sailmaking, stitched leather) work finer, pins help stretch hides on the tanning rack and fasten cloth, and a box of fish hooks rigs your line faster.",
    Jewelry: "Set fine metals, cut gems, chains and Glassblowing's beads into rings, brooches, amulets, crowns and regalia — from a simple gold band to a masterwork amulet.",
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
