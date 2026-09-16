/* shops.js — the Phase-2 per-town finite stock ledger (audit §7 Phase 2).
 * This IS the no-trading economy: players trade through the world. A sale
 * adds provenance-stamped units to the town's shelf; a purchase decrements
 * them. The client's computed base stock (SHOP_STOCK + biome surplus) is the
 * standing floor — the BANK_PERMANENTS pattern lives client-side, so this
 * ledger only ever holds the PLAYER-ADDED supply on top of it. The economy
 * can never starve a new player because the floor never reaches the server.
 *
 * Town key = the client's townKeyOf(x,y) ("cx,cy", market.js) — the same
 * keyspace contracts already use. Units keep the maker's NAME (quality +
 * "Coopered by Rowan" is the whole point), the seller's account for audit,
 * and the maker's rank at sale time (the §8 provenance ratchet). */

import { json, err, readJson, now, authUser, rateLimit } from "./util.js";

const TOWN_KEY = /^-?\d{1,6},-?\d{1,6}$/;
const MAX_LINES = 40;                 // items per trade call
const MAX_QTY = 10000;               // per line
const MAX_TOWN_ITEM_QTY = 50000;     // ledger cap per (town, item)
const MAX_UNITS_LISTED = 8;          // provenance batches shown per item
const STALE_DAYS = 120;              // unsold player stock quietly rots
const CACHE = { "cache-control": "public, max-age=30" };

const cleanItem = s => {
  const id = String(s || "").slice(0, 60);
  return /^[a-z0-9_]+$/.test(id) ? id : null;
};

/* GET /api/shop/stock?town=cx,cy
 * → {items: {id: {qty, units:[{maker, q, rank, qty}]}}, now}
 * Public read: a logged-out player still sees the living shelf. */
export async function stock(req, env, url) {
  const town = String(url.searchParams.get("town") || "");
  if (!TOWN_KEY.test(town)) return err("Bad town key.");
  const rows = await env.DB.prepare(
    `SELECT item, maker, maker_rank, quality, qty FROM shop_units
     WHERE town = ? AND qty > 0 ORDER BY item, sold_at`
  ).bind(town).all();
  const items = {};
  for (const r of rows.results) {
    const it = (items[r.item] ||= { qty: 0, units: [] });
    it.qty += r.qty;
    if (it.units.length < MAX_UNITS_LISTED)
      it.units.push({ maker: r.maker, q: r.quality, rank: r.maker_rank, qty: r.qty });
  }
  return json({ ok: true, town, items, now: now() }, 200, CACHE);
}

/* POST /api/shop/trade
 * {town, sells:[{item, qty, q?, maker?}], buys:[{item, qty}]}
 * Sells append (merging batches by maker+quality); buys decrement oldest
 * first and report what the ledger actually covered — the remainder was
 * floor stock and never concerned the server. Coins stay client-side:
 * async-first means the ledger owns SUPPLY, the client owns price. */
export async function trade(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  if (!await rateLimit(env, `shop:${user.id}`, 240, 3600))
    return err("Trading too fast.", 429);
  const b = await readJson(req, 64 * 1024);
  if (!b || !TOWN_KEY.test(String(b.town || ""))) return err("Bad town key.");
  const town = b.town, t = now();
  const sold = {}, bought = {};

  for (const line of (Array.isArray(b.sells) ? b.sells : []).slice(0, MAX_LINES)) {
    const item = cleanItem(line?.item);
    const qty = Math.min(MAX_QTY, Math.floor(Number(line?.qty) || 0));
    if (!item || qty <= 0) continue;
    const have = await env.DB.prepare(
      "SELECT COALESCE(SUM(qty),0) AS n FROM shop_units WHERE town = ? AND item = ?"
    ).bind(town, item).first();
    const room = Math.max(0, MAX_TOWN_ITEM_QTY - (have?.n || 0));
    const add = Math.min(qty, room);
    if (!add) { sold[item] = (sold[item] || 0); continue; }
    const maker = String(line.maker || user.username).slice(0, 40);
    const quality = Number.isFinite(line.q) ? Math.max(0, Math.min(100, Math.round(line.q))) : null;
    const rank = await makerRank(env, user.id, line.skill);
    const same = await env.DB.prepare(
      `SELECT id FROM shop_units WHERE town = ? AND item = ? AND maker = ?
       AND quality IS ? AND seller_id = ? LIMIT 1`
    ).bind(town, item, maker, quality, user.id).first();
    if (same) {
      await env.DB.prepare("UPDATE shop_units SET qty = qty + ?, sold_at = ? WHERE id = ?")
        .bind(add, t, same.id).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO shop_units (town, item, qty, maker, maker_rank, quality, seller_id, sold_at)
         VALUES (?,?,?,?,?,?,?,?)`
      ).bind(town, item, add, maker, rank, quality, user.id, t).run();
    }
    sold[item] = (sold[item] || 0) + add;
  }

  for (const line of (Array.isArray(b.buys) ? b.buys : []).slice(0, MAX_LINES)) {
    const item = cleanItem(line?.item);
    let want = Math.min(MAX_QTY, Math.floor(Number(line?.qty) || 0));
    if (!item || want <= 0) continue;
    const batches = await env.DB.prepare(
      "SELECT id, qty FROM shop_units WHERE town = ? AND item = ? AND qty > 0 ORDER BY sold_at"
    ).bind(town, item).all();
    let got = 0;
    for (const batch of batches.results) {
      if (!want) break;
      const take = Math.min(want, batch.qty);
      await env.DB.prepare("UPDATE shop_units SET qty = qty - ? WHERE id = ?")
        .bind(take, batch.id).run();
      want -= take; got += take;
    }
    bought[item] = got;
  }

  // Refreshed counts for every item the trade touched.
  const touched = [...new Set([...Object.keys(sold), ...Object.keys(bought)])];
  const stockNow = {};
  for (const item of touched) {
    const row = await env.DB.prepare(
      "SELECT COALESCE(SUM(qty),0) AS n FROM shop_units WHERE town = ? AND item = ? AND qty > 0"
    ).bind(town, item).first();
    stockNow[item] = row?.n || 0;
  }
  return json({ ok: true, town, sold, bought, stock: stockNow, now: t });
}

/* The §8 provenance ratchet: stamp units with the maker's rank AT SALE TIME
 * (a rank-32 blade stays a rank-32 artifact even if the smith later slips).
 * Ranks arrive with Phase-2 rank rows; null until that skill has data. */
async function makerRank(env, userId, skill) {
  const s = String(skill || "").slice(0, 40);
  if (!s) return null;
  const row = await env.DB.prepare(
    "SELECT level FROM ranks WHERE user_id = ? AND skill = ?"
  ).bind(userId, s).first();
  return row?.level ?? null;
}

/* Cron sweep: unsold player stock past STALE_DAYS quietly leaves the shelf
 * (the shopkeeper "sold it on") so dead towns don't accrete forever. */
export async function sweepStale(env) {
  await env.DB.prepare("DELETE FROM shop_units WHERE qty <= 0 OR sold_at < ?")
    .bind(now() - STALE_DAYS * 864e5).run();
}
