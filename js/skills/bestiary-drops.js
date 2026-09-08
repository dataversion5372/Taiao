// ===== Isle of Emberfall — monster drops = exclusive skill reagents =====
// Monsters are deliberately NOT a redundant source of gatherable/farmable
// intermediates (ore, logs, herbs, gems, grain, fibre…). Instead each monster
// drops only COINS + one of its theme's DROP-EXCLUSIVE REAGENTS — materials
// obtainable nowhere else (no shop, no node, no crop, no recipe output) that are
// REQUIRED inputs to a production skill's mid/high recipes. So a whole slice of
// the economy can only advance by hunting.
//
// Each of the 9 monster themes sources SEVERAL skills (one reagent pair —
// lesser + greater grade — per skill). Common themes (beast/humanoid/magical)
// carry more skills; rare themes (golem/dragon/celestial) fewer & premium.
//
//   theme        → gated skills
//   b beast      → Fletching, Tanning, Leatherworking, Cordwaining, Saddlery, Ropemaking, Spinning
//   h humanoid   → Toolmaking, Locksmithing, Wire-drawing, Coopering, Carpentry, Weaponsmithing
//   m magical    → Potionmaking, Pottery, Seasoning, Soapmaking, Assaying
//   u undead     → Runecrafting, Bookbinding, Candlemaking, Papermaking
//   e elemental  → Glassblowing, Smelting, Charcoaling
//   q aquatic    → Dyeing, Sailmaking, Fulling
//   g golem      → Masonry, Limeburning
//   d dragon     → Armoursmithing, Shipwrighting
//   c celestial  → Jewelry, Tailoring, Weaving
//
// The sustenance backbone stays HUNTLESS on purpose (Cooking, Baking,
// Cheesemaking, Milling, Malting, Brewing, Husbandry, Sawing) so you can always
// feed & lumber yourself without combat.
//
// (Agriculture seeds are added minimally on top by seed-drops.js — the one
// deliberate intermediate, so every crop is also huntable.) Beasts/dragons/sea
// monsters keep their auto meat+hide butcher; any equipment/tool drop is kept.
// Loaded after all recipe + monster + item definitions (index.html ~line 216,
// before production.js) so injected reagent inputs are seen by the economy.
"use strict";

