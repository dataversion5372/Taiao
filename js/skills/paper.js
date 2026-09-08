// ===== Isle of Emberfall — Papermaking · Bookbinding =====
// The scholar's branch, pulling threads from half the economy.
//
//   Weaving rags + Sawing wood + Tanning hides
//     → Papermaking → paper / parchment / vellum + inks + quills + sealing wax
//   paper + Leatherworking book covers + waxed thread + ink + glue
//     → Bookbinding → scrolls, books, atlases, tomes, illuminated manuscripts
//
// Papermaking's inks consume Dyeing pigments and charcoal; quills use Husbandry
// feathers; sealing wax uses beeswax. Bookbinding consumes Leatherworking's
// `book_cover`, Glassblowing's `lens` (atlases) and Assaying's `fine_gold`.
// Loaded after toolcraft.js, before market.js.
"use strict";

(function () {
  const CATS = { Papermaking: "Crafts & Arcana", Bookbinding: "Crafts & Arcana" };
  for (const s in CATS) if (!SKILLS.includes(s)) SKILLS.push(s);
  Object.assign(SKILL_CATEGORY, CATS);
  Object.assign(RECIPE_VERB, { Papermaking: "Pressed", Bookbinding: "Bound" });

  let pi = 500;
  const mk = (id, name, base, extra, props, note) => {
    if (ITEMS[id]) return;
    defineIcon("i_" + id, base, pi++, extra || "");
    ITEMS[id] = Object.assign({ name, icon: "i_" + id }, props);
    EXAMINE[id] = EXAMINE[id] || `${name}.`;
    registerPlaceholder(id, name, note || "paper good — tinted placeholder");
  };
  const stackGood = (id, name) => mk(id, name, "i_flour", " brightness(1.3) saturate(0.1)", { stack: true, value: 8, prov: "batch" }, "paper stock — tinted placeholder");

  // ====================================================================
  // PAPERMAKING — pulp, paper, parchment, vellum, inks, quills, wax
  // ====================================================================
  stackGood("pulp", "Paper pulp");
  stackGood("paper", "Paper");
  stackGood("fine_paper", "Fine paper");
  stackGood("cardstock", "Cardstock");
  mk("parchment", "Parchment", "i_leather", " brightness(1.35) saturate(0.2)", { stack: true, value: 14, prov: "batch" }, "parchment — tinted placeholder");
  mk("vellum", "Vellum", "i_leather", " brightness(1.5) saturate(0.1)", { stack: true, value: 24, prov: "batch" }, "vellum — tinted placeholder");
  mk("papyrus", "Papyrus", "i_flour", " hue-rotate(30deg) saturate(0.5) brightness(1.1)", { stack: true, value: 10, prov: "batch" }, "papyrus — tinted placeholder");
  mk("ink", "Ink", "i_vial", " brightness(0.4) saturate(0.6)", { stack: true, value: 10, prov: "batch" }, "ink — tinted placeholder");
  mk("iron_gall_ink", "Iron-gall ink", "i_vial", " brightness(0.3) sepia(0.6)", { stack: true, value: 16, prov: "batch" }, "ink — tinted placeholder");
  mk("gold_ink", "Gold ink", "i_vial", " hue-rotate(40deg) saturate(1.6) brightness(1.2)", { stack: true, value: 40, prov: "batch" }, "ink — tinted placeholder");
  mk("hide_glue", "Hide glue", "i_leather", " brightness(0.8) sepia(0.4)", { stack: true, value: 8, prov: "batch" }, "glue — tinted placeholder");
  mk("sealing_wax", "Sealing wax", "i_pot_hp", " hue-rotate(-20deg) saturate(1.6) brightness(0.7)", { stack: true, value: 10, prov: "batch" }, "sealing wax — tinted placeholder");
  mk("quill", "Quill pen", "i_shafts", " brightness(1.2)", { value: 12, tool: "quill", toolTier: 3 }, "quill — tinted placeholder");
  // [id, out, name, req, inputs, qty]
  const P = [
    ["pulp_rag",    "pulp", "Beat rag pulp",       1,  { cloth: 2 }, 3],
    ["pulp_wood",   "pulp", "Beat wood pulp",      2,  { wood_offcuts: 3 }, 2],
    ["pulp_hemp",   "pulp", "Beat hemp pulp",      4,  { boards: 2 }, 2],
    ["pulp_bleached","pulp","Bleach pulp",         6,  { cloth: 2, slaked_lime: 1 }, 3],
    ["make_paper",  "paper", "Press paper",        2,  { pulp: 2 }, 3],
    ["make_wove",   "paper", "Press wove paper",   4,  { pulp: 2 }, 3],
    ["make_laid",   "paper", "Press laid paper",   5,  { pulp: 2 }, 3],
    ["make_tissue", "paper", "Press tissue paper", 3,  { pulp: 1 }, 3],
    ["make_fine_paper","fine_paper","Press fine paper",7,{ pulp: 3 }, 2],
    ["make_watercolor","fine_paper","Press watercolour paper",10,{ pulp: 3, cloth: 1 }, 2],
    ["make_drafting","fine_paper","Press drafting paper",12,{ pulp: 4 }, 2],
    ["make_cardstock","cardstock","Press cardstock",6,{ pulp: 3 }, 2],
    ["make_pasteboard","cardstock","Laminate pasteboard",9,{ pulp: 4 }, 2],
    ["make_parchment","parchment","Prepare parchment",5,{ hide: 1 }, 2],
    ["make_fine_parchment","parchment","Prepare fine parchment",11,{ hide: 2 }, 3],
    ["make_vellum", "vellum", "Prepare vellum",    9,  { hide: 2 }, 1],
    ["make_fine_vellum","vellum","Prepare fine vellum",16,{ hide: 3 }, 2],
    ["make_papyrus","papyrus","Weave papyrus",     3,  { boards: 1 }, 2],
    ["ink_lampblack","ink","Grind lampblack ink",  1,  { charcoal: 1 }, 2],
    ["ink_berry",   "ink", "Boil berry ink",       2,  { berries: 2 }, 2],
    ["ink_sepia",   "ink", "Make sepia ink",       4,  { wood_tar: 1 }, 2],
    ["ink_walnut",  "ink", "Make walnut ink",      6,  { walnut_dye: 1 }, 2],
    ["ink_red",     "ink", "Make red ink",         7,  { madder_dye: 1 }, 2],
    ["ink_blue",    "ink", "Make blue ink",        8,  { woad_dye: 1 }, 2],
    ["ink_green",   "ink", "Make green ink",       9,  { verdigris_dye: 1 }, 2],
    ["ink_iron_gall","iron_gall_ink","Brew iron-gall ink",10,{ irongall_dye: 1 }, 2],
    ["ink_gold",    "gold_ink","Mix gold ink",     18, { fine_gold: 1 }, 2],
    ["make_glue",   "hide_glue","Boil hide glue",  3,  { hide: 1 }, 2],
    ["make_wax",    "sealing_wax","Pour sealing wax",4, { beeswax: 1 }, 3],
    ["make_wax_red","sealing_wax","Pour red sealing wax",8,{ beeswax: 1, madder_dye: 1 }, 3],
    ["make_quill",  "quill", "Cut a quill pen",    2,  { feathers: 2 }, 1],
    ["make_scroll_blank","papyrus","Roll blank scrolls",14,{ boards: 2 }, 3],
  ];
  RECIPES.papermaking = P.map(([id, out, name, req, inp, qty]) => ({
    id, out, qty, name, skill: "Papermaking", req, xp: 16 + req * 3, in: inp, tick: 1400 + req * 20,
    family: /ink/.test(id) ? "inks" : /pulp/.test(id) ? "pulp" : /parchment|vellum/.test(id) ? "skins" : "paper",
    stations: ["paper_mill", "mill", "workbench"],
  }));

  // ====================================================================
  // BOOKBINDING — bind paper + covers + thread + ink into books
  // ====================================================================
  const BOOK_NAMES = {
    scroll: "Scroll", letter: "Sealed letter", pamphlet: "Pamphlet", chapbook: "Chapbook",
    notebook: "Notebook", sketchbook: "Sketchbook", journal: "Journal", diary: "Diary",
    ledger: "Ledger", almanac: "Almanac", songbook: "Songbook", book: "Book", hardback: "Hardback book",
    folio: "Folio", herbal: "Herbal", bestiary: "Bestiary", sea_chart: "Sea chart", atlas: "Atlas",
    map: "Map", dictionary: "Dictionary", encyclopedia: "Encyclopedia", codex: "Codex", tome: "Tome",
    missal: "Missal", psalter: "Psalter", grimoire: "Grimoire", spellbook: "Spellbook",
    illuminated_manuscript: "Illuminated manuscript", bible: "Great bible", jeweled_bible: "Jewelled bible",
    royal_atlas: "Royal atlas", master_grand_tome: "Master's grand tome",
  };
  // [id, name, req, inputs, stack?]
  const B = [
    ["scroll", 1, { papyrus: 1, ink: 1 }, 1],
    ["letter", 1, { paper: 1, ink: 1, sealing_wax: 1 }, 1],
    ["pamphlet", 2, { paper: 2, ink: 1 }, 1],
    ["chapbook", 3, { paper: 3, waxed_thread: 1, ink: 1 }, 1],
    ["notebook", 4, { paper: 4, cardstock: 1, waxed_thread: 1 }, 0],
    ["sketchbook", 5, { fine_paper: 3, cardstock: 1, waxed_thread: 1 }, 0],
    ["journal", 6, { paper: 4, book_cover: 1, waxed_thread: 1, hide_glue: 1 }, 0],
    ["diary", 6, { paper: 4, book_cover: 1, waxed_thread: 1 }, 0],
    ["ledger", 8, { paper: 6, book_cover: 1, hide_glue: 1, ink: 1 }, 0],
    ["almanac", 9, { paper: 5, book_cover: 1, ink: 2 }, 0],
    ["songbook", 8, { paper: 5, book_cover: 1, ink: 1 }, 0],
    ["book", 10, { paper: 6, book_cover: 1, waxed_thread: 1, hide_glue: 1, ink: 1 }, 0],
    ["hardback", 12, { paper: 8, cardstock: 2, book_cover: 1, hide_glue: 1 }, 0],
    ["folio", 13, { fine_paper: 6, book_cover: 1, hide_glue: 1 }, 0],
    ["map", 9, { parchment: 2, ink: 1 }, 1],
    ["herbal", 14, { parchment: 4, book_cover: 1, ink: 2 }, 0],
    ["bestiary", 15, { parchment: 5, book_cover: 1, ink: 2 }, 0],
    ["sea_chart", 11, { vellum: 2, ink: 1 }, 1],
    ["codex", 17, { vellum: 4, book_cover: 1, waxed_thread: 2, hide_glue: 1 }, 0],
    ["dictionary", 16, { paper: 10, book_cover: 1, hide_glue: 2 }, 0],
    ["atlas", 18, { vellum: 4, book_cover: 1, ink: 2, lens: 1 }, 0],
    ["missal", 18, { parchment: 5, book_cover: 1, gold_ink: 1 }, 0],
    ["psalter", 19, { parchment: 5, book_cover: 1, gold_ink: 1 }, 0],
    ["tome", 20, { vellum: 6, book_cover: 2, hide_glue: 2, ink: 2 }, 0],
    ["grimoire", 21, { vellum: 5, book_cover: 1, iron_gall_ink: 2 }, 0],
    ["encyclopedia", 22, { paper: 14, book_cover: 2, hide_glue: 2, lens: 1 }, 0],
    ["spellbook", 24, { vellum: 6, book_cover: 2, iron_gall_ink: 2, cut_gem: 1 }, 0],
    ["illuminated_manuscript", 26, { vellum: 6, book_cover: 1, gold_ink: 2, fine_gold: 1 }, 0],
    ["bible", 27, { vellum: 8, book_cover: 2, gold_ink: 2, hide_glue: 2 }, 0],
    ["royal_atlas", 28, { vellum: 6, book_cover: 2, ink: 3, lens: 2, fine_gold: 1 }, 0],
    ["jeweled_bible", 30, { vellum: 8, book_cover: 2, gold_ink: 2, cut_gem: 2, fine_gold: 1 }, 0],
    ["master_grand_tome", 32, { vellum: 12, book_cover: 3, gold_ink: 3, iron_gall_ink: 2, cut_gem: 1, hide_glue: 3 }, 0],
  ];
  RECIPES.bookbinding = B.map(([id, req, inp, stack]) => {
    const name = BOOK_NAMES[id] || id;
    mk(id, name, /scroll|letter|map|chart|papyrus/.test(id) ? "i_flour" : "i_robe", ` hue-rotate(${(req * 17) % 60 - 25}deg) saturate(0.8) brightness(${1 - req * 0.004})`,
      stack ? { name, stack: true, value: 20 + req * 5, finished: true } : { name, value: 60 + req * 20, finished: true }, "book — tinted placeholder");
    return { id: "bind_" + id, out: id, name: "Bind " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name.toLowerCase(),
      skill: "Bookbinding", req, xp: 26 + req * 5, in: inp, tick: 1900 + req * 40, family: /bible|manuscript|tome|grimoire|spellbook|psalter|missal/.test(id) ? "sacred_works" : /atlas|map|chart/.test(id) ? "cartography" : "books",
      stations: ["bindery", "workbench"] };
  });

  // ---------- workstations ----------
  Object.assign(STATIONS, {
    paper_mill: { name: "Paper mill", spr: "mill",      action: "Make paper", lists: ["papermaking"], quality: 58 },
    bindery:    { name: "Bindery",    spr: "workbench", action: "Bind books", lists: ["bookbinding"], quality: 60 },
  });
  STATIONS.mill.lists.push("papermaking");
  STATIONS.workbench.lists.push("papermaking", "bookbinding");

  Object.assign(PROD_SKILL_INTRO, {
    Papermaking: "Beat rags and wood into pulp and press it into paper, prepare parchment and vellum from hide, and grind the inks — lampblack, iron-gall, coloured and gold — plus quills and sealing wax that every scribe needs.",
    Bookbinding: "Fold and sew paper, glue it into leather-covered boards, and bind everything from scrolls and ledgers to atlases, grimoires and gold-illuminated manuscripts. The buyer of the tanner's book covers.",
  });
  // (market tags for Papermaking/Bookbinding are declared in market.js)

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
