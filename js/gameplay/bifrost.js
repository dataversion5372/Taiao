// ===== Taiao — the Bifrost crossing (Tūhura Isle graduation cinematic) =====
// Sigrid's karakia calls down a pillar of light and lifts the player clean out
// of the world. The sequence, beat by beat:
//
//   ASCENT   the sidebar clears, the pillar of light swells, and the camera
//            rises — the isle falls away and shrinks beneath you.
//   REVEAL   a whiteout, then the isle is shown to have been a SPECK sitting on
//            a vast fractal (libs/xaos/xaos.js — the vendored GPL Hubička
//            zoomer). Your character fades in, held in the centre of the
//            screen, as the fractal ZOOMS OUT and the isle-speck recedes into
//            its filaments.
//   DRIFT    the zoom-out slows and the view PANS across the fractal to a new
//            region, the character still centred.
//   DIVE     the fractal ZOOMS IN on another speck, which dissolves into the
//            main world map — the whole endless land seen from on high.
//   FALL     the map rushes up and the character DESCENDS, until they drop into
//            the Newhaven plaza and the live world takes over.
//
// Driven by Tutorial.graduate(): Bifrost.start({ onTeleport, onDone }).
// onTeleport (silent graduation: teleport + isle seal + overnight clock shift)
// fires under the whiteout, so Newhaven warms up behind the fractal; onDone
// prints the arrival log. While Bifrost.active(), main.js pauses the player /
// action / quest ticks but keeps world updates and render() alive.
//
// Fail-safe: every phase is wrapped; any error (or Escape after a few seconds)
// jumps to the landing so a player can never be stranded mid-sky. If XaoS
// fails to load, the void falls back to streaking starlight.
"use strict";

