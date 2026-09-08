// ===== Isle of Emberfall — active action scheduler =====
"use strict";

// Callers (1):
//  main.js:40
function updateAction() {
  // passive production jobs finish on a wall clock while you roam — announce
  // each once so you know to return to the station and collect it.
  if (player.jobs && player.jobs.length && typeof jobReady === "function") {
    for (const j of player.jobs) if (!j._notified && jobReady(j)) {
      j._notified = true;
      const r = typeof jobRecipe === "function" ? jobRecipe(j) : null;
      log(`Your ${r ? r.name.toLowerCase() : "production"} batch is ready — collect it at the station.`, "gold");
      uiDirty = true;
    }
  }
  const act = player.act;
  if (!act) return;
  if (player.stunUntil && now < player.stunUntil) return;
  if (act.kind === "combat") { tickCombat(act); return; }
  if (now < act.nextAt) return;
  if (act.kind === "gather") tickGather(act);
  else if (act.kind === "craft") tickCraft(act);
  else if (act.kind === "harvest") tickHarvest(act);
  else if (act.kind === "till") tickTill(act);
  else if (act.kind === "chop") tickChop(act);
  else if (act.kind === "alch") tickAlchemy(act);
  else player.act = null;
  uiDirty = true;
}
