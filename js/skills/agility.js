// ===== Taiao — agility obstacles =====
"use strict";

// Callers (1):
//  gameplay/pathing.js:75
function useObstacle(ob) {
  if (skillLvl("Agility") < ob.req) { log(`You need Agility level ${ob.req} for that.`, "warn"); return; }
  cancelAction();
  player.path = [];
  // carry the obstacle's slip data into the forced walk so movement.js can roll
  // a stumble tile-by-tile (harder crossings only; `fail` 0 = a safe crossing).
  player.forced = {
    tiles: ob.path.map(([x, y]) => ({ x, y })), i: 0,
    xp: ob.xp, name: ob.name, req: ob.req || 1, fail: ob.fail || 0, dmg: ob.dmg || 0,
    // where to scramble back to if you slip (the bank you set off from) — the
    // crossing runs over blocked water, so we never leave you stranded on it.
    fromX: player.x, fromY: player.y,
  };
  log(`You cross the ${ob.name.toLowerCase()}...`);
}

// Callers (1):
//  gameplay/movement.js (forced-traversal slip check)
// Per-tile chance to lose your footing on a risky crossing. The base `fail` is
// the slip chance AT the required level; it shrinks as your level climbs past
// the requirement and with the passive Agility bonus, and is spread across the
// crossing's tiles so a longer span isn't punishingly more dangerous than a
// short one. Returns 0 for safe (fail:0) obstacles.
function obstacleSlipChance(f) {
  if (!f || !f.fail) return 0;
  const lvl = (typeof eff === "function") ? eff("Agility") : skillLvl("Agility");
  const over = Math.max(0, lvl - (f.req || 1));
  const tiles = Math.max(1, (f.tiles && f.tiles.length) || 1);
  // each level past the requirement cuts the risk ~8%; passive nimbleness cuts more
  const passive = (typeof charAgiSlipMul === "function") ? charAgiSlipMul() : 1;
  const per = (f.fail / tiles) * Math.max(0.15, 1 - over * 0.08) * passive;
  return Math.max(0, Math.min(0.6, per));
}
