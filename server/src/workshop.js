/* workshop.js — the ballot-box round (audit §3/§10 rung 1-2).
 * The client keeps voting locally exactly as today; when logged in it syncs
 * votes up and pulls community tallies down. "Export JSON" becomes "Submit
 * proposal": same payload, now landing in a curator queue with an explicit
 * licence grant. Nothing auto-applies — GOVERNANCE.md still means a human
 * reads every proposal; the server only counts. */

import { json, err, readJson, now, authUser, rateLimit } from "./util.js";

const MAX_VOTES_BATCH = 500;
const MAX_PAYLOAD = 512 * 1024;       // sprite strips ride in as dataURLs
const FLAG_HIDE_AT = 3;               // community flags before auto-hide
const LICENCES = new Set(["CC-BY-SA-4.0", "GPL-3.0-or-later"]);
const CACHE = { "cache-control": "public, max-age=120" };

// ---- votes ----------------------------------------------------------------

export async function pushVotes(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  if (!await rateLimit(env, `votes:${user.id}`, 60, 3600)) return err("Slow down a little.", 429);
  const b = await readJson(req, 256 * 1024);
  if (!b || !Array.isArray(b.votes)) return err("Bad request body.");
  let applied = 0;
  for (const v of b.votes.slice(0, MAX_VOTES_BATCH)) {
    const subject = String(v?.subject || "").slice(0, 120);
    const field = String(v?.field || "").slice(0, 120);
    if (!subject || !field) continue;
    if (v.choice == null) {                                  // un-vote
      await env.DB.prepare(
        "DELETE FROM workshop_votes WHERE user_id = ? AND subject = ? AND field = ?"
      ).bind(user.id, subject, field).run();
    } else {
      const choice = String(v.choice).slice(0, 400);
      await env.DB.prepare(
        "INSERT INTO workshop_votes (user_id, subject, field, choice, updated_at) VALUES (?,?,?,?,?) " +
        "ON CONFLICT(user_id, subject, field) DO UPDATE SET choice = ?, updated_at = ?"
      ).bind(user.id, subject, field, choice, now(), choice, now()).run();
    }
    applied++;
  }
  return json({ ok: true, applied });
}

/* Public tally for one subject: {fields: {field: {choice: count}}}. */
export async function tally(req, env, url) {
  const subject = String(url.searchParams.get("subject") || "").slice(0, 120);
  if (!subject) return err("subject required");
  const rows = await env.DB.prepare(
    "SELECT field, choice, COUNT(*) AS n FROM workshop_votes WHERE subject = ? GROUP BY field, choice"
  ).bind(subject).all();
  const fields = {};
  for (const r of rows.results) (fields[r.field] ||= {})[r.choice] = r.n;
  return json({ ok: true, subject, fields }, 200, CACHE);
}

// ---- proposals ------------------------------------------------------------

export async function submitProposal(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  if (!await rateLimit(env, `prop:${user.id}`, 10, 86400))
    return err("Proposal limit reached for today.", 429);
  const b = await readJson(req, MAX_PAYLOAD + 4096);
  if (!b || !b.payload) return err("Bad request body.");
  const payload = JSON.stringify(b.payload);
  if (payload.length > MAX_PAYLOAD) return err("Proposal too large.", 413);
  if (!LICENCES.has(b.licence)) return err("Licence grant missing.");
  const subject = String(b.subject || "").slice(0, 120);
  const kind = ["values", "sprites", "mixed"].includes(b.kind) ? b.kind : "mixed";
  const title = String(b.title || subject).slice(0, 120);
  if (!subject) return err("subject required");

  const r = await env.DB.prepare(
    "INSERT INTO proposals (user_id, subject, kind, title, licence, size, created_at) VALUES (?,?,?,?,?,?,?)"
  ).bind(user.id, subject, kind, title, b.licence, payload.length, now()).run();
  const id = r.meta.last_row_id;
  await env.VAULT.put(`proposals/${id}.json`, payload,
    { httpMetadata: { contentType: "application/json" } });
  return json({ ok: true, id });
}

export async function listProposals(req, env, url) {
  const subject = String(url.searchParams.get("subject") || "").slice(0, 120);
  const where = subject ? "AND p.subject = ?" : "";
  const stmt = env.DB.prepare(
    `SELECT p.id, p.subject, p.kind, p.title, p.licence, p.size, p.created_at,
            u.username, COUNT(e.user_id) AS endorsements
     FROM proposals p JOIN users u ON u.id = p.user_id
     LEFT JOIN endorsements e ON e.proposal_id = p.id
     WHERE p.status = 'open' ${where}
     GROUP BY p.id ORDER BY endorsements DESC, p.created_at DESC LIMIT 100`);
  const rows = await (subject ? stmt.bind(subject) : stmt).all();
  return json({ ok: true, proposals: rows.results }, 200, CACHE);
}

export async function getProposal(req, env, url) {
  const id = Number(url.searchParams.get("id") || 0);
  const meta = await env.DB.prepare(
    `SELECT p.*, u.username FROM proposals p JOIN users u ON u.id = p.user_id WHERE p.id = ?`
  ).bind(id).first();
  if (!meta || (meta.status !== "open" && meta.status !== "accepted"))
    return err("Not found.", 404);
  const obj = await env.VAULT.get(`proposals/${id}.json`);
  if (!obj) return err("Payload missing.", 404);
  const payload = JSON.parse(await obj.text());
  return json({
    ok: true,
    proposal: {
      id: meta.id, subject: meta.subject, kind: meta.kind, title: meta.title,
      licence: meta.licence, status: meta.status, username: meta.username,
      created_at: meta.created_at, payload,
    },
  }, 200, CACHE);
}

export async function endorse(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  const b = await readJson(req);
  const id = Number(b?.id || 0);
  if (!id) return err("id required");
  await env.DB.prepare(
    "INSERT OR IGNORE INTO endorsements (proposal_id, user_id, created_at) VALUES (?,?,?)"
  ).bind(id, user.id, now()).run();
  return json({ ok: true });
}

/* Community flagging — uploads are UGC, so the curator queue exists from
 * day one (audit §10 rung 2). At FLAG_HIDE_AT flags a proposal auto-hides
 * pending curator review. */
export async function flag(req, env) {
  const user = await authUser(req, env);
  if (!user) return err("Not logged in.", 401);
  if (!await rateLimit(env, `flag:${user.id}`, 20, 86400)) return err("Flag limit reached.", 429);
  const b = await readJson(req);
  const id = Number(b?.id || 0);
  if (!id) return err("id required");
  await env.DB.prepare("UPDATE proposals SET flags = flags + 1 WHERE id = ?").bind(id).run();
  await env.DB.prepare(
    "UPDATE proposals SET status = 'flagged' WHERE id = ? AND status = 'open' AND flags >= ?"
  ).bind(id, FLAG_HIDE_AT).run();
  return json({ ok: true });
}

export async function latestDigest(req, env) {
  const row = await env.DB.prepare(
    "SELECT created_at, markdown, posted_url FROM digests ORDER BY id DESC LIMIT 1"
  ).first();
  return json({ ok: true, digest: row || null }, 200, CACHE);
}
