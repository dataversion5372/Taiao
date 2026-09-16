// ===== Taiao — the Bifrost crossing (Tūhura Isle graduation cinematic) =====
// Sigrid's wayfinding song calls down a pillar of light and lifts the player
// clean out of the world. ONE continuous camera pull — no whiteout cut — sells the
// illusion that every point of the mandelbrot holds an entire vast world:
//
//   BEAM     the sidebar clears, the pillar swells, and the LIVE camera climbs
//            to RISE_ZOOM. The character is repainted centre-screen at a FIXED
//            size (the world shrinks; they don't — they are rising). Two
//            screenshots of the live canvas are taken on the way up.
//   RISE     past the live zoom limit the pull continues on PRE-RENDERED
//            frames: the screenshots shrink inside a macro-tile bake of the
//            whole isle, inside a painted endless ocean. The isle becomes a
//            speck on open water. (The silent teleport fires here, hidden
//            under the opaque painting, so Newhaven warms up for ~26s.)
//   MELT     the XaoS zoomer (libs/xaos/xaos.js — the vendored GPL Hubička
//            engine) fades in beneath, zooming OUT from seahorse valley; the
//            ocean disc shrinks LOCKED to the fractal's own zoom rate behind a
//            radial dissolve, so the sea's edges melt into filaments and the
//            island/ocean recedes to a speck in the set's background.
//   WIDE     the whole mandelbrot; the zoom-out eases off.
//   PAN      the view drifts across the set toward elephant valley.
//   DIVE     zoom IN on a new speck — which grows into the WORLD MAP seen from
//            ~0.01 px/tile (a pre-baked panorama ~220k tiles across: flat
//            classify colours sharpened by step-64 worker macros), proving the
//            new speck holds a world as vast as the one you left.
//   FALL     the map zooms 0.01 → 14 into Newhaven — far bake, then live
//            streamed macro tiles — and the character descends into the plaza.
//
// Driven by Tutorial.graduate(): Bifrost.start({ onTeleport, onDone }).
// onTeleport (silent graduation: teleport + isle seal + overnight clock shift)
// fires once the painting covers the screen AND the landing chunks have been
// pre-generated under it (paced per tick, so the renderer's first sync at
// Newhaven never freezes the rise); onDone prints the arrival log. While
// Bifrost.active(), main.js pauses the player / action / quest ticks but
// keeps world updates and render() alive.
//
// PRE-RENDERED: everything from T_BEAM on ships as a baked video
// (assets/bifrost.webm, produced by tools/record_bifrost.js) — at runtime the
// game only plays the video and composites the live screenshots + the
// player's character on top, so no fractal or macro baking runs mid-game.
// The full procedural painter is kept below: it IS the offline recorder, and
// it takes over automatically as a fallback when the asset is missing/slow.
//
// Fail-safe: every phase is wrapped; any error (or Escape after a few seconds)
// jumps to the landing so a player can never be stranded mid-sky. If XaoS
// fails to load, the void falls back to streaking starlight; if a canvas
// screenshot comes back blank it is simply skipped (the isle bake covers).
"use strict";

