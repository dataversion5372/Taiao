// ===== Taiao — placed world objects: furniture & vessels =====
// Any item with ITEMS[id].place (an OBJ_MAP key — furniture.js) can be set
// down in the world and picked back up. Furniture goes on open land;
// vessels (ITEMS[id].ride) go ON WATER and can be boarded: "sail" craft
// steer freely, "oar" craft need oars in the pack — without them the river
// current decides where you go (movement.js). Persisted in the save.
"use strict";

let placed = []; // [{ id, x, y, expireAt? }]  expireAt set only on temporary decor
let ridingIdx = -1; // index into `placed` of the vessel under the player
const DECOR_PLACE_MS = 300000; // a set-down decoration withers after 5 minutes

function ridingEnt() { return ridingIdx >= 0 ? placed[ridingIdx] : null; }

// ---------- multi-tile hull footprints ----------
// A hull SPANS real tiles: length = its Shipwrighting tier clamped [2, 32]
// (the same curve render3d's billboard length uses), beam growing gently
// with size. The footprint is the line of tiles along the heading
// (DIR8_DELTA stair-steps on diagonals), centred on the anchor tile,
// thickened perpendicular by the beam. It gates launching (a man-o'-war
// needs 32 tiles of open sea), steering (movement.js hullStepOK), walking/
// swimming collision (state.js passable → vesselBlockAt) and click
// targeting (placedAt matches any hull tile).
function hullLen(id) {
  const t = (ITEMS[id] && ITEMS[id].boat) || 0;
  return t ? Math.min(32, Math.max(2, t)) : 0;
}
function hullBeam(len) { return 1 + Math.floor(len / 12); }
function hullTiles(id, x, y, dir) {
  const len = hullLen(id);
  if (!len) return [[x, y]];
  const [dx8, dy8] = DIR8_DELTA[dir & 7];
  const mag = Math.hypot(dx8, dy8) || 1;
  const ux = dx8 / mag, uy = dy8 / mag;    // unit heading (1 tile per step)
  const px2 = -uy, py2 = ux;               // unit beam (perpendicular)
  const beam = hullBeam(len);
  const half = (len - 1) / 2, bHalf = (beam - 1) / 2;
  const tiles = [], seen = new Set();
  for (let t = -half; t <= half + 1e-6; t += 1)
    for (let b = -bHalf; b <= bHalf + 1e-6; b += 1) {
      const tx = Math.round(x + ux * t + px2 * b), ty = Math.round(y + uy * t + py2 * b);
      const k = tx + "," + ty;
      if (!seen.has(k)) { seen.add(k); tiles.push([tx, ty]); }
    }
  return tiles;
}
// footprint tile-set per placed vessel, cached until its anchor/heading move
// (WeakMap so nothing leaks into the save)
const _hullFP = new WeakMap();
function hullFootprint(e) {
  const d = e.dir | 0;
  let c = _hullFP.get(e);
  if (!c || c.x !== e.x || c.y !== e.y || c.dir !== d) {
    const set = new Set();
    for (const [tx, ty] of hullTiles(e.id, e.x, e.y, d)) set.add(tx + "," + ty);
    c = { x: e.x, y: e.y, dir: d, set };
    _hullFP.set(e, c);
  }
  return c.set;
}
// does a hull of this id fit at anchor (x,y) heading dir — every footprint
// tile open water, clear of terrain blocks, gate plugs and OTHER hulls?
function hullFits(id, x, y, dir, ignoreEnt) {
  const tiles = hullTiles(id, x, y, dir);
  for (const [tx, ty] of tiles) {
    if (!world.isWater(tx, ty) || world.isBlocked(tx, ty)) return false;
    const st = world.structAt && world.structAt(tx, ty);
    if (st && st.plug) return false;
  }
  for (const e of placed) {
    if (e === ignoreEnt) continue;
    const d2 = ITEMS[e.id];
    if (!d2 || !d2.ride) continue;
    if (Math.max(Math.abs(x - e.x), Math.abs(y - e.y)) > (hullLen(id) + hullLen(e.id))) continue;
    const fp = hullFootprint(e);
    for (const [tx, ty] of tiles) if (fp.has(tx + "," + ty)) return false;
  }
  return true;
}
// a parked hull blocks the water it spans (the ridden one moves WITH the
// player, so it never blocks its own rider). Called from passable().
function vesselBlockAt(x, y) {
  const rid = ridingEnt();
  for (const e of placed) {
    if (e === rid) continue;
    const d = ITEMS[e.id];
    if (!d || !d.ride) continue;
    const len = hullLen(e.id);
    if (!len || Math.max(Math.abs(x - e.x), Math.abs(y - e.y)) > (len >> 1) + 2) continue;
    if (hullFootprint(e).has(x + "," + y)) return e;
  }
  return null;
}
// can the ridden hull advance its anchor to (nx,ny)? A land step is always
// allowed — that's stepping ashore, rideFollow leaves the hull on the water.
function hullStepOK(ent, nx, ny) {
  if (CHEAT_MODE) return true;
  if (!world.isWater(nx, ny)) return true;
  const nm = dir8From(nx - player.x, ny - player.y);
  const wi = nm ? Math.max(0, DIR8.indexOf(nm)) : (ent.dir | 0);
  return hullFits(ent.id, nx, ny, wi, ent);
}
// the hull tile nearest (x,y) — click-to-board/pickup paths here, since a
// big hull's anchor sits far out on the water
function nearestHullTile(ent, x, y) {
  let best = [ent.x, ent.y], bd = Infinity;
  for (const key of hullFootprint(ent)) {
    const c = key.indexOf(",");
    const tx = +key.slice(0, c), ty = +key.slice(c + 1);
    const d = Math.max(Math.abs(tx - x), Math.abs(ty - y));
    if (d < bd) { bd = d; best = [tx, ty]; }
  }
  return best;
}

