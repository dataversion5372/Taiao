// ===== Isle of Emberfall — placed world objects: furniture & vessels =====
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
function placedAt(x, y, level) {
  for (let i = 0; i < placed.length; i++)
    if (placed[i].x === x && placed[i].y === y &&
        (level == null || (placed[i].level | 0) === (level | 0))) return placed[i];
  return null;
}

// Callers (1): main/ui.js (inventory click/context menu)
function placeItem(i) {
  const s = player.inv[i];
  if (!s) return;
  const def = ITEMS[s.id];
  if (!def.place) return;
  // target: the tile the player faces, then the 8 neighbours — and for
  // vessels a second ring too, so a launch works from a high bank
  const D8 = { south: [0, 1], "south-east": [1, 1], east: [1, 0], "north-east": [1, -1],
    north: [0, -1], "north-west": [-1, -1], west: [-1, 0], "south-west": [-1, 1] };
  const dirs = [D8[player.dir8] || [0, 1], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  if (def.ride)
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) dirs.push([dx, dy]);
  const lv = player.level | 0;
  for (const [dx, dy] of dirs) {
    const x = player.x + dx, y = player.y + dy;
    if (placedAt(x, y, lv) || world.npcAt(x, y, lv)) continue;
    // nodes block placement — except fishing spots, which line every river
    // bank and shouldn't stop a boat from launching over them
    const nd = world.nodeAt(x, y);
    if (nd && !(def.ride && String(nd.type).startsWith("fishspot"))) continue;
    const water = world.isWater(x, y);
    if (def.ride) {
      if (!water) continue; // vessels launch onto water only
    } else if (lv > 0) {
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
    log(def.ride ? `You launch the ${def.name.toLowerCase()}.`
      : def.decor ? `You set down the ${def.name.toLowerCase()} — it will wither before long.`
      : `You place the ${def.name.toLowerCase()}.`, "sys");
    uiDirty = true;
    saveGame();
    return;
  }
  log(def.ride ? "There's no open water beside you to launch onto." : "There's no clear ground beside you.", "warn");
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
  const how = "Click it (or step ashore) to disembark.";
  if (canRowBoat(def)) log(`You board the ${def.name.toLowerCase()}. ${how}`, "sys");
  else log(`You board the ${def.name.toLowerCase()} — no oars, so the current decides. ${how}`, "sys");
}

// Callers: gameplay/input.js (click / context on the ridden vessel)
// Step off the vessel onto an adjacent walkable land tile, leaving the craft on
// the water where it floats. Refuses in open water (nowhere dry to stand).
function disembark() {
  const ent = ridingEnt();
  if (!ent) return false;
  const ring = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const [dx, dy] of ring) {
    const x = player.x + dx, y = player.y + dy;
    if (world.isWater(x, y) || world.isBlocked(x, y) || world.insideBuilding(x, y)) continue;
    if (world.nodeAt(x, y) || placedAt(x, y, player.level | 0) || world.npcAt(x, y, player.level | 0)) continue;
    if (world.structAt && world.structAt(x, y)) continue;
    cancelAction();
    player.x = x; player.y = y; player.px = PX(x); player.py = PX(y);
    player.moving = null; player.path = []; player.goal = null;
    ridingIdx = -1;
    log(`You step ashore, leaving the ${ITEMS[ent.id].name.toLowerCase()}.`, "sys");
    uiDirty = true;
    saveGame();
    return true;
  }
  log("There's no dry land beside you to step onto.", "warn");
  return false;
}

// Called from movement.js when a player step completes: the ridden vessel
// follows onto water; a step ashore leaves it at the last water tile.
function rideFollow() {
  const ent = ridingEnt();
  if (!ent) return;
  if (world.isWater(player.x, player.y)) { ent.x = player.x; ent.y = player.y; }
  else {
    ridingIdx = -1;
    log(`You step ashore, leaving the ${ITEMS[ent.id].name.toLowerCase()}.`, "sys");
    saveGame();
  }
}
