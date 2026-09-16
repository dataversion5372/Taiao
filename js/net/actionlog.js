// ===== Taiao — offline action summaries (audit §6.1-B) =====
// Records WHAT this client did, per elapsed hour, at the game's existing
// choke points (addXp / addItem / removeItem / killMonster / tradeBuy /
// fulfilContract / playerDie) — the same wrap-by-reassignment pattern
// pulse.js uses. Phase 1 ships the RECORDER only: summaries ride up with
// vault uploads and the server just stores them. Phase 2's plausibility
// envelope (max legitimate XP/items per attentive minute, from the game's
// own tick tables) then validates rank-bearing gains — and because clients
// recorded from day one, it starts with history instead of a cold start.
//
// This is not anti-cheat theatre: a local recorder can always be tampered
// with. Its job is to let HONEST offline play prove itself cheaply. Format
// spec: docs/action-summary.md. Storage: taiao_actionlog_v1 (local only
// until the player logs in and uploads a save).
"use strict";

(function () {
  const DEV = typeof DEV_MODE !== "undefined" && DEV_MODE;
  if (DEV) { window.ActionLog = { take: () => [], putBack: () => {}, report: () => null }; return; }

  const LS_KEY = "taiao_actionlog_v1";
  const VER = 1;
  const AFK_MS = 90 * 1000;          // same attentiveness line pulse.js draws
  const MAX_DONE = 40;               // finalized sessions kept locally
  const MAX_IDS = 48;                // per-hour item-id cardinality cap ("*" overflow)
  const SESSION_CAP_H = 24;          // roll absurdly long sessions

  let L;
  try { L = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { L = null; }
  if (!L || L.v !== VER) L = { v: VER, cur: null, done: [] };

  // A crash/refresh leaves `cur` behind — finalize it now (its end time is
  // the last persist heartbeat, which is within 30s of the truth).
  if (L.cur) { L.done.push(L.cur); L.cur = null; }
  trimDone();

  function trimDone() { if (L.done.length > MAX_DONE) L.done.splice(0, L.done.length - MAX_DONE); }
  function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(L)); } catch (e) {} }

  function freshSession() {
    return {
      v: VER, start: Date.now(), end: Date.now(),
      build: typeof WORLDGEN_SIG !== "undefined" ? WORLDGEN_SIG : "?",
      activeSec: 0, afkSec: 0, hours: [],
    };
  }
  function hourBucket() {
    const s = L.cur || (L.cur = freshSession());
    const h = Math.min(SESSION_CAP_H - 1, Math.floor((Date.now() - s.start) / 3600000));
    let b = s.hours[s.hours.length - 1];
    if (!b || b.h !== h) {
      b = { h, activeSec: 0, afkSec: 0, xp: {}, kills: {}, gained: {}, used: {},
            coinsIn: 0, coinsOut: 0, buys: 0, contracts: 0, deaths: 0 };
      s.hours.push(b);
    }
    s.end = Date.now();
    return b;
  }
  // capped counter maps: past MAX_IDS distinct keys, overflow pools under "*"
  function bump(map, key, n) {
    if (map[key] == null && Object.keys(map).length >= MAX_IDS) key = "*";
    map[key] = (map[key] || 0) + n;
  }

  // ---------- choke-point wraps ----------
  if (typeof addXp === "function") {
    const orig = addXp;
    addXp = function (skill, amt, quiet) {
      const before = player.skills && player.skills[skill];
      const r = orig(skill, amt, quiet);
      try {
        const gained = (player.skills && player.skills[skill]) - before;
        if (gained > 0) bump(hourBucket().xp, skill, gained);
      } catch (e) {}
      return r;
    };
  }
  if (typeof addItem === "function") {
    const orig = addItem;
    addItem = function (id, qty = 1, meta) {
      const r = orig(id, qty, meta);
      try {
        if (r) {
          const b = hourBucket();
          if (id === "coins") b.coinsIn += qty; else bump(b.gained, id, qty);
        }
      } catch (e) {}
      return r;
    };
  }
  if (typeof removeItem === "function") {
    const orig = removeItem;
    removeItem = function (id, qty = 1) {
      try {
        const b = hourBucket();
        if (id === "coins") b.coinsOut += qty; else bump(b.used, id, qty);
      } catch (e) {}
      return orig(id, qty);
    };
  }
  if (typeof killMonster === "function") {
    const orig = killMonster;
    killMonster = function (mon) {
      try { bump(hourBucket().kills, (mon && mon.kind) || "?", 1); } catch (e) {}
      return orig(mon);
    };
  }
  if (typeof tradeBuy === "function") {
    const orig = tradeBuy;
    tradeBuy = function (id, price, n) { try { hourBucket().buys++; } catch (e) {} return orig(id, price, n); };
  }
  if (typeof fulfilContract === "function") {
    const orig = fulfilContract;
    fulfilContract = function (c) {
      const r = orig(c);
      try { if (r) hourBucket().contracts++; } catch (e) {}
      return r;
    };
  }
  if (typeof playerDie === "function") {
    const orig = playerDie;
    playerDie = function (by) { try { hourBucket().deaths++; } catch (e) {} return orig(by); };
  }

  // ---------- attentive-time sampling (1 Hz) ----------
  let lastInput = Date.now();
  for (const ev of ["pointerdown", "keydown", "wheel"])
    document.addEventListener(ev, () => { lastInput = Date.now(); }, { capture: true, passive: true });

  let persistAt = 0;
  setInterval(() => {
    try {
      if (typeof gameReady === "undefined" || !gameReady || document.hidden) return;
      const attentive = Date.now() - lastInput < AFK_MS;
      const acting = typeof player !== "undefined" && !!player.act;
      if (!attentive && !acting) return;   // truly idle seconds don't exist here
      const s = L.cur || (L.cur = freshSession());
      const b = hourBucket();
      if (attentive) { s.activeSec++; b.activeSec++; }
      else { s.afkSec++; b.afkSec++; }     // AFK-but-acting (overnight grind)
      if (Date.now() - persistAt > 30000) { persistAt = Date.now(); persist(); }
    } catch (e) {}
  }, 1000);

  function finalize() {
    if (!L.cur) return;
    L.cur.end = Date.now();
    if (L.cur.activeSec + L.cur.afkSec >= 30) L.done.push(L.cur); // ignore blips
    L.cur = null;
    trimDone();
    persist();
  }
  addEventListener("beforeunload", finalize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });

  // ---------- upload drain (called by savesync.js) ----------
  window.ActionLog = {
    // remove up to n finalized sessions for upload; putBack() restores them
    // (front of the queue) if the upload fails.
    take(n) { return L.done.splice(0, Math.max(0, n)); },
    putBack(list) { if (list && list.length) { L.done.unshift(...list); trimDone(); persist(); } },
    persist,
    report: () => ({ pending: L.done.length, current: L.cur && { start: L.cur.start, activeSec: L.cur.activeSec } }),
  };
})();