const Bifrost = (function () {
  // phase boundaries, seconds from start
  const T_BEAM  = 4.0;   // ascent: sidebar clears, pillar swells, camera climbs
  const T_FLASH = 4.8;   // whiteout bridge (teleport fires here)
  const T_OUT   = 11.5;  // fractal zoom-OUT from the isle-speck; character fades in
  const T_PAN   = 15.0;  // zoom-out slows; pan across the fractal
  const T_IN    = 19.5;  // zoom IN toward a new speck
  const T_MAP   = 20.6;  // crossfade the speck into the world map (seen from high)
  const T_FALL  = 25.0;  // the map rushes up; the character descends
  const T_LAND  = 25.9;  // crossfade to the live world; touchdown
  const RISE_ZOOM = 5.2; // camZoom at the top of the climb (beyond ZOOM_MAX)

  // fractal viewpoints. region.center.y is stored PREMULTIPLIED by the canvas
  // aspect (see xaos.js convertArea, which divides y by it) — so multiply here.
  const ASPECT = () => (W && H) ? W / H : 16 / 10;
  const PT_A = () => ({ x: -0.743643887037151, y: 0.13182590420533 * ASPECT() }); // seahorse valley (the isle)
  const PT_B = () => ({ x: 0.2925, y: 0.0149 * ASPECT() });                        // elephant valley (the destination speck)
  const RAD_TIGHT = 0.006;  // zoomed onto a single speck
  const RAD_WIDE = 2.8;     // the whole set
  const FX_W = 480, FX_H = 300;

  let ACTIVE = false;
  let root = null, fx = null, top = null, tctx = null, charCv = null;
  let W = 0, H = 0, dpr = 1;
  let t0 = 0, raf = 0, opts = null;
  let teleported = false, doneCalled = false, skipping = false, restored = false;
  let zoomer = null, frac = null, xaosReady = false, xaosFailed = false;
  let savedZoom = 1.6, sidebarDisp = null;
  let stars = null, prewarmAt = 0, charDrawn = false;

  const active = () => ACTIVE;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeIn = v => v * v;
  const easeOut = v => 1 - (1 - v) * (1 - v);
  const easeInOut = v => v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const play = (n, v, r) => { try { if (typeof sfx === "function") sfx(n, v, r); } catch (e) {} };

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

  // ---------- world-map dive (macro tiles, truth-rendered flyover) ----------
  const STEPS = [0.25, 0.5, 1, 2, 4, 8, 16];
  function drawMapView(z, cx, cy, alpha) {
    tctx.save();
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.globalAlpha = clamp01(alpha == null ? 1 : alpha);
    tctx.imageSmoothingEnabled = true;
    const w = W / dpr, h = H / dpr;
    const step = world.overviewStep(Math.min(z, world.OVERVIEW_Z - 0.01));
    const MT = world.MACRO_PX * step;
    const m0x = Math.floor((cx - w / 2 / z) / 2 / MT), m1x = Math.floor((cx + w / 2 / z) / 2 / MT);
    const m0y = Math.floor((cy - h / 2 / z) / 2 / MT), m1y = Math.floor((cy + h / 2 / z) / 2 / MT);
    for (let my = m0y; my <= m1y; my++)
      for (let mx = m0x; mx <= m1x; mx++) {
        const sx = (mx * MT * 2 - cx) * z + w / 2, sy = (my * MT * 2 - cy) * z + h / 2, px = MT * 2 * z + 0.5;
        let img = world.macroCache.get(step + ":" + mx + "," + my);
        if (!img) world.requestMacro(step, mx, my);
        if (img) { tctx.drawImage(img, sx, sy, px, px); continue; }
        let drawn = false;
        for (const s2 of STEPS) {
          if (s2 <= step) continue;
          const f = s2 / step, ax = Math.floor(mx / f), ay = Math.floor(my / f);
          const big = world.macroCache.get(s2 + ":" + ax + "," + ay);
          if (!big) continue;
          const sub = world.MACRO_PX / f;
          tctx.drawImage(big, (mx - ax * f) * sub, (my - ay * f) * sub, sub, sub, sx, sy, px, px);
          drawn = true; break;
        }
        if (!drawn) { tctx.fillStyle = world.macroFlat(step, mx, my); tctx.fillRect(sx, sy, px, px); }
      }
    tctx.restore();
  }
  function prewarmMacros(cx, cy) {
    const w = W / dpr, h = H / dpr;
    for (const z of [0.18, 0.4, 0.9, 2, 4.5, 10]) {
      const step = world.overviewStep(Math.min(z, world.OVERVIEW_Z - 0.01));
      const MT = world.MACRO_PX * step;
      const m0x = Math.floor((cx - w / 2 / z) / 2 / MT), m1x = Math.floor((cx + w / 2 / z) / 2 / MT);
      const m0y = Math.floor((cy - h / 2 / z) / 2 / MT), m1y = Math.floor((cy + h / 2 / z) / 2 / MT);
      for (let my = m0y; my <= m1y; my++)
        for (let mx = m0x; mx <= m1x; mx++)
          if (!world.macroCache.get(step + ":" + mx + "," + my)) world.requestMacro(step, mx, my);
    }
  }

  // ---------- painters ----------
  function clearTop() { tctx.setTransform(dpr, 0, 0, dpr, 0, 0); tctx.clearRect(0, 0, W / dpr, H / dpr); }

  function paintBeam(t) {
    const w = W / dpr, h = H / dpr;
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
    tctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * swell})`;
    for (let i = 0; i < 28; i++) {
      const ph = (i * 0.371 + t * (0.25 + (i % 5) * 0.11)) % 1;
      const mx = w / 2 + Math.sin(i * 7.13) * bw * 0.8, my = h * (1 - ph), r = 1 + (i % 3) + swell * 2;
      tctx.fillRect(mx - r / 2, my - r / 2, r, r);
    }
    const white = easeIn(seg(t, T_BEAM - 0.6, T_FLASH));
    if (white > 0) { tctx.fillStyle = `rgba(255,255,255,${white})`; tctx.fillRect(0, 0, w, h); }
  }

  function fractalRegion(t) {
    const A = PT_A(), B = PT_B();
    if (t < T_OUT) {                       // zoom OUT from A (fast then slowing)
      return { cx: A.x, cy: A.y, rad: lerp(RAD_TIGHT, RAD_WIDE, easeOut(seg(t, T_FLASH, T_OUT))) };
    } else if (t < T_PAN) {                // drift: slow, pan A -> midpoint
      const k = easeInOut(seg(t, T_OUT, T_PAN));
      return { cx: lerp(A.x, (A.x + B.x) / 2, k), cy: lerp(A.y, (A.y + B.y) / 2, k), rad: lerp(RAD_WIDE, RAD_WIDE * 1.05, k) };
    }                                      // dive: pan -> B, zoom IN
    const k = seg(t, T_PAN, T_IN);
    return { cx: lerp((A.x + B.x) / 2, B.x, easeInOut(k)), cy: lerp((A.y + B.y) / 2, B.y, easeInOut(k)),
             rad: lerp(RAD_WIDE * 1.05, RAD_TIGHT, easeIn(k)) };
  }

  const mapZoom = t => Math.exp(lerp(Math.log(0.18), Math.log(14), easeInOut(seg(t, T_MAP, T_FALL))));

  function paintFractal(t) {
    const w = W / dpr, h = H / dpr;
    if (zoomer && frac) {
      const r = fractalRegion(t);
      setRegion(r.cx, r.cy, r.rad);
      fx.style.opacity = String(easeOut(seg(t, T_FLASH, T_FLASH + 0.7)) * (1 - seg(t, T_IN, T_MAP)));
      fx.style.filter = `hue-rotate(${(t - T_FLASH) * 26}deg) saturate(1.3) contrast(1.05)`;
      fx.style.transform = `scale(${1.06 + 0.04 * Math.sin((t - T_FLASH) * 1.4)})`;
    } else if (xaosReady && !xaosFailed) startFractal();

    clearTop();
    if (!zoomer) paintStars(t, w, h);      // fallback backdrop

    const flash = 1 - seg(t, T_FLASH, T_FLASH + 0.9);
    if (flash > 0) { tctx.fillStyle = `rgba(255,255,255,${flash})`; tctx.fillRect(0, 0, w, h); }

    // the isle, revealed as a speck: a little green motu that shrinks into the
    // fractal in the first breath of the zoom-out, the character standing on it
    const tokK = seg(t, T_FLASH, T_FLASH + 2.3);
    if (tokK < 1) {
      const s = lerp(1, 0, easeIn(tokK)), R = 46 * s;
      tctx.save(); tctx.globalAlpha = (1 - tokK) * 0.9;
      tctx.shadowColor = "rgba(210,240,255,0.9)"; tctx.shadowBlur = 30 * s;
      tctx.fillStyle = "#caa46a"; tctx.beginPath(); tctx.ellipse(w / 2, h / 2 + 6, R, R * 0.5, 0, 0, 7); tctx.fill();
      tctx.fillStyle = "#3f7d3a"; tctx.beginPath(); tctx.ellipse(w / 2, h / 2 + 2, R * 0.82, R * 0.42, 0, 0, 7); tctx.fill();
      tctx.restore();
    }

    // the character, held centre-screen: rises from a speck to full size as the
    // fractal falls away, then holds
    const appear = easeOut(seg(t, T_FLASH + 0.2, T_FLASH + 2.6));
    const charH = lerp(0.02, 0.26, appear) * h;
    drawChar(w / 2, h / 2, charH, seg(t, T_FLASH, T_FLASH + 1.0), 0);

    const vg = tctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(8,4,20,${0.32 + 0.18 * Math.sin(t * 1.9)})`);
    tctx.fillStyle = vg; tctx.fillRect(0, 0, w, h);

    // crossfade the speck into the world map as the dive bottoms out
    const mapA = seg(t, T_IN, T_MAP);
    if (mapA > 0) {
      drawMapView(mapZoom(T_MAP), world.playerStart.x, world.playerStart.y, mapA);
      drawChar(w / 2, h / 2, 0.26 * h, mapA, 0);   // keep the character over the map
    }
  }

  function paintMap(t) {
    const w = W / dpr, h = H / dpr;
    if (fx) fx.style.opacity = "0";
    clearTop();
    drawMapView(mapZoom(t), world.playerStart.x, world.playerStart.y, 1);
    // the character descends: drifts down and grows as the ground rushes up,
    // with a slow tumble that settles as they near the plaza
    const fall = seg(t, T_FALL - 1.2, T_LAND);
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

  // ---------- lifecycle ----------
  function doTeleport() {
    if (teleported) return;
    teleported = true;
    try { opts && opts.onTeleport && opts.onTeleport(); } catch (e) { console.error("bifrost teleport:", e); }
    camZoom = savedZoom;
    try { prewarmMacros(world.playerStart.x, world.playerStart.y); } catch (e) {}
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
    zoomer = null; frac = null; stars = null; opts = null; charCv = null;
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
      if (t < T_BEAM) {
        camZoom = savedZoom + (RISE_ZOOM - savedZoom) * easeIn(seg(t, 0, T_BEAM));
        paintBeam(t);
      } else if (t < T_FLASH) {
        camZoom = RISE_ZOOM;
        paintBeam(t);
      } else if (t < T_MAP) {
        if (!teleported) doTeleport();
        paintFractal(t);
        if (Date.now() >= prewarmAt) { prewarmAt = Date.now() + 400; prewarmMacros(world.playerStart.x, world.playerStart.y); }
      } else if (t < T_FALL) {
        paintMap(t);
      } else if (t < T_LAND) {
        if (!restored) restoreUI();          // reframe the live world before it shows through
        paintMap(t);
        root.style.opacity = String(1 - seg(t, T_FALL, T_LAND));
      } else { finish(); return; }
    } catch (e) { console.error("bifrost frame:", e); finish(); return; }
    raf = requestAnimationFrame(tick);
  }

  function start(o) {
    if (ACTIVE) return;
    opts = o || {};
    ACTIVE = true;
    teleported = doneCalled = skipping = restored = false;
    savedZoom = (typeof camZoom === "number" && camZoom > 0) ? Math.min(camZoom, 3) : 1.6;
    if (typeof cancelAction === "function") { try { cancelAction(); } catch (e) {} }

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
    fx = document.createElement("canvas");
    fx.width = FX_W; fx.height = FX_H;
    fx.style.cssText = "position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:0;transform-origin:50% 50%;";
    top = document.createElement("canvas");
    top.width = W; top.height = H;
    top.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    root.appendChild(fx); root.appendChild(top);
    root.onclick = () => { if ((Date.now() - t0) / 1000 > 3) skip(); };
    document.body.appendChild(root);
    tctx = top.getContext("2d");
    window.addEventListener("keydown", keyGate, true);

    prepChar();
    loadXaos();
    const tryStart = () => { if (zoomer || !ACTIVE) return; if (xaosReady) startFractal(); else if (!xaosFailed) setTimeout(tryStart, 120); };
    setTimeout(tryStart, 150);

    play("attune", 0.9);
    setTimeout(() => play("spellcast", 0.8), 850);
    t0 = Date.now();
    raf = requestAnimationFrame(tick);
  }

  return { start, active, skip };
})();
if (typeof window !== "undefined") window.Bifrost = Bifrost;
