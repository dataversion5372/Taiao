// First days in Newhaven — the authored post-graduation goal arc.
//
// The Bifrost crossing used to be a cliff: goalState() returns cur:null the
// moment t.graduated flips, the Goals tab collapses to "no goals remain",
// and a fresh graduate stands in Newhaven with a full pack and no thread to
// pull. This module hands them four first days' worth of thread:
//
//   1. bank the isle goods       (the pack is full — teach the shared vault)
//   2. take a ✦ quest            (the loop that replaces the keepers)
//   3. attune a portal           (the travel unlock that makes 4 painless)
//   4. set foot in a new biome   (the world is bigger than these plains)
//
// Steps are POLLED, not evented — quests/portals/biome are all cheap global
// reads, so a player who does them out of order (or did them before this
// module shipped) gets instant credit. Only bank deposits need a wire: we
// wrap depositToBank the same way pulse.js does (shared-global bundle scope,
// wrap-by-reassignment; this file loads after both ui.js and pulse.js).
//
// State nests under player.tutorial.arc — player.tutorial round-trips whole
// through storage.js, so no save-schema change. Veterans whose saves carry
// player.tutorial === null (pre-isle era) never see the arc; graduates from
// BEFORE this module get it seeded on their next boot, with any already-done
// steps checking off at once.
//
// main.js calls GoalsArc.tick() beside Tutorial.tick() (same !cine gate, so
// the arc stays silent until the Bifrost cinematic has let go of the sky);
// main/ui.js renderGoals() consults GoalsArc.state() for the graduated view.
var GoalsArc = (() => {
  "use strict";

  const NEED_DEPOSITS = 3; // "goods", plural — three stacks vaulted

  function arc() {
    const t = typeof player !== "undefined" && player.tutorial;
    if (!t || typeof t !== "object" || !t.graduated) return null;
    return t.arc || null;
  }

  // seeded on the first post-cinematic tick after graduation (also catches
  // pre-module graduates mid-world: their "home" biome is wherever they
  // stand, which keeps step 4 honest — somewhere they haven't been settling)
  function seed() {
    const t = player.tutorial;
    t.arc = {
      start: typeof world !== "undefined" && world.biomeAt ? world.biomeAt(player.x, player.y) : -1,
      dep: 0,          // deposits made since graduation
      s: {},           // stepId -> 1 once credited
      done: 0,
    };
    if (typeof log === "function")
      log("Newhaven, then. Your first days begin — the Goals tab holds the thread.", "gold");
    if (typeof saveGame === "function") saveGame();
    return t.arc;
  }

  // GRASS and MEADOW interleave across the whole Newhaven lowland (and FARM
  // rings every settlement), so from a plains start they count as one home
  // turf — otherwise step 4 pops on the first field boundary. Water and
  // beach never count: wading a river isn't "sampling a biome".
  const HOME_LOWLAND = () => new Set([B.GRASS, B.MEADOW, B.FARM]);
  const NEVER_NEW = () => new Set([B.DEEP, B.WATER, B.SAND]);
  function inNewBiome(a) {
    const b = world.biomeAt(player.x, player.y);
    if (b == null || NEVER_NEW().has(b)) return false;
    const home = HOME_LOWLAND();
    if (home.has(a.start)) return !home.has(b);
    return b !== a.start;
  }

  // ---------- the four steps ----------
  // check() runs at 1 Hz; label/need/num feed renderGoals' pill rows.
  const STEPS = [
    { id: "bank", label: "Bank your isle goods", need: NEED_DEPOSITS,
      num: a => Math.min(a.dep, NEED_DEPOSITS),
      check: a => a.dep >= NEED_DEPOSITS,
      hint: () => "Newhaven keeps a bank — and every road-linked town shares the same vault, so nothing you deposit is ever far away.",
      doneLine: "Your isle goods are vaulted. Any road-linked bank hands them back." },
    { id: "quest", label: "Take a quest from a ✦ villager", need: 1,
      num: a => questTaken() ? 1 : 0,
      check: () => questTaken(),
      hint: hintQuest,
      doneLine: "First quest taken — the journal (J) keeps the thread from here." },
    { id: "portal", label: "Attune your first portal", need: 1,
      num: () => portalCount() ? 1 : 0,
      check: () => portalCount() >= 1,
      hint: hintPortal,
      doneLine: "Portal attuned. Every portal you touch joins the same web — distance is now a choice." },
    { id: "biome", label: "Set foot in a neighbouring biome", need: 1,
      num: a => a.s.biome ? 1 : 0,
      check: a => inNewBiome(a),
      hint: () => "Plains and meadow are home turf. Pick a direction and walk until the land itself changes — the map (M) shows where the colours turn.",
      doneLine: "New ground underfoot — and the world holds thirty-seven kinds of it." },
  ];

  const questTaken = () => {
    const q = player.quests;
    return !!q && (Object.keys(q.active || {}).length > 0 || Object.keys(q.done || {}).length > 0);
  };
  const portalCount = () => Object.keys(player.portals || {}).length;

  // ---------- nearest-✦ / nearest-portal hints ----------
  // Icon/POI scans cost real work, so hints memoize for 5 s and only run
  // while the Goals panel is actually open (state() is render-driven).
  const DIR8 = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  function bearing(dx, dy) { // map-space; -y is north
    const a = Math.atan2(dx, -dy);
    return DIR8[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  }
  let hintAt = 0, hintFor = "", hintTxt = "";
  function memoHint(id, build) {
    const now = performance.now();
    if (id === hintFor && now - hintAt < 5000) return hintTxt;
    hintFor = id; hintAt = now;
    try { hintTxt = build(); } catch (e) { hintTxt = ""; }
    return hintTxt;
  }
  function nearest(list, mx, my) {
    let best = null, bd = Infinity;
    for (const p of list) {
      const d = (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my);
      if (d < bd) { bd = d; best = p; }
    }
    return best && { p: best, d: Math.sqrt(bd) };
  }
  function hintQuest() {
    return memoHint("quest", () => {
      const mx = player.x / 2, my = player.y / 2, R = 150;
      const icons = world.iconsNearForMap(mx - R, my - R, mx + R, my + R)
        .filter(ic => ic.type === "quest");
      const n = nearest(icons, mx, my);
      if (!n) return "Villagers with a gold ✦ overhead have work for you — every settlement keeps a few.";
      return `Look for the gold ✦ over a villager's head — the nearest is ~${Math.round(n.d * 2)} tiles ${bearing(n.p.x - mx, n.p.y - my)} of you.`;
    });
  }
  function hintPortal() {
    return memoHint("portal", () => {
      const mx = player.x / 2, my = player.y / 2, R = 400;
      const pois = world.poisNearForMap(mx - R, my - R, mx + R, my + R, 26)
        .filter(p => p && p.type === "portal");
      const n = nearest(pois, mx, my);
      if (!n) return "Standing stones with a humming ring dot the wilds — walk up to one and it attunes to you.";
      return `The ${n.p.name} stands ~${Math.round(n.d * 2)} tiles ${bearing(n.p.x - mx, n.p.y - my)} of you. Walk up to it and it attunes.`;
    });
  }

  // ---------- progress ----------
  function pulseNote(k) {
    try { if (typeof Pulse !== "undefined" && Pulse.noteEvent) Pulse.noteEvent(k); } catch (e) {}
  }
  let accum = 0;
  function tick(dt) {
    if (typeof player === "undefined" || !player.tutorial || typeof player.tutorial !== "object"
        || !player.tutorial.graduated) return;
    accum += dt || 0.016;
    if (accum < 1) return; // 1 Hz is plenty for polled steps
    accum = 0;
    const a = arc() || seed();
    if (a.done) return;
    let changed = false;
    for (const st of STEPS) {
      if (a.s[st.id]) continue;
      let ok = false;
      try { ok = st.check(a); } catch (e) {}
      if (!ok) continue;
      a.s[st.id] = 1; changed = true;
      if (typeof log === "function") log(st.doneLine, "gold");
      if (typeof sfx === "function") sfx("quest", 0.5);
      pulseNote("arc:" + st.id);
    }
    if (changed && STEPS.every(st => a.s[st.id])) {
      a.done = 1;
      if (typeof log === "function")
        log("First days in Newhaven, complete. The wide world is truly yours now.", "gold");
      pulseNote("arc:done");
    }
    if (changed) {
      if (typeof uiDirty !== "undefined") uiDirty = true;
      if (typeof saveGame === "function") saveGame();
    }
  }

  // ---------- bank-deposit wire (pulse.js wrap pattern) ----------
  if (typeof depositToBank === "function") {
    const orig = depositToBank;
    depositToBank = function (i, n) {
      try {
        const a = arc();
        if (a && !a.s.bank) { a.dep++; if (typeof uiDirty !== "undefined") uiDirty = true; }
      } catch (e) {}
      return orig(i, n);
    };
  }

  // ---------- render snapshot for main/ui.js renderGoals ----------
  function state() {
    const a = arc();
    if (!a) return null;
    const rows = STEPS.map(st => ({
      on: !!a.s[st.id], label: st.label, num: a.s[st.id] ? st.need : st.num(a), need: st.need,
    }));
    const doneN = rows.filter(r => r.on).length;
    const cur = a.done ? null : STEPS.find(st => !a.s[st.id]);
    return {
      done: !!a.done, doneN, total: STEPS.length,
      cur: cur ? { label: cur.label, hint: cur.hint() } : null,
      rows,
    };
  }

  return { tick, state };
})();
window.GoalsArc = GoalsArc;
