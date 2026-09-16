// ===== Taiao — retrieval NPC dialogue (no brain required) =====
// NPCs answer by semantic retrieval over a large bank of pre-written lines:
// the player's words (plus the NPC's previous line as context) are embedded
// in-browser (MiniLM via transformers.js, all vendored under /libs/npcml and
// /assets/models — no network beyond the game server), then matched against
// pre-embedded prompting-contexts of ~31k bank lines (assets/npc_dialogue/).
// Every line a player ever sees was pre-written — retrieval can pick a wrong
// line, never an incoherent one. Built offline by tools/npc_dialogue/.
"use strict";

const NPCR = {
  dim: 384,
  thresh: 0.45,        // min raw cosine before we fall back to a puzzled line
                       // (eval: in-domain p2=0.55, out-of-domain max≈0.42)
  cand1: 150,          // stage-1 (context-match) candidates kept for re-ranking
  replyW: 0.4,         // stage-2 weight on reply-text↔player-words similarity
  tie: 0.015,          // sample among final scores within this of the best
  roleBonus: 0.06,     // metadata affinity nudges (added to cosine for ranking)
  sceneBonus: 0.02,    // per matching mood/time/weather/relationship field
  state: "cold",       // cold -> loading -> ready | failed
  emb: null,           // Int8Array n*dim — prompting-context embeddings
  scale: null,         // Float32Array n
  remb: null,          // Int8Array n*dim — REPLY-text embeddings (stage 2)
  rscale: null,        // Float32Array n
  lines: null,         // [{t, role, intent, mood, rel, time, weather, slots}]
  fallback: [],        // indices of puzzled/deflection lines (low-confidence)
  embedder: null,
  used: new Map(),     // cid -> Set(bank idx) recently said by that NPC
  recent: [],          // global ring of recently used idx (cross-NPC repeats)
  lastSaid: new Map(), // cid -> last line this NPC spoke (context for next q)
  playerName: null,    // learned when the player introduces themself in chat
};

// Kick off model+bank loading (first time someone is in earshot). Idempotent.
function npcRetrievalWarm() {
  if (NPCR.state !== "cold") return;
  NPCR.state = "loading";
  const boot = (async () => {
    const T = await import("/libs/npcml/transformers.bundle.mjs");
    T.env.allowRemoteModels = false;
    T.env.allowLocalModels = true;
    T.env.localModelPath = "/assets/models/";
    if (T.env.backends && T.env.backends.onnx && T.env.backends.onnx.wasm)
      T.env.backends.onnx.wasm.wasmPaths = "/libs/npcml/";
    const [pipe, embBuf, scaleBuf, meta, rembBuf, rscaleBuf] = await Promise.all([
      T.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" }),
      fetch("/assets/npc_dialogue/bank.emb.bin").then(r => r.arrayBuffer()),
      fetch("/assets/npc_dialogue/bank.scale.bin").then(r => r.arrayBuffer()),
      fetch("/assets/npc_dialogue/bank.meta.json").then(r => r.json()),
      fetch("/assets/npc_dialogue/bank.remb.bin").then(r => r.arrayBuffer()),
      fetch("/assets/npc_dialogue/bank.rscale.bin").then(r => r.arrayBuffer()),
    ]);
    NPCR.embedder = pipe;
    NPCR.emb = new Int8Array(embBuf);
    NPCR.scale = new Float32Array(scaleBuf);
    NPCR.remb = new Int8Array(rembBuf);
    NPCR.rscale = new Float32Array(rscaleBuf);
    NPCR.lines = meta.lines;
    for (let i = 0; i < NPCR.lines.length; i++) {
      const it = NPCR.lines[i].intent;
      if (it === "out_of_world" || it === "nonsense" || it === "unknown_claim")
        NPCR.fallback.push(i);
    }
    NPCR.state = "ready";
  })();
  boot.catch(e => {
    NPCR.state = "failed";
    NPCR.error = String((e && e.message) || e);
    console.warn("npc retrieval failed to load:", e);
  });
  return boot;
}

