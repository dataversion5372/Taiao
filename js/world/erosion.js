// ===== hydraulic erosion + chunk terrain-field passes (shared) =====
// One copy of getChunk's passes 1-2 — the raw elevation grid, the
// SimpleHydrology erosion walk and the biome classification — used by BOTH
// the main thread's chunk generator (world/chunks.js, via the shared script
// scope) and the chunk-field warm worker (world/chunkworker.js, via
// importScripts). Both sides MUST run the identical droplet walk and field
// sampling or the worker's pre-computed terrain would not match the main
// thread's synchronous fallback; sharing the function is what removes that
// drift risk.
"use strict";

// Private copy of world.js's mulberry32: the worker imports only
// data.js/terrain.js/erosion.js (world.js pulls in the whole game), so the
// erosion RNG must live here. Byte-identical algorithm — the droplet walk
// must roll the same numbers on both sides.
function _eroRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Runs particle-based erosion on a flat heightmap array (values 0-1).
// Direct port of SimpleHydrology water.h / world.h erosion algorithm:
// each droplet descends following the terrain normal, eroding steep slopes
// and depositing sediment in flat areas. Returns the discharge accumulation
// array (higher = more water flow = river valleys / wet floors).
function runErosion(hm, w, h, rng) {
  const dis  = new Float32Array(w * h); // discharge accumulation
  const N    = 120;    // droplet count
  const evap = 0.001;  // evaporation rate (from SimpleHydrology)
  const dep  = 0.08;   // deposition rate
  const grav = 0.12;   // gravity scale
  const entr = 6.0;    // entrainment: discharge amplifies erosion
  const minV = 0.01;   // minimum droplet volume
  const maxA = 350;    // maximum droplet age

  for (let d = 0; d < N; d++) {
    let px = rng() * w, py = rng() * h;
    const si = Math.floor(py) * w + Math.floor(px);
    if (hm[si] < 0.46) continue; // don't spawn on water

    let vol = 1.0, sed = 0.0, vx = 0.0, vy = 0.0;

    for (let age = 0; age < maxA && vol >= minV; age++) {
      const ix = Math.floor(px), iy = Math.floor(py);
      if (ix < 1 || ix >= w - 1 || iy < 1 || iy >= h - 1) break;
      const idx = iy * w + ix;

      // Surface gradient (terrain normal x/y components)
      const gx = (hm[idx + 1]   - hm[idx - 1])   * 0.5;
      const gy = (hm[idx + w]   - hm[idx - w])   * 0.5;

      // Gravity accelerates droplet downslope; momentum dampens direction changes
      vx = (vx + grav * gx) * 0.85;
      vy = (vy + grav * gy) * 0.85;
      const spd = Math.sqrt(vx * vx + vy * vy);
      if (spd < 1e-6) break;
      vx /= spd; vy /= spd; // unit velocity

      const npx = px + vx, npy = py + vy;
      const nix = Math.floor(npx), niy = Math.floor(npy);
      if (nix < 0 || nix >= w || niy < 0 || niy >= h) break;

      // Height drop; discharge amplifies how much sediment can be transported
      const dh    = hm[idx] - hm[niy * w + nix];
      const c_eq  = Math.max(0, (1 + entr * dis[idx]) * dh);
      const cdiff = c_eq - sed;

      // Erode or deposit
      sed         += dep * cdiff;
      hm[idx]      = Math.max(0, hm[idx] - dep * cdiff);

      dis[idx] += vol;

      px = npx; py = npy;
      vol *= (1 - evap);
      sed /= (1 - evap);
    }
    // Deposit remaining sediment at final position
    const fx = Math.floor(px), fy = Math.floor(py);
    if (fx >= 0 && fx < w && fy >= 0 && fy < h)
      hm[fy * w + fx] = Math.min(1, hm[fy * w + fx] + sed);
  }
  return dis;
}

