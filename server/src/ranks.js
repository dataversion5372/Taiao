/* ranks.js — percentile prestige, levels 17-32 (audit §8), Phase-2 activation.
 * Levels 1-16 stay fixed XP thresholds (the client's curve). From 17 up a
 * level is a STANDING: hold the level-16 XP floor AND sit in the skill's
 * top percentile band among qualifying players. Recomputed daily from
 * server-VALIDATED XP only (envelope.js) — never from raw snapshots.
 *
 * Cold start (skill by skill): under 1,000 qualifying players a skill's
 * ranks are provisional — stored and shown with a hollow ring, but the
 * fixed curve still governs gameplay client-side. Demotion grace: falling
 * below a band starts a visible 14-day countdown before the level drops.
 *
 * XP_TABLE is the client curve verbatim (data.js) — port, don't drift. */

import { json, err, now, authUser } from "./util.js";

const MAX_LEVEL = 32;
const XP_TABLE = (() => {
  const old = [0, 0]; let pts = 0;
  for (let l = 1; l < 100; l++) {
    pts += Math.floor(l + 300 * Math.pow(2, l / 7));
    old.push(Math.floor(pts / 4));
  }
  const t = [0, 0];
  for (let l = 2; l <= MAX_LEVEL; l++) t.push(old[Math.ceil(l * 99 / MAX_LEVEL)]);
  return t;
})();
export const FLOOR_16 = XP_TABLE[16];

/* Audit §8: level → top-% band. A qualifying player in the top N% holds
 * the highest level whose band contains them. */
const BANDS = [
  [17, 90], [18, 75], [19, 60], [20, 45], [21, 33], [22, 24], [23, 17],
  [24, 12], [25, 8], [26, 5], [27, 3], [28, 1.8], [29, 1], [30, 0.4],
  [31, 0.1], [32, 0.01],
];
const QUALIFY_WINDOW = 90 * 864e5;
const ACTIVE_AT = 1000;
const GRACE_MS = 14 * 864e5;
const CACHE = { "cache-control": "public, max-age=600" };

const levelForTopPct = pct => {
  let lvl = 16;
  for (const [l, p] of BANDS) if (pct <= p) lvl = l;
  return lvl;
};

/* Daily cron: recompute every skill that has validated XP. */
export async function recomputeAll(env) {
  const t = now();
  const skills = await env.DB.prepare(
    "SELECT DISTINCT skill FROM validated_xp"
  ).all();
  for (const { skill } of skills.results) {
    const q = await env.DB.prepare(
      `SELECT v.user_id, v.xp FROM validated_xp v JOIN users u ON u.id = v.user_id
       WHERE v.skill = ? AND v.xp >= ? AND v.updated_at >= ?
       AND u.flags NOT LIKE '%banned%' ORDER BY v.xp DESC LIMIT 100000`
    ).bind(skill, FLOOR_16, t - QUALIFY_WINDOW).all();
    const rows = q.results, n = rows.length;
    await env.DB.prepare(
      "INSERT INTO rank_meta (skill, qualifying, active, computed_at) VALUES (?,?,?,?) " +
      "ON CONFLICT(skill) DO UPDATE SET qualifying = ?, active = ?, computed_at = ?"
    ).bind(skill, n, n >= ACTIVE_AT ? 1 : 0, t, n, n >= ACTIVE_AT ? 1 : 0, t).run();

    for (let i = 0; i < n; i++) {
      const topPct = ((i + 1) / n) * 100;
      const earned = levelForTopPct(topPct);
      const cur = await env.DB.prepare(
        "SELECT level, grace_until FROM ranks WHERE user_id = ? AND skill = ?"
      ).bind(rows[i].user_id, skill).first();
      let level = earned, grace = null;
      if (cur && earned < cur.level) {
        // Slipping: hold the old standing through a visible grace window.
        if (cur.grace_until == null) { level = cur.level; grace = t + GRACE_MS; }
        else if (t < cur.grace_until) { level = cur.level; grace = cur.grace_until; }
        // grace expired → the drop lands (level = earned, grace cleared)
      }
      await env.DB.prepare(
        "INSERT INTO ranks (user_id, skill, level, top_pct, grace_until, updated_at) VALUES (?,?,?,?,?,?) " +
        "ON CONFLICT(user_id, skill) DO UPDATE SET level = ?, top_pct = ?, grace_until = ?, updated_at = ?"
      ).bind(rows[i].user_id, skill, level, topPct, grace, t,
             level, topPct, grace, t).run();
    }
    // Players who fell out of qualifying keep their row until it goes stale;
    // dropping to the floor without data would punish a holiday (grace covers
    // the recomputed; the unqualified simply stop being recomputed).
  }
}

/* GET /api/ranks/skill?skill=… — public: is this skill's ladder live, how
 * many qualify, and the XP at each band boundary (for ambition displays). */
export async function skillMeta(req, env, url) {
  const skill = String(url.searchParams.get("skill") || "").slice(0, 40);
  if (!skill) return err("skill required");
  const meta = await env.DB.prepare(
    "SELECT qualifying, active, computed_at FROM rank_meta WHERE skill = ?"
  ).bind(skill).first();
  if (!meta) return json({ ok: true, skill, qualifying: 0, active: false, bands: {} }, 200, CACHE);
  const q = await env.DB.prepare(
    `SELECT v.xp FROM validated_xp v JOIN users u ON u.id = v.user_id
     WHERE v.skill = ? AND v.xp >= ? AND v.updated_at >= ?
     AND u.flags NOT LIKE '%banned%' ORDER BY v.xp DESC LIMIT 100000`
  ).bind(skill, FLOOR_16, now() - QUALIFY_WINDOW).all();
  const xs = q.results.map(r => r.xp), n = xs.length;
  const bands = {};
  for (const [lvl, pct] of BANDS) {
    const idx = Math.max(0, Math.ceil((pct / 100) * n) - 1);
    bands[lvl] = n ? xs[idx] : null;   // XP of the last player inside the band
  }
  return json({
    ok: true, skill, qualifying: meta.qualifying, active: !!meta.active,
    computed_at: meta.computed_at, floor16: FLOOR_16, bands,
  }, 200, CACHE);
}

/* GET /api/ranks/me — the player's standings, grace countdowns included. */
export async function mine(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  const rows = await env.DB.prepare(
    `SELECT r.skill, r.level, r.top_pct, r.grace_until, r.updated_at,
            m.active, m.qualifying
     FROM ranks r LEFT JOIN rank_meta m ON m.skill = r.skill
     WHERE r.user_id = ?`
  ).bind(user.id).all();
  const skills = {};
  for (const r of rows.results) skills[r.skill] = {
    level: r.level, topPct: r.top_pct, graceUntil: r.grace_until,
    active: !!r.active, qualifying: r.qualifying, at: r.updated_at,
  };
  return json({ ok: true, skills });
}
