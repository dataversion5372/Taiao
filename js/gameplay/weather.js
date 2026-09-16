// ===== Taiao — weather: fronts, rain, snow =====
// Weather is a DETERMINISTIC field over (x, y, wall-clock time) — like the
// day/night cycle it needs no save state, survives refresh, and reads the same
// at any world point (HUD, renderer, distant checks all agree). Synoptic
// pressure systems are low-frequency noise blown eastward by the prevailing
// wind; where the anomaly is LOW a storm sits, and the steep gradient band on
// its edge is a FRONT (a sweeping band of rain ahead of the low, exactly where
// the barometer falls fastest). Precipitation needs moisture, so the world
// humidity field gates how hard it can rain (deserts almost never), altitude
// squeezes extra orographic rain out of the mountains, and temperature
// (latitude + altitude lapse + night cooling) turns rain to snow in frozen
// lands. The Prs meter reads baseline-altitude pressure × the live anomaly, so
// a falling needle really does mean weather is coming.
"use strict";

// ---- noise (weather's own copy — terrain.js's lives in a closure) ----
function wxHash(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function wxNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = wxHash(xi, yi, s), b = wxHash(xi + 1, yi, s);
  const c = wxHash(xi, yi + 1, s), d = wxHash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function wxFbm(x, y, s, oct) {
  let total = 0, amp = 1, max = 0;
  for (let i = 0; i < oct; i++) {
    total += wxNoise(x, y, s + i * 101) * amp;
    max += amp; amp *= 0.5; x *= 2.03; y *= 2.03;
  }
  return total / max;
}

// ---- synoptic pressure anomaly ----
// Two noise layers drift at different speeds/headings; their interference makes
// systems deepen, fill and change shape rather than sliding past as a fixed
// stamp. Time is anchored to a fixed epoch so drift offsets stay small (raw
// Date.now() would shove the sample point billions of tiles downwind).
const WX_EPOCH = 1767225600000;               // 2026-01-01 UTC
const WX_SEED = (typeof WORLD_SEED !== "undefined" ? WORLD_SEED : 1337) + 77;
const WX_WIND = 0.4;                          // prevailing westerly, tiles per second
// Earth-proportional synoptics: pole-to-pole is 15000 tiles (daynight.js), and
// real extratropical lows span ~7-15% of that, so the primary layer runs at
// ~1400 tiles; the 280-tile layer stays as texture but at low weight so it
// no longer spawns its own mesoscale "lows". A ~1400-tile system at 0.4 t/s
// takes ~58 real minutes (≈ 22 game hours) to cross a spot — a front passage
// plays as "a stormy day", like the real thing.
const WX_FREQ_A = 1 / 1400, WX_FREQ_B = 1 / 280;
// measured std of the two-layer sum is ~0.11 (fbm sums crowd the middle), so
// amplify to spread the anomaly over a usable −1..1 range (±2.4σ hits clamp)
const WX_AMP = 3.7;
function wxAnomaly(x, y, tMs) {
  const t = (tMs - WX_EPOCH) / 1000;
  const a = wxFbm((x - t * WX_WIND) * WX_FREQ_A, y * WX_FREQ_A, WX_SEED, 3);
  const b = wxFbm((x - t * WX_WIND * 0.55 + 4000) * WX_FREQ_B, (y + t * WX_WIND * 0.18) * WX_FREQ_B, WX_SEED + 555, 2);
  const raw = (a - 0.5) * 0.75 + (b - 0.5) * 0.25;
  return Math.max(-1, Math.min(1, raw * WX_AMP));
}

// ---- weather core: pure math over sampled climate inputs (Node-testable) ----
// hum/temp ∈ 0..1 from world-gen; altFrac 0..1 above sea level; night 0..1
// (1 = full night, cools the air so highland/high-latitude rain turns to snow).
function weatherCore(x, y, tMs, hum, temp, altFrac, night) {
  const anom = wxAnomaly(x, y, tMs);
  // front: steep anomaly gradient = a squall band sweeping ahead of the low
  const G = 28;      // gradient sample arm, tiles
  const gx = wxAnomaly(x + G, y, tMs) - wxAnomaly(x - G, y, tMs);
  const gy = wxAnomaly(x, y + G, tMs) - wxAnomaly(x, y - G, tMs);
  const grad = Math.hypot(gx, gy) / (2 * G);
  return wxDerive(anom, grad, hum, temp, altFrac, night);
}
// derive the weather from an already-sampled anomaly + gradient — the world
// map's overlay samples the anomaly on a grid and finite-differences it there,
// so it shares this exact math instead of re-sampling 5× per cell.
function wxDerive(anom, grad, hum, temp, altFrac, night) {
  const front = Math.max(0, Math.min(1, (grad - 0.0025) / 0.00145));  // ~p80..p98 of the gradient distribution
  // storminess: how deep into the low we are
  const storm = Math.max(0, Math.min(1, (0.12 - anom) / 1.05));
  // moisture: humidity is the fuel; mountains wring extra rain from passing air
  const wet = hum * 0.95 + altFrac * 0.30;
  const p = storm * (0.15 + wet * 1.0) + front * 0.42 * (0.25 + wet) * Math.min(1, storm * 2.5 + 0.25);
  const precip = Math.max(0, Math.min(1, (p - 0.38) / 0.55));
  const cloud = Math.max(0, Math.min(1, storm * 1.05 + precip * 0.25 + hum * 0.15 - 0.04));
  // felt air temperature: nights cool, storms cool a touch more
  const felt = temp - (night || 0) * 0.16 - storm * 0.04;
  const kind = precip <= 0 ? null : felt < 0.34 ? "snow" : "rain";
  return { anom, front, storm, cloud, precip, kind };
}

// human label + icon for the HUD
function weatherLabel(w) {
  if (!w) return null;
  if (w.precip > 0) {
    if (w.kind === "snow") return w.precip < 0.6 ? "🌨️ Snow" : "❄️ Blizzard";
    if (w.precip < 0.25) return "🌦️ Drizzle";
    if (w.precip < 0.55) return "🌧️ Rain";
    if (w.precip < 0.82) return "🌧️ Downpour";
    return "⛈️ Storm";
  }
  if (w.cloud > 0.72) return "☁️ Overcast";
  if (w.cloud > 0.42) return "⛅ Cloudy";
  return null;   // clear: the Sky line's sun/moon already says it
}

// ---- wind ----
// Geostrophic-style wind: flow ALONG the isobars — the pressure gradient
// rotated 90° so air circulates counter-clockwise around lows (as drawn on the
// map: x east, y south) and clockwise around highs — on top of the prevailing
// westerly that also advects the systems themselves. Speed scales with how
// tightly packed the isobars are, so it's strongest on the flanks of a deep
// low and near fronts. Returned in tiles/second ({x east, y south}).
const WX_WIND_BG = 0.7;      // background westerly component (outruns the 0.4 t/s system drift — real winds move faster than the systems they belong to)
const WX_WIND_K = 760;       // rotational gain: p92 gradients → ~2.4 t/s gusts
function windAt(x, y, tMs) {
  tMs = tMs != null ? tMs : (typeof now !== "undefined" ? now : Date.now());
  const A = 28;
  const gx = (wxAnomaly(x + A, y, tMs) - wxAnomaly(x - A, y, tMs)) / (2 * A);
  const gy = (wxAnomaly(x, y + A, tMs) - wxAnomaly(x, y - A, tMs)) / (2 * A);
  return { x: WX_WIND_BG + gy * WX_WIND_K, y: -gx * WX_WIND_K };
}
// display helper: 1 tile/s ≈ 10 knots on the in-game scale
function windKn(v) { return Math.hypot(v.x, v.y) * 10; }

// ---- world-facing samplers ----
function weatherAt(x, y, tMs) {
  if (typeof window !== "undefined" && window.__weatherOverride) return window.__weatherOverride;   // debug/testing hook
  // Tūhura Isle pocket (gameplay/tutorial.js): staged sky — clear until the
  // tutorial's weather stage, then a scripted shower; null once graduated
  if (typeof Tutorial !== "undefined") {
    const tw = Tutorial.weatherOverride();
    if (tw) return tw;
  }
  if (typeof world === "undefined" || !world) return null;
  tMs = tMs != null ? tMs : (typeof now !== "undefined" ? now : Date.now());
  const hum = world.humidityAt(x, y);
  const temp = world.temperatureAt(x, y);
  const h = world.heightAt(x, y), LE = world.LAND_ELEVATION;
  const altFrac = Math.max(0, (h - LE) / (1 - LE));
  const night = (typeof daylightAt === "function" && typeof sunPhase === "function")
    ? 1 - daylightAt(y, sunPhase(x)) : 0;
  const w = weatherCore(x, y, tMs, hum, temp, altFrac, night);
  w.wind = windAt(x, y, tMs);
  // Dream Forest (gameplay/dream.js): dead calm over the whole interior and
  // blended calm around every door's waystone glade — so no downpour can pop
  // out of existence across a silent glade swap. Walking toward a stone, the
  // rain thins and stops; villagers would tell you it never rains there.
  if (typeof Dream !== "undefined" && Dream.calmAt) {
    const cw = Dream.calmAt(x, y);
    if (cw > 0) {
      const k = 1 - cw;
      w.precip *= k; w.storm *= k; w.front *= k;
      w.cloud = w.cloud * k + 0.30 * cw;          // a high, still haze
      if (w.precip <= 0) { w.precip = 0; w.kind = null; }
      w.wind = { x: w.wind.x * k + 0.15 * cw, y: w.wind.y * k };
    }
  }
  return w;
}
// the player's weather right now, sampled at most ~2×/s (the field moves at
// ~0.85 tiles/s — per-frame resampling would be pure waste)
let _wxCache = null, _wxAt = 0, _wxKey = "";
function weatherNow() {
  if (typeof player === "undefined" || !player) return null;
  const t = (typeof now !== "undefined") ? now : Date.now();
  const key = player.x + "," + player.y;
  if (_wxCache && key === _wxKey && t - _wxAt < 400) return _wxCache;
  _wxCache = weatherAt(player.x, player.y, t);
  _wxAt = t; _wxKey = key;
  return _wxCache;
}

// ---- river flood ----
// Sustained heavy RAIN swells the rivers: flood level is a deterministic
// integral of recent precipitation — precip re-sampled at several PAST
// moments with exponentially-decaying weights — so rivers rise through a
// downpour and drain back to normal over ~8 real minutes once the rain slows
// or stops. Pure (x, y, t) math like the rest of the weather: no save state,
// survives refresh, every caller agrees. Snow never floods (it stays on the
// ground); drizzle stays under the threshold — only real rain moves rivers.
// Consumers: playerSinkY (deeper water), movement (stronger drift + current),
// render3d (raised carved-water surface + faster foam streaks).
// gamma-shaped lag kernel over ~27 min of past rain: weight w(age) = a·e^(1−a)
// with a = age/FLOOD_RISE peaks ~7 min ago and tails off toward ~27 — so a
// river starts rising several minutes AFTER the rain sets in, crests through
// a sustained downpour, stays swollen after the sky clears, and drains back
// to nothing over ~20-25 minutes. Only rain heavier than drizzle
// (precip > 0.25) feeds the flood. The long window + the squared response
// below make a MAXIMUM flood (4 terrain steps, render3d FLOOD_AMP) genuinely
// rare: it needs peak rain parked overhead for most of half an hour.
// Distribution over sampled weather (offline sweep 2026-09-12): any visible
// flood ~4.6% of time, 2+ steps ~2.2%, max ~0.65% (was 1.8% with the old
// ~9-min window and linear response).
const FLOOD_STEPS = 12, FLOOD_DT = 150e3, FLOOD_RISE = 420e3;
function riverFloodAt(x, y, tMs) {
  if (typeof window !== "undefined" && window.__floodOverride != null) return window.__floodOverride;   // debug/testing hook
  if (typeof world === "undefined" || !world) return 0;
  tMs = tMs != null ? tMs : (typeof now !== "undefined" ? now : Date.now());
  const hum = world.humidityAt(x, y);
  const temp = world.temperatureAt(x, y);
  const h = world.heightAt(x, y), LE = world.LAND_ELEVATION;
  const altFrac = Math.max(0, (h - LE) / (1 - LE));
  const night = (typeof daylightAt === "function" && typeof sunPhase === "function")
    ? 1 - daylightAt(y, sunPhase(x)) : 0;
  let sum = 0, wsum = 0;
  for (let i = 0; i < FLOOD_STEPS; i++) {
    const a = (i * FLOOD_DT) / FLOOD_RISE;
    const w = a * Math.exp(1 - a);
    if (w <= 0) continue;
    const wx = weatherCore(x, y, tMs - i * FLOOD_DT, hum, temp, altFrac, night);
    sum += (wx.kind === "rain" ? Math.max(0, (wx.precip - 0.25) / 0.75) : 0) * w;
    wsum += w;
  }
  // squared response: moderate wet spells barely move the river, sustained
  // torrents dominate — this is what pushes the top flood buckets out into
  // rare-event territory (see the distribution note above)
  const f = Math.min(1, (sum / wsum) * 1.15);
  return f * f;
}
// the player's flood level, sampled at most ~1×/s on a coarse position key
// (the rain field is regional — per-frame/per-tile resampling is pure waste)
let _flCache = 0, _flAt = 0, _flKey = "";
function floodNow() {
  if (typeof player === "undefined" || !player) return 0;
  const t = (typeof now !== "undefined") ? now : Date.now();
  const key = (player.x >> 4) + "," + (player.y >> 4);
  if (key === _flKey && t - _flAt < 1000) return _flCache;
  _flCache = riverFloodAt(player.x, player.y, t);
  _flAt = t; _flKey = key;
  return _flCache;
}

// ---- snow cover ----
// Heavy SNOWFALL settles on the world: cover 0..1 is the same style of
// deterministic past-precip integral as the river flood, but slower on both
// sides — flakes start sticking a few minutes into a snowfall, the world is
// fully blanketed after ~10 minutes of steady snow, and the white lingers
// for ~20-25 minutes after the sky clears before melting away. Rain never
// counts (and where it rains it isn't cold enough for cover to survive
// anyway — the samples simply contribute nothing).
// Consumers: render3d's snow shading (ground/roof frost + billboard crowns).
const SNOW_STEPS = 8, SNOW_DT = 240e3, SNOW_RISE = 300e3;
function snowCoverAt(x, y, tMs) {
  if (typeof window !== "undefined" && window.__snowOverride != null) return window.__snowOverride;   // debug/testing hook
  if (typeof world === "undefined" || !world) return 0;
  tMs = tMs != null ? tMs : (typeof now !== "undefined" ? now : Date.now());
  const hum = world.humidityAt(x, y);
  const temp = world.temperatureAt(x, y);
  const h = world.heightAt(x, y), LE = world.LAND_ELEVATION;
  const altFrac = Math.max(0, (h - LE) / (1 - LE));
  const night = (typeof daylightAt === "function" && typeof sunPhase === "function")
    ? 1 - daylightAt(y, sunPhase(x)) : 0;
  let sum = 0, wsum = 0;
  for (let i = 0; i < SNOW_STEPS; i++) {
    const a = (i * SNOW_DT) / SNOW_RISE;
    const w = a * Math.exp(1 - a);
    if (w <= 0) continue;
    const wx = weatherCore(x, y, tMs - i * SNOW_DT, hum, temp, altFrac, night);
    sum += (wx.kind === "snow" ? Math.max(0, (wx.precip - 0.15) / 0.85) : 0) * w;
    wsum += w;
  }
  let cover = Math.max(0, Math.min(1, (sum / wsum) * 1.35));
  // Dream Forest calm (see weatherAt): snow can't lie where rain never falls
  if (typeof Dream !== "undefined" && Dream.calmAt) cover *= 1 - Dream.calmAt(x, y);
  return cover;
}
let _snCache = 0, _snAt = 0, _snKey = "";
function snowNow() {
  if (typeof player === "undefined" || !player) return 0;
  const t = (typeof now !== "undefined") ? now : Date.now();
  const key = (player.x >> 4) + "," + (player.y >> 4);
  if (key === _snKey && t - _snAt < 1000) return _snCache;
  _snCache = snowCoverAt(player.x, player.y, t);
  _snAt = t; _snKey = key;
  return _snCache;
}

// barometer: altitude baseline (1 atm at sea level, thins going up, builds
// below sea level) × the synoptic anomaly (±~4.5%, the real 960–1060 hPa swing)
function pressureAtmAt(x, y, tMs) {
  if (typeof world === "undefined" || !world) return 1;
  const h = world.heightAt(x, y), LE = world.LAND_ELEVATION;
  const base = h >= LE ? Math.exp(-((h - LE) / (1 - LE)) * 1.05) : 1 + (LE - h) / LE;
  tMs = tMs != null ? tMs : (typeof now !== "undefined" ? now : Date.now());
  return base * (1 + wxAnomaly(x, y, tMs) * 0.045);
}

if (typeof window !== "undefined") Object.assign(window, {
  wxAnomaly, wxDerive, weatherCore, weatherAt, weatherNow, weatherLabel, pressureAtmAt, windAt, windKn,
  riverFloodAt, floodNow, snowCoverAt, snowNow,
});
if (typeof module !== "undefined" && module.exports)
  module.exports = { wxAnomaly, wxDerive, weatherCore, weatherLabel, windAt, windKn };