function placedAt(x, y, level) {
  for (let i = 0; i < placed.length; i++) {
    const e = placed[i];
    if (level != null && (e.level | 0) !== (level | 0)) continue;
    if (e.x === x && e.y === y) return e;
    // vessels answer for their WHOLE footprint (clicking anywhere on the
    // hull targets it; furniture can't be set down inside one)
    const d = ITEMS[e.id];
    if (d && d.ride && hullLen(e.id) > 0 && hullFootprint(e).has(x + "," + y)) return e;
  }
  return null;
}

// Callers (1): main/ui.js (inventory click/context menu)
function placeItem(i) {
  const s = player.inv[i];
  if (!s) return;
  const def = ITEMS[s.id];
  if (!def.place) return;
  // Vessels launch bow-first: the anchor sits mid-hull, so the whole
  // footprint must fit on open water out along a heading — the player's
  // facing first, then the neighbouring headings. A dinghy slides onto any
  // pond; a man-o'-war only launches facing a 32-tile stretch of sea.
  if (def.ride) {
    const wi = Math.max(0, DIR8.indexOf(player.dir8 || "south"));
    const len = hullLen(s.id) || 2;
    for (const dd of [wi, (wi + 1) & 7, (wi + 7) & 7, (wi + 2) & 7, (wi + 6) & 7, (wi + 3) & 7, (wi + 5) & 7, (wi + 4) & 7]) {
      const [dx8, dy8] = DIR8_DELTA[dd], mag = Math.hypot(dx8, dy8) || 1;
      for (let dist = 1; dist <= 3; dist++) {
        const a = dist + (len - 1) / 2; // stern `dist` tiles out, anchor mid-hull
        const ax = Math.round(player.x + (dx8 / mag) * a), ay = Math.round(player.y + (dy8 / mag) * a);
        if (!hullFits(s.id, ax, ay, dd)) continue;
        if (world.npcAt(ax, ay, 0)) continue;
        placed.push({ id: s.id, x: ax, y: ay, dir: dd });
        s.qty -= 1;
        if (s.qty <= 0) player.inv[i] = null;
        log(`You launch the ${def.name.toLowerCase()}.`, "sys");
        uiDirty = true;
        saveGame();
        return;
      }
    }
    log(len > 6 ? `The ${def.name.toLowerCase()} needs ${len} tiles of open water — face a wider stretch.`
      : "There's no open water beside you to launch onto.", "warn");
    return;
  }
  // target: the tile the player faces, then the 8 neighbours
  const D8 = { south: [0, 1], "south-east": [1, 1], east: [1, 0], "north-east": [1, -1],
    north: [0, -1], "north-west": [-1, -1], west: [-1, 0], "south-west": [-1, 1] };
  const dirs = [D8[player.dir8] || [0, 1], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const lv = player.level | 0;
  for (const [dx, dy] of dirs) {
    const x = player.x + dx, y = player.y + dy;
    if (placedAt(x, y, lv) || world.npcAt(x, y, lv)) continue;
    if (world.nodeAt(x, y)) continue; // nodes block placement (vessels returned above)
    const water = world.isWater(x, y);
    if (lv > 0) {
      // upstairs: set furniture on a walkable interior floor tile of THIS storey,
      // but never on the ladder tile (it'd block the way up/down)
      if (typeof passable === "function" && !passable(x, y)) continue;
      const st = world.structAt && world.structAt(x, y);
      if (st) continue;
      const bld = world.insideBuilding && world.insideBuilding(x, y);
      const bm = bld && world.buildingMeta && world.buildingMeta(bld);
      if (bm && bm.ladder && bm.ladder.x === x && bm.ladder.y === y) continue;
    } else {
      // candles/lamps may be set down INDOORS too (on a table or the floor), so
      // they're not barred from a building interior the way furniture/vessels are.
      if (water || world.isBlocked(x, y)) continue;
      if (!def.light && world.insideBuilding(x, y)) continue;
      const st = world.structAt && world.structAt(x, y);
      if (st) continue;
    }
    const entry = { id: s.id, x, y };
    if (lv > 0) entry.level = lv;
    if (def.decor) entry.expireAt = now + DECOR_PLACE_MS; // temporary decoration
    placed.push(entry);
    s.qty -= 1;
    if (s.qty <= 0) player.inv[i] = null;
    log(def.decor ? `You set down the ${def.name.toLowerCase()} — it will wither before long.`
      : `You place the ${def.name.toLowerCase()}.`, "sys");
    uiDirty = true;
    saveGame();
    return;
  }
  log("There's no clear ground beside you.", "warn");
}

// Callers (1): main.js frame loop. Temporary set-down decorations (entry.expireAt,
// from placing a def.decor item) vanish 300s after they were placed.
function tickPlaced() {
  if (!placed.length) return;
  const rid = ridingEnt();
  let changed = false;
  for (let i = placed.length - 1; i >= 0; i--) {
    const e = placed[i];
    if (e.expireAt != null && now >= e.expireAt) { placed.splice(i, 1); changed = true; }
  }
  if (changed) { ridingIdx = rid ? placed.indexOf(rid) : -1; uiDirty = true; }
}

// Callers (1): gameplay/pathing.js (executeGoal)
function pickUpPlaced(ent) {
  const idx = placed.indexOf(ent);
  if (idx < 0) return;
  if (idx === ridingIdx) { log("You're standing on it.", "warn"); return; }
  if (!addItem(ent.id, 1)) { log("Your inventory is full.", "warn"); return; }
  if (ridingIdx > idx) ridingIdx--;
  placed.splice(idx, 1);
  log(`You pick up the ${ITEMS[ent.id].name.toLowerCase()}.`, "sys");
  uiDirty = true;
  saveGame();
}

// oar-class craft steer only with oars aboard; sail-class steer themselves
function canRowBoat(def) { return def.ride === "sail" || countItem("oars") > 0; }

// Callers (1): gameplay/pathing.js (executeGoal) — player is adjacent
function boardVessel(ent) {
  const idx = placed.indexOf(ent);
  if (idx < 0) return;
  cancelAction();
  player.x = ent.x; player.y = ent.y;
  player.px = PX(ent.x); player.py = PX(ent.y);
  player.moving = null; player.path = [];
  ridingIdx = idx;
  const def = ITEMS[ent.id];
  const how = "Click it to disembark — step ashore, or over the side for a swim.";
  if (canRowBoat(def)) log(`You board the ${def.name.toLowerCase()}. ${how}`, "sys");
  else log(`You board the ${def.name.toLowerCase()} — no oars, so the current decides. ${how}`, "sys");
}

// Callers: gameplay/input.js (click / context on the ridden vessel)
// Step off the vessel, leaving the craft on the water where it floats.
// Prefers an adjacent walkable LAND tile; in open water you slip over the
// side instead and swim (water movement handles wading/current from there).
function disembark() {
  const ent = ridingEnt();
  if (!ent) return false;
  const stepOff = (x, y, msg) => {
    cancelAction();
    player.x = x; player.y = y; player.px = PX(x); player.py = PX(y);
    player.moving = null; player.path = []; player.goal = null;
    ridingIdx = -1;
    log(msg, "sys");
    uiDirty = true;
    saveGame();
    return true;
  };
  // candidates: every tile hugging the hull (the footprint's outside
  // neighbours, nearest the player first) — the gangplank drops anywhere
  // along the ship's sides, not just beside the anchor
  const fp = hullFootprint(ent);
  const cands = [], seen = new Set();
  for (const key of fp) {
    const c = key.indexOf(",");
    const fx = +key.slice(0, c), fy = +key.slice(c + 1);
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = fx + dx, y = fy + dy, k = x + "," + y;
      if (fp.has(k) || seen.has(k)) continue;
      seen.add(k);
      cands.push([x, y]);
    }
  }
  cands.sort((a, b) => Math.hypot(a[0] - player.x, a[1] - player.y) - Math.hypot(b[0] - player.x, b[1] - player.y));
  for (const [x, y] of cands) {
    if (world.isWater(x, y) || world.isBlocked(x, y) || world.insideBuilding(x, y)) continue;
    if (world.nodeAt(x, y) || placedAt(x, y, player.level | 0) || world.npcAt(x, y, player.level | 0)) continue;
    if (world.structAt && world.structAt(x, y)) continue;
    return stepOff(x, y, `You step ashore, leaving the ${ITEMS[ent.id].name.toLowerCase()}.`);
  }
  // no dry land: slip over the side into any water you could swim in —
  // passable() carries the real movement rules (blocked tiles, gate plugs,
  // under-deck passages), so anywhere you could wade to, you can dismount to
  for (const [x, y] of cands) {
    if (!world.isWater(x, y) || !passable(x, y)) continue;
    if (placedAt(x, y, player.level | 0) || world.npcAt(x, y, player.level | 0)) continue;
    return stepOff(x, y, `You slip over the side and swim, leaving the ${ITEMS[ent.id].name.toLowerCase()}.`);
  }
  log("There's nowhere beside you to disembark.", "warn");
  return false;
}

// Called from movement.js when a player step completes: the ridden vessel
// follows onto water; a step ashore leaves it at the last water tile.
function rideFollow() {
  const ent = ridingEnt();
  if (!ent) return;
  if (world.isWater(player.x, player.y)) {
    ent.x = player.x; ent.y = player.y;
    // a parked hull keeps the heading it was last steered on
    ent.dir = Math.max(0, DIR8.indexOf(player.dir8 || "south"));
  } else {
    ridingIdx = -1;
    log(`You step ashore, leaving the ${ITEMS[ent.id].name.toLowerCase()}.`, "sys");
    saveGame();
  }
}
