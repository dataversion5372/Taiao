// ===== Taiao — the Bifrost crossing (Tūhura Isle graduation cinematic) =====
// Sigrid's karakia calls down a pillar of light: the camera climbs until the
// isle is a coin on the sea, the light swallows the screen, and the player
// falls between worlds — a realtime XaoS fractal zoom (libs/xaos/xaos.js,
// vendored GPL Hubička-algorithm engine, lazy-loaded here) — then drops out
// of a MORNING sky over the main world: a whole-world macro-map dive that
// zooms from "vast scope of the land" down to the Newhaven plaza, crossfading
// into the live 3D scene as the player lands.
//
// Driven by Tutorial.graduate() (gameplay/tutorial.js): Bifrost.start({
// onTeleport, onDone }) — onTeleport runs the silent graduation mechanics
// (teleport + isle seal + overnight clock shift) at the first whiteout peak,
// so Newhaven's chunks and meshes warm up BEHIND the fractal; onDone prints
// the arrival log lines. While Bifrost.active(), main.js skips the player /
// action / quest sim ticks but keeps world updates and render() alive.
//
// Fail-safe by design: every phase is wrapped; any error (or Escape after a
// few seconds) jumps straight to the landing so a player can never be
// stranded mid-sky. If XaoS fails to load, the void phase falls back to
// streaking starlight.
"use strict";

