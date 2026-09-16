/* admin.js — tiny maintainer surface, guarded by the ADMIN_TOKEN secret.
 * Curl-first by design (no admin UI in Phase 1):
 *   curl -H "authorization: Bearer $ADMIN_TOKEN" .../api/admin/flagged
 *   curl -H "authorization: Bearer $ADMIN_TOKEN" -d '{"month":"2026-09","usd_cents":1100,"note":"Workers paid plan + R2"}' .../api/admin/cost
 */

import { json, err, readJson } from "./util.js";

function isAdmin(req, env) {
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "");
  return !!(env.ADMIN_TOKEN && m && m[1] === env.ADMIN_TOKEN);
}

export async function setCost(req, env) {
  if (!isAdmin(req, env)) return err("Nope.", 403);
  const b = await readJson(req);
  if (!b || !/^\d{4}-\d{2}$/.test(b.month || "") || !Number.isFinite(b.usd_cents))
    return err("Need {month: 'YYYY-MM', usd_cents, note?}.");
  await env.DB.prepare(
    "INSERT INTO koha_costs (month, usd_cents, note) VALUES (?,?,?) " +
    "ON CONFLICT(month) DO UPDATE SET usd_cents = ?, note = ?"
  ).bind(b.month, b.usd_cents, b.note || "", b.usd_cents, b.note || "").run();
  return json({ ok: true });
}

export async function flaggedQueue(req, env) {
  if (!isAdmin(req, env)) return err("Nope.", 403);
  const rows = await env.DB.prepare(
    `SELECT p.id, p.subject, p.kind, p.title, p.flags, p.status, p.created_at, u.username
     FROM proposals p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'flagged' OR p.flags > 0 ORDER BY p.flags DESC LIMIT 200`
  ).all();
  return json({ ok: true, queue: rows.results });
}

export async function setProposalStatus(req, env) {
  if (!isAdmin(req, env)) return err("Nope.", 403);
  const b = await readJson(req);
  if (!b || !["open", "flagged", "accepted", "declined"].includes(b.status))
    return err("Need {id, status: open|flagged|accepted|declined}.");
  await env.DB.prepare("UPDATE proposals SET status = ? WHERE id = ?")
    .bind(b.status, Number(b.id || 0)).run();
  return json({ ok: true });
}