async function _npcrEmbed(text) {
  const out = await NPCR.embedder(text, { pooling: "mean", normalize: true });
  return out.data; // Float32Array(dim), unit length
}

// Learn the player's name from their own words ("I'm Finn", "call me Moss").
function npcrHearName(text) {
  const m = /\b(?:my name is|my name's|i'm called|call me|name's|i am|i'?m)\s+([A-Z][a-z]{2,})/i.exec(text);
  if (m && !/^(the|but|and|not|just|here|sure|well|also|sorry|glad|only|now|new|old|all|one)$/i.test(m[1])) {
    NPCR.playerName = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    if (typeof player !== "undefined") player.chatName = NPCR.playerName;
  }
}

function _npcrSceneOf(npc) {
  const cid = npcCid(npc);
  const dayNo = Math.floor((typeof now !== "undefined" ? now : Date.now()) /
    (typeof DAY_MS !== "undefined" ? DAY_MS : 600000));
  return {
    role: npcRoleKey(npc),
    mood: NPC_MOODS[_npcHash(cid) % NPC_MOODS.length],
    time: npcTimeOfDay(),
    weather: NPC_WEATHERS[_npcHash(dayNo + ":" + Math.round((npc._home ? npc._home[0] : npc.x) / 40)) % NPC_WEATHERS.length],
    rel: NPC_CHAT.greetedAt.has(cid) ? "neutral" : "unfamiliar",
  };
}

function _npcrMarkUsed(cid, idx) {
  let set = NPCR.used.get(cid);
  if (!set) NPCR.used.set(cid, (set = new Set()));
  set.add(idx);
  if (set.size > 60) set.delete(set.values().next().value);
  NPCR.recent.push(idx);
  if (NPCR.recent.length > 40) NPCR.recent.shift();
}

