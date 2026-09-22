// ===== Taiao — the Dream Forest: bigger on the inside =====
// REWRITE (2026-09-16, replacing the parked shrinking-illusion): the forest
// is a pocket dimension, and every scrap of magic happens OFF-SCREEN. Nothing
// on screen ever warps, shrinks, or slows — the picture always looks normal.
// You just… can't square it with the map.
//
// HOW IT WORKS
//   · Every wild Dream Forest patch holds one WAYSTONE GLADE (features.js
//     dreamGateSite): an old standing stone under a twisted dreamwood. Walk
//     PAST THE STONE and you are silently relocated into the shared interior
//     — a column of five level discs + the Heart, carved far away in the
//     tutorial isle's world block (terrain.js DREAM_WORLD). Many doors, one
//     forest.
//   · Every relocation is glade-to-glade, and every glade shares ONE
//     deterministic stamp (chunks.js) out past the clamped view radius — so
//     the screen shows the same pixels before and after a swap. No fade, no
//     flash, no transformation. As far as your eyes know, nothing happened.
//   · Each level has an IN stone (where you arrive) and an OUT stone,
//     55·(lvl+1) map units apart: the walk to the next stone grows linearly,
//     the total walk to the Heart quadratically. Level discs are rimmed with
//     bramble (chunks.js paints it, barred() below enforces it): the only way
//     on is a stone. Cross the stone you arrived by → one level SHALLOWER
//     (level 0 → back out the door you entered; the lost always escape by
//     retreating). Cross the far stone → one level DEEPER.
//   · The only clue to the OUT stone's true bearing is the waystone's moss
//     (a whispered log line when you near a stone) — given in TRUE compass
//     words. Meanwhile the compass and minimap quietly rotate by a quarter
//     turn while you dream (eased so slowly you can't catch it moving), the
//     world map freezes your marker at the door you entered, the sun and the
//     clock hold the door's longitude, and rain never falls near a waystone
//     (weather.js blend — so a downpour can't pop out of existence across a
//     swap). Everything looks right. Everything is slightly wrong.
//   · The reward at the very centre: the HEART — a lamp-lit glade village
//     (chunks.js stamps it; deriveNpcs seats the NPCs) with the Somnolent
//     Pedlar's dream-goods shop (always open), moonflax to pick, and the
//     Matron, who gifts a one-time dream-amber ring and can sing you home.
//
// INVISIBILITY CONTRACT (what keeps the magic off-screen) — if you touch any
// of these, keep them agreeing:
//   · glade stamps identical to r=52 (chunks.js GLADE_RG) > view radius at
//     the in-dream zoom clamp (viewRadius() floor is 48; zoomMax 1.15 → 42);
//   · relocations are pure TRANSLATIONS: position, in-flight step interp,
//     path, goal, forced runs and queued tasks all shift by the same delta,
//     and the camera's smoothed follow point shifts with them (render3d
//     __r3dShiftFollow) — walking never hitches;
//   · destination chunks are PREWARMED (1/frame while you near a stone) and
//     pre-marked seen, so neither the 3D view nor the minimap pops;
//   · spawns are stripped within 60 tiles of any glade (chunks.js) and
//     stamp flora is decor, not nodes — decor-pickup refuses glade tiles —
//     so no creature/stump/gap can differ between two stones;
//   · weather is calm-blended near stones and across the whole interior;
//     sun/clock/day-length hold the entry door's coordinates (daynight.js).
"use strict";

