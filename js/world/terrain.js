// ===== world terrain noise and biome classification =====
"use strict";

// Callers (1):
//  world.js:22
function createWorldTerrain() {
  const S = WORLD_SEED;
  // ---------- noise (exact port) ----------
  function hash2i(x, y, s) {
    let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rand2 = (x, y, s) => hash2i(x, y, s) / 4294967296;
  function valueNoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = rand2(xi, yi, s), b = rand2(xi + 1, yi, s);
    const c = rand2(xi, yi + 1, s), d = rand2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const ROT_C = Math.cos(0.6), ROT_S = Math.sin(0.6);
  function fbm(x, y, s, octaves) {
    let total = 0, amp = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      total += valueNoise(x, y, s + i * 101) * amp;
      max += amp;
      amp *= 0.5;
      const nx = (x * ROT_C - y * ROT_S) * 2;
      const ny = (x * ROT_S + y * ROT_C) * 2;
      x = nx; y = ny;
    }
    return total / max;
  }

  // ---------- terrain generation ----------
  function originBlend(x, y, v, target) {
    const d2 = x * x + y * y;
    if (d2 >= 40000) return v;
    const d = Math.sqrt(d2) / 200;
    const inner = Math.max(0, Math.min(1, (0.65 - d) / 0.3));
    const noisy = (1 - d) * (0.4 + fbm(x * 0.025, y * 0.025, S + 701, 2) * 1.1);
    const w = Math.min(1, Math.max(inner, noisy)) * 0.95;
    return v + (target - v) * w;
  }

  // Ridge noise produces sharp mountain chains (SimpleHydrology-inspired)
  function ridgeNoise(x, y, s, octaves) {
    let total = 0, amp = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      total += (1 - Math.abs(valueNoise(x, y, s + i * 101) * 2 - 1)) * amp;
      max += amp; amp *= 0.5;
      const nx = (x * ROT_C - y * ROT_S) * 2;
      const ny = (x * ROT_S + y * ROT_C) * 2;
      x = nx; y = ny;
    }
    return total / max;
  }

  // Elevation: domain-warped FBM continents + ridge mountain chains (Azgaar-inspired)
  function elevation(x, y) {
    const wx = x + (fbm(x * 0.008, y * 0.008, S + 201, 2) - 0.5) * 90;
    const wy = y + (fbm(x * 0.008, y * 0.008, S + 211, 2) - 0.5) * 90;
    const cont   = fbm(wx * 0.0028, wy * 0.0028, S, 4);
    const detail = fbm(x  * 0.02,   y  * 0.02,   S + 7, 4);
    const ridge  = ridgeNoise(wx * 0.006, wy * 0.006, S + 400, 4);
    let e = cont * 0.72 + detail * 0.28;
    e += ridge * Math.max(0, cont - 0.50) * 0.40;    // ridges on high terrain
    const isl = fbm(wx * 0.016, wy * 0.016, S + 301, 3);
    if (isl > 0.60) e += (isl - 0.60) * 0.55;
    return originBlend(x, y, Math.max(0, Math.min(1, e)), 0.565);
  }

  // Latitude: triangle wave maps Y → 0 (equatorial/warm) to 1 (polar/cold),
  // with the same equator (y = k·LAT_PERIOD) and pole (half-period) positions
  // the old |sin| curve had. The triangle is UNIFORM in y — |sin| lingered
  // near 1, which made ~60% of all land polar.
  const LAT_PERIOD = 7500; // map-coordinate units per equator-to-pole cycle (15000 game tiles)
  function latitudeAt(y) {
    const t = ((y / LAT_PERIOD) % 1 + 1) % 1; // 0..1 within one period
    return 1 - Math.abs(2 * t - 1);           // 0 at equator, 1 at the pole
  }

  // Temperature: latitude bands + altitude lapse rate. warmCurve squeezes the
  // cold end of the latitude range so the polar belt is only the quarter of
  // the world nearest each pole — warm:polar LAND lands at ~3:1 once the
  // altitude lapse is accounted for (tuned by offline measurement: knee at
  // lat 0.75 → 0.44, steep polar tail beyond).
  function warmCurve(lat) {
    return lat < 0.75 ? lat * (0.44 / 0.75) : 0.44 + (lat - 0.75) * (0.56 / 0.25);
  }
  function temperature(x, y) {
    const lat  = latitudeAt(y);
    const e    = elevation(x, y);
    const latT = 1 - warmCurve(lat);
    const altC = Math.max(0, (e - LAND_E) / (1 - LAND_E)) * 0.55;
    const noise = fbm(x * 0.003, y * 0.003, S + 57, 2) * 0.18 - 0.09;
    return originBlend(x, y, Math.max(0, Math.min(1, latT - altC + noise)), 0.52);
  }

  // Humidity: latitude bands + valley drainage + basin flow (SimpleHydrology-inspired)
  function humidity(x, y) {
    const e   = elevation(x, y);
    const lat = latitudeAt(y);
    // ITCZ pattern: wet equatorial, drying toward the poles (this curve alone
    // has no subtropical dry dip — local dryness comes from `noise` below)
    const latHum = Math.cos(lat * Math.PI * 0.5) * 0.55
                 + Math.pow(Math.sin(lat * Math.PI), 2) * 0.18;
    // Local valley concavity: tiles lower than immediate neighbours drain inward → wetter
    const STEP = 5;
    const eAvg = (elevation(x + STEP, y) + elevation(x - STEP, y) +
                  elevation(x, y + STEP) + elevation(x, y - STEP)) * 0.25;
    const concavity = Math.max(0, eAvg - e) * 3;
    // Regional basin drainage proxy: smooth large-scale field approximating discharge
    // accumulation from SimpleHydrology — river-basin lows collect catchment moisture.
    const basinFlow = Math.max(0, 0.5 - fbm(x * 0.0018, y * 0.0018, S + 333, 2)) * 0.32 * (1 - e);
    // Coastal lowlands: humid sea air near water edges
    const coastHum = (e >= LAND_E && e < LAND_E + 0.06)
      ? (1 - (e - LAND_E) / 0.06) * 0.08 : 0;
    // Rain shadow: high terrain intercepts moisture
    const altDry = Math.max(0, (e - 0.57) * 2.8);
    // `noise` was one-sided (`fbm*0.28`, always >=0) — a spot could only ever
    // be WETTER than its latitude/altitude baseline, never drier. That made
    // Badlands/Canyon/Steppe/Red Desert (all warm-and-dry) mathematically
    // unreachable: everywhere warm enough for them already sits at a baseline
    // humidity too high, and altDry (rain-shadow) alone is too weak to close
    // the gap. Kept the original term (`noiseBase`, preserves its upward bias
    // so existing wet biomes don't just get starved) and added a genuine
    // SIGNED variance term (`noiseVar`, different frequency+seed so it isn't
    // just a rescale of the same field) so a spot can swing locally drier too
    // — deserts and rainforest can now coexist at the same latitude, like
    // real regional climate variation, instead of humidity being a pure
    // function of latitude.
    const noiseBase = fbm(x * 0.0045, y * 0.0045, S + 31, 3) * 0.28;
    const noiseVar  = (fbm(x * 0.006, y * 0.006, S + 191, 2) - 0.5) * 1.6;
    const noise = noiseBase + noiseVar;
    return originBlend(x, y,
      Math.max(0, Math.min(1, latHum + concavity * 0.25 + basinFlow + coastHum + noise - altDry)), 0.45);
  }

  const civField   = (x, y) => originBlend(x, y, fbm(x * 0.0012, y * 0.0012, S + 601, 2), 0.72);
  const weirdField = (x, y) => originBlend(x, y, fbm(x * 0.002,  y * 0.002,  S + 901, 2), 0.5);
  const farmField  = (x, y) => fbm(x * 0.025, y * 0.025, S + 501, 3);

  // Biome classifier: Whittaker latitude × altitude × humidity matrix
  function classify(e, hum, temp, f, c, w) {
    // Water
    if (e < 0.40)   return B.DEEP;
    if (e < LAND_E) return (temp > 0.68 && e > 0.44 && w > 0.62) ? B.REEF : B.WATER;
    // Beach
    if (e < 0.497)  return B.SAND;
    // Extreme high terrain
    if (e > ROCK_E) {
      if (w > 0.74)    return B.VOLCANO;
      if (temp < 0.22) return B.GLACIER;
      if (temp < 0.42) return B.SNOW;
      return B.ROCK;
    }
    // Upper highlands
    if (e > 0.615) {
      if (temp < 0.22) return B.GLACIER;
      if (temp < 0.38) return B.SNOW;
      if (hum  < 0.32 && temp > 0.55) return B.CANYON;
      if (hum  > 0.58 && temp < 0.52) return B.MOOR;
      if (e    > 0.64) return B.ROCKY;
    }
    // Fantasy biomes (weirdField-driven)
    if (w > 0.76) {
      if (hum  > 0.53) return temp > 0.55 ? B.MUSHROOM : temp < 0.42 ? B.ASH : B.DREAM;
      if (temp > 0.64 && hum < 0.48) return B.SALT;
      if (temp < 0.34) return B.CRYSTAL;
      return temp > 0.55 ? B.BONE : B.LABYRINTH;
    }
    if (w < 0.24) return temp < 0.50 ? B.WILD : B.RUINSB;
    // Cold / boreal (latitude-driven)
    if (temp < 0.24) return e > 0.58 ? B.GLACIER : B.SNOW;
    if (temp < 0.32) return hum > 0.50 ? B.TAIGA : B.TUNDRA;
    if (temp < 0.42) return hum > 0.55 ? B.TAIGA : hum > 0.35 ? B.TUNDRA : B.SNOW;
    // Tropical
    if (temp > 0.65) {
      if (hum < 0.26) return B.REDDESERT;
      if (hum < 0.44) return f > 0.78 ? B.OASIS : B.DESERT;
      if (hum < 0.58) return B.SAVANNA;
      if (hum < 0.70) return f > 0.64 ? B.BAMBOO : B.JUNGLE; // was 0.74 — its parent
        // hum-band shrank once dry tropical spots could peel off into Desert/Red
        // Desert (see humidity() above), so Bamboo needs a bigger farmField share
        // of what's left to keep its own frequency from dropping too
      return B.WETLAND;
    }
    // Temperate
    if (temp > 0.56 && hum < 0.32) return B.BADLANDS;
    if (hum < 0.28) return B.STEPPE;
    if (hum > 0.72) return B.SWAMP;
    if (hum > 0.55) return (f > 0.70 && temp > 0.44) ? B.CHERRY : B.FOREST; // was 0.80, same reason as Bamboo above
    if (f > 0.62 && c > 0.48) return B.FARM;
    if (hum > 0.46) return B.MEADOW;
    return B.GRASS;
  }

  const biomeAtTile = (x, y) => classify(
    elevation(x, y), humidity(x, y), temperature(x, y),
    farmField(x, y), civField(x, y), weirdField(x, y));

  return {
    S, hash2i, rand2, valueNoise, fbm, originBlend, ridgeNoise,
    elevation, latitudeAt, temperature, humidity, civField, weirdField,
    farmField, classify, biomeAtTile,
  };
}
