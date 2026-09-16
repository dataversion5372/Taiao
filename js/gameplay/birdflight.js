// ===== Taiao — NZ bird flight =====
// The flying native birds (js/nz-extra-birds.js) take to the air: a grounded
// bird waits out a take-off timer, then flies a smoothly-steered path to a
// picked perch — most often a tree crown (roosting, tree-to-tree hops), and
// sometimes a fence rail, a city-wall top, a roof ridge or open ground.
// While a bird is on the wing (or up a canopy/roof) it renders at altitude
// (render3d syncEntities reads m.flyAbs), casts a sun-projected ground shadow
// (place() airShadow), and only archery can reach it (combat.js gates melee
// on birdAirborne). Birds never fight back: any combat code that sets
// m.target on a flier is answered next frame by flushing away instead.
// Flightless species (kiwi, weka, kākāpō, Tarepo, the moa) have no entry in
// BIRD_FLIGHT and keep the ordinary ground AI.
"use strict";

// Per-species flight profile: cr = cruise height above the terrain (world
// units — one storey is 1.8), sp = airspeed in tiles/s (walking ≈ 3.5).
// jink: erratic fantail flitting. ground: short-burst fliers that prefer to
// land back in the grass. night: nocturnal (roosts by day, flies at night).
const BIRD_FLIGHT = {
  titipounamu:  { cr: 3.2,  sp: 4.2 },
  piwakawaka:   { cr: 3.0,  sp: 4.5, jink: true },
  tieke:        { cr: 3.4,  sp: 4.6 },
  kotata:       { cr: 3.2,  sp: 4.4 },
  tui:          { cr: 4.5,  sp: 5.6 },
  kaka:         { cr: 5.5,  sp: 6.2 },
  kea:          { cr: 6.0,  sp: 6.6 },
  ruru:         { cr: 4.0,  sp: 5.2, night: true },
  koreke:       { cr: 2.4,  sp: 5.0, ground: true },
  pukeko:       { cr: 2.6,  sp: 4.6, ground: true },
  putangitangi: { cr: 6.0,  sp: 7.0, ground: true }, // shelducks graze, not roost
  whio:         { cr: 3.6,  sp: 6.4, ground: true },
  kereru:       { cr: 5.0,  sp: 6.0 },
  takapu:       { cr: 7.5,  sp: 7.4, ground: true }, // gannets land, never perch
  huia:         { cr: 4.2,  sp: 5.2 },
  karearea:     { cr: 8.0,  sp: 9.0 },
  hakawai:      { cr: 9.0,  sp: 8.0 },
  pouakai:      { cr: 11.0, sp: 9.0 },
};
function birdCfg(m) { return BIRD_FLIGHT[m.kind.replace(/_v$/, "")]; }

// Nocturnal natives only come out at night: by day they're dormant — the
// ruru and hakawai tucked deep in foliage, the kiwi and kākāpō in their
// burrows — hidden from render, clicks and collision (checks on m.dormant in
// render3d syncEntities/overlays, input targetsAt and monsterAt). At dusk
// they wake where they went to ground.
const NOCTURNAL_BIRDS = new Set(["ruru", "kiwi", "kakapo", "hakawai"]);
function birdNocturnalTick(m) {
  if (!NOCTURNAL_BIRDS.has(m.kind.replace(/_v$/, ""))) return false;
  if (!bfNight()) {
    if (!m.dormant) {
      m.dormant = true;
      m.flight = null; m.flyAbs = undefined; m.flyY = 0;
      m.target = null; m.moving = null;
      m.x = m.sx; m.y = m.sy; m.px = PX(m.sx); m.py = PX(m.sy);
      // a fight can't follow it into the burrow
      if (player.act && player.act.kind === "combat" && player.act.mon === m) player.act = null;
    }
    return true; // hidden until nightfall
  }
  if (m.dormant) { m.dormant = false; m.takeoffAt = now + 2000 + Math.random() * 8000; }
  return false; // night: live the usual bird life below
}

// Feet height above the local terrain (0 for a grounded bird). combat.js
// reads this for arrow arcs; > 1.3 means "beyond a blade" (a fence-rail
// perch at ~0.9 can still be swatted).
function birdAirY(m) { return m.flyY || 0; }
function birdAirborne(m) { return (m.flyY || 0) > 1.3; }

