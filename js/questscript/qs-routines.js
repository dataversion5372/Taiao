// ===== QuestScript — NPC routine runner =====
// NPC daily routines are persistent async coroutines. Each routine NPC runs its
// routine(...) section body as "one day"; when the body finishes, the engine
// re-runs it (a day loop, without needing script-level loops — kept out per the
// surface-only design). The body `await`s SUSPENDING verbs that resolve when a
// world condition is met:
//   walk_to(x,y[,level])  arrives at a tile/storey (uses the render3d _escortTarget
//                         locomotion seam; "arrived" == the engine cleared it)
//   sleep_until(hour)     the local clock reaches that hour
//   wait(seconds)         a real-time pause
//   go_to_bed()/climb_to  convenience wrappers over walk_to
//   open_door/close_door/face/say   instant actions
//
// Division of labor: the coroutine DECIDES (sets targets/timers); render3d's
// stepMixNpc executes the MOTION. This file adds no motion of its own.
//
// tickRoutines() is pumped once per frame from the main loop. It is INERT until
// routine(...) scripts are registered (Phase C authors villager.qs etc.), so it
// starts no coroutines for a world with no routines.
"use strict";

(function () {
  const QS = (window.__QS = window.__QS || {});
  const { rNull, asInt, asNum } = QS;

  const running = new Set();   // NPCs with a live coroutine

  const nowMs = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
  const curHour = x => (typeof localPhase === "function" ? Math.floor(localPhase(x) * 24) : 0);

  // Suspend the coroutine until predicate() is true (checked each frame by pump).
  // Rejects with {__qsCancel} if the NPC is despawned mid-wait.
  function waitOn(npc, predicate) {
    return new Promise((res, rej) => { (npc._qsWaits || (npc._qsWaits = [])).push({ predicate, res, rej }); });
  }
  const pause = (npc, ms) => { const t = nowMs() + ms; return waitOn(npc, () => nowMs() >= t); };
  // walk toward npc._escortTarget until arrival OR a real-time deadline, then
  // clear the target. The deadline stops a greedy path that can't reach its goal
  // (no NPC pathfinder — see the plan) from wedging the coroutine forever.
  const arrive = (npc, ms) => {
    const dl = nowMs() + (ms || 8000);
    return waitOn(npc, () => !npc._escortTarget || nowMs() >= dl).then(() => { npc._escortTarget = null; });
  };

  // ---- lamplighter support (per-NPC; reuses the daynight/village services) ----
  // Replaces the settlement-level assignLampTasks dispatcher: each villager, at
  // its own twilight, claims the nearest outdoor candle spot still needing work,
  // walks there and sets/collects the stand (lampSpotSet flips the lit state).
  // A shared claim set stops two villagers heading for the same spot.
  const lampClaims = new Set();               // "vx,vy:x,y" claimed this twilight
  function lampVillageFor(npc) {
    if (typeof world === "undefined" || !world || !world.villagesNearPt) return null;
    for (const v of world.villagesNearPt(npc.x, npc.y, 40)) {
      const dx = npc.x - v.x, dy = npc.y - v.y;
      if (dx * dx + dy * dy < v.R * v.R) return v;
    }
    return null;
  }
  function lampModeFor(npc) {                 // "place" (dusk) | "collect" (dawn) | ""
    const v = lampVillageFor(npc); if (!v) return "";
    if (typeof daylightAt !== "function" || typeof sunPhase !== "function" || typeof daylightTrend !== "function") return "";
    const L = daylightAt(npc.y, sunPhase(npc.x));
    if (L <= 0.05 || L >= 0.72) return "";     // full night (all placed) or full day (all stored)
    return daylightTrend(npc.x) < 0 ? "place" : "collect";
  }
  function lampRelease(npc) {
    if (npc._qsLampKey) { lampClaims.delete(npc._qsLampKey); npc._qsLampKey = null; }
    npc._qsLamp = null; npc._qsLampV = null; npc._qsLampMode = null;
  }

  function cancel(npc) {
    running.delete(npc);
    npc._qsRoutine = false;
    lampRelease(npc);   // don't leave a lamp spot claimed by a despawned villager
    const w = npc._qsWaits;
    if (w && w.length) { npc._qsWaits = []; for (const x of w) x.rej && x.rej({ __qsCancel: true }); }
  }

  function startRoutine(npc) {
    if (running.has(npc)) return;
    const sec = window.QuestScript.routineFor(npc);
    if (!sec) return;
    running.add(npc);
    npc._qsRoutine = true;   // flag: this NPC's decisions come from QuestScript (Phase C gates JS wander off)
    loop(npc, sec);
  }

  async function loop(npc, sec) {
    try {
      while (running.has(npc)) {
        const ctx = QS.makeCtx({ npc, script: sec.subject });
        try {
          await QS.run(sec, ctx);
        } catch (e) {
          if (e && e.__qsCancel) break;                 // despawned — stop the coroutine
          if (!(e === QS.STOP || (e && e.__qsStop))) {   // stop() ends the day early (fine)
            console.error("QuestScript routine error in", sec.subject, e);
            await pause(npc, 2000).catch(() => {});
          }
        }
        // guard: a body with no suspends must not busy-spin the microtask queue
        await pause(npc, 300).catch(() => {});
      }
    } finally { cancel(npc); }
  }

  // Called every frame. Starts coroutines for new routine NPCs, resolves pending
  // waits, and cancels coroutines for NPCs that have left world.npcs.
  function tickRoutines() {
    if (typeof world === "undefined" || !world || !world.npcs) return;
    const npcs = world.npcs;
    if (running.size) { const live = new Set(npcs); for (const npc of running) if (!live.has(npc)) cancel(npc); }
    for (const npc of npcs) {
      if (npc._home && !running.has(npc) && window.QuestScript.routineFor(npc)) startRoutine(npc);
      // pump pending waits for ANY npc — routine NPCs and also role/talk scripts
      // that use timing verbs (e.g. the Weaver's wait() after a veil teleport).
      if (npc._qsWaits && npc._qsWaits.length) pump(npc);
    }
  }
  function pump(npc) {
    const w = npc._qsWaits;
    if (!w || !w.length) return;
    for (let i = 0; i < w.length; i++) {
      let ok = false;
      try { ok = w[i].predicate(); } catch (e) { ok = true; }   // a throwing predicate resolves (fail-open)
      if (ok) { const res = w[i].res; w.splice(i, 1); i--; res(); }
    }
  }

  // ---- suspending + instant routine verbs (added to the shared command table) --
  Object.assign(QS.builtins, {
    // walk to a tile (optionally a storey); resolves on arrival. Uses the existing
    // _escortTarget mover in render3d (auto-handles doors/ladders/stuck-recovery).
    walk_to: async (args, ctx) => {
      const npc = ctx.npc; if (!npc) return rNull();
      const x = asInt(args[0] && args[0].value), y = asInt(args[1] && args[1].value);
      const lv = args.length > 2 ? asInt(args[2].value) : (npc.level | 0);
      npc._escortTarget = [x, y, lv];
      await arrive(npc);
      return rNull();
    },
    walk_home: async (_a, ctx) => {
      const npc = ctx.npc; if (!npc) return rNull();
      const hx = npc._home ? npc._home[0] : npc.x, hy = npc._home ? npc._home[1] : npc.y;
      npc._escortTarget = [hx, hy, 0];
      await arrive(npc);
      return rNull();
    },
    go_to_bed: async (_a, ctx) => {
      const npc = ctx.npc; if (!npc) return rNull();
      const bx = npc._bed ? npc._bed[0] : (npc._home ? npc._home[0] : npc.x);
      const by = npc._bed ? npc._bed[1] : (npc._home ? npc._home[1] : npc.y);
      npc._escortTarget = [bx, by, npc._bed ? (npc._bedLevel | 0) : 0];
      await arrive(npc, 12000);   // bedtime walk may cross the whole building + a ladder
      return rNull();
    },
    climb_to: async (args, ctx) => {
      const npc = ctx.npc; if (!npc) return rNull();
      npc._escortTarget = [npc.x, npc.y, asInt(args[0] && args[0].value)];
      await arrive(npc, 8000);
      return rNull();
    },
    // leashed idle wander: about half the time just stand a while, otherwise pick
    // a walkable tile within `radius` of home and stroll to it. Reproduces the
    // feel of the old JS wander (render3d stepMixNpc) as a routine step.
    wander: async (args, ctx) => {
      const npc = ctx.npc; if (!npc) return rNull();
      const r = Math.max(1, args.length ? asInt(args[0].value) : (npc._r || 3));
      if (Math.random() < 0.5) { await pause(npc, 1200 + Math.random() * 3200); return rNull(); }
      const hx = npc._home ? npc._home[0] : npc.x, hy = npc._home ? npc._home[1] : npc.y;
      let tx = npc.x, ty = npc.y;
      for (let i = 0; i < 6; i++) {
        const cx = hx + (Math.floor(Math.random() * (2 * r + 1)) - r);
        const cy = hy + (Math.floor(Math.random() * (2 * r + 1)) - r);
        if (typeof world !== "undefined" && world.isBlocked && (world.isBlocked(cx, cy) || (world.isWater && world.isWater(cx, cy)))) continue;
        tx = cx; ty = cy; break;
      }
      npc._escortTarget = [tx, ty, npc.level | 0];
      await arrive(npc, 5000);
      return rNull();
    },
    // wait until the local clock next reaches `hour` (0..23). Robust to the clock
    // being anywhere and to time jumps: if the hour is still ahead today, resolve
    // when we reach/pass it; if it already passed today, resolve after the wrap
    // past midnight brings us back to it. (A plain "curHour === h" could be missed
    // forever if the clock ever steps past h — e.g. under the time-offset cheat.)
    sleep_until: async (args, ctx) => {
      const npc = ctx.npc; const h = ((asInt(args[0] && args[0].value) % 24) + 24) % 24;
      const x = npc ? npc.x : (typeof player !== "undefined" && player ? player.x : 0);
      // localPhase already returns 0..1; don't re-wrap it (that adds float error
      // that can leave p a hair below tp at the exact boundary). EPS covers the
      // remaining boundary equality so a wake hour is never skipped.
      const ph = () => (typeof localPhase === "function" ? localPhase(x) : 0);
      const EPS = 1e-6, tp = h / 24, p0 = ph();
      await waitOn(npc || {}, () => {
        const p = ph();
        return p0 <= tp + EPS ? (p >= tp - EPS) : (p >= tp - EPS && p < p0);   // ahead-today vs. wrap-to-next
      });
      return rNull();
    },
    // real-time pause in seconds
    wait: async (args, ctx) => { await pause(ctx.npc || {}, Math.max(0, asNum(args[0] && args[0].value)) * 1000); return rNull(); },

    // instant actions (location-addressable; the NPC is expected to be adjacent)
    open_door: async (args) => { const x = asInt(args[0] && args[0].value), y = asInt(args[1] && args[1].value); if (typeof world !== "undefined" && world.setDoorOpen) world.setDoorOpen(x, y, true); return rNull(); },
    close_door: async (args) => { const x = asInt(args[0] && args[0].value), y = asInt(args[1] && args[1].value); if (typeof world !== "undefined" && world.setDoorOpen) world.setDoorOpen(x, y, false); return rNull(); },
    face: async (args, ctx) => { if (ctx.npc && args[0]) ctx.npc.dir8 = QS.asStr(args[0].value); return rNull(); },
    say: async (args, ctx) => { if (ctx.npc && typeof npcSay === "function") npcSay(ctx.npc, QS.asStr(args[0] && args[0].value)); return rNull(); },

    // ---- lamplighter verbs -------------------------------------------------
    // "place" at dusk, "collect" at dawn, "" otherwise (for THIS npc's town/time).
    lamp_mode: async (_a, ctx) => QS.rStr(ctx.npc ? lampModeFor(ctx.npc) : ""),
    // claim the nearest outdoor spot still needing work; TRUE if one was claimed.
    claim_lamp_spot: async (_a, ctx) => {
      const npc = ctx.npc; if (!npc) return QS.rBool(false);
      const v = lampVillageFor(npc), mode = lampModeFor(npc);
      if (!v || !mode || typeof villageCandleSpots !== "function" || typeof lampSpotPlaced !== "function") return QS.rBool(false);
      const vk = v.x + "," + v.y;
      let best = null, bd = Infinity;
      for (const s of villageCandleSpots(v)) {
        if (s.inside) continue;                                  // residents light their own homes
        const placed = lampSpotPlaced(v, s.x, s.y);
        const need = mode === "place" ? placed !== true : placed === true;
        if (!need) continue;
        const key = vk + ":" + s.x + "," + s.y;
        if (lampClaims.has(key)) continue;
        const d = Math.abs(s.x - npc.x) + Math.abs(s.y - npc.y);
        if (d < bd) { bd = d; best = s; }
      }
      if (!best) return QS.rBool(false);
      npc._qsLampKey = vk + ":" + best.x + "," + best.y;
      lampClaims.add(npc._qsLampKey);
      npc._qsLampV = v; npc._qsLamp = [best.x, best.y]; npc._qsLampMode = mode;
      return QS.rBool(true);
    },
    lamp_spot_x: async (_a, ctx) => QS.rInt(ctx.npc && ctx.npc._qsLamp ? ctx.npc._qsLamp[0] : (ctx.npc ? ctx.npc.x : 0)),
    lamp_spot_y: async (_a, ctx) => QS.rInt(ctx.npc && ctx.npc._qsLamp ? ctx.npc._qsLamp[1] : (ctx.npc ? ctx.npc.y : 0)),
    // set the stand down (place) or pick it up (collect) at the claimed spot.
    light_lamp: async (_a, ctx) => {
      const npc = ctx.npc; if (!npc || !npc._qsLamp) return rNull();
      if (npc._qsLampV && typeof lampSpotSet === "function")
        lampSpotSet(npc._qsLampV, npc._qsLamp[0], npc._qsLamp[1], npc._qsLampMode !== "collect");
      lampRelease(npc);
      return rNull();
    },
  });

  QS.routines = { tickRoutines, startRoutine, cancel, _running: running };
})();
