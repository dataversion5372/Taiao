// Easter eggs — ~25 small secrets seeded through the world (2026-09-16).
//
// Design rules:
//  · CHEAP: every egg rides an existing system (decor examine, POI lattice,
//    birdflight, the split roster, the bank) — no new art beyond the moa
//    footprint tile, no new systems.
//  · DISCOVERED, never announced: nothing points at an egg; the trigger IS
//    the reveal. Misses are silent.
//  · TRACKED: first discovery per save lands in player.quests.flags
//    ("egg:<id>", ms timestamp — quests.flags already round-trips through
//    storage.js) and is reported to Play Pulse (Pulse.noteEgg) so the I-key
//    viewer — and later the Phase-1 server — can learn which eggs land.
//  · Nothing here touches Māori narrative figures — that content waits for
//    cultural consultation (roadmap §6.5). Natural fauna, common-usage te
//    reo bird names, and the game's own history only.
//
// The full set (ids as reported to Pulse):
//   moa_prints           examine a footprint trail that ends mid-field
//   gravestone_memorial  1-in-19 gravestones: feathers, no name
//   bush_weka            1-in-31 bushes: a weka explodes out
//   boulder_fossil       1-in-23 boulders: a pressed fern
//   flower_braid         1-in-37 white flowers: an old plait
//   examine_snark        examine the same thing 5× in a row
//   wishing_well         toss a coin (one a day; the well remembers)
//   bank_42              deposit exactly 42 coins
//   hermit_names         the Hermit names your split selves
//   so_it_goes           Kurt the Gravedigger ends every line the same way
//   bestiary_lore        read an extinct bird's lore line (silent credit)
//   fantail_escort       pīwakawaka keep pace with you after rain
//   fantail_shoulder     stand dead still 5 min; one lands beside you
//   hakawai_night        hear the Hakawai overhead at night
//   pouakai_shadow       the Pouākai's shadow crosses you
//   ruru_midnight        a ruru calls at the stroke of midnight
//   stone_circle_midnight / fairy_ring / hot_spring_soak / lighthouse_storm
//   graveyard_dusk       old birdsong where the ground remembers
//   five_selves          all five of you on one spot
//   rain_on_roof         shelter indoors through rain
//   portal_web           the tenth portal knows you
//   split_registrar      split in front of Newhaven's Registrar
var Eggs = (() => {
  "use strict";

  // ---------- persistence ----------
  // player.quests.flags is the idiomatic persisted string->value bag
  // (quests.js seeds the same shape lazily; matching it here is safe).
  function flags() {
    if (typeof player === "undefined") return {};
    const st = player.quests || (player.quests = { active: {}, done: {}, flags: {}, revealed: [] });
    return st.flags || (st.flags = {});
  }
  function isFound(id) { return !!flags()["egg:" + id]; }
  function found(id, line) {
    const f = flags();
    if (f["egg:" + id]) return false;
    f["egg:" + id] = Date.now();
    if (line && typeof log === "function") log(line, "gold");
    try { if (typeof Pulse !== "undefined" && Pulse.noteEgg) Pulse.noteEgg(id); } catch (e) {}
    if (typeof saveGame === "function") saveGame();
    return true;
  }
  // deterministic per-tile hash for the rare-examine variants (no world seed
  // needed: WHICH tiles carry a gravestone/bush already varies per world)
  function hash32(x, y, salt) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263;
    for (let i = 0; i < salt.length; i++) h = (h ^ salt.charCodeAt(i)) * 16777619;
    h = (h ^ (h >>> 13)) * 1274126177;
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ---------- rare examine variants + the footprint trail ----------
  const RARE_EXAMINE = {
    gravestone: { mod: 19, egg: "gravestone_memorial",
      text: "No name on this one — only feathers cut deep into the stone: a huia's tail, a moa's great foot, a snipe on the wing. Somebody keeps the evenings for them." },
    bush: { mod: 31, egg: "bush_weka",
      text: "You lean in close — and a weka EXPLODES from the leaves, fixes you with a stare of ancient contempt, and strolls away entirely unhurried." },
    boulder: { mod: 23, egg: "boulder_fossil",
      text: "A fern frond lies pressed flat in the stone: one green afternoon, kept — older than every name in every register." },
    flower_white: { mod: 37, egg: "flower_braid",
      text: "Someone braided these stems together long ago, and the flowers have kept the plait ever since." },
  };
  function rareAt(base, x, y) {
    const r = RARE_EXAMINE[base];
    return r && hash32(x, y, base) % r.mod === 0 ? r : null;
  }
  // input.js consults this BEFORE decorExamine — a non-null return replaces
  // the stock examine text for this one hashed tile
  function examineOverride(dk, x, y) {
    const r = rareAt(dk.split("#")[0], x, y);
    return r ? r.text : null;
  }
  // called when the player actually CLICKS Examine (credit on read, not on
  // menu-build) — also runs the repeat-examine snark ladder
  let lastEx = { k: "", n: 0 };
  function onExamine(dk, x, y) {
    const base = dk.split("#")[0];
    if (base === "footprint_moa") found("moa_prints", null); // the text is the content
    const r = rareAt(base, x, y);
    if (r) found(r.egg, null);
    const k = x + "," + y + "," + base;
    if (k === lastEx.k) lastEx.n++; else lastEx = { k, n: 1 };
    if (typeof log !== "function") return;
    const nm = (typeof decorName === "function" && decorName(dk)) || "thing";
    if (lastEx.n === 3) log(`Still the same ${nm}.`, "sys");
    else if (lastEx.n === 5) { log(`The ${nm} has not changed. You, though — are you quite all right?`, "sys"); found("examine_snark", null); }
    else if (lastEx.n === 9) log(`Fine. FINE. It is a deeply fascinating ${nm} and everyone else has been walking right past it.`, "sys");
  }

  // ---------- the wishing well ----------
  // One coin per real day, and the well remembers the running count forever.
  const WELL_KEYS = new Set(["well", "well_roofed", "fountain_small", "city_fountain"]);
  function wellMenu(dk, x, y) {
    if (!WELL_KEYS.has(dk.split("#")[0])) return null;
    return { label: "Toss a coin in", fn: () => {
      if (typeof countItem !== "function" || countItem("coins") < 1) {
        log("You pat your pockets. Not a single coin to spare for wishes.", "sys"); return;
      }
      const f = flags();
      if (Date.now() - (f["well:last"] || 0) < 86400000) {
        log("One wish a day — the well is still turning today's coin over.", "sys"); return;
      }
      removeItem("coins", 1);
      f["well:last"] = Date.now();
      const n = (f["well:coins"] = (f["well:coins"] || 0) + 1);
      if (typeof addFloat === "function") addFloat("✦", x, y, "#ffd75e", 14);
      if (typeof sfx === "function") sfx("coins", 0.5);
      if (n === 1) log("The coin turns twice as it falls, catches the light, and is gone. Far below, the smallest splash. The well remembers.", "gold");
      else if (n === 7) log("Seven coins now. The well is keeping a tally — and so, apparently, are you.", "gold");
      else if (n === 30) log("Thirty coins. Whatever it is you keep wishing for, the well is rooting for you too now.", "gold");
      else log(`The coin falls a long while before the splash. (That's ${n} wishes this well holds for you.)`, "sys");
      found("wishing_well", null);
      if (typeof saveGame === "function") saveGame();
    } };
  }

  // ---------- scripted NPCs (the Hermit, Kurt) ----------
  // chunks.js deriveNpcs stamps one at every hermitage/graveyard POI with an
  // _egg tag; npc-chat.js routes their Enter-chat through here instead of
  // the retrieval bank. Return null to fall through to the normal pipeline.
  const SELF_NAMES = ["Porridge", "Left Boot", "The Quiet One", "Backwards", "Tuesday",
                      "Pebble", "Second Breakfast", "Doubt", "Echo", "The Spare"];
  function npcReply(npc, text) {
    if (!npc || !npc._egg) return null;
    if (npc._egg === "soitgoes") {
      found("so_it_goes", null);
      const t = (text || "").toLowerCase();
      let line;
      if (!text) line = "Fresh earth today. There's always fresh earth.";
      else if (/die|death|dead|grave|bur(y|ied)|kill/.test(t)) line = "Everyone I work for was somebody's whole world, once.";
      else if (/hello|\bhi\b|kia ora|who are|your name/.test(t)) line = "Kurt. I dig. The ground and I have an understanding.";
      else if (/why|how|what/.test(t)) line = "The birds ask me that too. The ground keeps what the sky lets fall.";
      else line = "Hm. The shovel has heard stranger.";
      return line + " So it goes.";
    }
    if (npc._egg === "hermit") {
      const bodies = (typeof player !== "undefined" && player.bodies) || [];
      const selves = [player.num || 1, ...bodies.map(b => b && b.num).filter(Boolean)].sort((a, b) => a - b);
      found("hermit_names", null);
      if (selves.length <= 1)
        return "Just the one of you today? A pity. Bring the others next time — I remember all their names. Even the ones I haven't given yet.";
      const f = flags();
      if (f["hermit:salt"] == null) f["hermit:salt"] = Math.floor(Math.random() * SELF_NAMES.length);
      const named = selves.map(n => {
        const k = "hermit:name:" + n;
        if (!f[k]) f[k] = SELF_NAMES[(n * 3 + f["hermit:salt"]) % SELF_NAMES.length];
        return `№${n} is "${f[k]}"`;
      });
      if (typeof saveGame === "function") saveGame();
      return `Ah — ${selves.length} of you walking about today! Let me see: ${named.join(", ")}. Yes, I named you all. Somebody had to.`;
    }
    return null;
  }

  // ---------- the 42-coin deposit (wrap-by-reassignment, pulse.js pattern) ----------
  if (typeof depositToBank === "function") {
    const orig = depositToBank;
    depositToBank = function (i, n) {
      try {
        const s = player.inv[i];
        if (s && s.id === "coins" && Math.min(n, s.qty) === 42)
          found("bank_42", "The clerk pauses mid-count and looks at you with sudden respect. “The Answer,” they murmur. “Banked at last.”");
      } catch (e) {}
      return orig(i, n);
    };
  }

  // ---------- the 1 Hz condition eggs ----------
  // Cheap guards only: the POI neighbourhood memoizes for 10 s, monster
  // scans walk the live `monsters` array once, and every found egg's checks
  // stop running entirely.
  let pois = [], poisAt = 0;
  function nearPois() {
    if (typeof world === "undefined" || !world.poisNearForMap) return pois;
    const t = performance.now();
    if (t - poisAt < 10000) return pois;
    poisAt = t;
    const mx = player.x / 2, my = player.y / 2, R = 14;
    try { pois = world.poisNearForMap(mx - R, my - R, mx + R, my + R, 8) || []; } catch (e) { pois = []; }
    return pois;
  }
  function poiDist(type) {
    let d = Infinity;
    for (const p of nearPois())
      if (p && p.type === type)
        d = Math.min(d, Math.hypot(p.x * 2 - player.x, p.y * 2 - player.y));
    return d; // game tiles
  }
  function monNear(kind, r) {
    let best = null, bd = r * r;
    for (const m of (typeof monsters !== "undefined" ? monsters : [])) {
      if (!m || m.dead || (m.kind || "").replace(/_v$/, "") !== kind) continue;
      const d = (m.x - player.x) ** 2 + (m.y - player.y) ** 2;
      if (d <= bd) { bd = d; best = m; }
    }
    return best;
  }
  const clockMins = () => typeof localPhase === "function"
    ? Math.floor(localPhase(player.x) * 1440) % 1440 : -1;
  const raining = () => typeof weatherNow === "function" && (weatherNow() || {}).kind === "rain";

  const holds = {}; // eggId -> accumulated seconds while its condition holds
  function held(id, ok, needSec) {
    if (!ok) { holds[id] = 0; return false; }
    holds[id] = (holds[id] || 0) + 1;
    return holds[id] >= needSec;
  }

  let idleAt = { x: null, y: null, t: 0 };
  let lastBodies = 0;

  // Each entry: [id, () => boolean, line]. Checked only until found.
  const TICKS = [
    ["fantail_escort", () => {
      const wet = typeof window !== "undefined" && window.__eggRainUntil > Date.now();
      if (!wet) return held("fantail_escort", false, 1);
      let n = 0;
      for (const m of (typeof monsters !== "undefined" ? monsters : []))
        if (m && (m.kind || "").replace(/_v$/, "") === "piwakawaka" &&
            Math.hypot(m.x - player.x, m.y - player.y) <= 7) n++;
      return held("fantail_escort", n >= 2, 25);
    }, "Two pīwakawaka flit from perch to perch behind you, keeping perfect pace. After rain, it seems, you rate an escort."],
    ["fantail_shoulder", () => {
      if (player.x !== idleAt.x || player.y !== idleAt.y) { idleAt = { x: player.x, y: player.y, t: 0 }; return false; }
      idleAt.t++;
      if (idleAt.t < 300) return false;
      const m = monNear("piwakawaka", 2);
      return !!m && (m.flyY == null || m.flyY < 1.6);
    }, "A pīwakawaka lands an arm's length away and regards you — briefly, sincerely convinced you are furniture."],
    ["hakawai_night", () => {
      const mins = clockMins();
      const night = mins >= 0 && (mins >= 1290 || mins <= 270); // 21:30–04:30
      const m = night && monNear("hakawai", 14);
      return !!m && m.flyY != null && m.flyY > 1.3;
    }, "From high dark air comes a sound like the sky tearing along a seam — the Hakawai. Very few alive have heard it."],
    ["pouakai_shadow", () => {
      const m = monNear("pouakai", 9);
      return !!m && m.flyY != null && m.flyY > 1.3;
    }, "A shadow the size of a rowboat sweeps across the grass. High above, unhurried, the Pouākai rides the wind."],
    ["ruru_midnight", () => {
      const mins = clockMins();
      return (mins >= 1430 || (mins >= 0 && mins <= 10)) && !!monNear("ruru", 10);
    }, "Midnight, exactly. Close by, a ruru calls twice — once for the day gone, once for the one to come."],
    ["stone_circle_midnight", () => {
      const mins = clockMins();
      return (mins >= 1430 || (mins >= 0 && mins <= 10)) && poiDist("stonecircle") < 12;
    }, "At the stroke of midnight the stones hum — very softly, in a key you almost remember."],
    ["fairy_ring", () => held("fairy_ring", poiDist("fairyring") < 5, 4),
      "You stand inside the ring. Nothing happens. Which is exactly what a fairy ring would want you to think. (Don't eat the mushrooms.)"],
    ["hot_spring_soak", () => held("hot_spring_soak", poiDist("hotspring") < 8, 30),
      "You soak a while in the steam. Your worries poach gently."],
    ["lighthouse_storm", () => raining() && poiDist("lighthouse") < 20,
      "Rain lashes the lantern room, and the keeper's light does not so much as flinch."],
    ["graveyard_dusk", () => {
      const mins = clockMins();
      return mins >= 1050 && mins <= 1110 && poiDist("graveyard") < 16;
    }, "In the failing light you would swear you hear birdsong no one has heard in three hundred years. The ground remembers evenings."],
    ["five_selves", () => {
      const bodies = player.bodies || [];
      return bodies.length === 4 &&
        bodies.every(b => b && Math.abs(b.x - player.x) <= 2 && Math.abs(b.y - player.y) <= 2);
    }, "All five of you, shoulder to shoulder on one patch of grass. Somewhere, a census clerk wakes in a cold sweat."],
    ["rain_on_roof", () => held("rain_on_roof",
        raining() && typeof world !== "undefined" && world.insideBuilding &&
        !!world.insideBuilding(player.x, player.y), 20),
      "Rain drums on the roof over your head. The old sound, in a new world."],
    ["portal_web", () => Object.keys(player.portals || {}).length >= 10,
      "Ten portals now hum in sympathy as you pass. The web knows you."],
    ["split_registrar", () => {
      const n = 1 + (player.bodies || []).length;
      const grew = n > lastBodies; lastBodies = n;
      return grew && n > 1 && Math.hypot(player.x - 2, player.y - 2) < 9;
    }, "The Registrar looks from you… to you. “The register keeps ONE line per soul,” she calls over. “I shall simply have to write smaller.”"],
  ];

  let accum = 0;
  function tick(dt) {
    if (typeof player === "undefined" || !player) return;
    // the isle keeps its lessons clean of secrets; eggs live in the wide world
    if (typeof Tutorial !== "undefined" && Tutorial.active && Tutorial.active()) return;
    accum += dt || 0.016;
    if (accum < 1) return;
    accum = 0;
    // remember recent rain for the fantail-escort behaviour (birdflight.js
    // reads the same window: rain now, or within the last 10 minutes)
    if (raining() && typeof window !== "undefined")
      window.__eggRainUntil = Date.now() + 10 * 60 * 1000;
    for (const [id, cond, line] of TICKS) {
      if (isFound(id)) continue;
      let ok = false;
      try { ok = cond(); } catch (e) {}
      if (ok) found(id, line);
    }
  }

  // how many eggs exist in total (Pulse's viewer shows found/total). The
  // non-tick, non-rare seven: moa_prints, examine_snark, wishing_well,
  // bank_42, hermit_names, so_it_goes, bestiary_lore. 14 + 4 + 7 = 25.
  const NONTICK = 7;
  const total = () => TICKS.length + Object.keys(RARE_EXAMINE).length + NONTICK;

  return { tick, found, isFound, examineOverride, onExamine, wellMenu, npcReply, total };
})();
window.Eggs = Eggs;
