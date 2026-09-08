// ===== Isle of Emberfall — bootstrap =====
"use strict";

// Renderer startup failed — the one non-recoverable boot error. Under file://
// this is EXPECTED since the sprite sheets moved to external files
// (assets/sheets/*.webp): every file:// document is its own opaque origin, so
// the sheets taint the atlas canvas and WebGL refuses the textures. Explain
// the fix on screen instead of dying to a blank page, and offer a raw
// localStorage save download so the character can follow to localhost.
function bootFailed() {
  const isFile = location.protocol === "file:";
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;inset:0;z-index:99999;background:#14161f;color:#e8eaf2;" +
    "font:15px/1.5 OpenDyslexic,Verdana,sans-serif;padding:12vh 18vw;overflow:auto";
  d.innerHTML = isFile
    ? "<h2>Emberfall can't run from file:// any more</h2>" +
      "<p>The sprite sheets now live in separate <code>assets/sheets/*.webp</code> files, and " +
      "browsers refuse to feed file:// images to WebGL (the world can't get its textures).</p>" +
      "<p><b>To play:</b> double-click <code>Start Emberfall.command</code> in the game folder — " +
      "it starts a tiny local server and opens the game at <code>http://localhost:8899</code>.</p>" +
      "<p>localhost counts as a different browser identity, so your character won't be there on " +
      "first launch. Click the button below to back up this page's save, then use " +
      "<b>Import</b> in the localhost game and pick that file.</p>" +
      "<button id='bf-save' style='font:inherit;padding:8px 16px;cursor:pointer'>Download save backup</button>"
    : "<h2>Emberfall couldn't start its renderer</h2>" +
      "<p>WebGL initialisation failed — check the browser console for details.</p>";
  document.body.appendChild(d);
  const btn = document.getElementById("bf-save");
  if (btn) btn.onclick = () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { alert("No save found in this browser."); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    a.download = "emberfall-save-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
  };
}