const Bifrost = (function () {
  // phase boundaries, seconds from start
  const T_BEAM  = 4.0;   // live ascent: pillar swells, camera climbs to RISE_ZOOM
  const T_PORT  = 4.6;   // earliest teleport (screen is fully painted from T_BEAM)
  const T_PORT_MAX = 11.0; // teleport deadline even if the chunk pregen is slow
  const T_FXIN  = 10.6;  // fractal canvas fades in beneath the ocean
  const T_LOCK  = 12.0;  // ocean disc LOCKS to the fractal zoom; edges dissolve
  const T_WIDE  = 17.5;  // zoom-out bottoms out: the whole set on screen
  const T_PAN   = 20.5;  // pan across the set toward the destination speck
  const T_SPECK = 22.6;  // the world-map speck starts growing in the dive point
  const T_MAP   = 24.0;  // map fills the screen (z = MAP_Z0); fractal fades
  const T_FALL  = 30.0;  // map zoom-in bottoms out; the character descends
  const T_LAND  = 30.9;  // crossfade to the live world; touchdown
  const RISE_ZOOM = 5.2; // live camZoom at capture (beyond ZOOM_MAX; shipped safe)
  const CAP_A_AT  = 2.6; // live camZoom at which the sharper mid capture is taken

  // px-per-tile ladder. LIVE_K converts live camZoom to screen px per tile at
  // the camera's look target: view height = 2*tan(fov/2)*|cam-look| = 0.891 *
  // 12.66 * camZoom world units (render3d: fov 48°, dist (9.1, 8.8)*camZoom).
  // Perspective tilt makes this approximate — the crossfade hides the rest.
  const LIVE_K = 11.28;
  const Z_LOCK = 0.08;   // painted zoom when the fractal takes over (isle ~17px)
  const MAP_Z0 = 0.01;   // the far-map reveal zoom ("the whole endless world")
  const MAP_Z1 = 14;     // map zoom at touchdown (handoff to the live renderer)

  // fractal viewpoints. region.center.y is stored PREMULTIPLIED by the canvas
  // aspect (see xaos.js convertArea, which divides y by it) — so multiply here.
  const ASPECT = () => (W && H) ? W / H : 16 / 10;
  const PT_A = () => ({ x: -0.743643887037151, y: 0.13182590420533 * ASPECT() }); // seahorse valley (the isle)
  const PT_B = () => ({ x: 0.2925, y: 0.0149 * ASPECT() });                        // elephant valley (the destination speck)
  const RAD_TIGHT = 0.006;  // zoomed onto a single speck
  const RAD_WIDE = 2.8;     // the whole set
  const FX_W = 480, FX_H = 300;
  const FX_HUE0 = 165;      // base hue-rotate: XaoS's default orange → deep ocean blue,
                            // so the sea's rim melts into same-coloured filaments

  // The crossing ships as a PRE-RENDERED VIDEO (tools/record_bifrost.js bakes
  // the whole T_BEAM..T_LAND timeline offline at VID_WxVID_H/30fps): at
  // runtime only the video, the live screenshots and the character are
  // composited — no fractal, no macro bakes. The full procedural painter
  // below is kept as the automatic fallback when the asset is missing or
  // slow, and doubles as the offline recorder.
  const VID_SRC = "assets/bifrost.webm";
  const VID_W = 1920, VID_H = 1080;
  const ZCAP_VID = VID_H / (LIVE_K * RISE_ZOOM);  // the recording's px/tile at T_BEAM

  // pre-render geometry
  const IB_PX = 1024, IB_R = 1;        // isle bake: 1024px @ 1 px/tile (±512 tiles)
  const FAR_PX = 1536, FAR_SPAN = 220000;             // far map: ~220k tiles across
  const FAR_R = FAR_PX / FAR_SPAN;                    // ≈ 0.007 px/tile
  const FAR_STEP = 64;                                // macro step for far tiles
  const OCEAN_DEEP = "rgb(50,70,114)";                // MAP_WATER[0] (map.js)

  let ACTIVE = false;
  let root = null, fx = null, top = null, tctx = null, charCv = null;
  let W = 0, H = 0, dpr = 1;
  let t0 = 0, raf = 0, opts = null;
  let teleported = false, doneCalled = false, skipping = false, restored = false;
  let zoomer = null, frac = null, xaosReady = false, xaosFailed = false;
  let savedZoom = 1.6, sidebarDisp = null;
  let stars = null, prewarmAt = 0, charDrawn = false, charH0 = 48;
  // the static-frame stack (all freed in finish())
  let org = null;                       // { x, y, yawK } — takeoff pos + camera cardinal
  let capA = null, capB = null;         // { cv, r } live screenshots (r = px/tile)
  let isleCv = null, isleShow = null;   // north-up bake + camera-rotated copy
  let isleC = null, isleAt = 0, isleDone = false;
  let farCv = null, farCells = null, farPend = null, farAt = 0, farX0 = 0, farY0 = 0;
  let worldCv = null, wctx = null;      // full-screen compositor for masked phases
  let land = null;                      // touchdown tile (playerStart, then live pos)
  let zCap = 17, capTried = false;      // painted zoom at capture B (set live)
  let pregen = null;                    // Newhaven chunk queue, drained under cover
  let vid = null, vidMode = null, vidFailed = false, procReady = false;
  let recMode = false;                  // offline recorder drives the painters

  const active = () => ACTIVE;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const expLerp = (a, b, k) => a * Math.pow(b / a, k);   // constant perceptual zoom
  const easeIn = v => v * v;
  const easeOut = v => 1 - (1 - v) * (1 - v);
  const easeInOut = v => v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const play = (n, v, r) => { try { if (typeof sfx === "function") sfx(n, v, r); } catch (e) {} };
  const cssW = () => W / dpr, cssH = () => H / dpr;
  const pxPerTile = cz => cssH() / (LIVE_K * cz);

  // ---------- character sprite (drawn centre-screen through the crossing) ----
  function prepChar() {
    charCv = document.createElement("canvas");
    charDrawn = false;
    try {
      if (typeof window !== "undefined" && typeof window.drawPlayerFrame === "function") {
        window.drawPlayerFrame(charCv, 0, 160);   // di 0 = south / front-facing
        charDrawn = true;
      }
    } catch (e) { charDrawn = false; }
    if (!charDrawn) { charCv.width = charCv.height = 160; } // blank; harmless
  }
  function drawChar(cxS, cyS, h, alpha, spin) {
    if (!charDrawn || alpha <= 0) return;
    tctx.save();
    tctx.globalAlpha = clamp01(alpha);
    tctx.imageSmoothingEnabled = false;
    tctx.translate(cxS, cyS);
    if (spin) tctx.rotate(spin);
    tctx.drawImage(charCv, -h / 2, -h / 2, h, h);
    tctx.restore();
  }
  // fixed while the world shrinks (the rise), growing gently once the fractal
  // owns the frame so the figure reads against the filaments
  function charSize(t) {
    return lerp(charH0, 0.26 * cssH(), easeInOut(seg(t, T_LOCK, T_WIDE)));
  }

  // ---------- live-canvas screenshots (the first "pre-rendered frames") -----
  // Copy the WebGL canvas right after driving a render() ourselves, so the
  // drawing buffer is valid in this task even without preserveDrawingBuffer.
  function snapLive(cz) {
    try {
      if (typeof render === "function") render();
      const src = document.getElementById("game");
      if (!src || !src.width) return null;
      const cv = document.createElement("canvas");
      cv.width = src.width; cv.height = src.height;
      const c2 = cv.getContext("2d");
      c2.drawImage(src, 0, 0);
      // reject an all-blank copy (lost context / cleared buffer)
      const d = c2.getImageData(cv.width >> 1, cv.height >> 1, 4, 4).data;
      let lit = false;
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] > 8) { lit = true; break; }
      if (!lit) return null;
      // crop the top: the tilted live view fades into fog-hazed distance up
      // there, which would float over the top-down ocean as a blue band. dy
      // (source px) records how far the original screen-centre now sits
      // above the crop's centre, so the blit can keep the world aligned.
      const y0 = Math.round(cv.height * 0.22);
      const crop = document.createElement("canvas");
      crop.width = cv.width; crop.height = cv.height - y0;
      crop.getContext("2d").drawImage(cv, 0, -y0);
      // r: px/tile — the buffer is CSS-sized (render3d setSize w/o dpr)
      return { cv: crop, r: cv.height / (LIVE_K * cz), dy: y0 / 2 };
    } catch (e) { return null; }
  }

  // ---------- XaoS lazy-load ----------
  function loadXaos() {
    if ((typeof xaos !== "undefined" && xaos.zoom) || (window.xaos && window.xaos.zoom)) { xaosReady = true; return; }
    const sc = document.createElement("script");
    sc.src = "libs/xaos/xaos.js";
    sc.onload = () => { xaosReady = true; };
    sc.onerror = () => { xaosFailed = true; };
    document.head.appendChild(sc);
  }
  function startFractal() {
    if (zoomer || !xaosReady) return;
    try {
      const X = (typeof xaos !== "undefined") ? xaos : window.xaos;
      const a = PT_A();
      frac = Object.assign({}, X.mandelbrot, { region: { center: { x: a.x, y: a.y }, radius: { x: RAD_TIGHT, y: RAD_TIGHT }, angle: 0 } });
      zoomer = X.zoom(fx, frac);
      if (!zoomer || !zoomer.drawFractal) { zoomer = null; xaosFailed = true; }
    } catch (e) { zoomer = null; xaosFailed = true; }
  }
  function setRegion(cx, cy, rad) {
    if (!frac) return;
    frac.region.center.x = cx; frac.region.center.y = cy;
    frac.region.radius.x = rad; frac.region.radius.y = rad;
    try { zoomer.drawFractal(false); } catch (e) { zoomer = null; xaosFailed = true; }
  }
  // the fractal camera path: zoom OUT at A (log-space), pan A -> B, dive IN
  function fracState(t) {
    const A = PT_A(), B = PT_B();
    if (t < T_WIDE) {
      const k = easeInOut(seg(t, T_LOCK, T_WIDE));
      return { cx: A.x, cy: A.y, rad: expLerp(RAD_TIGHT, RAD_WIDE, k) };
    } else if (t < T_PAN) {
      const k = easeInOut(seg(t, T_WIDE, T_PAN));
      return { cx: lerp(A.x, (A.x + B.x) / 2, k), cy: lerp(A.y, (A.y + B.y) / 2, k), rad: RAD_WIDE * (1 + 0.05 * k) };
    }
    const k = seg(t, T_PAN, T_MAP);
    return { cx: lerp((A.x + B.x) / 2, B.x, easeInOut(k)), cy: lerp((A.y + B.y) / 2, B.y, easeInOut(k)),
             rad: expLerp(RAD_WIDE * 1.05, RAD_TIGHT, easeIn(k)) };
  }
  // painted world zoom (px/tile). Before T_LOCK the rise runs on its own
  // exponential; from T_LOCK it is SLAVED to the fractal radius so the ocean
  // disc recedes exactly as fast as the set zooms out — that lock is what
  // makes the sea read as a place ON the fractal.
  function worldZoom(t) {
    if (t < T_LOCK) return expLerp(zCap, Z_LOCK, easeOut(seg(t, T_BEAM, T_LOCK)));
    return Z_LOCK * (RAD_TIGHT / fracState(t).rad);
  }

  // ---------- shared macro-tile painter (bakes + the live map dive) ---------
  const STEPS = [0.25, 0.5, 1, 2, 4, 8, 16, 64];
  // paint the world seen from z px/tile centred on (cx,cy) game tiles into a
  // wpx × hpx viewport on ctx2. Missing tiles borrow a coarser cached step or
  // fall back to a flat classify colour, and are queued for the worker.
  function paintTiles(ctx2, wpx, hpx, z, cx, cy, forceStep) {
    const step = forceStep || world.overviewStep(Math.min(z, world.OVERVIEW_Z - 0.01));
    const MT = world.MACRO_PX * step;
    const m0x = Math.floor((cx - wpx / 2 / z) / 2 / MT), m1x = Math.floor((cx + wpx / 2 / z) / 2 / MT);
    const m0y = Math.floor((cy - hpx / 2 / z) / 2 / MT), m1y = Math.floor((cy + hpx / 2 / z) / 2 / MT);
    let full = true;
    for (let my = m0y; my <= m1y; my++)
      for (let mx = m0x; mx <= m1x; mx++) {
        const sx = (mx * MT * 2 - cx) * z + wpx / 2, sy = (my * MT * 2 - cy) * z + hpx / 2, px = MT * 2 * z + 0.5;
        let img = world.macroCache.get(step + ":" + mx + "," + my);
        if (!img) world.requestMacro(step, mx, my);
        if (img) { ctx2.drawImage(img, sx, sy, px, px); continue; }
        full = false;
        let drawn = false;
        for (const s2 of STEPS) {
          if (s2 <= step) continue;
          const f = s2 / step, ax = Math.floor(mx / f), ay = Math.floor(my / f);
          const big = world.macroCache.get(s2 + ":" + ax + "," + ay);
          if (!big) continue;
          const sub = world.MACRO_PX / f;
          ctx2.drawImage(big, (mx - ax * f) * sub, (my - ay * f) * sub, sub, sub, sx, sy, px, px);
          drawn = true; break;
        }
        if (!drawn) { ctx2.fillStyle = world.macroFlat(step, mx, my); ctx2.fillRect(sx, sy, px, px); }
      }
    return full;
  }
  function drawMapView(z, cx, cy, alpha) {
    tctx.save();
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.globalAlpha = clamp01(alpha == null ? 1 : alpha);
    tctx.imageSmoothingEnabled = true;
    paintTiles(tctx, cssW(), cssH(), z, cx, cy);
    tctx.restore();
  }
  // finest zooms FIRST (the dive's final seconds need their art most), each
  // level centre-out, so whatever the worker manages lands where it is seen
  function prewarmMacros(cx, cy) {
    let n = 0;
    for (const z of [10, 4.5, 2, 0.9, 0.4, 0.18, 0.08, 0.03]) {
      const step = world.overviewStep(Math.min(z, world.OVERVIEW_Z - 0.01));
      const MT = world.MACRO_PX * step;
      const m0x = Math.floor((cx - cssW() / 2 / z) / 2 / MT), m1x = Math.floor((cx + cssW() / 2 / z) / 2 / MT);
      const m0y = Math.floor((cy - cssH() / 2 / z) / 2 / MT), m1y = Math.floor((cy + cssH() / 2 / z) / 2 / MT);
      const want = [];
      for (let my = m0y; my <= m1y; my++)
        for (let mx = m0x; mx <= m1x; mx++)
          if (!world.macroCache.get(step + ":" + mx + "," + my))
            want.push([mx, my, (mx - (m0x + m1x) / 2) ** 2 + (my - (m0y + m1y) / 2) ** 2]);
      want.sort((a, b) => a[2] - b[2]);
      for (const c of want) {
        if (n++ >= 1200) return;
        world.requestMacro(step, c[0], c[1]);
      }
    }
  }

  // ---------- the isle bake (the terrain around the takeoff, from macros) ---
  function isleSetup() {
    const gx = (typeof TUT_ISLE !== "undefined") ? TUT_ISLE.CX * 2 : org.x;
    const gy = (typeof TUT_ISLE !== "undefined") ? TUT_ISLE.CY * 2 : org.y;
    isleC = { x: gx, y: gy };
    isleCv = document.createElement("canvas");
    isleCv.width = isleCv.height = IB_PX;
    // coarse-to-fine prewarm around the isle (coarse queued first = shown first)
    for (const step of [2, 1, 0.5]) {
      const MT = world.MACRO_PX * step, r = IB_PX / 2 / IB_R / 2; // half-span, map coords
      for (let my = Math.floor((gy / 2 - r) / MT); my * MT <= gy / 2 + r; my++)
        for (let mx = Math.floor((gx / 2 - r) / MT); mx * MT <= gx / 2 + r; mx++)
          world.requestMacro(step, mx, my);
    }
    isleCompose();
  }
  function isleCompose() {
    const c2 = isleCv.getContext("2d");
    c2.clearRect(0, 0, IB_PX, IB_PX);
    c2.imageSmoothingEnabled = true;
    // step 0.5 = native 1 px/tile art at this bake's resolution
    isleDone = paintTiles(c2, IB_PX, IB_PX, IB_R, isleC.x, isleC.y, 0.5);
    // soft radial edge: the outer band (past the isle's guaranteed private
    // ocean) dissolves into the painted endless sea beneath
    c2.save();
    c2.globalCompositeOperation = "destination-in";
    const g = c2.createRadialGradient(IB_PX / 2, IB_PX / 2, 300, IB_PX / 2, IB_PX / 2, 490);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    c2.fillStyle = g; c2.fillRect(0, 0, IB_PX, IB_PX);
    c2.restore();
    // the live camera shows the world rotated to a cardinal (camYaw = k*90°);
    // show the bake the same way so coastlines line up under the screenshots
    if (org.yawK) {
      if (!isleShow) { isleShow = document.createElement("canvas"); isleShow.width = isleShow.height = IB_PX; }
      const r2 = isleShow.getContext("2d");
      r2.setTransform(1, 0, 0, 1, 0, 0);
      r2.clearRect(0, 0, IB_PX, IB_PX);
      r2.translate(IB_PX / 2, IB_PX / 2);
      r2.rotate(org.yawK * Math.PI / 2);
      r2.drawImage(isleCv, -IB_PX / 2, -IB_PX / 2);
    } else isleShow = isleCv;
    isleAt = Date.now();
  }
  // rotate a world-space offset from the takeoff point into screen space
  // (screen = R(+camYaw) · map delta; camYaw is a cardinal so this is exact)
  function rotOff(dx, dy) {
    const a = org.yawK * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }

  // ---------- Newhaven chunk pregen (the teleport must not stall the rise) --
  // The renderer's first sync after the teleport generates every missing chunk
  // in its radius SYNCHRONOUSLY — a multi-second freeze if it lands mid-shot
  // (same cost main.js pays at boot, where it's paced one chunk per paint).
  // Same medicine here: from the moment the static frames cover the screen,
  // drain the landing neighbourhood a little per tick, and only fire the
  // teleport once the ground is hot (or at T_PORT_MAX, whichever comes first).
  function pregenSetup() {
    const CS = world.CHUNK;
    const reach = 19 * savedZoom + 22;                    // renderer tile reach
    const rc = Math.ceil(reach / CS) + 1;
    const pcx = Math.floor(land.x / CS), pcy = Math.floor(land.y / CS);
    pregen = [];
    for (let dy = -rc; dy <= rc; dy++)
      for (let dx = -rc; dx <= rc; dx++)
        if (!world.chunks || !world.chunks.has((pcx + dx) + "," + (pcy + dy)))
          pregen.push([pcx + dx, pcy + dy, dx * dx + dy * dy]);
    pregen.sort((a, b) => a[2] - b[2]);
  }
  function pregenJob() {
    if (!pregen || !pregen.length) return;
    const t1 = Date.now() + 24;                           // ~one gen per frame
    do {
      const c = pregen.shift();
      try { world.getChunk(c[0], c[1]); } catch (e) { /* generated on arrival instead */ }
    } while (pregen.length && Date.now() < t1);
  }

  // ---------- the far world-map bake (the 0.01x panorama) -------------------
  function farSetup() {
    farCv = document.createElement("canvas");
    farCv.width = farCv.height = FAR_PX;
    const c2 = farCv.getContext("2d");
    c2.fillStyle = OCEAN_DEEP; c2.fillRect(0, 0, FAR_PX, FAR_PX);
    farX0 = land.x - FAR_SPAN / 2; farY0 = land.y - FAR_SPAN / 2;
    const MTg = world.MACRO_PX * FAR_STEP * 2;          // game tiles per far cell
    const m0x = Math.floor(farX0 / MTg), m1x = Math.floor((farX0 + FAR_SPAN) / MTg);
    const m0y = Math.floor(farY0 / MTg), m1y = Math.floor((farY0 + FAR_SPAN) / MTg);
    farCells = [];
    for (let my = m0y; my <= m1y; my++)
      for (let mx = m0x; mx <= m1x; mx++) farCells.push({ mx, my });
    // centre-out: the middle of the panorama (where the dive lands) first
    const cmx = (m0x + m1x) / 2, cmy = (m0y + m1y) / 2;
    farCells.sort((a, b) => (Math.abs(a.mx - cmx) + Math.abs(a.my - cmy)) - (Math.abs(b.mx - cmx) + Math.abs(b.my - cmy)));
    farPend = [];
  }
  // paced: a slice of flat classify fills + worker requests per frame, then a
  // periodic sweep that overdraws arrived step-64 macro art
  function farJob() {
    if (!farCells) return;
    const c2 = farCv.getContext("2d");
    const MTg = world.MACRO_PX * FAR_STEP * 2;
    for (let n = 0; n < 60 && farCells.length; n++) {
      const c = farCells.shift();
      const x = (c.mx * MTg - farX0) * FAR_R, y = (c.my * MTg - farY0) * FAR_R, s = MTg * FAR_R + 0.5;
      try { c2.fillStyle = world.macroFlat(FAR_STEP, c.mx, c.my); c2.fillRect(x, y, s, s); } catch (e) {}
      world.requestMacro(FAR_STEP, c.mx, c.my);
      farPend.push(c);
    }
    if (Date.now() - farAt < 600) return;
    farAt = Date.now();
    c2.imageSmoothingEnabled = true;
    // step-64 art undersamples the classify field (one pixel per 128 map
    // units) into salt-and-pepper — average it down to 16px before use so
    // the pointwise shimmer becomes area-true continent colour. Two 2x
    // halvings, because a single 4x drawImage minification is allowed to
    // point-sample; each 2x step is a real 2x2 average everywhere.
    if (!farJob._t32) {
      farJob._t32 = document.createElement("canvas"); farJob._t32.width = farJob._t32.height = 32;
      farJob._t16 = document.createElement("canvas"); farJob._t16.width = farJob._t16.height = 16;
    }
    const c32 = farJob._t32.getContext("2d"), c16 = farJob._t16.getContext("2d");
    c32.imageSmoothingEnabled = c16.imageSmoothingEnabled = true;
    for (let i = farPend.length - 1; i >= 0; i--) {
      const c = farPend[i];
      const img = world.macroCache.get(FAR_STEP + ":" + c.mx + "," + c.my);
      if (!img) continue;
      c32.clearRect(0, 0, 32, 32); c32.drawImage(img, 0, 0, 32, 32);
      c16.clearRect(0, 0, 16, 16); c16.drawImage(farJob._t32, 0, 0, 16, 16);
      c2.drawImage(farJob._t16, (c.mx * MTg - farX0) * FAR_R, (c.my * MTg - farY0) * FAR_R, MTg * FAR_R + 0.5, MTg * FAR_R + 0.5);
      farPend.splice(i, 1);
    }
  }

  // ---------- painters ----------
  function clearTop() { tctx.setTransform(dpr, 0, 0, dpr, 0, 0); tctx.clearRect(0, 0, cssW(), cssH()); }

  // draw cv scaled by s with its centre at (ax,ay), source-clipped to the
  // viewport (a bake blown up 20x must not ask the browser to rasterize a
  // 30,000px image; only the visible window of it is submitted)
  function blitLayer(c2, cv, s, ax, ay, alpha, wpx, hpx) {
    if (!cv || s <= 0) return;
    const dw = cv.width * s, dh = cv.height * s;
    if (dw < 1 || dh < 1) return;
    const dx = ax - dw / 2, dy = ay - dh / 2;
    const vx0 = Math.max(dx, 0), vy0 = Math.max(dy, 0);
    const vx1 = Math.min(dx + dw, wpx), vy1 = Math.min(dy + dh, hpx);
    if (vx1 <= vx0 || vy1 <= vy0) return;
    c2.save();
    c2.globalAlpha = clamp01(alpha == null ? 1 : alpha);
    c2.imageSmoothingEnabled = true;
    c2.drawImage(cv, (vx0 - dx) / s, (vy0 - dy) / s, (vx1 - vx0) / s, (vy1 - vy0) / s, vx0, vy0, vx1 - vx0, vy1 - vy0);
    c2.restore();
  }

  // the endless painted sea under the isle bake: deep-water fill, a sun glade
  // under the riser, and glints pinned to WORLD positions so they converge as
  // the camera climbs (the water recedes; it doesn't just sit there)
  function paintOcean(c2, zw, t, wpx, hpx) {
    c2.fillStyle = OCEAN_DEEP; c2.fillRect(0, 0, wpx, hpx);
    const g = c2.createRadialGradient(wpx / 2, hpx / 2, 0, wpx / 2, hpx / 2, Math.max(wpx, hpx) * 0.55);
    g.addColorStop(0, "rgba(140,180,220,0.20)");
    g.addColorStop(0.5, "rgba(90,130,190,0.08)");
    g.addColorStop(1, "rgba(10,18,44,0.25)");
    c2.fillStyle = g; c2.fillRect(0, 0, wpx, hpx);
    c2.fillStyle = "rgba(225,240,255,0.8)";
    for (let i = 0; i < 90; i++) {
      const a = i * 2.399, rr = 900 + (i * 761 % 23000);           // world tiles from takeoff
      const p = rotOff(Math.cos(a) * rr, Math.sin(a) * rr);
      const sx = wpx / 2 + p.x * zw, sy = hpx / 2 + p.y * zw;
      if (sx < -4 || sy < -4 || sx > wpx + 4 || sy > hpx + 4) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * (1.1 + (i % 7) * 0.13) + i);
      c2.globalAlpha = 0.10 + 0.30 * tw;
      const r = 0.6 + (i % 3) * 0.7;
      c2.fillRect(sx - r / 2, sy - r / 2, r, r);
    }
    c2.globalAlpha = 1;
  }

  // the full painted-world stack at zoom zw: sea, isle bake, screenshots
  function paintWorldLayers(c2, zw, t, wpx, hpx) {
    paintOcean(c2, zw, t, wpx, hpx);
    if (isleShow && isleC) {
      const off = rotOff(isleC.x - org.x, isleC.y - org.y);
      blitLayer(c2, isleShow, zw / IB_R, wpx / 2 + off.x * zw, hpx / 2 + off.y * zw, 1, wpx, hpx);
    }
    if (capB) blitLayer(c2, capB.cv, zw / capB.r, wpx / 2, hpx / 2 + capB.dy * (zw / capB.r), 1, wpx, hpx);
    if (capA) blitLayer(c2, capA.cv, zw / capA.r, wpx / 2, hpx / 2 + capA.dy * (zw / capA.r), 1, wpx, hpx);
  }

  function paintBeam(t) {
    const w = cssW(), h = cssH();
    clearTop();
    const k = seg(t, 0, T_BEAM), swell = easeIn(clamp01(k * 1.4));
    const bw = w * (0.05 + 0.30 * swell), a = 0.26 + 0.62 * swell;
    const g = tctx.createLinearGradient(w / 2 - bw, 0, w / 2 + bw, 0);
    g.addColorStop(0, "rgba(200,230,255,0)");
    g.addColorStop(0.35, `rgba(220,240,255,${a * 0.55})`);
    g.addColorStop(0.5, `rgba(255,255,255,${a})`);
    g.addColorStop(0.65, `rgba(220,240,255,${a * 0.55})`);
    g.addColorStop(1, "rgba(200,230,255,0)");
    tctx.fillStyle = g; tctx.fillRect(w / 2 - bw, 0, bw * 2, h);
    paintMotes(t, w, h, swell);
    paintHaze(t, w, h);
    // the fixed-size double takes over from the live sprite under the glare —
    // from here on the world shrinks and the character doesn't
    drawChar(w / 2, h / 2, charH0, seg(t, 0.6, 1.4), 0);
  }
  function paintMotes(t, w, h, swell) {
    tctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * swell})`;
    for (let i = 0; i < 28; i++) {
      const ph = (i * 0.371 + t * (0.25 + (i % 5) * 0.11)) % 1;
      const mx = w / 2 + Math.sin(i * 7.13) * w * 0.28, my = h * (1 - ph), r = 1 + (i % 3) + swell * 2;
      tctx.fillRect(mx - r / 2, my - r / 2, r, r);
    }
  }
  // altitude light: a rim of sky-glow that swallows the screen edges during
  // the early rise (and softens the seam where a screenshot meets the bake)
  function paintHaze(t, w, h) {
    const a = 0.5 * easeOut(seg(t, 1.2, T_BEAM)) * (1 - seg(t, T_BEAM + 1.5, T_LOCK - 1));
    if (a <= 0.01) return;
    const g = tctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(215,235,255,0)");
    g.addColorStop(1, `rgba(215,235,255,${a})`);
    tctx.fillStyle = g; tctx.fillRect(0, 0, w, h);
  }

  // RISE → MELT → WIDE → PAN → DIVE: everything between the beam and the map
  function paintSky(t) {
    const w = cssW(), h = cssH();
    // fractal beneath (its own canvas under `top`) — driven only once it is
    // about to matter, so it has a beat to converge before the fade-in
    if (zoomer && frac) {
      if (t >= T_FXIN - 1.2) {
        const r = fracState(t);
        setRegion(r.cx, r.cy, r.rad);
        // fade out only once the destination map fully covers the screen —
        // any earlier and the live world bleeds through the dive
        fx.style.opacity = String(easeOut(seg(t, T_FXIN, T_LOCK)) * (1 - seg(t, T_MAP - 0.05, T_MAP + 0.35)));
        fx.style.filter = `hue-rotate(${FX_HUE0 + (t - T_FXIN) * 14}deg) saturate(1.3) contrast(1.05)`;
        fx.style.transform = `scale(${1.06 + 0.04 * Math.sin((t - T_FXIN) * 1.4)})`;
      }
    } else if (xaosReady && !xaosFailed) startFractal();

    clearTop();
    if (!zoomer && t >= T_FXIN) paintStars(t, w, h);   // fallback backdrop

    const halfDiag = Math.hypot(w, h) / 2;
    const sOut = t < T_LOCK ? 1 : RAD_TIGHT / fracState(t).rad;
    const maskR = 1.25 * halfDiag * sOut;
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wctx.clearRect(0, 0, w, h);
    // the home world exists only until the zoom-out swallows it — the dive
    // (where the mask radius regrows) belongs to the DESTINATION speck
    let worldA = t < T_WIDE ? 1 - seg(t, T_WIDE - 1.5, T_WIDE) : 0;
    if (worldA > 0 && maskR > 1) {
      // the receding home world, its rim dissolving into the set
      paintWorldLayers(wctx, worldZoom(t), t, w, h);
      if (t >= T_LOCK) maskWorld(maskR, w, h);
    }
    let speckGlow = 0;
    if (worldA <= 0 && t >= T_SPECK && farCv) {
      // the DESTINATION world, growing out of the dive point
      const zm = MAP_Z0 * (RAD_TIGHT / fracState(t).rad);
      blitLayer(wctx, farCv, zm / FAR_R, w / 2, h / 2, 1, w, h);
      // feather radius rides the bake's own on-screen size (a soft round
      // mote, never the bake's square edge), then outgrows the corners so
      // the map arrives opaque edge to edge
      const rBake = FAR_PX * (zm / FAR_R) / 2;
      maskWorld(rBake * lerp(1, 2.6, easeIn(seg(zm / MAP_Z0, 0.25, 1))), w, h);
      worldA = easeOut(seg(t, T_SPECK, T_MAP - 0.4));
      speckGlow = Math.min(halfDiag, FAR_PX * (zm / FAR_R) * 0.75) * 1.6;
    }
    if (worldA > 0) {
      if (speckGlow > 2) {
        // a bright mote in the void: the new world announces itself with
        // light before its ground resolves
        const gg = tctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, speckGlow);
        gg.addColorStop(0, `rgba(235,242,255,${0.55 * worldA})`);
        gg.addColorStop(0.45, `rgba(190,210,250,${0.22 * worldA})`);
        gg.addColorStop(1, "rgba(160,190,240,0)");
        tctx.fillStyle = gg; tctx.fillRect(0, 0, w, h);
      }
      tctx.save();
      tctx.globalAlpha = worldA;
      tctx.drawImage(worldCv, 0, 0, w, h);
      tctx.restore();
    }

    // beam afterglow: the pillar lets go just after the static frames take
    // over. NOT baked into the recording — at playback these sit on TOP of
    // the live screenshots, so paintVideo paints them instead.
    if (!recMode) {
      const after = 1 - seg(t, T_BEAM, T_BEAM + 1.1);
      if (after > 0) {
        const bw = w * 0.35 * after;
        const g = tctx.createLinearGradient(w / 2 - bw, 0, w / 2 + bw, 0);
        g.addColorStop(0, "rgba(220,240,255,0)");
        g.addColorStop(0.5, `rgba(255,255,255,${0.5 * after})`);
        g.addColorStop(1, "rgba(220,240,255,0)");
        tctx.fillStyle = g; tctx.fillRect(w / 2 - bw, 0, bw * 2, h);
        paintMotes(t, w, h, after);
      }
      paintHaze(t, w, h);
    }

    // deep-void vignette while the fractal reigns
    const vk = seg(t, T_LOCK + 1, T_WIDE) * (1 - seg(t, T_SPECK, T_MAP));
    if (vk > 0.01) {
      const vg = tctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(8,4,20,${vk * (0.32 + 0.18 * Math.sin(t * 1.9))})`);
      tctx.fillStyle = vg; tctx.fillRect(0, 0, w, h);
    }

    drawChar(w / 2, h / 2, charSize(t), 1, 0);
  }
  function maskWorld(radius, w, h) {
    wctx.save();
    wctx.globalCompositeOperation = "destination-in";
    const g = wctx.createRadialGradient(w / 2, h / 2, Math.max(0, radius * 0.55), w / 2, h / 2, Math.max(1, radius));
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    wctx.fillStyle = g; wctx.fillRect(0, 0, w, h);
    wctx.restore();
  }

  const mapZoom = t => expLerp(MAP_Z0, MAP_Z1, easeInOut(seg(t, T_MAP, T_FALL)));

  function paintMap(t) {
    const w = cssW(), h = cssH();
    if (fx) fx.style.opacity = "0";
    clearTop();
    const zm = mapZoom(t);
    // far panorama under, live streamed macro tiles over as the detail arrives
    const liveA = clamp01((Math.log(zm) - Math.log(0.03)) / (Math.log(0.08) - Math.log(0.03)));
    if (liveA < 1 && farCv)
      blitLayer(tctx, farCv, zm / FAR_R, w / 2, h / 2, 1, w, h);
    if (zm > 0.03) drawMapView(zm, land.x, land.y, liveA);
    // the character descends: drifts down and grows as the ground rushes up,
    // with a slow tumble that settles as they near the plaza
    const fall = seg(t, T_FALL - 1.4, T_LAND);
    const cy = h * lerp(0.44, 0.62, easeIn(fall));
    const ch = lerp(0.26, 0.40, easeIn(fall)) * h;
    drawChar(w / 2, cy, ch, 1, Math.sin(t * 2.2) * 0.06 * (1 - fall));
    const haze = (1 - seg(t, T_MAP, T_FALL)) * 0.3;
    if (haze > 0) { tctx.fillStyle = `rgba(190,215,240,${haze})`; tctx.fillRect(0, 0, w, h); }
    tctx.fillStyle = "rgba(255,255,255,0.7)";
    const fk = seg(t, T_MAP, T_LAND);
    for (let i = 0; i < 9; i++) {
      const ph = (i * 0.173 + fk * (1.5 + (i % 4) * 0.3)) % 1;
      const cw = (0.28 + (i % 3) * 0.16) * w * (0.4 + ph * 2.2);
      const cxp = w * ((i * 0.37) % 1) + (ph - 0.5) * w * 0.7, cyp = h * ((i * 0.61) % 1) + (ph - 0.5) * h * 0.9;
      const al = 0.3 * Math.sin(Math.PI * ph);
      if (al <= 0.01) continue;
      tctx.globalAlpha = al; tctx.beginPath(); tctx.ellipse(cxp, cyp, cw, cw * 0.38, 0, 0, 7); tctx.fill();
    }
    tctx.globalAlpha = 1;
  }

  function paintStars(t, w, h) {
    tctx.fillStyle = "#04030a"; tctx.fillRect(0, 0, w, h);
    if (!stars) stars = [...Array(140)].map((_, i) => ({ a: i * 2.399, r: (i * 37 % 100) / 100, s: 0.4 + (i * 13 % 10) / 10 }));
    tctx.strokeStyle = "rgba(190,210,255,0.8)";
    for (const s of stars) {
      s.r += 0.012 * s.s; if (s.r > 1) s.r -= 1;
      const rr = easeIn(s.r) * Math.hypot(w, h) * 0.55;
      tctx.beginPath();
      tctx.moveTo(w / 2 + Math.cos(s.a) * rr, h / 2 + Math.sin(s.a) * rr);
      tctx.lineTo(w / 2 + Math.cos(s.a) * (rr + 8), h / 2 + Math.sin(s.a) * (rr + 8));
      tctx.stroke();
    }
  }

  // ---------- pre-rendered video playback ----------
  // The video is recorded centred on Sigrid's harbour (graduation always
  // happens beside her) with a north-up camera; start() snaps camStep to 0 so
  // the live view and screenshots share that orientation.
  const vidCenter = () => (typeof TUT_ISLE !== "undefined" && TUT_ISLE.pods && TUT_ISLE.pods[14])
    ? { x: TUT_ISLE.pods[14].mx * 2, y: TUT_ISLE.pods[14].my * 2 }
    : { x: org ? org.x : 0, y: org ? org.y : 0 };
  // the recording's zoom timeline (video px/tile) — same curve the recorder
  // painted with, so runtime overlays stay glued to the baked terrain
  function zVidAt(t) {
    if (t < T_LOCK) return expLerp(ZCAP_VID, Z_LOCK, easeOut(seg(t, T_BEAM, T_LOCK)));
    return Z_LOCK * (RAD_TIGHT / fracState(t).rad);
  }
  // decide once, just before the static frames take over: play the video if
  // it buffered in time, else spin up the full procedural painter
  function decideMode(t) {
    if (vidMode !== null) return;
    if (vidFailed || !vid) { vidMode = false; procSetup(); return; }
    if (vid.readyState >= 3 && isFinite(vid.duration) && vid.duration > 10) { vidMode = true; return; }
    if (t >= T_BEAM - 0.6) { vidMode = false; procSetup(); }
  }
  // the procedural path's heavy setup, deferred so the video path never pays it
  function procSetup() {
    if (procReady) return;
    procReady = true;
    try { if (vid) { vid.pause(); vid.style.display = "none"; } } catch (e) {}
    loadXaos();
    try { if (!isleCv) isleSetup(); } catch (e) { console.error("bifrost isle bake:", e); }
    try { if (!farCv) farSetup(); } catch (e) { console.error("bifrost far bake:", e); }
    const tryStart = () => { if (zoomer || !ACTIVE) return; if (xaosReady) startFractal(); else if (!xaosFailed) setTimeout(tryStart, 120); };
    setTimeout(tryStart, 150);
  }
  function paintVideo(t) {
    const w = cssW(), h = cssH();
    const k = Math.max(w / VID_W, h / VID_H);        // object-fit: cover
    const zs = zVidAt(t) * k;                        // screen px per tile
    // keep the takeoff point centred: slide the video by the (decaying,
    // clamped) offset between the player and the recording's centre
    const vc = vidCenter();
    const dx = Math.max(-140, Math.min(140, (vc.x - org.x) * zs));
    const dy = Math.max(-140, Math.min(140, (vc.y - org.y) * zs));
    vid.style.transform = `translate(${dx}px, ${dy}px)`;
    if (vid.paused && !vid.ended) { try { vid.play().catch(() => {}); } catch (e) {} }
    // rAF wall-clock is the master clock; nudge the video when it drifts
    const want = t - T_BEAM;
    if (isFinite(vid.duration) && Math.abs(vid.currentTime - want) > 0.25) {
      try { vid.currentTime = Math.max(0, Math.min(want, vid.duration - 0.05)); } catch (e) {}
    }
    clearTop();
    // the live screenshots ride the recorded zoom until the melt swallows them
    if (t < T_WIDE) {
      if (capB) blitLayer(tctx, capB.cv, zs / capB.r, w / 2, h / 2 + capB.dy * (zs / capB.r), 1, w, h);
      if (capA) blitLayer(tctx, capA.cv, zs / capA.r, w / 2, h / 2 + capA.dy * (zs / capA.r), 1, w, h);
    }
    // afterglow + altitude haze live on top of the screenshots (the recorder
    // skips them, so they are not doubled)
    const after = 1 - seg(t, T_BEAM, T_BEAM + 1.1);
    if (after > 0) {
      const bw = w * 0.35 * after;
      const g = tctx.createLinearGradient(w / 2 - bw, 0, w / 2 + bw, 0);
      g.addColorStop(0, "rgba(220,240,255,0)");
      g.addColorStop(0.5, `rgba(255,255,255,${0.5 * after})`);
      g.addColorStop(1, "rgba(220,240,255,0)");
      tctx.fillStyle = g; tctx.fillRect(w / 2 - bw, 0, bw * 2, h);
      paintMotes(t, w, h, after);
    }
    paintHaze(t, w, h);
    // the character: held centre through the sky, descending over the map
    if (t < T_FALL - 1.4) drawChar(w / 2, h / 2, charSize(t), 1, 0);
    else {
      const fall = seg(t, T_FALL - 1.4, T_LAND);
      drawChar(w / 2, h * lerp(0.44, 0.62, easeIn(fall)),
               lerp(0.26, 0.40, easeIn(fall)) * h, 1, Math.sin(t * 2.2) * 0.06 * (1 - fall));
    }
  }

  // ---------- lifecycle ----------
  function doTeleport() {
    if (teleported) return;
    teleported = true;
    try { opts && opts.onTeleport && opts.onTeleport(); } catch (e) { console.error("bifrost teleport:", e); }
    camZoom = savedZoom;
    // land facing north: the map dive is north-up and the live world must
    // match it when the painting fades at touchdown
    try { if (typeof camStep !== "undefined") camStep = 0; } catch (e) {}
    try { land = { x: player.x, y: player.y }; } catch (e) {}
    try { prewarmMacros(land.x, land.y); } catch (e) {}
    play("portal", 0.8);
  }
  function restoreUI() {
    if (restored) return;
    restored = true;
    try {
      const sb = document.getElementById("sidebar");
      if (sb && sidebarDisp !== null) sb.style.display = sidebarDisp;
      if (typeof resizeCanvas === "function") resizeCanvas();
    } catch (e) {}
  }
  function landShake() {
    const el = document.getElementById("gamecol"); if (!el) return;
    const t1 = Date.now() + 420;
    (function sh() {
      const left = t1 - Date.now();
      if (left <= 0) { el.style.transform = ""; return; }
      const m = left / 420 * 7;
      el.style.transform = `translate(${(Math.random() - 0.5) * m}px, ${(Math.random() - 0.5) * m}px)`;
      requestAnimationFrame(sh);
    })();
  }
  function finish() {
    if (doneCalled) return;
    doneCalled = true;
    doTeleport(); restoreUI();
    cancelAnimationFrame(raf);
    if (root) { root.remove(); root = null; }
    window.removeEventListener("keydown", keyGate, true);
    ACTIVE = false; camZoom = savedZoom;
    landShake(); play("step_stone", 1);
    setTimeout(() => play("levelup", 0.8), 480);
    try { opts && opts.onDone && opts.onDone(); } catch (e) {}
    try { if (typeof Postcard !== "undefined" && Postcard.offerBifrostKeepsake) Postcard.offerBifrostKeepsake(); } catch (e) {}
    try { if (vid) { vid.pause(); vid.removeAttribute("src"); } } catch (e) {}
    vid = null; vidMode = null;
    zoomer = null; frac = null; stars = null; opts = null; charCv = null;
    capA = capB = null; isleCv = isleShow = null; farCv = null;
    farCells = farPend = null; worldCv = null; wctx = null; org = null; pregen = null;
  }
  function skip() {
    if (!ACTIVE || skipping) return;
    skipping = true; doTeleport(); restoreUI();
    if (root) { root.style.transition = "opacity 0.6s"; root.style.opacity = "0"; }
    setTimeout(finish, 620);
  }
  function keyGate(e) { if (!ACTIVE) return; if (e.key === "Escape") skip(); e.stopPropagation(); e.preventDefault(); }

  function tick() {
    if (!ACTIVE || skipping) return;
    const t = (Date.now() - t0) / 1000;
    try {
      if (vidMode === false) {
        if (isleCv && !isleDone && Date.now() - isleAt > 450 && t < T_LOCK + 2) isleCompose();
        farJob();
      }
      if (t < T_BEAM) {
        decideMode(t);
        camZoom = savedZoom + (RISE_ZOOM - savedZoom) * easeIn(seg(t, 0, T_BEAM));
        // the sharper mid screenshot on the way up
        if (!capA && camZoom >= CAP_A_AT) capA = snapLive(camZoom);
        paintBeam(t);
      } else if (t < T_LAND) {
        if (vidMode === null) decideMode(T_BEAM);   // a stalled beam frame skipped the decision
        if (!capTried) {
          capTried = true;
          camZoom = RISE_ZOOM;
          capB = snapLive(RISE_ZOOM);
          zCap = capB ? capB.r : pxPerTile(RISE_ZOOM);
        }
        if (!teleported && t >= T_PORT && (t >= T_PORT_MAX || !pregen || !pregen.length)) doTeleport();
        if (vidMode) {
          if (vid.style.display === "none") vid.style.display = "block";
          paintVideo(t);
        } else if (t < T_MAP) {
          paintSky(t);
          if (teleported && Date.now() >= prewarmAt) { prewarmAt = Date.now() + 400; prewarmMacros(land.x, land.y); }
        } else {
          paintMap(t);
        }
        if (t >= T_FALL) {
          if (!restored) restoreUI();        // reframe the live world before it shows through
          root.style.opacity = String(1 - seg(t, T_FALL, T_LAND));
        }
      } else { finish(); return; }
      // AFTER the paint: a slow cold chunk stalls the NEXT frame, not this one
      if (t >= T_BEAM && !teleported) pregenJob();
    } catch (e) { console.error("bifrost frame:", e); finish(); return; }
    raf = requestAnimationFrame(tick);
  }

  function start(o) {
    if (ACTIVE) return;
    opts = o || {};
    ACTIVE = true;
    teleported = doneCalled = skipping = restored = false;
    capA = capB = null; capTried = false; isleCv = isleShow = null; isleDone = false; isleAt = 0;
    farCv = null; farCells = null; farPend = null; farAt = 0; stars = null;
    savedZoom = (typeof camZoom === "number" && camZoom > 0) ? Math.min(camZoom, 3) : 1.6;
    if (typeof cancelAction === "function") { try { cancelAction(); } catch (e) {} }
    // snap the view north for the climb: the recorded video is north-up, so
    // the live view and its screenshots must share that orientation (a 90°
    // cardinal snap is the game's normal camera grammar)
    try { if (typeof camStep !== "undefined") camStep = 0; } catch (e) {}
    org = {
      x: (typeof player !== "undefined") ? player.x : 0,
      y: (typeof player !== "undefined") ? player.y : 0,
      yawK: 0,
    };
    land = (typeof world !== "undefined" && world.playerStart)
      ? { x: world.playerStart.x, y: world.playerStart.y } : { x: 0, y: 0 };

    // clear the sidebar for a full-bleed crossing
    try {
      const sb = document.getElementById("sidebar");
      if (sb) { sidebarDisp = sb.style.display; sb.style.display = "none"; }
      if (typeof resizeCanvas === "function") resizeCanvas();
    } catch (e) {}

    root = document.createElement("div");
    root.id = "bifrost";
    root.style.cssText = "position:fixed;inset:0;z-index:9500;background:transparent;overflow:hidden;";
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(window.innerWidth * dpr); H = Math.round(window.innerHeight * dpr);
    // the pre-rendered crossing, buffering during the beam; decideMode picks
    // it (or the procedural fallback) just before the static frames take over
    vidMode = null; vidFailed = false; procReady = false;
    vid = document.createElement("video");
    vid.muted = true; vid.playsInline = true; vid.preload = "auto";
    vid.onerror = () => { vidFailed = true; if (vidMode) { vidMode = false; procSetup(); } };
    vid.src = VID_SRC;
    vid.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;";
    fx = document.createElement("canvas");
    fx.width = FX_W; fx.height = FX_H;
    fx.style.cssText = "position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:0;transform-origin:50% 50%;";
    top = document.createElement("canvas");
    top.width = W; top.height = H;
    top.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    root.appendChild(vid); root.appendChild(fx); root.appendChild(top);
    root.onclick = () => { if ((Date.now() - t0) / 1000 > 3) skip(); };
    document.body.appendChild(root);
    tctx = top.getContext("2d");
    worldCv = document.createElement("canvas");
    worldCv.width = W; worldCv.height = H;
    wctx = worldCv.getContext("2d");
    window.addEventListener("keydown", keyGate, true);

    charH0 = Math.max(40, Math.min(0.2 * cssH(), 2.1 * pxPerTile(savedZoom)));
    zCap = pxPerTile(RISE_ZOOM);
    prepChar();
    try { pregenSetup(); } catch (e) { pregen = null; console.error("bifrost pregen:", e); }

    play("attune", 0.9);
    setTimeout(() => play("spellcast", 0.8), 850);
    t0 = Date.now();
    raf = requestAnimationFrame(tick);
  }

  // ---------- offline recorder ----------
  // tools/record_bifrost.js drives this from a headless browser: start()
  // builds the cinematic at a fixed VID_WxVID_H with no character /
  // screenshots / teleport / sfx; ready() reports when every bake and the
  // fractal have converged (pumping the composites meanwhile); frame(t)
  // paints the timeline at a virtual second; the tool screenshots each frame
  // and encodes the stack to VID_SRC. Dev-only surface; inert in production.
  const record = {
    timeline: () => ({ t0: T_BEAM, t1: T_LAND, fps: 30, w: VID_W, h: VID_H }),
    start() {
      if (ACTIVE) return false;
      ACTIVE = true; recMode = true;
      teleported = true; doneCalled = skipping = false; restored = true;
      capA = capB = null; capTried = true; stars = null; charDrawn = false; charCv = null;
      isleCv = isleShow = null; isleDone = false; isleAt = 0;
      farCv = null; farCells = null; farPend = null; farAt = 0;
      savedZoom = 1.6; vidMode = false; procReady = false; vid = null;
      dpr = 1; W = VID_W; H = VID_H;
      org = { x: 0, y: 0, yawK: 0 };
      Object.assign(org, vidCenter());
      land = (typeof world !== "undefined" && world.playerStart)
        ? { x: world.playerStart.x, y: world.playerStart.y } : { x: 0, y: 0 };
      root = document.createElement("div");
      root.id = "bifrost-rec";
      root.style.cssText = `position:fixed;left:0;top:0;width:${VID_W}px;height:${VID_H}px;z-index:9500;background:#000;overflow:hidden;`;
      fx = document.createElement("canvas");
      fx.width = FX_W; fx.height = FX_H;
      fx.style.cssText = "position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:0;transform-origin:50% 50%;";
      top = document.createElement("canvas");
      top.width = W; top.height = H;
      top.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      root.appendChild(fx); root.appendChild(top);
      document.body.appendChild(root);
      tctx = top.getContext("2d");
      worldCv = document.createElement("canvas");
      worldCv.width = W; worldCv.height = H;
      wctx = worldCv.getContext("2d");
      zCap = pxPerTile(RISE_ZOOM);             // == ZCAP_VID at this fixed size
      loadXaos();
      try { isleSetup(); } catch (e) { console.error("rec isle bake:", e); }
      try { farSetup(); } catch (e) { console.error("rec far bake:", e); }
      try { prewarmMacros(land.x, land.y); } catch (e) {}
      const tryStart = () => { if (zoomer || !ACTIVE) return; if (xaosReady) startFractal(); else if (!xaosFailed) setTimeout(tryStart, 120); };
      setTimeout(tryStart, 150);
      return true;
    },
    ready() {
      if (!recMode) return false;
      if (isleCv && !isleDone && Date.now() - isleAt > 300) isleCompose();
      farJob();
      try { prewarmMacros(land.x, land.y); } catch (e) {}
      const mq = (typeof world._macDebug === "function") ? world._macDebug() : { q: 0, rq: 0, inf: 0 };
      return !!zoomer && isleDone && !!farCells && farCells.length === 0
        && !!farPend && farPend.length === 0 && mq.q === 0 && mq.rq === 0 && mq.inf === 0;
    },
    frame(t) {
      if (!recMode) return false;
      try {
        if (t < T_MAP) {
          paintSky(t);
          // drawFractal(true) = full exact recompute, no incremental
          // approximation and no time-budget bail — every recorded frame is
          // fully converged however fast the region is moving
          try { if (zoomer) zoomer.drawFractal(true); } catch (e) {}
        } else paintMap(t);
        return true;
      } catch (e) { console.error("rec frame:", e); return false; }
    },
    stop() {
      if (!recMode) return;
      recMode = false; ACTIVE = false;
      if (root) { root.remove(); root = null; }
      zoomer = null; frac = null; stars = null;
      capA = capB = null; isleCv = isleShow = null; farCv = null;
      farCells = farPend = null; worldCv = null; wctx = null; org = null; land = null;
    },
  };

  return { start, active, skip, record };
})();
if (typeof window !== "undefined") window.Bifrost = Bifrost;
