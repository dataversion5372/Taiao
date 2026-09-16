// ===== Taiao — collective workshop sync (the ballot-box round, audit §3) =====
// The workshop panel (gameplay/objedit.js) keeps voting in localStorage
// exactly as before — this module is the ballot box: when logged in it
// pushes votes up (diffed, debounced) and pulls community tallies down so
// the panel can show "the community prefers this sprite 340–120". Votes
// inform the curator; nothing auto-applies (GOVERNANCE.md).
//
// Vote translation: option ids are stable across clients EXCEPT player-made
// ones — a suggested value votes as "custom:<label>", an uploaded sprite as
// "upload:<label>" — so everyone suggesting "48 coins" lands in one tally row.
"use strict";

(function () {
  const OBJEDIT_KEY = "taiao_objedit_v1";   // objedit.js's store (read-only here)
  const SYNCED_KEY = "taiao_worksync_v1";   // subject -> {field: choice} last pushed
  const TALLY_TTL = 60 * 1000;

  const on = () => typeof Server !== "undefined" && Server.enabled() && Server.logged();

  let synced;
  try { synced = JSON.parse(localStorage.getItem(SYNCED_KEY) || "{}"); } catch (e) { synced = {}; }
  const persistSynced = () => { try { localStorage.setItem(SYNCED_KEY, JSON.stringify(synced)); } catch (e) {} };

  const readStore = () => { try { return JSON.parse(localStorage.getItem(OBJEDIT_KEY)) || {}; } catch (e) { return {}; } };

  // one object's local record -> {field: choice} in server vocabulary
  function serverVotes(rec) {
    const out = {};
    for (const [pid, optId] of Object.entries(rec.votes || {})) {
      const prop = (rec.props && rec.props[pid] || []).find(p => p.id === optId);
      const spr = (rec.sprites || []).find(s => s.id === optId);
      out[pid] = prop ? "custom:" + prop.label : spr ? "upload:" + spr.label : optId;
    }
    return out;
  }

  // Push one subject's votes: upserts for changes, null for retracted fields.
  async function pushSubject(subject) {
    if (!on()) return;
    const rec = readStore()[subject];
    const want = rec ? serverVotes(rec) : {};
    const have = synced[subject] || {};
    const votes = [];
    for (const [field, choice] of Object.entries(want))
      if (have[field] !== choice) votes.push({ subject, field, choice });
    for (const field of Object.keys(have))
      if (!(field in want)) votes.push({ subject, field, choice: null });
    if (!votes.length) return;
    const r = await Server.call("/api/workshop/votes", { body: { votes } });
    if (r.ok) { synced[subject] = want; persistSynced(); tallies.delete(subject); }
  }

  const dirty = new Set();
  let pushTimer = null;
  function noteChange(subject) {
    if (!on()) return;
    dirty.add(subject);
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const batch = [...dirty]; dirty.clear();
      for (const s of batch) pushSubject(s);
    }, 4000);
  }

  // First login (or a new device): everything local goes up once.
  async function pushAll() {
    for (const subject of Object.keys(readStore())) await pushSubject(subject);
  }
  if (typeof Server !== "undefined") Server.onAuth(u => { if (u) setTimeout(pushAll, 3000); });

  // ---------- community tallies ----------
  const tallies = new Map();   // subject -> {at, fields} | {at, pending}
  function getCached(subject) {
    const t = tallies.get(subject);
    return t && t.fields ? t.fields : null;
  }
  // kick a fetch if stale; onUpdate fires when fresh numbers arrive
  function ensure(subject, onUpdate) {
    if (typeof Server === "undefined" || !Server.enabled()) return;
    const t = tallies.get(subject);
    if (t && (t.pending || Date.now() - t.at < TALLY_TTL)) return;
    tallies.set(subject, { at: Date.now(), pending: true, fields: t && t.fields });
    // cache-bust: the endpoint is public/max-age=120, and a post-vote refresh
    // must not be served the pre-vote numbers from the browser's HTTP cache
    Server.call("/api/workshop/tally?subject=" + encodeURIComponent(subject) + "&_=" + Date.now()).then(r => {
      if (r.ok) {
        tallies.set(subject, { at: Date.now(), fields: r.fields });
        if (onUpdate) onUpdate(r.fields);
      } else tallies.delete(subject);
    });
  }

  // ---------- proposals ----------
  // The old Export JSON payload, submitted instead of downloaded. The licence
  // grant sentence lives in objedit.js's submit flow (audit §10: one sentence
  // at the moment of submission is what makes community content legally
  // load-bearing).
  async function submit(bundle, licence) {
    if (!on()) return { error: "Log in (Account tab) to submit proposals." };
    return Server.call("/api/workshop/proposal", { body: {
      subject: bundle.object.type + ":" + bundle.object.key,
      kind: bundle.sprites && bundle.sprites.length
        ? (Object.keys(bundle.votes).length || Object.keys(bundle.props).length ? "mixed" : "sprites")
        : "values",
      title: "Proposal for " + (bundle.object.name || bundle.object.key),
      licence,
      payload: bundle,
    } });
  }

  window.WorkSync = { noteChange, pushAll, ensure, getCached, submit };
})();
