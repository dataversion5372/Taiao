// ===== Taiao — shop stock ledger sync (Phase 2: the no-trading economy) =====
// Shops carry what players sold. The server ledger (server/src/shops.js)
// holds only the PLAYER-ADDED units per town — the client's computed base
// stock (SHOP_STOCK + biome surplus) is the standing floor, BANK_PERMANENTS
// style, so staples are always buyable and a new player can never starve.
//
// market.js consults this module for: player-stocked quantities (shown on
// the shelf with the maker's name — trading through the world, asynchronously,
// provenance attached), and the SUPPLY TERM its price formulas gain — a glut
// of player stock softens both what the town pays and what it charges.
//
// Trades queue locally and flush async (offline play loses nothing); logged
// out or in DEV_MODE the module is inert and shops are exactly as before.
"use strict";

(function () {
  const DEV = typeof DEV_MODE !== "undefined" && DEV_MODE;
  const QUEUE_KEY = "taiao_tradequeue_v1";
  const STOCK_TTL = 90e3;
  const noop = { ensureStock: () => null, qty: () => 0, units: () => [], items: () => ({}),
    buyMult: () => 1, sellMult: () => 1, noteSell: () => {}, noteBuy: () => {},
    status: () => ({ enabled: false }) };
  if (DEV) { window.ShopSync = noop; return; }

  const live = () => typeof Server !== "undefined" && Server.enabled() && Server.logged();

  let queue = [];                        // [{town, sells:[], buys:[]}]
  try { queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") || []; } catch (e) {}
  const persistQueue = () => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch (e) {} };

  const stocks = new Map();              // town -> {items, at, fetching}

  // ---------- reads (market.js render + price formulas) ----------
  function ensureStock(town) {
    if (!town || !live()) return null;
    let s = stocks.get(town);
    if (!s || (!s.fetching && Date.now() - s.at > STOCK_TTL)) {
      s = s || { items: null, at: 0 };
      s.fetching = true;
      stocks.set(town, s);
      Server.call("/api/shop/stock?town=" + encodeURIComponent(town)).then(r => {
        s.fetching = false;
        if (!r || !r.ok) return;
        s.items = r.items || {}; s.at = Date.now();
        // repaint an open market so player stock appears without a reopen
        try {
          if (typeof activeMarket !== "undefined" && activeMarket &&
              activeMarket.townKey === town && typeof renderMarket === "function") renderMarket();
        } catch (e) {}
      });
    }
    return s.items;
  }
  const entry = (town, id) => { const it = stocks.get(town); return it && it.items && it.items[id] || null; };
  const qty = (town, id) => (entry(town, id) || {}).qty || 0;
  const units = (town, id) => (entry(town, id) || {}).units || [];
  const items = town => { const s = stocks.get(town); return (s && s.items) || {}; };

  // The supply term (audit Phase 2): log-damped so the first few player
  // units barely move prices and a warehouse of them caps out gently.
  // More supply → the town charges less for it and pays less for more of it.
  const buyMult = (town, id) => {
    const q = qty(town, id);
    return q > 0 ? Math.max(0.65, 1 - 0.06 * Math.log2(1 + q)) : 1;
  };
  const sellMult = (town, id) => {
    const q = qty(town, id);
    return q > 0 ? Math.max(0.55, 1 - 0.05 * Math.log2(1 + q)) : 1;
  };

  // ---------- writes (choke-point notes from market.js) ----------
  function lineFor(town) {
    let l = queue.find(x => x.town === town);
    if (!l) { l = { town, sells: [], buys: [] }; queue.push(l); }
    return l;
  }
  function noteSell(town, id, n, q, maker, skill) {
    if (!town || !n || DEV) return;
    const l = lineFor(town);
    const same = l.sells.find(s => s.item === id && s.q === q && s.maker === maker);
    if (same) same.qty += n;
    else l.sells.push({ item: id, qty: n, q: q ?? null, maker: maker || null, skill: skill || null });
    // optimistic: the shelf shows your goods immediately
    const e = entry(town, id);
    if (e) e.qty += n;
    persistQueue(); soonFlush();
  }
  function noteBuy(town, id, n) {
    if (!town || !n || DEV) return;
    const l = lineFor(town);
    const same = l.buys.find(b => b.item === id);
    if (same) same.qty += n; else l.buys.push({ item: id, qty: n });
    const e = entry(town, id);
    if (e) e.qty = Math.max(0, e.qty - n);
    persistQueue(); soonFlush();
  }

  // ---------- flush ----------
  let flushing = false, flushTimer = null;
  const soonFlush = () => { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 2500); };
  async function flush() {
    if (flushing || !live() || !queue.length) return;
    flushing = true;
    try {
      while (queue.length) {
        const l = queue[0];
        const r = await Server.call("/api/shop/trade", { body: l });
        if (!r || !r.ok) break;              // kept queued; retried later
        queue.shift();
        const s = stocks.get(l.town);
        if (s && s.items && r.stock)
          for (const [id, n] of Object.entries(r.stock))
            (s.items[id] ||= { qty: 0, units: [] }).qty = n;
      }
      persistQueue();
    } catch (e) {} finally { flushing = false; }
  }
  setInterval(flush, 20e3);
  addEventListener("beforeunload", persistQueue);

  window.ShopSync = {
    ensureStock, qty, units, items, buyMult, sellMult, noteSell, noteBuy,
    status: () => ({ enabled: true, live: live(), queued: queue.length }),
  };
})();