function bfGround(x, y) {
  return (typeof REN !== "undefined" && REN && REN.groundLevel) ? REN.groundLevel(x, y) : 0;
}
function bfNight() {
  const s = (typeof REN !== "undefined" && REN && REN._sunDebug) ? REN._sunDebug() : null;
  return s ? !s.up : false;
}

// What (if anything) can a bird perch on at this tile? Returns {kind, alt, w}
// — alt is the absolute feet height of the perch, w its selection weight.
function birdPerchAt(x, y) {
  if (world.inMap && !world.inMap(x, y)) return null;
  if (world.isWater(x, y)) return null;
  const g = bfGround(x, y);
  const b = world.insideBuilding && world.insideBuilding(x, y);
  if (b) {
    const bm = world.buildingMeta(b);
    return { kind: "roof", alt: g + bm.storeys * 1.8 + 0.85, w: 1 };
  }
  const s = world.structAt && world.structAt(x, y);
  if (s && s.plug) return { kind: "wall", alt: g + 2.45, w: 1 }; // city-wall top
  if (s && s.door) return null;
  const dk = world.getDecor(x, y);
  if (dk === "fence_wood" || dk === "gate_wood") return { kind: "fence", alt: g + 0.92, w: 1.6 };
  // tree crowns: any decor/node tree tall enough to hold a body. The drawn
  // billboard is exactly `scale` world units tall, so the crown sits at ~78%.
  // Harvestable trees are NODES whose art key is the NODE_TYPES spr ("tree",
  // "s_tree<i>", "nzf_<species>"); ambient trees are decor keys directly.
  let tk = null;
  if (dk && (dk === "tree" || dk.startsWith("tree_") || dk.startsWith("s_tree") ||
             dk.startsWith("nzf_") || dk.startsWith("nz_"))) tk = dk;
  else {
    const n = world.nodeAt && world.nodeAt(x, y);
    const nt = n && n.alive !== false && !n.station && !n.farm && !n.portal &&
      typeof NODE_TYPES !== "undefined" && NODE_TYPES[n.type];
    // n.sprv is the species SKIN a tree actually renders with (the isle's
    // demoted natives are treeT0 nodes wearing e.g. "nzf_rimu") — perch on
    // what's drawn, not the base type's default art
    const sk = nt && nt.skill === "Woodcutting" && (n.sprv || nt.spr);
    if (sk && (sk === "tree" || sk.startsWith("tree_") || sk.startsWith("s_tree") || sk.startsWith("nzf_"))) tk = sk;
  }
  if (tk) {
    const art = (typeof REN !== "undefined" && REN && REN.objArtFor) ? REN.objArtFor(tk) : null;
    const sc = (art && art.scale) || 0;
    return sc >= 1.5 ? { kind: "tree", alt: g + sc * 0.78, w: 4 } : null; // shrubs hold no roost
  }
  if (dk) return null; // other decor: rocks, stumps, stations — bad footing
  if (world.isBlocked(x, y)) return null;
  return { kind: "ground", alt: g, w: 1 };
}
// Height of whatever stands on a tile — for clearing obstacles mid-flight.
function birdObstacleTop(x, y) {
  const p = birdPerchAt(x, y);
  return p && p.kind !== "ground" ? p.alt : bfGround(x, y);
}

// Sample the neighbourhood for a destination. Trees dominate (w:4) so the
// default rhythm is roost → hop to another crown → roost, with the odd
// fence/wall/roof/ground stop. `away` (a {x,y}) biases the fan directly away
// from a threat — a flushed bird flees, it doesn't circle its attacker.
function birdPickPerch(m, cfg, away) {
  let best = null, bestScore = -1;
  for (let i = 0; i < 60; i++) {
    let ang = Math.random() * Math.PI * 2;
    if (away) ang = Math.atan2(m.y - away.y, m.x - away.x) + (Math.random() - 0.5) * 1.6;
    const r = (cfg.ground ? 4 : 7) + Math.random() * (cfg.ground ? 10 : 20) + (away ? 8 : 0);
    const x = Math.round(m.x + Math.cos(ang) * r), y = Math.round(m.y + Math.sin(ang) * r);
    if (x === m.x && y === m.y) continue;
    const p = birdPerchAt(x, y);
    if (!p) continue;
    if (typeof monsterAt === "function" && monsterAt(x, y)) continue; // roost taken
    let w = p.w;
    if (cfg.ground) w = p.kind === "ground" ? 4 : p.kind === "tree" ? 0.3 : w; // grass birds keep out of crowns
    if (away && p.kind === "tree") w *= 1.5;      // a flushed bird makes for cover
    const score = w * (0.5 + Math.random());
    if (score > bestScore) { bestScore = score; best = { kind: p.kind, alt: p.alt, x, y }; }
  }
  return best;
}