const Bifrost = (function () {
  // phase boundaries, seconds
  const T_BEAM = 4.2;    // karakia + light pillar + camera climb over the isle
  const T_VOID = 12.4;   // fractal hyperfall (teleport happens at T_BEAM)
  const T_BURST = 12.8;  // white burst out of the void
  const T_FALL = 18.2;   // macro-map dive into Newhaven
  const T_LAND = 19.0;   // crossfade + touchdown
  const RISE_ZOOM = 5.0; // camZoom at the top of the climb (beyond ZOOM_MAX)

  // the famous seahorse-valley point; region.center.y is stored premultiplied
  // by the canvas aspect ratio (see xaos.js convertArea) — corrected below
  const SEA_X = -0.743643887037151, SEA_Y = 0.13182590420533;
  const FX_W = 480, FX_H = 300;

  let ACTIVE = false;
  let root = null, fx = null, top = null, tctx = null;
  let W = 0, H = 0, dpr = 1;
  let t0 = 0, raf = 0, opts = null;
  let teleported = false, doneCalled = false, skipping = false;
  let zoomer = null, frac = null, xaosReady = false, xaosFailed = false;
  let savedZoom = 1.6;
  let stars = null;            // starlight fallback for the void phase
  let prewarmAt = 0;

  const active = () => ACTIVE;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeIn = v => v * v;
  const easeOut = v => 1 - (1 - v) * (1 - v);
  const easeInOut = v => v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
  const play = (name, vol, rate) => { try { if (typeof sfx === "function") sfx(name, vol, rate); } catch (e) {} };

  // ---------- XaoS: lazy-load the vendored engine ----------
  function loadXaos() {
    if (typeof xaos !== "undefined" && xaos.zoom) { xaosReady = true; return; }
    if (window.xaos && window.xaos.zoom) { xaosReady = true; return; }
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
      frac = Object.assign({}, X.mandelbrot, {
        region: { center: { x: -0.75, y: 0.0 }, radius: { x: 2.5, y: 2.5 }, angle: 0 },
      });
      zoomer = X.zoom(fx, frac);        // [taiao-patch 1] returns the ZoomContext
      if (!zoomer || !zoomer.drawFractal) { zoomer = null; xaosFailed = true; }
    } catch (e) { zoomer = null; xaosFailed = true; }
  }

  // ---------- the whole-world macro dive (mirrors wmDraw's pass A, but
  // ---------- truth-rendered: a flyover reveal ignores the explored fog) ----
  const STEPS = [0.25, 0.5, 1, 2, 4, 8, 16];
  function drawMapView(z, cx, cy) {
    // cx/cy in GAME tiles (Newhaven plaza); macro tiles live in MAP units (×2)
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.imageSmoothingEnabled = true;
    const w = W / dpr, h = H / dpr;
    const step = world.overviewStep(Math.min(z, world.OVERVIEW_Z - 0.01));
    const MT = world.MACRO_PX * step;                 // map units per macro tile
    const gx0 = cx - (w / 2) / z, gx1 = cx + (w / 2) / z;
    const gy0 = cy - (h / 2) / z, gy1 = cy + (h / 2) / z;
    const m0x = Math.floor(gx0 / 2 / MT), m1x = Math.floor(gx1 / 2 / MT);
    const m0y = Math.floor(gy0 / 2 / MT), m1y = Math.floor(gy1 / 2 / MT);
    for (let my = m0y; my <= m1y; my++)
      for (let mx = m0x; mx <= m1x; mx++) {
        const sx = (mx * MT * 2 - cx) * z + w / 2;
        const sy = (my * MT * 2 - cy) * z + h / 2;
        const px = MT * 2 * z + 0.5;
        let img = world.macroCache.get(step + ":" + mx + "," + my);
        if (!img) world.requestMacro(step, mx, my);
        if (img) { tctx.drawImage(img, sx, sy, px, px); continue; }
        let drawn = false;
        for (const s2 of STEPS) {                     // coarser cached step: blur beats blocks
          if (s2 <= step) continue;
          const f = s2 / step;
          const ax = Math.floor(mx / f), ay = Math.floor(my / f);
          const big = world.macroCache.get(s2 + ":" + ax + "," + ay);
          if (!big) continue;
          const sub = world.MACRO_PX / f;
          tctx.drawImage(big, (mx - ax * f) * sub, (my - ay * f) * sub, sub, sub, sx, sy, px, px);
          drawn = true; break;
        }
        if (!drawn) { tctx.fillStyle = world.macroFlat(step, mx, my); tctx.fillRect(sx, sy, px, px); }
      }
  }
  // ask the paced macro pump for the dive's tile pyramid while the fractal
  // has the screen — by the time we fall, the land below is already painted
  function prewarmMacros(cx, cy) {
    const w = W / dpr, h = H / dpr;
    for (const z of [0.18, 0.4, 0.9, 2, 4.5]) {
      const step = world.overviewStep(Math.min(z, world.OVERVIEW_Z - 0.01));
      const MT = world.MACRO_PX * step;
      const m0x = Math.floor((cx - w / 2 / z) / 2 / MT), m1x = Math.floor((cx + w / 2 / z) / 2 / MT);
      const m0y = Math.floor((cy - h / 2 / z) / 2 / MT), m1y = Math.floor((cy + h / 2 / z) / 2 / MT);
      for (let my = m0y; my <= m1y; my++)
        for (let mx = m0x; mx <= m1x; mx++)
          if (!world.macroCache.get(step + ":" + mx + "," + my)) world.requestMacro(step, mx, my);
    }
  }

  // ---------- overlay painting ----------
  function paintBeam(t) {
    // the pillar: a soft-edged column of light swelling from the player,
    // shafts drifting upward, everything brightening toward whiteout
    const w = W / dpr, h = H / dpr;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, w, h);
    const k = clamp01(t / T_BEAM);
    const swell = easeIn(clamp01(k * 1.5));
    const bw = w * (0.06 + 0.30 * swell);           // beam width
    const g = tctx.createLinearGradient(w / 2 - bw, 0, w / 2 + bw, 0);
    const a = 0.28 + 0.6 * swell;
    g.addColorStop(0, "rgba(200,230,255,0)");
    g.addColorStop(0.35, `rgba(220,240,255,${a * 0.55})`);
    g.addColorStop(0.5, `rgba(255,255,255,${a})`);
    g.addColorStop(0.65, `rgba(220,240,255,${a * 0.55})`);
    g.addColorStop(1, "rgba(200,230,255,0)");
    tctx.fillStyle = g;
    tctx.fillRect(w / 2 - bw, 0, bw * 2, h);
    // rising motes
    tctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * swell})`;
    for (let i = 0; i < 26; i++) {
      const ph = (i * 0.371 + t * (0.25 + (i % 5) * 0.11)) % 1;
      const mx = w / 2 + Math.sin(i * 7.13) * bw * 0.8;
      const my = h * (1 - ph);
      const r = 1 + (i % 3) + swell * 2;
      tctx.fillRect(mx - r / 2, my - r / 2, r, r);
    }
    // whiteout floor rising to full at phase end
    const white = easeIn(clamp01((k - 0.62) / 0.38));
    if (white > 0) { tctx.fillStyle = `rgba(255,255,255,${white})`; tctx.fillRect(0, 0, w, h); }
  }

  function paintVoid(t) {
    const w = W / dpr, h = H / dpr;
    const k = clamp01((t - T_BEAM) / (T_VOID - T_BEAM));
    // fractal frame (or starlight fallback), plus streaks + vignette on top
    if (zoomer && frac) {
      const ASPECT = FX_W / FX_H;
      const tx = SEA_X, ty = SEA_Y * ASPECT;
      const r = frac.region;
      // exponential dive: radius 2.5 → ~2e-4 across the phase, clamped so the
      // view never leaves the filament country for interior black
      const kz = 0.981;
      r.center.x = tx + (r.center.x - tx) * kz;
      r.center.y = ty + (r.center.y - ty) * kz;
      r.radius.x = Math.max(2e-4, r.radius.x * kz);
      r.radius.y = Math.max(2e-4, r.radius.y * kz);
      try { zoomer.drawFractal(false); } catch (e) { zoomer = null; xaosFailed = true; }
      fx.style.opacity = String(clamp01((t - T_BEAM) / 0.8));
      // the interdimensional shimmer: slow hue carousel + a breathing pulse
      const hue = (t - T_BEAM) * 42;
      const pulse = 1.07 + 0.05 * Math.sin((t - T_BEAM) * 1.7); // never below 1: no canvas edges
      fx.style.filter = `hue-rotate(${hue}deg) saturate(1.35) contrast(1.06)`;
      fx.style.transform = `scale(${pulse})`;
    } else if (!zoomer) {
      if (xaosReady && !xaosFailed) startFractal();
    }
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, w, h);
    if (!zoomer) {
      // starlight fallback: streaks racing outward from centre
      tctx.fillStyle = "#04030a";
      tctx.fillRect(0, 0, w, h);
      if (!stars) stars = [...Array(140)].map((_, i) => ({ a: i * 2.399, r: (i * 37 % 100) / 100, s: 0.4 + (i * 13 % 10) / 10 }));
      tctx.strokeStyle = "rgba(190,210,255,0.8)";
      for (const s of stars) {
        s.r += 0.012 * s.s * (1 + k * 3); if (s.r > 1) s.r -= 1;
        const rr = easeIn(s.r) * Math.hypot(w, h) * 0.55;
        const x1 = w / 2 + Math.cos(s.a) * rr, y1 = h / 2 + Math.sin(s.a) * rr;
        const x2 = w / 2 + Math.cos(s.a) * (rr + 6 + 40 * k * s.r), y2 = h / 2 + Math.sin(s.a) * (rr + 6 + 40 * k * s.r);
        tctx.beginPath(); tctx.moveTo(x1, y1); tctx.lineTo(x2, y2); tctx.stroke();
      }
    }
    // entry flash decaying, exit vignette breathing in
    const flash = 1 - clamp01((t - T_BEAM) / 0.8);
    if (flash > 0) { tctx.fillStyle = `rgba(255,255,255,${flash})`; tctx.fillRect(0, 0, w, h); }
    const vg = tctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(8,4,20,${0.35 + 0.2 * Math.sin(t * 2.1)})`);
    tctx.fillStyle = vg;
    tctx.fillRect(0, 0, w, h);
  }

  function paintFall(t) {
    const w = W / dpr, h = H / dpr;
    const k = clamp01((t - T_FALL_START()) / (T_FALL - T_FALL_START()));
    const s = world.playerStart;
    // altitude → map zoom: exponential in z reads as a steady terminal-velocity
    // fall; ease the ends so the reveal hangs a beat before the ground rush
    const z0 = 0.18, z1 = 13;
    const z = Math.exp(Math.log(z0) + (Math.log(z1) - Math.log(z0)) * easeInOut(k));
    drawMapView(z, s.x, s.y);
    // thin high-altitude haze burning off as we drop
    const haze = (1 - k) * 0.35;
    if (haze > 0) { tctx.fillStyle = `rgba(190,215,240,${haze})`; tctx.fillRect(0, 0, w, h); }
    // clouds whipping past (parallax puffs that swell and slide off-screen)
    tctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 10; i++) {
      const ph = (i * 0.173 + k * (1.4 + (i % 4) * 0.33)) % 1;
      const cw = (0.25 + (i % 3) * 0.18) * w * (0.4 + ph * 2.2);
      const cxp = w * ((i * 0.37) % 1) + (ph - 0.5) * w * 0.7;
      const cyp = h * ((i * 0.61) % 1) + (ph - 0.5) * h * 0.9;
      const al = 0.35 * Math.sin(Math.PI * ph) * (1 - k * 0.6);
      if (al <= 0.01) continue;
      tctx.globalAlpha = al;
      tctx.beginPath(); tctx.ellipse(cxp, cyp, cw, cw * 0.38, 0, 0, Math.PI * 2); tctx.fill();
    }
    tctx.globalAlpha = 1;
    // burst-out flash at the top of the fall
    const flash = 1 - clamp01((t - T_FALL_START()) / 0.5);
    if (flash > 0) { tctx.fillStyle = `rgba(255,255,255,${flash})`; tctx.fillRect(0, 0, w, h); }
  }
  const T_FALL_START = () => T_BURST;

  function paintBurst(t) {
    const w = W / dpr, h = H / dpr;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = clamp01((t - T_VOID) / (T_BURST - T_VOID));
    tctx.fillStyle = `rgba(255,255,255,${easeOut(k)})`;
    tctx.fillRect(0, 0, w, h);
  }

  // ---------- lifecycle ----------
  function doTeleport() {
    if (teleported) return;
    teleported = true;
    try { opts && opts.onTeleport && opts.onTeleport(); } catch (e) { console.error("bifrost teleport:", e); }
    camZoom = savedZoom;             // meshes warm at landing zoom behind the void
    try { prewarmMacros(world.playerStart.x, world.playerStart.y); } catch (e) {}
    play("portal", 0.8);
  }

  function landShake() {
    const el = document.getElementById("gamecol");
    if (!el) return;
    const t1 = Date.now() + 420;
    (function sh() {
      const left = t1 - Date.now();
      if (left <= 0 || !el) { if (el) el.style.transform = ""; return; }
      const m = left / 420 * 7;
      el.style.transform = `translate(${(Math.random() - 0.5) * m}px, ${(Math.random() - 0.5) * m}px)`;
      requestAnimationFrame(sh);
    })();
  }

  function finish() {
    if (doneCalled) return;
    doneCalled = true;
    doTeleport();                     // safety: never finish un-teleported
    cancelAnimationFrame(raf);
    if (root) { root.remove(); root = null; }
    window.removeEventListener("keydown", keyGate, true);
    ACTIVE = false;
    camZoom = savedZoom;
    landShake();
    play("step_stone", 1);
    setTimeout(() => play("levelup", 0.8), 500);
    try { opts && opts.onDone && opts.onDone(); } catch (e) {}
    zoomer = null; frac = null; stars = null; opts = null;
  }

  function skip() {
    if (!ACTIVE || skipping) return;
    skipping = true;
    doTeleport();
    if (root) root.style.transition = "opacity 0.6s";
    if (root) root.style.opacity = "0";
    setTimeout(finish, 620);
  }

  function keyGate(e) {
    if (!ACTIVE) return;
    if (e.key === "Escape") { skip(); }
    e.stopPropagation();
    e.preventDefault();
  }

  function tick() {
    if (!ACTIVE || skipping) return;
    const t = (Date.now() - t0) / 1000;
    try {
      if (t < T_BEAM) {
        // the climb: the isle shrinks beneath the rising light
        camZoom = savedZoom + (RISE_ZOOM - savedZoom) * easeIn(clamp01(t / T_BEAM));
        paintBeam(t);
      } else if (t < T_VOID) {
        if (!teleported) doTeleport();
        paintVoid(t);
        if (Date.now() >= prewarmAt) { prewarmAt = Date.now() + 400; prewarmMacros(world.playerStart.x, world.playerStart.y); }
      } else if (t < T_BURST) {
        fx.style.opacity = "0";
        paintBurst(t);
        if (t + 0.3 > T_BURST && !tick._burstSfx) { tick._burstSfx = 1; play("portal", 0.7, 1.2); }
      } else if (t < T_FALL) {
        paintFall(t);
      } else if (t < T_LAND) {
        // crossfade to the live morning scene
        paintFall(Math.min(t, T_FALL));
        root.style.opacity = String(1 - clamp01((t - T_FALL) / (T_LAND - T_FALL)));
      } else {
        finish();
        return;
      }
    } catch (e) {
      console.error("bifrost frame:", e);
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function start(o) {
    if (ACTIVE) return;
    opts = o || {};
    ACTIVE = true;
    teleported = doneCalled = skipping = false;
    tick._burstSfx = 0;
    savedZoom = (typeof camZoom === "number" && camZoom > 0) ? Math.min(camZoom, 3) : 1.6;
    if (typeof cancelAction === "function") { try { cancelAction(); } catch (e) {} }

    root = document.createElement("div");
    root.id = "bifrost";
    root.style.cssText = "position:fixed;inset:0;z-index:9500;background:transparent;overflow:hidden;";
    fx = document.createElement("canvas");
    fx.width = FX_W; fx.height = FX_H;
    fx.style.cssText = "position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:0;transform-origin:50% 50%;";
    top = document.createElement("canvas");
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(window.innerWidth * dpr); H = Math.round(window.innerHeight * dpr);
    top.width = W; top.height = H;
    top.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    root.appendChild(fx);
    root.appendChild(top);
    root.onclick = () => { if ((Date.now() - t0) / 1000 > 3) skip(); };
    document.body.appendChild(root);
    tctx = top.getContext("2d");
    window.addEventListener("keydown", keyGate, true);

    loadXaos();
    const tryStartFractal = () => {
      if (zoomer || !ACTIVE) return;
      if (xaosReady) startFractal();
      else if (!xaosFailed) setTimeout(tryStartFractal, 120);
    };
    setTimeout(tryStartFractal, 200);

    play("attune", 0.9);
    setTimeout(() => play("spellcast", 0.8), 900);
    t0 = Date.now();
    raf = requestAnimationFrame(tick);
  }

  return { start, active, skip };
})();
if (typeof window !== "undefined") window.Bifrost = Bifrost;
