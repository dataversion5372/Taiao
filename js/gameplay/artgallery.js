// ===== Isle of Emberfall — community Art Workshop (Shift+A) =====
//
// A curated, static community-art gallery. The in-game client is READ-ONLY: it
// fetches gallery/gallery.json (a feed the curator moderates), lets players
// browse + audition + rate submissions locally, and lets anyone package their
// own sprite / icon / tile / object / sound into a submission.json to send in.
// No live server, no live-upload abuse surface — approvals happen off-line and
// land in the next feed. Same-origin assets only (cross-origin art would taint
// the WebGL atlas, exactly like the old file:// problem).
//
// Self-contained: injects its own DOM + styles and installs a CAPTURE-phase
// Shift+A handler (runs before the bundled keydown handler). Loaded as its own
// <script> after dist/bundle.js, so it needs no bundle rebuild. Exposes
// window.toggleArtGallery().
(function () {
  "use strict";

  // ---- config -------------------------------------------------------------
  const CFG = {
    feedUrl: "gallery/gallery.json",
    feedBase: "gallery/",           // asset paths in the feed resolve against this
    // Optional write-back endpoint for votes. Leave null to stay fully static
    // (votes are kept locally and can be exported for the curator to tally).
    voteEndpoint: null,
    // Where finished submission.json bundles should be sent. Filled from the
    // feed's `submit` block when present.
    submitChannel: "Send your downloaded submission.json to the game's curator.",
    submitUrl: "",
    maxImageBytes: 4 * 1024 * 1024,
    maxAudioBytes: 3 * 1024 * 1024,
  };
  const TYPES = ["sprite", "icon", "tile", "object", "sound"];
  const TYPE_LABEL = { sprite: "Sprites", icon: "Icons", tile: "Tiles", object: "Objects", sound: "Sounds" };
  const LS_VOTES = "ioe_art_votes_v1";
  const LS_DRAFT = "ioe_art_draft_v1";

  // ---- state --------------------------------------------------------------
  let feed = null, feedError = null, loaded = false;
  let filterType = "all", search = "";
  let votes = load(LS_VOTES, {});        // { entryId: 1 }  (local upvotes)
  let root = null, open = false, spriteTimer = null;

  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const assetUrl = a => /^(\.\.\/|https?:|data:|\/)/.test(a) ? (a.startsWith("..") ? CFG.feedBase + a : a) : CFG.feedBase + a;

  // ---- styles -------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById("artgallery-css")) return;
    const s = document.createElement("style");
    s.id = "artgallery-css";
    s.textContent = `
#artgallery{position:fixed;inset:0;z-index:9000;display:none;background:rgba(8,9,14,.82);
  font:14px/1.45 Verdana,system-ui,sans-serif;color:#e7e9f2}
#artgallery.open{display:flex;flex-direction:column}
#ag-head{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#141724;border-bottom:1px solid #2a2f45}
#ag-head h2{margin:0;font-size:18px;color:#ffd873;letter-spacing:.3px}
#ag-head .ag-sub{color:#8b93ad;font-size:12px}
#ag-head .sp{flex:1}
#ag-search{background:#0e1018;border:1px solid #2a2f45;color:#e7e9f2;border-radius:6px;padding:6px 10px;width:200px}
#ag-close{background:#2a2f45;border:0;color:#e7e9f2;border-radius:6px;padding:6px 11px;cursor:pointer;font-size:15px}
#ag-close:hover{background:#3a4a6b}
#ag-tabs{display:flex;gap:6px;padding:10px 16px 0;flex-wrap:wrap}
.ag-tab{background:#191d2c;border:1px solid #2a2f45;color:#c7cce0;border-radius:16px;padding:5px 14px;cursor:pointer;font-size:13px}
.ag-tab.on{background:#3b6ea5;border-color:#5b8fd0;color:#fff}
.ag-tab.upl{margin-left:auto;background:#2e7d4f;border-color:#3fae6b;color:#fff}
#ag-body{flex:1;overflow:auto;padding:14px 16px}
#ag-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px}
.ag-card{background:#161a28;border:1px solid #262c42;border-radius:10px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column}
.ag-card:hover{border-color:#5b8fd0}
.ag-thumb{height:120px;background:#0c0e16 repeating-linear-gradient(45deg,#0c0e16,#0c0e16 8px,#10131d 8px,#10131d 16px);
  display:flex;align-items:center;justify-content:center;image-rendering:pixelated}
.ag-thumb canvas,.ag-thumb img{image-rendering:pixelated;max-width:100%;max-height:112px}
.ag-meta{padding:8px 10px}
.ag-title{font-weight:bold;font-size:13px;color:#f0f2fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-by{color:#8b93ad;font-size:11px;margin:2px 0 6px}
.ag-vote{display:flex;align-items:center;gap:8px}
.ag-up{background:#20263a;border:1px solid #33405f;color:#c7cce0;border-radius:6px;padding:3px 9px;cursor:pointer;font-size:12px}
.ag-up.on{background:#c85; border-color:#e0a860;color:#fff}
.ag-score{color:#ffd873;font-weight:bold}
.ag-badge{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#7fa8d8;background:#1a2740;border-radius:4px;padding:1px 6px}
#ag-empty,#ag-err{color:#8b93ad;text-align:center;padding:60px 20px}
/* detail + upload overlays */
.ag-modal{position:absolute;inset:0;background:rgba(6,7,11,.9);display:flex;align-items:center;justify-content:center;padding:24px}
.ag-panel{background:#141826;border:1px solid #2c3350;border-radius:12px;max-width:640px;width:100%;max-height:88%;overflow:auto;padding:18px 20px}
.ag-panel h3{margin:0 0 4px;color:#ffd873}
.ag-panel .ag-by{margin-bottom:14px}
.ag-preview{background:#0c0e16 repeating-linear-gradient(45deg,#0c0e16,#0c0e16 8px,#10131d 8px,#10131d 16px);
  border:1px solid #262c42;border-radius:8px;min-height:180px;display:flex;align-items:center;justify-content:center;margin:12px 0}
.ag-preview canvas,.ag-preview img{image-rendering:pixelated}
.ag-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0}
.ag-row label{color:#a9b0c8;font-size:12px;min-width:78px}
.ag-row input,.ag-row select,.ag-row textarea{flex:1;background:#0e1018;border:1px solid #2a2f45;color:#e7e9f2;border-radius:6px;padding:6px 9px;font:13px Verdana,sans-serif}
.ag-btn{background:#3b6ea5;border:0;color:#fff;border-radius:7px;padding:8px 16px;cursor:pointer;font-size:14px}
.ag-btn:hover{background:#4a80bd}.ag-btn.gr{background:#2e7d4f}.ag-btn.gr:hover{background:#38955f}
.ag-btn.mut{background:#262c42}
.ag-note{color:#8b93ad;font-size:12px;margin-top:8px}
.ag-x{position:absolute;top:14px;right:16px}
`;
    document.head.appendChild(s);
  }

  // ---- DOM ----------------------------------------------------------------
  function build() {
    if (root) return;
    injectStyles();
    root = document.createElement("div");
    root.id = "artgallery";
    root.innerHTML = `
      <div id="ag-head">
        <h2>Art Workshop</h2>
        <span class="ag-sub">community sprites, icons, tiles, objects &amp; sounds — browse, vote, submit</span>
        <span class="sp"></span>
        <input id="ag-search" placeholder="Search art…" autocomplete="off">
        <button id="ag-close" title="Close (Esc / Shift+A)">✕</button>
      </div>
      <div id="ag-tabs"></div>
      <div id="ag-body"></div>`;
    (document.getElementById("gamecol") || document.body).appendChild(root);

    root.querySelector("#ag-close").addEventListener("click", () => toggle(false));
    root.querySelector("#ag-search").addEventListener("input", e => { search = e.target.value.toLowerCase(); renderGrid(); });
    renderTabs();
  }

  function renderTabs() {
    const tabs = root.querySelector("#ag-tabs");
    const mk = (id, label, cls) => `<button class="ag-tab ${cls || ""} ${filterType === id ? "on" : ""}" data-f="${id}">${label}</button>`;
    tabs.innerHTML = mk("all", "All") + TYPES.map(t => mk(t, TYPE_LABEL[t])).join("")
      + `<button class="ag-tab upl" data-upl="1">＋ Submit your art</button>`;
    tabs.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => { filterType = b.dataset.f; renderTabs(); renderGrid(); }));
    tabs.querySelector("[data-upl]").addEventListener("click", openUpload);
  }

  // ---- feed ---------------------------------------------------------------
  async function ensureFeed() {
    if (loaded) return;
    loaded = true;
    try {
      const r = await fetch(CFG.feedUrl, { cache: "no-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      feed = await r.json();
      if (feed.submit) { CFG.submitChannel = feed.submit.channel || CFG.submitChannel; CFG.submitUrl = feed.submit.url || ""; }
    } catch (e) {
      feedError = e.message || String(e);
    }
  }

  function entries() {
    const list = (feed && feed.entries) || [];
    return list.filter(e => (filterType === "all" || e.type === filterType)
      && (!search || (e.title + " " + e.author + " " + (e.tags || []).join(" ") + " " + e.target).toLowerCase().includes(search)))
      .sort((a, b) => (scoreOf(b) - scoreOf(a)));
  }
  const scoreOf = e => (e.score || 0) + (votes[e.id] ? 1 : 0);

  // ---- grid ---------------------------------------------------------------
  function renderGrid() {
    const body = root.querySelector("#ag-body");
    if (feedError) { body.innerHTML = `<div id="ag-err">Couldn't load the community feed (<code>${esc(feedError)}</code>).<br>The workshop needs to be served over http (not opened as a file). You can still submit your own art below.<br><br><button class="ag-btn gr" id="ag-err-upl">＋ Submit your art</button></div>`; body.querySelector("#ag-err-upl").addEventListener("click", openUpload); return; }
    const list = entries();
    if (!list.length) { body.innerHTML = `<div id="ag-empty">No submissions here yet.<br>Be the first — hit <b>＋ Submit your art</b>.</div>`; return; }
    const grid = document.createElement("div"); grid.id = "ag-grid";
    for (const e of list) {
      const card = document.createElement("div"); card.className = "ag-card";
      card.innerHTML = `
        <div class="ag-thumb" data-thumb></div>
        <div class="ag-meta">
          <div class="ag-title">${esc(e.title)} <span class="ag-badge">${e.type}</span></div>
          <div class="ag-by">by ${esc(e.author)}</div>
          <div class="ag-vote">
            <button class="ag-up ${votes[e.id] ? "on" : ""}" data-up>▲ ${votes[e.id] ? "Voted" : "Vote"}</button>
            <span class="ag-score">${scoreOf(e)}</span>
          </div>
        </div>`;
      card.querySelector("[data-thumb]").appendChild(makeThumb(e));
      card.querySelector("[data-up]").addEventListener("click", ev => { ev.stopPropagation(); toggleVote(e); });
      card.addEventListener("click", () => openDetail(e));
      grid.appendChild(card);
    }
    body.innerHTML = ""; body.appendChild(grid);
  }

  function makeThumb(e) {
    if (e.type === "sound") { const d = document.createElement("div"); d.style.cssText = "font-size:40px"; d.textContent = "🔊"; return d; }
    const img = new Image(); img.src = assetUrl(e.asset);
    if (e.type === "sprite") {
      // show just the first direction cell
      const c = document.createElement("canvas"); const cell = (e.meta && e.meta.cell) || 64; c.width = cell; c.height = cell;
      const cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      img.onload = () => cx.drawImage(img, 0, 0, cell, cell, 0, 0, cell, cell);
      return c;
    }
    return img;
  }

  function toggleVote(e) {
    if (votes[e.id]) delete votes[e.id]; else votes[e.id] = 1;
    save(LS_VOTES, votes);
    if (CFG.voteEndpoint) { try { fetch(CFG.voteEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, vote: votes[e.id] ? 1 : 0 }) }).catch(() => {}); } catch (x) {} }
    renderGrid();
  }

  // ---- detail + preview ---------------------------------------------------
  function closeModal() { const m = root.querySelector(".ag-modal"); if (m) m.remove(); if (spriteTimer) { clearInterval(spriteTimer); spriteTimer = null; } }

  function openDetail(e) {
    closeModal();
    const m = document.createElement("div"); m.className = "ag-modal";
    m.innerHTML = `
      <div class="ag-panel" style="position:relative">
        <button class="ag-close ag-x ag-btn mut" data-x>✕</button>
        <h3>${esc(e.title)} <span class="ag-badge">${e.type}</span></h3>
        <div class="ag-by">by ${esc(e.author)} · for ${esc(e.target || "—")}</div>
        <div class="ag-preview" data-prev></div>
        <div class="ag-row"><label>Tags</label><span>${(e.tags || []).map(esc).join(", ") || "—"}</span></div>
        <div class="ag-row">
          <button class="ag-up ${votes[e.id] ? "on" : ""}" data-up>▲ ${votes[e.id] ? "Voted" : "Vote for this"}</button>
          <span class="ag-score">Score ${scoreOf(e)}</span>
          <span class="sp" style="flex:1"></span>
          <button class="ag-btn gr" data-apply title="Preview this in your own game (local, reversible)">Apply to my game</button>
        </div>
        <div class="ag-note">Local votes are saved on this device. <a href="#" data-export style="color:#7fa8d8">Export my votes</a> to send to the curator.</div>
      </div>`;
    root.appendChild(m);
    m.addEventListener("click", ev => { if (ev.target === m) closeModal(); });
    m.querySelector("[data-x]").addEventListener("click", closeModal);
    m.querySelector("[data-up]").addEventListener("click", () => { toggleVote(e); openDetail(e); });
    m.querySelector("[data-apply]").addEventListener("click", () => applyOverride(e));
    m.querySelector("[data-export]").addEventListener("click", ev => { ev.preventDefault(); exportVotes(); });
    renderPreview(m.querySelector("[data-prev]"), e, assetUrl(e.asset));
  }

  // Renders `src` (a URL or dataURL) previewed the way its type is used in-game.
  function renderPreview(host, e, src) {
    host.innerHTML = "";
    if (e.type === "sound") {
      const btn = document.createElement("button"); btn.className = "ag-btn"; btn.textContent = "▶ Audition sound";
      const au = new Audio(src);
      btn.addEventListener("click", () => { au.currentTime = 0; au.play().catch(() => {}); });
      host.appendChild(btn); return;
    }
    const img = new Image(); img.src = src;
    if (e.type === "sprite") {
      const cell = (e.meta && e.meta.cell) || 64, dirs = (e.meta && e.meta.dirs) || 8, scale = 3;
      const c = document.createElement("canvas"); c.width = cell * scale; c.height = cell * scale;
      const cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      let d = 0;
      const draw = () => { if (!img.complete || !img.naturalWidth) return; cx.clearRect(0, 0, c.width, c.height); cx.drawImage(img, (d % dirs) * cell, 0, cell, cell, 0, 0, c.width, c.height); };
      img.onload = draw;
      if (spriteTimer) clearInterval(spriteTimer);
      spriteTimer = setInterval(() => { d++; draw(); }, 420);
      const wrap = document.createElement("div"); wrap.style.textAlign = "center";
      wrap.appendChild(c); const cap = document.createElement("div"); cap.className = "ag-note"; cap.textContent = `${dirs}-direction sheet — cycling facings`; wrap.appendChild(cap);
      host.appendChild(wrap); return;
    }
    if (e.type === "tile") {
      const cell = (e.meta && e.meta.cell) || 32, n = 4, scale = 3;
      const c = document.createElement("canvas"); c.width = cell * n * scale; c.height = cell * n * scale;
      const cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      img.onload = () => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cx.drawImage(img, 0, 0, cell, cell, x * cell * scale, y * cell * scale, cell * scale, cell * scale); };
      host.appendChild(c); return;
    }
    if (e.type === "icon") {
      const slot = document.createElement("div");
      slot.style.cssText = "width:96px;height:96px;background:#20263a;border:2px solid #394a6b;border-radius:8px;display:flex;align-items:center;justify-content:center";
      img.style.width = "72px"; img.style.height = "72px"; img.style.imageRendering = "pixelated";
      slot.appendChild(img); host.appendChild(slot); return;
    }
    // object
    img.style.maxHeight = "220px"; img.style.imageRendering = "pixelated";
    host.appendChild(img);
  }

  // ---- apply as a LOCAL override (reversible skin) ------------------------
  // v1 supports ICON overrides (cleanest: wraps the global icon() cache). Other
  // types record the intent and explain that a render hook is coming.
  const overrides = load("ioe_art_overrides_v1", {});
  function applyOverride(e) {
    if (e.type === "icon") {
      overrides[e.id] = { type: "icon", src: assetUrl(e.asset), target: e.target };
      save("ioe_art_overrides_v1", overrides);
      toast(`"${e.title}" saved as a local icon skin. Pick which item it replaces from Equip → (coming soon), or it previews here.`);
    } else {
      toast(`Applying ${e.type} art to the live world needs a render hook — coming in the next pass. For now the preview above shows exactly how it looks in-game.`);
    }
  }

  // ---- upload / submit ----------------------------------------------------
  function openUpload() {
    if (!open) toggle(true);
    closeModal();
    const draft = load(LS_DRAFT, { type: "sprite", cell: 64, dirs: 8 });
    const m = document.createElement("div"); m.className = "ag-modal";
    m.innerHTML = `
      <div class="ag-panel" style="position:relative">
        <button class="ag-btn mut ag-x" data-x>✕</button>
        <h3>Submit your art</h3>
        <div class="ag-by">Package a sprite, icon, tile, object or sound into a <code>submission.json</code>. It stays on your device until you send it to the curator, who reviews it before it joins the gallery.</div>
        <div class="ag-preview" data-prev><span class="ag-note">Choose a file to preview</span></div>
        <div class="ag-row"><label>File</label><input type="file" data-file accept="image/png,image/webp,image/gif,audio/*"></div>
        <div class="ag-row"><label>Type</label>
          <select data-type>${TYPES.map(t => `<option value="${t}" ${draft.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="ag-row"><label>Title</label><input data-title maxlength="48" value="${esc(draft.title || "")}"></div>
        <div class="ag-row"><label>Your name</label><input data-author maxlength="32" value="${esc(draft.author || "")}"></div>
        <div class="ag-row"><label>Used for</label><input data-target maxlength="80" placeholder="e.g. wolf monster / iron dagger icon / grass tile" value="${esc(draft.target || "")}"></div>
        <div class="ag-row"><label>Tags</label><input data-tags placeholder="comma,separated" value="${esc(draft.tags || "")}"></div>
        <div class="ag-row" data-spritemeta><label>Sheet</label>
          <input type="number" data-cell min="8" max="256" step="1" value="${draft.cell || 64}" style="max-width:90px" title="cell size (px)">
          <span class="ag-note">px cell ×</span>
          <input type="number" data-dirs min="1" max="8" step="1" value="${draft.dirs || 8}" style="max-width:70px" title="directions">
          <span class="ag-note">directions</span></div>
        <div class="ag-row">
          <button class="ag-btn gr" data-gen>⤓ Generate submission.json</button>
          <span class="ag-note" data-status></span>
        </div>
        <div class="ag-note" data-channel></div>
      </div>`;
    root.appendChild(m);
    const q = s => m.querySelector(s);
    const state = { file: null, dataUrl: null, w: 0, h: 0 };
    const syncSpriteMeta = () => { q("[data-spritemeta]").style.display = q("[data-type]").value === "sprite" ? "flex" : "none"; };
    syncSpriteMeta();
    q("[data-channel]").innerHTML = "When ready: <b>" + esc(CFG.submitChannel) + "</b>" + (CFG.submitUrl ? ` — <a href="${esc(CFG.submitUrl)}" target="_blank" rel="noopener" style="color:#7fa8d8">open</a>` : "");
    q("[data-x]").addEventListener("click", closeModal);
    m.addEventListener("click", ev => { if (ev.target === m) closeModal(); });
    q("[data-type]").addEventListener("change", () => { syncSpriteMeta(); saveDraft(); if (state.dataUrl) preview(); });
    ["[data-title]", "[data-author]", "[data-target]", "[data-tags]", "[data-cell]", "[data-dirs]"].forEach(sel => q(sel).addEventListener("input", saveDraft));

    function saveDraft() {
      save(LS_DRAFT, { type: q("[data-type]").value, title: q("[data-title]").value, author: q("[data-author]").value,
        target: q("[data-target]").value, tags: q("[data-tags]").value, cell: +q("[data-cell]").value, dirs: +q("[data-dirs]").value });
    }
    function preview() {
      const type = q("[data-type]").value;
      renderPreview(q("[data-prev]"), { type, meta: { cell: +q("[data-cell]").value, dirs: +q("[data-dirs]").value } }, state.dataUrl);
    }
    q("[data-file]").addEventListener("change", ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      const isAudio = /^audio\//.test(f.type);
      const cap = isAudio ? CFG.maxAudioBytes : CFG.maxImageBytes;
      if (f.size > cap) { q("[data-status]").textContent = `Too big (${(f.size / 1048576).toFixed(1)}MB, max ${(cap / 1048576)}MB).`; return; }
      const rd = new FileReader();
      rd.onload = () => {
        state.file = f; state.dataUrl = rd.result;
        if (isAudio) { if (q("[data-type]").value !== "sound") { q("[data-type]").value = "sound"; syncSpriteMeta(); } preview(); q("[data-status]").textContent = f.name; return; }
        const im = new Image(); im.onload = () => { state.w = im.width; state.h = im.height; preview(); q("[data-status]").textContent = `${f.name} — ${im.width}×${im.height}`; }; im.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    q("[data-gen]").addEventListener("click", () => {
      if (!state.dataUrl) { q("[data-status]").textContent = "Pick a file first."; return; }
      const title = q("[data-title]").value.trim(); const author = q("[data-author]").value.trim();
      if (!title || !author) { q("[data-status]").textContent = "Title and your name are required."; return; }
      const type = q("[data-type]").value;
      const sub = {
        submissionVersion: 1, type, title, author,
        target: q("[data-target]").value.trim(),
        tags: q("[data-tags]").value.split(",").map(s => s.trim()).filter(Boolean),
        meta: type === "sprite" ? { cell: +q("[data-cell]").value, dirs: +q("[data-dirs]").value }
              : type === "sound" ? {} : { w: state.w, h: state.h },
        date: new Date().toISOString().slice(0, 10),
        asset: state.dataUrl,
      };
      downloadJSON(sub, `submission-${slug(title)}.json`);
      q("[data-status]").textContent = "Downloaded — now send it in. Thank you!";
    });
  }

  // ---- helpers ------------------------------------------------------------
  function exportVotes() {
    const ids = Object.keys(votes).filter(k => votes[k]);
    downloadJSON({ votesVersion: 1, date: new Date().toISOString().slice(0, 10), upvotes: ids }, "my-art-votes.json");
  }
  function downloadJSON(obj, name) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "art";
  function toast(msg) {
    const t = document.createElement("div");
    t.style.cssText = "position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:#1c2338;border:1px solid #3a4a6b;color:#e7e9f2;padding:10px 16px;border-radius:8px;z-index:20;max-width:70%;text-align:center";
    t.textContent = msg; root.appendChild(t); setTimeout(() => t.remove(), 4200);
  }

  // ---- open / close -------------------------------------------------------
  async function toggle(force) {
    build();
    open = force == null ? !open : force;
    root.classList.toggle("open", open);
    if (open) { await ensureFeed(); renderGrid(); }
    else closeModal();
  }
  window.toggleArtGallery = () => { toggle(); };

  // Shift+A (capture phase → beats the bundled keydown handler; also avoids the
  // typing-into-an-input case). Esc closes.
  window.addEventListener("keydown", e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "");
    if (open && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); toggle(false); return; }
    if (e.code === "KeyA" && (e.shiftKey || e.getModifierState && e.getModifierState("Shift")) && !typing) {
      e.preventDefault(); e.stopImmediatePropagation(); toggle();
    }
  }, true);
})();