function birdSetTarget(fl, tgt) {
  fl.tx = tgt.x; fl.ty = tgt.y; fl.kind = tgt.kind; fl.tgtAlt = tgt.alt;
  fl.deadline = now + 40000; // a wedged flight force-lands (birdForceLand)
}

function birdLaunch(m, cfg, away) {
  const tgt = birdPickPerch(m, cfg, away);
  if (!tgt) { m.takeoffAt = now + 3000 + Math.random() * 5000; return; }
  // current float position: px is authoritative whether walking, mid-step or
  // already aloft (PX-space / (TILE*SCALE) is the tile-float the renderer uses)
  const T = TILE * SCALE;
  const fx = m.px / T, fy = m.py / T;
  const fl = {
    mode: "air", fx, fy,
    alt: m.flyAbs != null ? m.flyAbs : bfGround(m.x, m.y),
    hdg: Math.atan2(tgt.y - fy, tgt.x - fx),
    vx: 0, vy: 0, boost: 0,
  };
  birdSetTarget(fl, tgt);
  m.moving = null;
  m.flight = fl;
}

// Something hurt or spooked this bird: flee on the wing instead of fighting.
// Called from combat.js (arrow/blow lands) and from the perch-flush check.
function birdFlush(m) {
  const cfg = birdCfg(m);
  if (!cfg) return false;
  const fl = m.flight;
  if (fl && fl.mode === "air") {
    fl.boost = now + 4000;
    if (!fl.fleeing) {
      const p = birdPickPerch(m, cfg, player);
      if (p) birdSetTarget(fl, p);
      fl.fleeing = true;
    }
  } else {
    birdLaunch(m, cfg, player);
    if (m.flight) { m.flight.boost = now + 4000; m.flight.fleeing = true; }
  }
  return true;
}

// A flight that ran out its deadline (wedged steering, ungenerated ground)
// settles where it is: nearest open tile within 4, else back at its spawn.
function birdForceLand(m) {
  let lx = m.x, ly = m.y, found = birdPerchAt(lx, ly) != null;
  ring: for (let r = 1; r <= 4 && !found; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const p = birdPerchAt(m.x + dx, m.y + dy);
      if (p && p.kind === "ground") { lx = m.x + dx; ly = m.y + dy; found = true; break ring; }
    }
  if (!found) { lx = m.sx; ly = m.sy; }
  m.x = lx; m.y = ly; m.px = PX(lx); m.py = PX(ly);
  m.flight = null; m.flyAbs = undefined; m.flyY = 0;
  m.takeoffAt = now + 6000 + Math.random() * 20000;
}

function birdLand(m, cfg, fl) {
  m.x = fl.tx; m.y = fl.ty; m.px = PX(fl.tx); m.py = PX(fl.ty);
  // the landing spot becomes home: the ground wander stays local to it, and
  // the biome lock re-homes too (birds genuinely cross biome borders)
  m.sx = m.x; m.sy = m.y;
  m.spawnBiome = world.biomeAt(m.x, m.y);
  if (fl.kind === "ground") {
    m.flight = null; m.flyAbs = undefined; m.flyY = 0;
    m.takeoffAt = now + 6000 + Math.random() * 20000;
  } else {
    // day birds settle long into a night-time canopy roost; the ruru is the
    // reverse — it sits out the daylight and flies by night
    const roost = fl.kind === "tree" && (cfg.night ? !bfNight() : bfNight());
    m.flight = { mode: "perch", alt: fl.tgtAlt, until: now + (roost ? 60000 + Math.random() * 120000 : 9000 + Math.random() * 22000) };
    m.flyAbs = fl.tgtAlt;
    m.flyY = fl.tgtAlt - bfGround(m.x, m.y);
  }
}

