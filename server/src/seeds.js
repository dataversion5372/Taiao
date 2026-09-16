/* seeds.js — server-issued seeds for rank-bearing rolls (audit §7 Phase 2).
 * The client asks for a batch of entropy up front; rare-drop and craft-
 * quality rolls then come from mulberry32(seed ^ rollIndex) instead of
 * Math.random(). The server keeps every issued seed, so a claimed rare drop
 * in an action summary can be replayed and audited later — the economy's
 * scarce goods are server-honest without the server simulating the game.
 *
 * Unranked play never needs a seed; offline the client falls back to local
 * rolls, and those outcomes simply aren't rank/economy-bearing (§6.1-B). */

import { json, err, readJson, now, authUser, rateLimit } from "./util.js";

const KEEP_BATCHES = 50;              // audit horizon per user

/* POST /api/seeds/next {} → {batch, seed} — seed is 16 hex bytes; the
 * client derives roll i as mulberry32(fnv(seed + ":" + i)). */
export async function next(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  if (!await rateLimit(env, `seeds:${user.id}`, 60, 3600))
    return err("Seed batches last a while — slow down.", 429);
  await readJson(req); // body unused today; kept for future {count}

  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const seed = [...buf].map(b => b.toString(16).padStart(2, "0")).join("");
  const prev = await env.DB.prepare(
    "SELECT MAX(batch) AS b FROM seed_batches WHERE user_id = ?"
  ).bind(user.id).first();
  const batch = (prev?.b || 0) + 1;
  await env.DB.prepare(
    "INSERT INTO seed_batches (user_id, batch, seed, issued_at) VALUES (?,?,?,?)"
  ).bind(user.id, batch, seed, now()).run();
  await env.DB.prepare(
    "DELETE FROM seed_batches WHERE user_id = ? AND batch <= ?"
  ).bind(user.id, batch - KEEP_BATCHES).run();
  return json({ ok: true, batch, seed });
}