// getChunk passes 1-2 for chunk (ccx,ccy): raw elevation on the CHUNK+3
// margin grid, erosion in place, then biome + terrain-flavour classification.
// `T` carries the terrain field functions (createWorldTerrain() in the
// worker; the same functions destructured from ctx in chunks.js). This is
// the expensive noise half of a chunk's data build — the part the worker
// pre-computes ahead of the player. The discharge grid is consumed here
// (humidity boost) and not returned; nothing downstream reads it.
function computeChunkFields(T, CHUNK, ccx, ccy) {
  const GS = CHUNK + 3;
  const bx = ccx * CHUNK, by = ccy * CHUNK;
  const eG  = new Float32Array(GS * GS);
  const bG  = new Int16Array(GS * GS);
  const tfG = new Float32Array(GS * GS);

  // Pass 1: raw elevation
  for (let gy = 0; gy < GS; gy++)
    for (let gx = 0; gx < GS; gx++)
      eG[gy * GS + gx] = T.elevation((bx + gx - 1) * 0.5, (by + gy - 1) * 0.5);

  // Tūhura Isle: snapshot the raw grid where this chunk touches the isle
  // footprint. The droplet walk below deposits sediment in the hand-carved
  // river channel and roughens the shore taper, flipping tiles back and
  // forth across LAND_E — the isle's ground stopped matching the analytic
  // carve that heightAt/isWater/the world map all read. The carve IS the
  // terrain there, so after erosion the raw values are restored (same 16..24
  // fade as tutW, so the erosion seam lands out in open ocean).
  let tutRaw = null;
  if (typeof tutIsleSD === "function" && typeof TUT_ISLE !== "undefined") {
    const B = TUT_ISLE.bbox;
    const mx0 = (bx - 1) * 0.5, mx1 = (bx + GS - 1) * 0.5;
    const my0 = (by - 1) * 0.5, my1 = (by + GS - 1) * 0.5;
    if (mx1 >= B.x0 && mx0 <= B.x1 && my1 >= B.y0 && my0 <= B.y1)
      tutRaw = eG.slice();
  }

  // Hydraulic erosion (SimpleHydrology): modifies eG in-place, returns discharge.
  // Uses a separate RNG so erosion doesn't perturb the main chunk rng sequence.
  const erosionRng = _eroRng(
    (T.S ^ Math.imul(ccx * 7, 0x9E3779B1) ^ Math.imul(ccy * 13, 0x85EBCA77)) >>> 0);
  const disG = runErosion(eG, GS, GS, erosionRng);

  // (restore band widened 24 → 120 on 2026-09-16, then → 380 with the
  // 2026-09-18 relocation: the whole private ocean is analytic carve — the
  // Swim-Master's dome, the drowning-deep approach AND the widened moat out
  // past the seal must all match heightAt exactly; the erosion seam lands
  // inside the carve's own 380..400 fade, in open water nobody can reach)
  if (tutRaw)
    for (let gy = 0; gy < GS; gy++)
      for (let gx = 0; gx < GS; gx++) {
        const q = tutIsleSD((bx + gx - 1) * 0.5, (by + gy - 1) * 0.5);
        if (!q || q.D >= 388) continue;
        const w = q.D <= 380 ? 1 : (388 - q.D) / 8;
        const i = gy * GS + gx;
        eG[i] += (tutRaw[i] - eG[i]) * w;
      }

  // Pass 2: biome classification using eroded elevations + discharge-boosted humidity
  for (let gy = 0; gy < GS; gy++)
    for (let gx = 0; gx < GS; gx++) {
      const wx = bx + gx - 1, wy = by + gy - 1;
      const hx = wx * 0.5, hy = wy * 0.5;
      const i  = gy * GS + gx;
      const e  = eG[i];
      // Discharge boosts local humidity (river valleys and basins are wetter)
      const disHum = Math.min(0.30, disG[i] / 120 * 0.35);
      const hum = Math.min(1, T.humidity(hx, hy) + disHum);
      bG[i]  = T.classify(e, hum, T.temperature(hx, hy),
        T.farmField(hx, hy), T.civField(hx, hy), T.weirdField(hx, hy));
      tfG[i] = T.fbm(hx * 0.014, hy * 0.014, T.S + 0x9A, 2);
    }
  return { eG, bG, tfG };
}