(function () {
  if (typeof MONSTERS === "undefined") return;

  // theme → { base:iconBase, skills:[ [lesserId,lesserName,greaterId,greaterName,skill,reqMin], … ] }
  // Every reagent in a theme shares one placeholder icon base but gets a unique
  // hue tint (defineIcon), so they read as distinct.
  const REAGENTS = {
    b: { base: "i_shafts", skills: [
      ["sinew", "Beast sinew", "thick_sinew", "Thick sinew", "Fletching", 5],
      ["raw_tannin", "Raw tannin", "deep_tannin", "Deep tannin", "Tanning", 6],
      ["curing_oil", "Curing oil", "rich_curing_oil", "Rich curing oil", "Leatherworking", 6],
      ["cobbler_wax", "Cobbler's wax", "hard_cobbler_wax", "Hardened cobbler's wax", "Cordwaining", 6],
      ["rawhide_lace", "Rawhide lace", "tough_rawhide_lace", "Tough rawhide lace", "Saddlery", 7],
      ["beast_gut", "Beast gut", "braided_gut", "Braided gut", "Ropemaking", 6],
      ["raw_lanolin", "Raw lanolin", "pure_lanolin", "Pure lanolin", "Spinning", 6],
    ]},
    h: { base: "i_bar_fe", skills: [
      ["tempering_grit", "Tempering grit", "hardening_grit", "Hardening grit", "Toolmaking", 5],
      ["clockwork_cog", "Clockwork cog", "master_cog", "Master cog", "Locksmithing", 7],
      ["drawplate_die", "Drawplate die", "hardened_die", "Hardened die", "Wire-drawing", 7],
      ["iron_hoopstock", "Iron hoopstock", "riveted_hoopstock", "Riveted hoopstock", "Coopering", 6],
      ["joiners_glue", "Joiner's glue", "master_joiners_glue", "Master joiner's glue", "Carpentry", 8],
      ["quench_oil", "Quench oil", "fine_quench_oil", "Fine quench oil", "Weaponsmithing", 5],
    ]},
    m: { base: "i_vial", skills: [
      ["arcane_dust", "Arcane dust", "arcane_powder", "Arcane powder", "Potionmaking", 6],
      ["glazing_ash", "Glazing ash", "prismatic_ash", "Prismatic ash", "Pottery", 6],
      ["mana_salt", "Mana salt", "pure_mana_salt", "Pure mana salt", "Seasoning", 6],
      ["saponite", "Saponite crystal", "pure_saponite", "Pure saponite", "Soapmaking", 6],
      ["assay_flux", "Assay flux", "true_flux", "True flux", "Assaying", 6],
    ]},
    u: { base: "i_essence", skills: [
      ["grave_dust", "Grave dust", "grave_ash", "Grave-ash", "Runecrafting", 6],
      ["wraith_ink", "Wraith ink", "phantom_ink", "Phantom ink", "Bookbinding", 6],
      ["corpse_wax", "Corpse wax", "barrow_wax", "Barrow wax", "Candlemaking", 6],
      ["pallid_pulp", "Pallid pulp", "bone_pulp", "Bone pulp", "Papermaking", 5],
    ]},
    e: { base: "i_essence", skills: [
      ["elemental_mote", "Elemental mote", "elemental_core", "Elemental core", "Glassblowing", 6],
      ["forge_ember", "Forge ember", "blaze_core", "Blaze core", "Smelting", 6],
      ["ember_heart", "Ember heart", "inferno_heart", "Inferno heart", "Charcoaling", 6],
    ]},
    q: { base: "i_gem", skills: [
      ["deep_pearl", "Deep pearl", "black_pearl", "Black pearl", "Dyeing", 6],
      ["kraken_resin", "Kraken resin", "leviathan_resin", "Leviathan resin", "Sailmaking", 6],
      ["sea_lye", "Sea lye", "deep_sea_lye", "Deep-sea lye", "Fulling", 6],
    ]},
    g: { base: "i_gem", skills: [
      ["golem_core", "Golem core", "titan_core", "Titan core", "Masonry", 6],
      ["binding_grit", "Binding grit", "adamant_grit", "Adamant grit", "Limeburning", 6],
    ]},
    d: { base: "i_shield", skills: [
      ["dragon_scale", "Dragon scale", "wyrm_heartscale", "Wyrm heartscale", "Armoursmithing", 16],
      ["dragon_pitch", "Dragon pitch", "wyrm_pitch", "Wyrm pitch", "Shipwrighting", 14],
    ]},
    c: { base: "i_gem", skills: [
      ["seraph_feather", "Seraph feather", "astral_shard", "Astral shard", "Jewelry", 14],
      ["halo_lace", "Halo lace", "seraphic_lace", "Seraphic lace", "Tailoring", 12],
      ["astral_thread", "Astral thread", "empyrean_thread", "Empyrean thread", "Weaving", 12],
    ]},
  };

  // create the drop-exclusive reagent items (hue-tinted placeholder icons)
  let hs = 200;
  const mkReagent = (id, name, base, value) => {
    if (ITEMS[id]) return;
    let icon = base;
    if (typeof defineIcon === "function" && typeof SPR !== "undefined" && SPR[base]) { defineIcon("ir_" + id, base, hs++); icon = "ir_" + id; }
    ITEMS[id] = { name, icon, stack: true, value };
    if (typeof EXAMINE !== "undefined") EXAMINE[id] = `${name} — a reagent won only from slain monsters; the crafts that need it can't be bought around.`;
    if (typeof registerPlaceholder === "function") registerPlaceholder(id, name, "monster reagent — tinted placeholder");
  };
  for (const t in REAGENTS) {
    const base = REAGENTS[t].base;
    for (const R of REAGENTS[t].skills) {
      mkReagent(R[0], R[1], base, 12);   // lesser
      mkReagent(R[2], R[3], base, 36);   // greater
    }
  }

  // per-theme monster-level midpoint → split lesser vs greater DROPS
  const themeLvls = {};
  for (const k in MONSTERS) {
    if (/_baby$/.test(k)) continue;
    const t = (typeof MONSTER_THEME !== "undefined" && MONSTER_THEME[k]) || "m";
    (themeLvls[t] = themeLvls[t] || []).push(MONSTERS[k].lvl || 1);
  }
  // Midpoint = min(arithmetic mid, 80th-percentile level). The arithmetic mid
  // alone is outlier-sensitive: magical runs lvl 1-162 (median 8!), which put
  // its mid at 81.5 and locked five skills' greater reagents behind near-boss
  // kills. Clamping to the 80th percentile only bites on such bottom-heavy
  // themes; top-heavy ones (dragons/celestials) keep their generous mid.
  const themeMid = {}, themePct = {};
  for (const t in themeLvls) {
    const a = themeLvls[t].slice().sort((x, y) => x - y);
    const pct = p => a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))];
    themePct[t] = pct;
    themeMid[t] = Math.min((a[0] + a[a.length - 1]) / 2, pct(0.8));
  }

  function dropTable(theme, lvl) {
    const L = Math.max(1, lvl | 0);
    const coins = { id: "coins", min: Math.max(1, L), max: L * 5 + 5, ch: theme === "b" ? 0.5 : 1 };
    const T = REAGENTS[theme] || REAGENTS.m;
    const pairs = T.skills;
    const mid = themeMid[theme] != null ? themeMid[theme] : 16;
    // spread a ~0.7 expected-reagent budget across the theme's skills so each
    // individual reagent stays reasonably common (higher per-drop chance when a
    // theme gates fewer skills).
    const chEach = Math.max(0.12, Math.min(0.4, 0.7 / pairs.length));
    const out = [coins];
    for (const R of pairs) {
      const id = L >= mid ? R[2] : R[0];      // greater above the theme midpoint, else lesser
      const max = L >= mid ? 1 + Math.floor(L / 24) : 1 + Math.floor(L / 12);
      out.push({ id, min: 1, max, ch: chEach });
    }
    // pre-existing DROP-EXCLUSIVE essentials with no other source — keep them on
    // their natural theme so those chains (Candlemaking/Crafting) don't lose
    // their only supply: tallow (animal fat) from beasts, action-runes from the
    // undead & the arcane. (state-runes are mineable; gems come from Gem-mining
    // via the ingredient-family shim — those stay off monster loot.)
    if (theme === "b") out.push({ id: "tallow", min: 1, max: 2, ch: 0.35 });
    if (theme === "u") out.push({ id: "action_rune", min: 1, max: 2 + Math.floor(L / 12), ch: 0.35 });
    if (theme === "m") out.push({ id: "action_rune", min: 1, max: 1 + Math.floor(L / 16), ch: 0.22 });
    // rare-theme trickle: the top-decile monsters of a big common theme also
    // carry a scarce partner theme's reagents at HALF chance, so the skills
    // gated behind seldom-seen dragons/celestials/golems aren't hostage to
    // finding them — while true-theme hunting stays twice as productive.
    //   apex beasts → dragon reagents · arch-magical → celestial · greater elementals → golem
    const TRICKLE = { b: "d", m: "c", e: "g" };
    const rt = TRICKLE[theme];
    if (rt && themePct[theme] && L >= themePct[theme](0.9)) {
      const rtPairs = REAGENTS[rt].skills;
      const rtMid = themeMid[rt] != null ? themeMid[rt] : 16;
      const rtCh = Math.max(0.12, Math.min(0.4, 0.7 / rtPairs.length)) * 0.5;
      // always the lesser grade (the mid-tier bottleneck), plus the greater
      // above the rare theme's own midpoint
      for (const R of rtPairs) {
        out.push({ id: R[0], min: 1, max: 1, ch: rtCh });
        if (L >= rtMid) out.push({ id: R[2], min: 1, max: 1, ch: rtCh });
      }
    }
    return out.filter(x => ITEMS[x.id]);
  }

  // Dragons/sea monsters have no beast hide index → map by name to the top
  // tanning hides so all 32 hides keep a source (auto-dropped by killMonster).
  function dragonSeaHide(name, theme) {
    const n = (name || "").toLowerCase();
    if (n.includes("hydra")) return "hide_28";
    if (n.includes("kraken") || n.includes("tentacle") || n.includes("leviathan") || n.includes("whale")) return "hide_31";
    if (theme === "d") return (n.includes("dragonkin") || n.includes("wyrm") || n.includes("drake") || n.includes("green")) ? "hide_29" : "hide_30";
    if (theme === "q" && (n.includes("shark") || n.includes("croc"))) return "hide_15";
    return null;
  }

  let done = 0;
  for (const key in MONSTERS) {
    const def = MONSTERS[key];
    const theme = (typeof MONSTER_THEME !== "undefined" && MONSTER_THEME[key]) || "m";
    // keep equipment/tool drops AND signature raw meats (raw_moa etc.) — those
    // are chain-starters for Cooking that only their species can supply.
    // Non-stack GEAR (gold swords, gem amulets — 41/58 droppers) is clamped to
    // ≤4% so free legacy loot doesn't undercut the smithing/jewelry trades;
    // stackable equips (arrows, wearable runes) are consumables and keep theirs.
    const keep = (def.drops || [])
      .filter(d => d && ITEMS[d.id] && (ITEMS[d.id].equip || ITEMS[d.id].tool || /^raw_/.test(d.id)))
      .map(d => (ITEMS[d.id].equip && !ITEMS[d.id].stack)
        ? Object.assign({}, d, { ch: Math.min(d.ch != null ? d.ch : 0.1, 0.04) }) : d);
    def.drops = [...dropTable(theme, def.lvl), ...keep];
    if (!def.butcher && (theme === "d" || theme === "q")) {
      const hi = dragonSeaHide(def.name, theme);
      if (hi && ITEMS[hi]) def.butcher = { hide: 1 + Math.floor((def.lvl || 0) / 20), hideItem: hi };
    }
    done++;
  }

  // ---- make the reagents ESSENTIAL: inject them as required inputs into their
  // skill's mid/high recipes (req ≥ reqMin), lesser below the gated-range
  // midpoint, greater above — so both grades have consumers and advancing that
  // skill past the early rungs requires hunting. Early rungs (req < reqMin) stay
  // reagent-free so every skill is playable before you can hunt.
  let injected = 0, gatedSkills = 0;
  for (const t in REAGENTS) {
    for (const R of REAGENTS[t].skills) {
      const [lo, , hi, , skill, reqMin] = R;
      const reqs = [];
      for (const cat in RECIPES) for (const r of RECIPES[cat]) if (r.skill === skill && (r.req || 1) >= reqMin) reqs.push(r.req || 1);
      if (!reqs.length) continue;
      gatedSkills++;
      const split = (Math.min(...reqs) + Math.max(...reqs)) / 2;
      for (const cat in RECIPES) for (const r of RECIPES[cat]) {
        if (r.skill !== skill) continue;
        const rq = r.req || 1;
        if (rq < reqMin) continue;
        const reagent = rq <= split ? lo : hi;
        r.in = r.in || {};
        if (!(reagent in r.in)) { r.in[reagent] = 1; injected++; }
      }
    }
  }

  if (typeof window !== "undefined") { window.__bestiaryDropsApplied = done; window.__reagentInjected = injected; window.__reagentGatedSkills = gatedSkills; }
})();
