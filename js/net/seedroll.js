// ===== Taiao — server-issued seeds for rank-bearing rolls (Phase 2) =====
// The audit's answer to "outcomes are client random": anything the shared
// economy prizes — rare drops, craft quality — rolls from a seed the SERVER
// issued, consumed strictly in sequence. The server keeps every seed it
// hands out (server/src/seeds.js), so a summary's claimed jackpot can be
// replayed and audited; the client can't reroll its way to riches.
//
// SeedRoll.random() is a drop-in Math.random(): while a batch is live it
// returns mulberry32(fnv(seed:i)) and advances i (persisted — a refresh
// can't rewind the stream); with no batch (logged out, offline, DEV) it
// falls straight through to Math.random() and those outcomes simply aren't
// rank-bearing (§6.1-B). Batches refresh in the background well before the
// stream runs dry.
"use strict";

(function () {
  const DEV = typeof DEV_MODE !== "undefined" && DEV_MODE;
  const LS_KEY = "taiao_seedbatch_v1";
  const REFRESH_AT = 4000, HARD_STOP = 100000;
  if (DEV) { window.SeedRoll = { random: () => Math.random(), status: () => ({ enabled: false }) }; return; }

  let cur = null;                          // {batch, seed, i}
  try { cur = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) {}
  const persist = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(cur)); } catch (e) {} };

  // FNV-1a over "seed:i" → a 32-bit state for the game's own mulberry32.
  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }

  let fetching = false;
  async function refill() {
    if (fetching || typeof Server === "undefined" || !Server.enabled() || !Server.logged()) return;
    fetching = true;
    try {
      const r = await Server.call("/api/seeds/next", { body: {} });
      if (r && r.ok && r.seed) { cur = { batch: r.batch, seed: r.seed, i: 0 }; persist(); }
    } catch (e) {} finally { fetching = false; }
  }

  function random() {
    if (!cur || cur.i >= HARD_STOP ||
        typeof Server === "undefined" || !Server.logged()) return Math.random();
    const v = (typeof mulberry32 === "function"
      ? mulberry32(fnv(cur.seed + ":" + cur.i))() : Math.random());
    cur.i++;
    if (cur.i % 50 === 0) persist();
    if (cur.i === REFRESH_AT) refill();    // rotate long before the stream thins
    return v;
  }

  if (typeof Server !== "undefined") Server.onAuth(u => { if (u && !cur) refill(); });
  setTimeout(() => { if (!cur) refill(); }, 8000);
  addEventListener("beforeunload", persist);

  window.SeedRoll = {
    random,
    status: () => ({ enabled: true, batch: cur && cur.batch, used: cur && cur.i }),
  };
})();
