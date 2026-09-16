/* envelope.js — §6.1-B plausibility-envelope validation, live in Phase 2.
 * Phase 1 stored action summaries verbatim; this turns them into VALIDATED
 * XP — the only XP percentile ranks and the shared economy ever count.
 *
 * The envelope: the game self-throttles (gathers ~1.3-1.9 s, swings ~1.7 s,
 * craft ticks per recipe), so there is a maximum legitimate XP per elapsed
 * minute per skill. We accept a summary's claimed XP up to
 * rate × minutes × margin and clamp the rest — honest players lose nothing
 * (real play sits well inside the envelope), cheaters gain at most what a
 * legitimate no-lifer could, which percentiles absorb by definition.
 *
 * Summary format: docs/action-summary.md (v1) — per-session objects with
 * per-hour buckets {xp: {skill: gained}, activeSec, afkSec}. Minutes counted
 * are min(claimed attentive time, wall-clock span), and the span is clipped
 * against a per-user validated-until high-water mark, so ten copies of the
 * same hour validate once. Split selves don't break this — split conserves
 * XP (split.js), it never multiplies rates.
 *
 * XP_PER_MIN is hand-tuned from the tick tables with ~2× headroom; revisit
 * alongside any xp-award rebalance. Per-skill overrides cover the skills
 * whose awards ride combat damage. */

import { json, err, now, authUser } from "./util.js";

const MARGIN = 1.25;
const DEFAULT_XP_PER_MIN = 6000;
const XP_PER_MIN = {
  // Combat styles award dmg-proportional XP on every hit plus kill bonuses.
  Melee: 4000, Strength: 4000, Archery: 5000, Magic: 8000, Health: 3000,
};
const MAX_SESSION_HOURS = 14;         // one summary can't claim a day and a half

const rateFor = skill => (XP_PER_MIN[skill] || DEFAULT_XP_PER_MIN) * MARGIN;

/* Validate every unprocessed summary for one user, oldest first, advancing
 * the validated-until mark and accumulating clamped XP into validated_xp.
 * Called from saves.putSave after storing, and swept by cron for strays. */
export async function processUser(env, userId) {
  const pending = await env.DB.prepare(
    "SELECT id, started_at, ended_at, payload FROM action_summaries " +
    "WHERE user_id = ? AND validated = 0 ORDER BY started_at LIMIT 50"
  ).bind(userId).all();
  if (!pending.results.length) return 0;

  const mark = await env.DB.prepare(
    "SELECT validated_until FROM user_validation WHERE user_id = ?"
  ).bind(userId).first();
  let until = mark?.validated_until || 0;
  const gains = {}; // skill -> clamped xp
  let processed = 0;

  for (const row of pending.results) {
    let s;
    try { s = JSON.parse(row.payload); } catch { s = null; }
    // Usable minutes: claimed attentive+acting time, capped by the part of
    // [start, end] past the high-water mark, never in the future, never
    // longer than a marathon sitting.
    const end = Math.min(row.ended_at, now());
    const start = Math.max(row.started_at, until, end - MAX_SESSION_HOURS * 3600e3);
    const spanMin = Math.max(0, (end - start) / 60e3);
    const hours = Array.isArray(s?.hours) ? s.hours.slice(0, MAX_SESSION_HOURS) : [];
    let claimedSec = 0;
    const bySkill = {};
    for (const b of hours) {
      claimedSec += Math.max(0, Number(b?.activeSec) || 0) + Math.max(0, Number(b?.afkSec) || 0);
      if (b?.xp && typeof b.xp === "object")
        for (const [skill, xp] of Object.entries(b.xp).slice(0, 100)) {
          if (skill.length > 40) continue;
          bySkill[skill] = (bySkill[skill] || 0) + Math.max(0, Math.floor(Number(xp) || 0));
        }
    }
    const minutes = Math.min(claimedSec / 60, spanMin);
    if (minutes > 0) {
      for (const [skill, claimed] of Object.entries(bySkill)) {
        if (!claimed) continue;
        const allowed = Math.floor(rateFor(skill) * minutes);
        gains[skill] = (gains[skill] || 0) + Math.min(claimed, allowed);
      }
    }
    until = Math.max(until, end);
    await env.DB.prepare("UPDATE action_summaries SET validated = 1 WHERE id = ?")
      .bind(row.id).run();
    processed++;
  }

  await env.DB.prepare(
    "INSERT INTO user_validation (user_id, validated_until) VALUES (?,?) " +
    "ON CONFLICT(user_id) DO UPDATE SET validated_until = ?"
  ).bind(userId, until, until).run();
  for (const [skill, xp] of Object.entries(gains)) {
    if (!xp) continue;
    await env.DB.prepare(
      "INSERT INTO validated_xp (user_id, skill, xp, updated_at) VALUES (?,?,?,?) " +
      "ON CONFLICT(user_id, skill) DO UPDATE SET xp = xp + ?, updated_at = ?"
    ).bind(userId, skill, xp, now(), xp, now()).run();
  }
  return processed;
}

/* Cron sweep: users with unvalidated summaries (uploads that raced, or
 * pre-Phase-2 history — the flywheel the Phase-1 design promised). */
export async function sweep(env) {
  const rows = await env.DB.prepare(
    "SELECT DISTINCT user_id FROM action_summaries WHERE validated = 0 LIMIT 200"
  ).all();
  for (const r of rows.results) await processUser(env, r.user_id);
}

/* GET /api/xp/validated — the player's own validated ledger, so the client
 * can show "counted toward rank" next to raw XP. */
export async function mine(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  const rows = await env.DB.prepare(
    "SELECT skill, xp, updated_at FROM validated_xp WHERE user_id = ?"
  ).bind(user.id).all();
  const skills = {};
  for (const r of rows.results) skills[r.skill] = { xp: r.xp, at: r.updated_at };
  return json({ ok: true, skills });
}