// Callers (8):
//  main.js:27,49 main/assets.js:36 render3d.js:323,325,642 storage.js:8,152
async function init() {
  // IMGS is fully decoded by now (we're the loadAssets(init) callback) — the
  // minimap draws icons continuously without ever requiring the world map to
  // be opened, so this can't wait on openWorldMap() (see applyMapIconArt()).
  if (typeof applyMapIconArt === "function") applyMapIconArt();
  const loaded = loadGame();
  // The original Isle of Emberfall renders in HD-2D with billboard sprites (the
  // R3D three.js renderer). The retired prototype voxel engine is intentionally left
  // DISABLED so the original bestiary AND all original sprites are shown — LC3D
  // has no billboard path for monsters, so it would draw voxel NPCs instead of
  // the tiny-creatures art. Keeping lcBoot=false skips LC3D.loadEngine(),
  // applyLcBestiary() and LC3D.start(), so the renderer falls through to R3D.
  const lcBoot = false;
  // if (typeof LC3D !== "undefined" && LC3D) { try { lcBoot = await LC3D.loadEngine(); } catch (e) { console.error("LC3D load:", e); } }
  // if (lcBoot && typeof applyLcBestiary === "function") applyLcBestiary();
  world = genWorld();
  monsters = []; // spawned lazily as chunks activate (updateWorldStuff)
  // fold vaults/accounts keyed by retired regional net ids onto today's
  // networks (bank edge rules changed in chunk v43 — storage.js)
  if (loaded) migrateBankNets();
  if (!loaded) {
    newPlayer();
    const s = world.playerStart;
    player.x = s.x; player.y = s.y;
    log("Welcome to the Isle of Emberfall!", "gold");
    log("Click things to interact. Check the ? tab for a guide.", "sys");
  } else {
    if (!loaded.pos || !passable(player.x, player.y)) {
      const s = world.playerStart;
      player.x = s.x; player.y = s.y;
      player.level = 0;
    }
    // (bridge tiles are water underneath — standing on the deck is not sailing)
    if (world.isWater(player.x, player.y) &&
        !String(world.getDecor(player.x, player.y) || "").startsWith("stone_bridge"))
      player.sailing = bestBoat();
    log("Welcome back to the Isle of Emberfall!", "gold");
  }
  // Unconditional build beacon (stale-client diagnosis): shows in EVERY boot,
  // new save or old, and reports whether the current feature wiring is live.
  log(`build 2026-09-03d · placing ${ITEMS.raft_logs && ITEMS.raft_logs.place ? "on" : "OFF"}` +
      ` · ammo ${String(ITEMS.arrow_iron && ITEMS.arrow_iron.icon).startsWith("i_arrow_") ? "paired" : "OFF"}`, "sys");
  // Warm only the chunks AROUND THE PLAYER. A long-lived save can carry
  // thousands of seen chunks; decoding a map image for every one of them (and,
  // after a chunk-cache version bump, regenerating every one of them via the
  // prewarm queue) OOM-crashed the tab during load. Everything farther out
  // hydrates on demand: markSeen streams nearby chunks as you move, and the
  // world map's prewarm pump pulls stored images from IndexedDB as you pan.
  const bootNear = new Set();
  {
    const pcx = Math.floor(player.x / world.CHUNK), pcy = Math.floor(player.y / world.CHUNK);
    for (const k of seenChunks) {
      const [cx, cy] = k.split(",").map(Number);
      if (Math.abs(cx - pcx) <= 8 && Math.abs(cy - pcy) <= 8) bootNear.add(k);
    }
  }
  // restore persisted world-name registries first: chunk gen below stamps
  // settlement/POI labels, and a cache hit here skips an ~8s full-world
  // naming pass (world/features.js preloadWorldNames)
  if (world.preloadWorldNames) await world.preloadWorldNames();
  await world.preloadSeen(bootNear);
  // warm the zoomed-out macro set FIRST — its one small ranged getAll must
  // not queue behind the per-key chunk-image storm below, so the first map
  // open (however early) already has the whole generalized world on hand
  try { world.prewarmMacros(); } catch (e) { /* best effort */ }
  world.preloadMapImages(bootNear).then(() => { for (const k of bootNear) { const [cx, cy] = k.split(",").map(Number); world.prewarmMapChunk(cx, cy); } });
  player.px = PX(player.x);
  player.py = PX(player.y);
  // Prefer the retired prototype engine renderer (voxel world, real 3D models,
  // retired prototype collision + pathfinding); fall back to the three.js billboards.
  let lcOk = false;
  if (lcBoot) {
    try { lcOk = LC3D.start(); } catch (e) { console.error("LC3D start:", e); }
  }
  if (lcOk) {
    REN = LC3D;
    log("retired prototype engine online: 3D models, voxels and pathfinding active.", "gold");
  } else {
    let r3dOk = false;
    try { r3dOk = R3D.init(); } catch (e) { console.error("R3D init:", e); }
    if (!r3dOk) return bootFailed();
    REN = R3D;
  }
  gameReady = true;
  saveGame();
  uiDirty = true;

  // `now` is WALL-CLOCK (Date.now, epoch ms), not a session timer — so every
  // game-logic timer (crop growth, node/monster respawn, husbandry cooldowns,
  // decor regrowth…) is measured against real time and KEEPS RUNNING while the
  // tab is closed: on return, `now` has advanced by the real elapsed time and
  // anything whose deadline passed is simply ready. The per-frame delta is
  // capped (below) so a long gap can't fast-forward movement/animation.
  let last = Date.now();
  function frame(t) {
    now = Date.now();
    const dt = Math.min(100, now - last);
    last = now;
    // one bad frame (a transient renderer error) must never kill the loop
    try {
      stepPlayer(dt);
      updateZoom(dt);
      updateAction();
      updateMonsters(dt);
      updateWorldStuff();
      tickTrade(); // close the shop/bank window when out of reach
      if (typeof npcChatTick === "function") npcChatTick(); // AI NPC earshot greetings (Nets)
      if (typeof tickPlaced === "function") tickPlaced(); // temporary placed decor withers
      if (typeof Quests !== "undefined") Quests.tick(); // quest collect/reach objectives
      render();
    } catch (e) {
      console.error("frame error:", e);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

loadAssets(init);