// ~3% of bank lines were cut mid-sentence by the teacher's token limit; tidy
// them for display — trim to the last complete sentence when that keeps most
// of the line, otherwise end the cut clause as a natural trail-off.
function _npcrTidy(t) {
  t = t.trim();
  if (/[.!?…"')]$/.test(t)) return t;
  const cut = Math.max(t.lastIndexOf(". "), t.lastIndexOf("! "), t.lastIndexOf("? "));
  if (cut >= 40) return t.slice(0, cut + 1);
  const sp = t.lastIndexOf(" ");
  return (sp > 0 ? t.slice(0, sp) : t).replace(/[,;:\-–—]+$/, "") + "…";
}

function _npcrFillSlots(text, npc) {
  return _npcrTidy(text)
    .replace(/\{name\}/g, npc.name || "friend")
    .replace(/\{player\}/g, NPCR.playerName || "friend");
}

// Pick a puzzled/deflection line (low retrieval confidence = the player said
// something no villager has an answer for — anachronisms, nonsense, filth).
// Lines that name their speaker's trade ("I'm a miner…") are only allowed on
// an NPC of that trade, or the villager keeps changing jobs mid-chat.
function _npcrFallback(npc, cid) {
  const used = NPCR.used.get(cid) || new Set();
  const role = npcRoleKey(npc);
  const ok = i => {
    const L = NPCR.lines[i];
    return L.role === role || !L.t.toLowerCase().includes(L.role);
  };
  let pool = NPCR.fallback.filter(i => !used.has(i) && ok(i));
  if (!pool.length) pool = NPCR.fallback.filter(ok);
  if (!pool.length) pool = NPCR.fallback;
  const pick = pool[(Math.random() * pool.length) | 0];
  if (pick == null) return null;
  _npcrMarkUsed(cid, pick);
  return _npcrFillSlots(NPCR.lines[pick].t, npc);
}

// Core: retrieve this NPC's reply to the player's text (or a greeting when
// text is null). Returns the final line (slots filled) or null if not ready.
async function npcRetrieveReply(npc, text) {
  if (NPCR.state !== "ready") { npcRetrievalWarm(); return null; }
  const cid = npcCid(npc);
  if (text) npcrHearName(text);
  const prev = NPCR.lastSaid.get(cid);
  // q mirrors the offline format: previous NPC line (context) \n player words.
  // The context helps continuity but inflates similarity, so the confidence
  // gate is judged on the player's words ALONE (mv) — otherwise nonsense
  // questions ride the context past the threshold and never get the puzzled
  // deflection they deserve.
  const q = (prev ? prev.slice(-160) + "\n" : "") + (text || "Kia ora.");
  const qv = await _npcrEmbed(q);
  const mv = (text && prev) ? await _npcrEmbed(text) : qv;

  const { emb, scale, lines, dim } = NPCR;
  const scene = _npcrSceneOf(npc);
  const used = NPCR.used.get(cid) || new Set();
  const recent = new Set(NPCR.recent);
  const haveName = !!NPCR.playerName;

  // STAGE 1 — context match: int8 dot * scale = cosine over every line's
  // prompting-context embedding, plus metadata affinity. Keeps cand1 best.
  const top = [];             // sorted desc by s
  let bestRaw = -1;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (used.has(i) || recent.has(i)) continue;
    if (L.slots.length && !haveName && L.slots.indexOf("player") >= 0) continue;
    let d = 0, g = 0;
    const o = i * dim;
    if (mv === qv) {
      for (let k = 0; k < dim; k++) d += qv[k] * emb[o + k];
      g = d;
    } else {
      for (let k = 0; k < dim; k++) { const e = emb[o + k]; d += qv[k] * e; g += mv[k] * e; }
    }
    const raw = d * scale[i];
    const gRaw = g * scale[i];
    if (gRaw > bestRaw) bestRaw = gRaw;
    // the player's words drive the ranking; the conversation context is a
    // continuity tiebreak, not the subject
    let s = 0.4 * raw + 0.6 * gRaw;
    if (L.role === scene.role) s += NPCR.roleBonus;
    if (L.mood === scene.mood) s += NPCR.sceneBonus;
    if (L.time === scene.time) s += NPCR.sceneBonus;
    if (L.weather === scene.weather) s += NPCR.sceneBonus;
    if (L.rel === scene.rel) s += NPCR.sceneBonus;
    if (top.length >= NPCR.cand1 && s <= top[top.length - 1].s) continue;
    let lo = 0, hi = top.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (top[m].s < s) hi = m; else lo = m + 1; }
    top.splice(lo, 0, { i, s });
    if (top.length > NPCR.cand1) top.pop();
  }
  if (!top.length || bestRaw < NPCR.thresh) return _npcrFallback(npc, cid);

  // STAGE 2 — relevance re-rank: does the REPLY itself share topic with the
  // player's words? Stops a direct question drawing personality-chatter that
  // matched on context alone but talks about something else entirely.
  const { remb, rscale } = NPCR;
  for (const c of top) {
    let d = 0;
    const o = c.i * dim;
    for (let k = 0; k < dim; k++) d += mv[k] * remb[o + k];
    c.f = (1 - NPCR.replyW) * c.s + NPCR.replyW * (d * rscale[c.i]);
  }
  top.sort((a, b) => b.f - a.f);

  // sample among near-ties so the same question gets varied answers
  const cut = top[0].f - NPCR.tie;
  const cands = top.filter(c => c.f >= cut);
  const pick = cands[(Math.random() * cands.length) | 0].i;
  _npcrMarkUsed(cid, pick);
  const line = _npcrFillSlots(NPCR.lines[pick].t, npc);
  NPCR.lastSaid.set(cid, line);
  return line;
}

// Reveal a chosen line word-by-word above the NPC's head (same streaming feel
// as the AI brain gave, without the wait), ending with a proper npcSay.
function npcrSayStreaming(npc, line) {
  const words = line.split(" ");
  let n = 0;
  const step = () => {
    n++;
    if (n >= words.length) { npcSay(npc, line); return; }
    npc._say = { text: words.slice(0, n).join(" "), until: performance.now() + 4000 };
    setTimeout(step, 50 + Math.random() * 60);
  };
  step();
}