// Per-frame flight driver, called from updateMonsters for every monster.
// Returns true when the flight layer owns the bird this frame (airborne or
// perched); false hands a grounded flier back to the ordinary wander AI.
function birdFlightTick(m, def, dt, distP) {
  if (birdNocturnalTick(m)) return true; // dormant by day: no wander, no render
  const cfg = birdCfg(m);
  if (!cfg) {
    // flightless natives (moa, Tarepo, day-caught kiwi…) don't fight back
    // either: a blow sends them scrambling away instead of into a chase —
    // the chase's broken-leash reset used to refill their health bar mid-
    // fight. The weka keeps its cheeky scrap.
    const kind = m.kind.replace(/_v$/, "");
    if (typeof NZ_BIRD_KINDS !== "undefined" && NZ_BIRD_KINDS.has(kind) &&
        kind !== "weka" && m.target) {
      m.target = null;
      (m.fx = m.fx || {}).fleeUntil = now + 6000;
    }
    return false;
  }
  // birds never fight back: whatever combat path aimed this bird at the
  // player (arrow, blow, spell aggro), the answer is wings, not talons
  if (m.target) { m.target = null; birdFlush(m); }
  const fl = m.flight;
  if (!fl) {
    if (!m.takeoffAt) m.takeoffAt = now + 5000 + Math.random() * 18000;
    if (distP > 40 || now < m.takeoffAt) return false; // grounded: wander as usual
    birdLaunch(m, cfg);
    return true;
  }
  if (distP > 60) return true; // far offscreen: hold the pose until the player returns
  if (fl.mode === "perch") {
    m.flyAbs = fl.alt;
    m.flyY = fl.alt - bfGround(m.x, m.y);
    // a walker underneath flushes a bird off a low perch
    if (now >= fl.until || (distP <= 2 && m.flyY < 1.5)) birdLaunch(m, cfg);
    return true;
  }
  // --- on the wing ---
  if (now >= fl.deadline) { birdForceLand(m); return true; }
  const sp = cfg.sp * (now < fl.boost ? 1.35 : 1);
  const dx = fl.tx - fl.fx, dy = fl.ty - fl.fy;
  const dist = Math.hypot(dx, dy);
  // steer: limited turn rate bends the path into smooth arcs instead of
  // snapping straight at the target; the fantail's jink wobbles the heading
  let dh = Math.atan2(dy, dx) - fl.hdg;
  while (dh > Math.PI) dh -= 2 * Math.PI;
  while (dh < -Math.PI) dh += 2 * Math.PI;
  const turn = 2.4 * dt / 1000;
  fl.hdg += Math.max(-turn, Math.min(turn, dh));
  if (cfg.jink) fl.hdg += Math.sin(now / 140 + (m.uid || 0) * 3) * 1.6 * dt / 1000;
  const c = Math.cos(fl.hdg), s = Math.sin(fl.hdg);
  const step = Math.min(sp * dt / 1000, Math.max(0.05, dist));
  fl.fx += c * step; fl.fy += s * step;
  fl.vx = c * sp; fl.vy = s * sp; // combat.js leads flying targets with these
  m.x = Math.round(fl.fx); m.y = Math.round(fl.fy);
  m.px = PX(fl.fx); m.py = PX(fl.fy);
  m.facing = c >= 0 ? 1 : -1;
  m.dir8 = dir8From(Math.abs(c) > 0.38 ? Math.sign(c) : 0, Math.abs(s) > 0.38 ? Math.sign(s) : 0);
  // altitude: hold cruise height over the terrain, lift over whatever stands
  // two tiles ahead (crowns, roofs, wall rings), and glide down onto the
  // perch across the final approach
  const gHere = bfGround(m.x, m.y);
  const ahead = birdObstacleTop(Math.round(fl.fx + c * 2), Math.round(fl.fy + s * 2));
  let want = Math.max(gHere + cfg.cr, ahead + 0.8);
  if (dist < 6) {
    const t = dist / 6;
    want = want * t + fl.tgtAlt * (1 - t);
  }
  const vr = (2.2 + cfg.sp * 0.25) * dt / 1000;
  fl.alt += Math.max(-vr, Math.min(vr, want - fl.alt));
  m.flyAbs = fl.alt;
  m.flyY = fl.alt - gHere;
  if (dist < 0.5 && Math.abs(fl.alt - fl.tgtAlt) < 0.6) birdLand(m, cfg, fl);
  return true;
}