var Dream = (() => {
  const ZOOM_MAX = 1.15;      // in-dream zoom clamp (gameplay/world.js updateZoom)
  const TRIG_R = 3.2;         // crossing = passing this close to a waystone
  const ARM_R = 9;            // must leave this far before a stone re-arms
  const SIGHT_R = 20;         // "that tree again…" sighting radius
  const YAW_LIE = Math.PI / 2;             // the dream's quarter-turn compass lie
  const LIE_RATE = (Math.PI / 180) * 2.2;  // ≤2.2°/s — an unwatchably slow creep
  const DIR8 = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];

  // ---- geometry, in GAME tiles (terrain.js DREAM_WORLD is in map units) ----
  const G = m => ({ x: Math.round(m.x * 2), y: Math.round(m.y * 2) });
  function geo() {
    if (geo._g || typeof DREAM_WORLD === "undefined") return geo._g;
    const LVL = DREAM_WORLD.LVL.map(L => ({
      c: { x: Math.round(L.cx * 2), y: Math.round(L.cy * 2) }, R: L.R * 2,
      IN: G(L.IN), OUT: G(L.OUT), psi: L.psi,
    }));
    const H = DREAM_WORLD.HEART;
    geo._g = { LVL, HEART: { c: { x: Math.round(H.cx * 2), y: Math.round(H.cy * 2) }, R: H.R * 2, IN: G(H.IN) } };
    return geo._g;
  }
  const inRegion = (x, y) => typeof dreamZoneAtMap === "function" && dreamZoneAtMap(x * 0.5, y * 0.5);

  // ---- persisted state (storage.js): { lvl: 0-4 | 5 (Heart) | null, entry: {x,y} | null }
  function st() {
    if (typeof player === "undefined" || !player) return null;
    if (!player.dream || typeof player.dream !== "object") player.dream = { lvl: null, entry: null };
    return player.dream;
  }
  const inside = () => { const s = st(); return s && s.lvl != null ? s.lvl : null; };

  // ---- volatile (per-session) ----
  let armed = {};             // glade id → false until the player has stood clear
  let sighted = {};           // glade id → currently within SIGHT_R
  let sightings = 0;          // re-sightings since the last level change
  let lieCur = 0;             // eased compass-lie radians
  let gateCache = { at: 0, x: 0, y: 0, g: null };
  let pw = { key: null, list: [], i: 0 };
  let saidMoss = {};          // glade id → mossline whispered this arming

  function whisper(msg, cls) { if (typeof log === "function") log(msg, cls || "sys"); }
  const dirWord = deg => DIR8[((Math.round(deg / 45) % 8) + 8) % 8];

  // the nearest real-world door glade (features.js lattice), cached briefly
  function gateNear() {
    if (typeof world === "undefined" || !world.dreamGatesNear) return null;
    const t = (typeof now !== "undefined") ? now : 0;
    if (gateCache.g !== undefined && Math.abs(player.x - gateCache.x) < 6 &&
        Math.abs(player.y - gateCache.y) < 6 && t - gateCache.at < 4000) return gateCache.g;
    const mx = player.x * 0.5, my = player.y * 0.5;
    let best = null, bd = Infinity;
    for (const g of world.dreamGatesNear(mx - 60, my - 60, mx + 60, my + 60)) {
      const gx = Math.round(g.x * 2), gy = Math.round(g.y * 2);
      const d = Math.hypot(gx - player.x, gy - player.y);
      if (d < bd) { bd = d; best = { x: gx, y: gy }; }
    }
    gateCache = { at: t, x: player.x, y: player.y, g: best };
    return best;
  }

  // ---- the silent relocation: a pure translation of everything in motion ----
  function relocate(dx, dy) {
    player.x += dx; player.y += dy;
    player.px = PX(player.x); player.py = PX(player.y);
    const m = player.moving;
    if (m) { m.fx += dx; m.fy += dy; m.tx += dx; m.ty += dy; }
    if (player.goal) {
      if (player.goal.tx != null) player.goal.tx += dx;
      if (player.goal.ty != null) player.goal.ty += dy;
    }
    if (Array.isArray(player.path)) for (const p of player.path) { p.x += dx; p.y += dy; }
    if (Array.isArray(player.forced)) for (const p of player.forced) { p.x += dx; p.y += dy; }
    if (Array.isArray(player.queue)) for (const q of player.queue) {
      if (q.tx != null) q.tx += dx;
      if (q.ty != null) q.ty += dy;
      if (q.goal) { if (q.goal.tx != null) q.goal.tx += dx; if (q.goal.ty != null) q.goal.ty += dy; }
    }
    // the camera's smoothed follow point rides along — zero visible motion
    if (typeof window !== "undefined" && window.__r3dShiftFollow) window.__r3dShiftFollow(dx, dy);
    // an aggroed straggler pinned to the player would never retire (world.js)
    if (typeof monsters !== "undefined") for (const mo of monsters) if (mo.target === player) mo.target = null;
    // make sure the arrival ring is hot and on the minimap (normally the
    // prewarm below has already done all of this)
    const CS = world.CHUNK, pcx = Math.floor(player.x / CS), pcy = Math.floor(player.y / CS);
    for (let cy = -2; cy <= 2; cy++)
      for (let cx = -2; cx <= 2; cx++) {
        world.getChunk(pcx + cx, pcy + cy);
        if (typeof seenChunks !== "undefined") seenChunks.add((pcx + cx) + "," + (pcy + cy));
        if (world.prewarmMapChunk) world.prewarmMapChunk(pcx + cx, pcy + cy);
      }
    armed = {}; sighted = {}; saidMoss = {};
    if (typeof saveGame === "function") saveGame();
  }

  // prewarm one destination chunk per frame while a stone is near
  function prewarm(dest) {
    if (!dest || typeof world === "undefined") return;
    const key = dest.x + "," + dest.y;
    if (pw.key !== key) {
      const CS = world.CHUNK, cx = Math.floor(dest.x / CS), cy = Math.floor(dest.y / CS);
      pw = { key, list: [], i: 0 };
      for (let r = 0; r <= 2; r++)   // centre-out, so the landing tile warms first
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++)
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r) pw.list.push([cx + dx, cy + dy]);
    }
    if (pw.i < pw.list.length) {
      const c = pw.list[pw.i++];
      world.getChunk(c[0], c[1]);
      if (typeof seenChunks !== "undefined") seenChunks.add(c[0] + "," + c[1]);
      if (world.prewarmMapChunk) world.prewarmMapChunk(c[0], c[1]);
    }
  }

  const DEPTH_LINES = [
    "The air stills. Somewhere behind you, a gate you never saw swings to.",
    "The trees stand closer here. The light comes from no particular direction.",
    "You cannot remember how long you have been walking.",
    "Birdsong, but no birds. Or birds, but no song. You forget which is wrong.",
    "The forest is holding its breath.",
  ];

  // one glade's runtime bookkeeping: arming, sightings, the moss whisper, and
  // the crossing itself. Returns true if a relocation fired.
  function glade(id, stone, mossDeg, mossText, onCross) {
    const d = Math.hypot(player.x - stone.x, player.y - stone.y);
    if (armed[id] === undefined) armed[id] = d > ARM_R;
    if (!armed[id] && d > ARM_R) { armed[id] = true; saidMoss[id] = false; }
    if (d < SIGHT_R && !sighted[id]) {
      sighted[id] = true;
      sightings++;
      if (sightings === 2) whisper("That twisted tree… again. Surely not the same one.");
      else if (sightings === 5) whisper("You have passed this tree five times now. Or it has passed you.", "gold");
    } else if (d > SIGHT_R + 14 && sighted[id]) sighted[id] = false;
    if (d < 7 && armed[id] && !saidMoss[id]) {
      saidMoss[id] = true;
      whisper(mossText != null ? mossText :
        `Moss smothers the old waystone — every face but one. The bare face looks ${dirWord(mossDeg)}.`);
    }
    if (armed[id] && d <= TRIG_R && !player.dying) {
      armed[id] = false;
      onCross();
      return true;
    }
    return false;
  }

  function enterAt(gate) {
    const g = geo();
    const s = st();
    if (typeof Split !== "undefined" && Split.count && Split.count() > 1) {
      whisper("The waystone hums, then quiets. The forest will not take a divided soul.", "warn");
      return;
    }
    s.entry = { x: gate.x, y: gate.y };
    s.lvl = 0;
    sightings = 0;
    relocate(g.LVL[0].IN.x - gate.x, g.LVL[0].IN.y - gate.y);
    whisper(DEPTH_LINES[0]);
  }

  function descendFrom(lvl) {          // crossed OUT(lvl)
    const g = geo(), s = st();
    sightings = 0;
    if (lvl >= 4) {
      s.lvl = 5;
      relocate(g.HEART.IN.x - g.LVL[4].OUT.x, g.HEART.IN.y - g.LVL[4].OUT.y);
      whisper("The forest opens. Lamplight, and the smell of bread — a village no map will ever hold.", "gold");
      if (player.quests && !player.quests.flags) player.quests.flags = {};
      if (player.quests && player.quests.flags && !player.quests.flags.dream_heart) {
        player.quests.flags.dream_heart = 1;
        whisper("You have found the Heart of the Dream.", "gold");
      }
    } else {
      s.lvl = lvl + 1;
      relocate(g.LVL[lvl + 1].IN.x - g.LVL[lvl].OUT.x, g.LVL[lvl + 1].IN.y - g.LVL[lvl].OUT.y);
      whisper(DEPTH_LINES[Math.min(lvl + 1, DEPTH_LINES.length - 1)]);
    }
  }

  function ascendFrom(lvl) {           // crossed IN(lvl) — retreating
    const g = geo(), s = st();
    sightings = 0;
    if (lvl === 0) {
      const out = s.entry || (world && world.playerStart) || { x: 0, y: 0 };
      s.lvl = null;
      relocate(out.x - g.LVL[0].IN.x, out.y - g.LVL[0].IN.y);
      whisper("The trees thin. Quite suddenly, you are at the edge of the wood — though you'd swear you walked in for miles.", "gold");
    } else if (lvl === 5) {
      s.lvl = 4;
      relocate(g.LVL[4].OUT.x - g.HEART.IN.x, g.LVL[4].OUT.y - g.HEART.IN.y);
      whisper("The lamplight fades behind you. The long dark walk back begins.");
    } else {
      s.lvl = lvl - 1;
      relocate(g.LVL[lvl - 1].OUT.x - g.LVL[lvl].IN.x, g.LVL[lvl - 1].OUT.y - g.LVL[lvl].IN.y);
      whisper("Back over the waystone. The forest feels… shallower. Slightly.");
    }
  }

  // wake OUTSIDE the dream (death, portal, dev teleport, the Matron's song)
  function wake(silent) {
    const s = st();
    if (!s || s.lvl == null) return;
    s.lvl = null;
    armed = {}; sighted = {}; saidMoss = {}; sightings = 0;
    if (!silent) whisper("The dream lets go of you.", "sys");
  }

  // the Matron's send-home: a gentle white waking, the one WILLING exit
  function singHome() {
    const s = st();
    const out = (s && s.entry) || (world && world.playerStart) || { x: 0, y: 0 };
    let el = (typeof document !== "undefined") ? document.getElementById("dreamfade") : null;
    if (!el && typeof document !== "undefined") {
      el = document.createElement("div");
      el.id = "dreamfade";
      el.style.cssText = "position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity 1.4s ease;z-index:2000";
      document.body.appendChild(el);
    }
    const port = () => {
      if (typeof cancelAction === "function") cancelAction();
      player.moving = null; player.path = []; player.goal = null; player.forced = null;
      relocate(out.x - player.x, out.y - player.y);
      wake(true);
      whisper("You wake at the edge of the wood, the Matron's song still in your ears.", "gold");
    };
    // reduced motion: skip the full-screen white luminance swell — the
    // relocation itself is already a clean cut, and the whisper carries it
    if (el && !(typeof reducedMotion === "function" && reducedMotion())) {
      el.style.opacity = "1";
      setTimeout(port, 1450);
      setTimeout(() => { el.style.opacity = "0"; }, 2400);
    } else port();
  }

  // ---- NPC talk (main/ui.js talkTo routes npc.dreamNpc here) ----
  let matronAt = 0;
  function talk(npc) {
    if (npc.dreamNpc === "pedlar") {
      npc._say = { text: `"Wares from the shallow sleep and the deep. Coin works here too — some things are the same in every world."`, until: performance.now() + 4000 };
      return false;                    // fall through to the shop (trader)
    }
    if (npc.dreamNpc !== "matron") return false;
    const t = performance.now();
    const flags = (player.quests && player.quests.flags) || {};
    if (!flags.dream_heart_gift) {
      if (player.quests && !player.quests.flags) player.quests.flags = {};
      player.quests.flags.dream_heart_gift = 1;
      if (typeof addItem === "function") addItem("dream_amber", 1);
      whisper(`Matron: "Few walk all the way down, dear heart. The forest tests the patient and the observant, and you are both."`, "gold");
      whisper(`She presses a warm amber ring into your palm. "It remembers this place. So will you."`, "gold");
      whisper(`Matron: "Speak to me again when you wish to wake — I will sing you home."`);
      matronAt = t;
      return true;
    }
    if (t - matronAt < 8000) {
      whisper(`The Matron begins, very softly, to sing.`, "gold");
      singHome();
    } else {
      whisper(`Matron: "Rest a while — the Pedlar's lullabies are honest work. Speak to me twice when you want the morning back."`);
      matronAt = t;
    }
    return true;
  }

  // ---- per-frame driver (gameplay/world.js updateWorldStuff) ----
  function update() {
    if (typeof player === "undefined" || !player || typeof world === "undefined") return;
    const g = geo();
    if (!g) return;
    const s = st();
    const lvl = s.lvl;
    const here = inRegion(player.x, player.y);
    // repair: left the region without a crossing (death, portal, dev tp)…
    if (lvl != null && !here) { wake(); return; }
    // …or landed in the region stateless (dev tp, legacy save): adopt a level
    if (lvl == null && here) {
      const dq = dreamSD(player.x * 0.5, player.y * 0.5);
      s.lvl = dq ? dq.lvl : 0;
      if (!s.entry) s.entry = (world && world.playerStart) ? { x: world.playerStart.x, y: world.playerStart.y } : { x: 0, y: 0 };
      return;
    }
    // the compass lie creeps in and out — never a visible snap. Under
    // reduced motion the preference is the opposite: a discrete change
    // over a continuous rotation, so the lie lands instantly instead.
    const lieTarget = lvl != null ? YAW_LIE : 0;
    const rm = typeof reducedMotion === "function" && reducedMotion();
    const dt = 16;                     // updateWorldStuff runs per frame; a fixed step is fine here
    if (rm) lieCur = lieTarget;
    else if (lieCur < lieTarget) lieCur = Math.min(lieTarget, lieCur + LIE_RATE * dt / 1000);
    else if (lieCur > lieTarget) lieCur = Math.max(lieTarget, lieCur - LIE_RATE * dt / 1000);

    if (lvl == null) {
      // OUTSIDE: watch for the nearest door glade
      const gate = gateNear();
      if (!gate) return;
      const d = Math.hypot(player.x - gate.x, player.y - gate.y);
      if (d < 26) {
        prewarm(g.LVL[0].IN);
        // ease the zoom in under the closing canopy so the identical-stamp
        // radius always covers the whole screen at the moment of a crossing.
        // Reduced motion: no continuous zoom — clamp in one step instead
        // (the stamp-radius invariant still needs camZoom ≤ ZOOM_MAX).
        if (typeof camZoom !== "undefined" && camZoom > ZOOM_MAX)
          camZoom = rm ? ZOOM_MAX : camZoom + (ZOOM_MAX - camZoom) * 0.025;
      }
      glade("gate", gate, 0,
        "Moss smothers the old waystone — every face but one. The bare face looks to the heart of the wood.",
        () => enterAt(gate));
      return;
    }
    if (lvl === 5) {
      // the HEART: crossing the arrival stone starts the long walk back
      prewarm(g.LVL[4].OUT);
      glade("h5", g.HEART.IN, 0,
        "This waystone wears no moss at all. Behind you: lamplight. Ahead: the long way home.",
        () => ascendFrom(5));
      return;
    }
    const L = g.LVL[lvl];
    const dIn = Math.hypot(player.x - L.IN.x, player.y - L.IN.y);
    const dOut = Math.hypot(player.x - L.OUT.x, player.y - L.OUT.y);
    if (dIn < 30) prewarm(lvl === 0 ? (s.entry || world.playerStart) : g.LVL[lvl - 1].OUT);
    else if (dOut < 30) prewarm(lvl === 4 ? g.HEART.IN : g.LVL[lvl + 1].IN);
    if (glade("in" + lvl, L.IN, L.psi,
      `Moss smothers the old waystone — every face but one. The bare face looks ${dirWord(L.psi)}.`,
      () => ascendFrom(lvl))) return;
    glade("out" + lvl, L.OUT, L.psi,
      "Moss crowds every face of this waystone but the one that looks back the way you came. Cross here, and the forest deepens.",
      () => descendFrom(lvl));
  }

  // ---- movement seal (gameplay/movement.js moveTo, beside Tutorial.barred) ----
  function barred(nx, ny) {
    const lvl = inside();
    if (lvl == null) return null;
    const g = geo();
    if (!g) return null;
    const D = lvl === 5 ? g.HEART : g.LVL[lvl];
    if (Math.hypot(nx - D.c.x, ny - D.c.y) > D.R - 4)
      return "The brambles knit tight here — there is no way through. Somewhere in this wood stands a stone that is a door.";
    return null;
  }

  // ---- item / node / shop / examine registration ----
  function registerContent() {
    if (typeof ITEMS === "undefined") return;
    const di = (key, base, hue) => {
      if (typeof SPR !== "undefined" && SPR[key]) return;   // bespoke art (quest-icons-data.js)
      if (typeof defineIcon === "function" && typeof SPR !== "undefined" && SPR[base]) defineIcon(key, base, hue);
    };
    const rp = (id, name, note) => { if (typeof registerPlaceholder === "function") registerPlaceholder(id, name, note); };
    if (!ITEMS.moonflax) {
      ITEMS.moonflax = { name: "Moonflax", icon: "i_moonflax", stack: true, value: 260 };
      di("i_moonflax", "i_herb", 9); rp("moonflax", "Moonflax", "pale night-blooming flax — tinted herb placeholder");
    }
    if (!ITEMS.dream_amber) {
      ITEMS.dream_amber = { name: "Dream-amber ring", icon: "i_dream_amber", value: 4200, equip: "ring", hitBonus: 1 };
      di("i_dream_amber", "i_ring", 3); rp("dream_amber", "Dream-amber ring", "the Matron's keepsake — tinted ring placeholder");
    }
    if (!ITEMS.moth_lantern) {
      ITEMS.moth_lantern = { name: "Moth-lantern", icon: "i_moth_lantern", value: 950, place: "candle_scrying", light: 3 };
      di("i_moth_lantern", "i_vial", 6); rp("moth_lantern", "Moth-lantern", "a jar of patient moths — tinted vial placeholder");
    }
    if (!ITEMS.bottled_lullaby) {
      ITEMS.bottled_lullaby = { name: "Bottled lullaby", icon: "i_bottled_lullaby", stack: true, value: 320, potion: { heal: 16 } };
      di("i_bottled_lullaby", "i_vial", 11); rp("bottled_lullaby", "Bottled lullaby", "sleep, corked — tinted vial placeholder");
    }
    if (!ITEMS.dreamwood_charm) {
      ITEMS.dreamwood_charm = { name: "Dreamwood charm", icon: "i_dreamwood_charm", value: 2600, equip: "neck", hitBonus: 1 };
      di("i_dreamwood_charm", "i_amulet", 7); rp("dreamwood_charm", "Dreamwood charm", "a twist of the twisted tree — tinted amulet placeholder");
    }
    if (typeof NODE_TYPES !== "undefined" && !NODE_TYPES.dream_moonflax)
      NODE_TYPES.dream_moonflax = {
        name: "Moonflax", spr: "herb_starbud", skill: "Foraging",
        req: 8, xp: 60, item: "moonflax", tool: null, tick: 1800, depleteCh: 1,
        respawn: 240000, deadSpr: null, gatherVerb: "Pick",
      };
    if (typeof SHOP_TYPES !== "undefined" && !SHOP_TYPES.dream)
      SHOP_TYPES.dream = {
        name: "The Somnolent Pedlar",
        line: `"Take something back with you. Proof, if you like — most people call it a souvenir."`,
        sells: ["moth_lantern", "bottled_lullaby", "dreamwood_charm"],
        buys: (id, d) => ["moonflax", "moth_lantern", "bottled_lullaby", "dreamwood_charm", "dream_amber"].includes(id) || /^herb/.test(id),
      };
    if (typeof DECOR_EXAMINE !== "undefined") {
      if (!DECOR_EXAMINE.pillar_stone) DECOR_EXAMINE.pillar_stone = "An old grey waystone. The moss on it seems… deliberate.";
      if (!DECOR_EXAMINE.tree_dreamwood) DECOR_EXAMINE.tree_dreamwood = "A dreamwood, twisted like a held breath. You feel you have seen this exact tree before.";
    }
  }
  if (typeof window !== "undefined") {
    // content tables (ITEMS/SHOP_TYPES/NODE_TYPES) all exist by the time the
    // bundle reaches this file; register immediately so chunk stamping and
    // shops can rely on them from the first generated chunk
    registerContent();
  }

  const api = {
    update, barred, talk, wake,
    zoomMax: ZOOM_MAX,
    inside,
    yawLie: () => lieCur,
    // the position the WORLD believes you're at while dreaming (world map
    // marker, info-bar X,Y): your walking mapped onto the door's surroundings
    // via the current level's IN stone — you appear to wander near the door,
    // however many miles the dream has actually taken. Pace it out and the
    // numbers don't add up. That is the point.
    mapPos: () => {
      const s = st();
      if (!s || s.lvl == null || !s.entry) return null;
      const g = geo();
      if (!g) return s.entry;
      const a = s.lvl === 5 ? g.HEART.IN : g.LVL[s.lvl].IN;
      return { x: s.entry.x + (player.x - a.x), y: s.entry.y + (player.y - a.y) };
    },
    // daynight anchors: while dreaming, sun/clock/day-length queries about
    // dream coordinates resolve to the door you entered by
    fxX: x => { const s = st(); return (s && s.lvl != null && s.entry && inRegion(x != null ? x : player.x, player.y)) ? s.entry.x : null; },
    fxY: y => { const s = st(); return (s && s.lvl != null && s.entry && inRegion(player.x, y != null ? y : player.y)) ? s.entry.y : null; },
    // weather calm weight 0..1 at GAME (x,y): full over the interior,
    // blending in over the outer 20 tiles of a door glade's stamp
    calmAt: (x, y) => {
      if (inRegion(x, y)) return 1;
      if (typeof world === "undefined" || !world.dreamGatesNear) return 0;
      const mx = x * 0.5, my = y * 0.5;
      let w = 0;
      for (const g of world.dreamGatesNear(mx - 40, my - 40, mx + 40, my + 40)) {
        const d = Math.hypot(g.x * 2 - x, g.y * 2 - y);
        w = Math.max(w, Math.min(1, (72 - d) / 20));
      }
      return Math.max(0, w);
    },
    // decor-pickup guard: nothing inside a glade stamp may be Taken
    inGladeZone: (x, y) => {
      const g = geo();
      if (!g) return false;
      const near = (p) => Math.hypot(x - p.x, y - p.y) <= 53;
      if (inRegion(x, y)) {
        for (const L of g.LVL) if (near(L.IN) || near(L.OUT)) return true;
        return near(g.HEART.IN);
      }
      if (typeof world !== "undefined" && world.dreamGatesNear)
        for (const gt of world.dreamGatesNear(x * 0.5 - 30, y * 0.5 - 30, x * 0.5 + 30, y * 0.5 + 30))
          if (Math.hypot(gt.x * 2 - x, gt.y * 2 - y) <= 53) return true;
      return false;
    },
    blocksSplit: () => inside() != null
      ? "The dream holds you singly — you cannot tear into two selves here." : null,
    // dev/testing helpers (headless verify): positions + direct warps
    debug: {
      geo,
      state: () => st(),
      warpLevel: (i) => {
        const g = geo(), s = st();
        const dest = i === 5 ? g.HEART.IN : g.LVL[i].IN;
        if (!s.entry) s.entry = { x: player.x, y: player.y };
        s.lvl = i;
        relocate(dest.x - player.x, dest.y - player.y);
      },
    },
  };
  if (typeof window !== "undefined") window.Dream = api;
  return api;
})();
