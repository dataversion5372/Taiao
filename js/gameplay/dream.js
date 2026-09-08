// ===== Isle of Emberfall — Dream Forest shrinking illusion =====
// Walk into a Dream Forest and the dream deepens the further you get from the
// edge. The illusion is kept mostly at the PERIPHERY (things shrink hard toward
// the screen edges / just off-screen, the near field stays steady) so it doesn't
// make you dizzy, and the camera is pinned from zooming out. Every step covers
// less real ground the deeper you are, so escaping is quadratic: at ~50 tiles
// deep on the map you're hundreds of tiles of walking from the boundary
// (walked ≈ ∫mag d(depth), mag = 1 + 0.25·depth ⇒ depth + 0.125·depth²).
// The world map / minimap are untouched — only the 3D view dreams.
"use strict";

(function () {
  // PARKED (2026-09-06): the Dream Forest plays as an ordinary biome for now.
  // Flip ENABLED to true to revive the whole illusion — every hook (render
  // shrink/zoom in render3d.js, movement slowdown in movement.js, zoom clamp in
  // world.js) is gated on DREAM.active, which stays false while this is off. To
  // fully revive also restore the monster seal (monsters.js) and the lusher
  // vegetation (chunks.js dreamLush) that were reverted alongside this.
  const ENABLED = false;
  const NAME = "Dream Forest";
  const MOVE_RATE = 0.25;   // per-tile movement magnification (drives quadratic escape)
  const MAG_CAP = 60;
  const UNI_RATE = 0.006;   // gentle uniform shrink of the near field
  const UNI_FLOOR = 0.45;
  const PERI_RATE = 0.045;  // peripheral (off-screen) shrink intensity
  const PERI_CAP = 3;
  const PERI_R0 = 18.0;     // world-units radius kept steady — larger than the
                            // on-screen view radius, so the hard shrink lives
                            // entirely OFF-SCREEN (out past the fog) and you never
                            // watch things shrink in front of you (= no dizziness)
  const ZOOM_CAP = 1.1;     // deepest manual zoom-out allowed inside a dream
  const ZOOM_RATE = 0.02;   // camera magnification gained per tile of depth (eased)
  const MAXR = 260;         // border-search radius (deeper ⇒ treated as this deep)

  // depth = tiles to the nearest non-Dream-Forest tile; 0 if not in one.
  // biomeNameAt is pure noise math, so this is cheap; cached per 4-tile cell.
  const cache = new Map();
  function depthAt(x, y) {
    if (typeof world === "undefined" || !world.biomeNameAt) return 0;
    if (world.biomeNameAt(x, y) !== NAME) return 0;
    const key = (x >> 2) + "," + (y >> 2);
    if (cache.has(key)) return cache.get(key);
    let d = MAXR;
    const stride = 6;
    outer: for (let r = stride; r <= MAXR; r += stride) {
      const n = Math.max(6, Math.round(2 * Math.PI * r / stride));
      for (let i = 0; i < n; i++) {
        const a = 2 * Math.PI * i / n;
        if (world.biomeNameAt(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r)) !== NAME) { d = r; break outer; }
      }
    }
    if (cache.size > 6000) cache.clear();
    cache.set(key, d);
    return d;
  }

  // sd = smoothed depth; every visible parameter is derived from it so the dream
  // ramps in/out gently (no lurching = no nausea).
  const DREAM = { sd: 0, mag: 1, uni: 1, peri: 0, zoomIn: 1, speedMul: 1, zoomMax: ZOOM_CAP, active: false, depth: 0 };
  DREAM.update = function () {
    if (!ENABLED) return;                 // parked — biome behaves normally
    if (typeof player === "undefined") return;
    const depth = depthAt(Math.round(player.x), Math.round(player.y));
    DREAM.depth = depth;
    DREAM.sd += (depth - DREAM.sd) * 0.04;                    // slow ease
    if (Math.abs(depth - DREAM.sd) < 0.05) DREAM.sd = depth;
    const sd = DREAM.sd;
    DREAM.mag = Math.min(MAG_CAP, 1 + sd * MOVE_RATE);
    DREAM.uni = Math.max(UNI_FLOOR, 1 / (1 + sd * UNI_RATE)); // near-field stays gentle
    DREAM.peri = Math.min(PERI_CAP, sd * PERI_RATE);          // periphery shrinks hard
    DREAM.zoomIn = 1 + Math.min(2.5, sd * ZOOM_RATE);         // ground magnifies/interpolates deeper
    DREAM.speedMul = 1 / DREAM.mag;
    DREAM.zoomMax = ZOOM_CAP;
    DREAM.active = sd > 0.5;
  };
  // per-object render scale multiplier: gentle uniform shrink × a strong shrink
  // that grows with the object's distance from the player (so the warp lives at
  // the edges/off-screen). r = distance from the player in world units.
  DREAM.scaleAt = function (r) {
    if (!DREAM.active) return 1;
    const peri = (DREAM.peri > 0 && r > PERI_R0) ? 1 / (1 + DREAM.peri * (r - PERI_R0)) : 1;
    return DREAM.uni * peri;
  };
  DREAM.depthAt = depthAt;
  DREAM.reset = function () { DREAM.sd = DREAM.depth = 0; DREAM.mag = DREAM.uni = DREAM.zoomIn = 1; DREAM.peri = 0; DREAM.speedMul = 1; DREAM.active = false; };
  if (typeof window !== "undefined") window.DREAM = DREAM;
})();
