// ===== Taiao — picking up decoration objects =====
// Any decorative world object (barrels, statues, crates, urns, benches,
// furniture, civic props…) can be picked up. It drops an item version of
// itself into the inventory and its billboard vanishes, respawning after
// 300 seconds. Structural pieces (walls/fences/gates/bridges) and flat
// ground decor are NOT pickable. State lives in `pickedDecor` (main/state.js);
// render3d.js syncDecor hides picked tiles until they respawn.
"use strict";

const DECOR_RESPAWN_MS = 300000; // 5 minutes
// structural / non-pickable prefixes (walls, fences, gates, doors, bridges…)
const DECOR_NOPICK_RE = /^(wall_|tower_|fence_|gate_|door_|rampart|portcullis|stone_bridge|bridge_arch|aqueduct|grille)/;

// A decoration is pickable if it's a real packed object (renders as a billboard)
// and isn't a structural / flat piece.
function decorPickable(key) {
  if (!key || typeof key !== "string") return false;
  const k = key.split("#")[0];
  if (DECOR_NOPICK_RE.test(k)) return false;
  return typeof OBJ_MAP !== "undefined" && OBJ_MAP[k] != null;
}

// Is this decor tile currently picked (hidden, awaiting respawn)?
function decorPicked(x, y) {
  const t = pickedDecor.get(x + "," + y);
  return t != null && now < t;
}

// Ensure an inventory item exists for a decoration key, deriving an icon from
// the object's own south frame (the "ob" icon sheet, same trick as furniture
// fo_ icons). Returns the item id (== the decor key).
function decorPickItem(key) {
  if (typeof ITEMS === "undefined") return key;
  if (ITEMS[key]) return key;
  let icon = "i_planks";
  if (typeof OBJ_MAP !== "undefined" && OBJ_MAP[key] != null && typeof OBJ_CELL !== "undefined" && typeof OBJ_COLS !== "undefined") {
    const f = OBJ_MAP[key] * 8; // south frame
    SPR["fo_" + key] = ["ob", 0, 0, { sx: (f % OBJ_COLS) * OBJ_CELL, sy: Math.floor(f / OBJ_COLS) * OBJ_CELL, sw: OBJ_CELL, sh: OBJ_CELL }];
    icon = "fo_" + key;
  } else if (typeof SPR !== "undefined" && SPR[key]) {
    icon = key;
  }
  const nm = (typeof decorName === "function") ? decorName(key) : key.replace(/_/g, " ");
  // id == the OBJ_MAP object key, so `.place` lets it be set back down in the
  // world (placing.js) — placed decor is temporary and despawns after 300s.
  ITEMS[key] = { name: nm.charAt(0).toUpperCase() + nm.slice(1), icon, stack: true, value: 5, decor: true, place: key };
  if (typeof EXAMINE !== "undefined" && !EXAMINE[key] && typeof decorExamine === "function") EXAMINE[key] = decorExamine(key);
  return key;
}

// Pick up the decoration at (x,y): give the item, hide the billboard, schedule
// its return. Called from executeGoal (pathing.js) once the player has walked up.
function pickUpDecor(x, y, key) {
  const raw = key || (world.getDecor && world.getDecor(x, y));
  const k = raw && raw.split("#")[0];
  if (!decorPickable(k)) { log("There's nothing to pick up there.", "warn"); return; }
  if (decorPicked(x, y)) { log("It's already been taken — give it time to return.", "warn"); return; }
  const item = decorPickItem(k);
  if (!addItem(item, 1)) { log("Your inventory is full.", "warn"); return; }
  pickedDecor.set(x + "," + y, now + DECOR_RESPAWN_MS);
  log(`You pick up the ${(typeof decorName === "function") ? decorName(k) : k}.`);
  uiDirty = true;
}
