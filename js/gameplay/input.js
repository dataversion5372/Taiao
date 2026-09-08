// ===== Isle of Emberfall — mouse, keyboard, target picking, and context menus =====
"use strict";

// ---------- input ----------
// Callers (3):
//  gameplay/input.js:67,79,113
function canvasTile(e) {
  return REN.pickTile(e);
}

// Callers (1):
//  gameplay/input.js:31
function obstaclesAt(x, y) {
  return world.obstacles.filter(o => o.x === x && o.y === y);
}
// Callers (1):
//  gameplay/input.js:32
function pickObstacle(obs) {
  // choose the crossing that leads away from the player
  let best = obs[0], bd = -1;
  for (const o of obs) {
    const end = o.path[o.path.length - 1];
    const d = Math.hypot(end[0] - player.x, end[1] - player.y);
    if (d > bd) { bd = d; best = o; }
  }
  return best;
}

// Callers (3):
//  gameplay/input.js:69,81,115
function targetsAt(x, y) {
  const out = [];
  // doors, gates & ladders (multi-storey buildings — retired prototype port)
  const door = world.doorAt && world.doorAt(x, y);
  if (door) out.push({ kind: "door", door });
  const bld = world.insideBuilding && world.insideBuilding(x, y);
  if (bld) {
    const bm = world.buildingMeta(bld);
    if (bm.ladder && bm.ladder.x === x && bm.ladder.y === y) {
      const lv = player.level | 0;
      if (lv < bm.storeys - 1) out.push({ kind: "ladder", b: bld, m: bm, dir: 1 });
      if (lv > 0) out.push({ kind: "ladder", b: bld, m: bm, dir: -1 });
    }
  }
  // monsters live on the ground floor; an upstairs player can't target one below
  const m = monsters.find(m => m.alive && (m.level | 0) === (player.level | 0) &&
    ((m.moving && m.moving.tx === x && m.moving.ty === y) || (m.x === x && m.y === y)));
  if (m) {
    // domestic livestock offers BOTH Tend/Feed (Husbandry) and Attack (Combat).
    // The interaction-mode toggle (sidebar) decides which is listed first — i.e.
    // which sits at the top of the right-click menu AND is the left-click default.
    // Non-livestock monsters only ever offer Attack, so the toggle is a no-op there.
    const live = (typeof isLivestock === "function" && isLivestock(m)) ? { kind: "livestock", mon: m } : null;
    const mon = { kind: "monster", mon: m };
    if (live && window.interactMode === "combat") { out.push(mon); out.push(live); }
    else if (live) { out.push(live); out.push(mon); }
    else out.push(mon);
  }
  // placed furniture & vessels (gameplay/placing.js). The vessel you're RIDING
  // becomes a "riding" target (click it to disembark) rather than being hidden.
  const pl = typeof placedAt === "function" && placedAt(x, y, player.level | 0);
  if (pl) {
    const riding = typeof ridingEnt === "function" && ridingEnt();
    out.push({ kind: pl === riding ? "riding" : "placed", ent: pl });
  }
  const npc = world.npcAt(x, y, player.level | 0);   // only NPCs on the player's storey
  if (npc) out.push({ kind: "npc", npc });
  const d = dynNodes.find(d => d.x === x && d.y === y);
  if (d) out.push({ kind: d.type === "unlit_fire" ? "unlitfire" : "dynstation", node: d });
  const obs = obstaclesAt(x, y);
  if (obs.length) out.push({ kind: "obstacle", ob: pickObstacle(obs), obs });
  const n0 = world.nodeAt(x, y);
  const n = n0 && (n0.station || n0.farm || n0.portal || n0.alive !== false) ? n0 : null;
  if (n) out.push({ kind: n.portal ? "portal" : n.station ? "station" : n.farm ? "farm" : "node", node: n });
  const gi = groundItems.find(g => g.x === x && g.y === y && (g.level | 0) === (player.level | 0));
  if (gi) out.push({ kind: "ground", item: gi });
  return out;
}

// Callers (2):
//  gameplay/input.js:71,118
function hoverLabel(tg) {
  if (tg.kind === "livestock") return (typeof husbLabel === "function" && husbLabel(tg.mon)) || `Tend ${MONSTERS[tg.mon.kind].name}`;
  if (tg.kind === "monster") {
    const def = MONSTERS[tg.mon.kind];
    const nm = (typeof monName === "function") ? monName(tg.mon) : def.name;
    return `Attack ${nm} (level ${def.lvl})`;
  }
  if (tg.kind === "npc") {
    if (tg.npc.trader && typeof shopClosed === "function" && shopClosed(tg.npc)) return `${tg.npc.name} (shop closed)`;
    if (!tg.npc.trader && typeof npcAsleep === "function" && npcAsleep(tg.npc)) return `${tg.npc.name} (asleep)`;
    if (tg.npc._questGiver) return `✦ Talk to ${tg.npc.name} (quest)`;
    return `${tg.npc.trader ? "Trade with" : "Talk to"} ${tg.npc.name}`;
  }
  if (tg.kind === "door") {
    const what = tg.door.kind === "gate" ? "gate" : "door";
    if (world.isDoorOpen(tg.door.x, tg.door.y)) return `Close ${what}`;
    return `${typeof doorLocked === "function" && doorLocked(tg.door) ? "Unlock" : "Open"} ${what}`;
  }
  if (tg.kind === "ladder") return tg.dir > 0 ? "Climb-up ladder" : "Climb-down ladder";
  if (tg.kind === "riding") return `Disembark ${ITEMS[tg.ent.id].name}`;
  if (tg.kind === "placed")
    return ITEMS[tg.ent.id].ride ? `Board ${ITEMS[tg.ent.id].name}` : `Pick up ${ITEMS[tg.ent.id].name}`;
  if (tg.kind === "unlitfire") return "Light fire";
  if (tg.kind === "dynstation") return "Cook at fire";
  if (tg.kind === "obstacle") return `Cross ${tg.ob.name} (Agility ${tg.ob.req})`;
  if (tg.kind === "portal") return portalAttuned(tg.node) ? "Enter Ancient portal" : "Attune Ancient portal";
  if (tg.kind === "station") return `${STATIONS[tg.node.type].action} at ${STATIONS[tg.node.type].name}`;
  if (tg.kind === "farm") {
    const n = tg.node;
    if (!n.crop) return n.tilled === false ? "Till soil" : `Plant ${n.skill ? n.skill + " " : ""}seeds`;
    const crop = CROPS[n.crop.kind];
    const mature = now >= n.crop.plantedAt + crop.time;
    if (crop.tree) return !mature ? "Inspect fruit tree"
      : n.crop.picked ? ((typeof hasTool === "function" && hasTool("watering_can")) ? "Water tree" : "Chop tree")
      : `Harvest ${crop.name}`;
    return mature ? `Harvest ${crop.name}` : `Inspect crop`;
  }
  if (tg.kind === "node") {
    const nt = NODE_TYPES[tg.node.type];
    const verbs = { Woodcutting: "Chop", Mining: "Mine", "Ore-mining": "Mine",
      "Gem-mining": "Mine", "Stone-mining": "Mine", Fishing: "Fish at", Foraging: "Forage" };
    return `${nt.gatherVerb || verbs[nt.skill] || "Gather"} ${nt.name}`;
  }
  if (tg.kind === "ground") return `Take ${ITEMS[tg.item.id].name}`;
  return "";
}

// Short object name for the "Examine <name>" context-menu label.
function targetName(tg) {
  if (tg.kind === "livestock" || tg.kind === "monster") return (typeof monName === "function") ? monName(tg.mon) : MONSTERS[tg.mon.kind].name;
  if (tg.kind === "npc") return tg.npc.name;
  if (tg.kind === "door") return tg.door.kind === "gate" ? "gate" : "door";
  if (tg.kind === "ladder") return "ladder";
  if (tg.kind === "riding" || tg.kind === "placed") return ITEMS[tg.ent.id].name;
  if (tg.kind === "obstacle") return tg.ob.name;
  if (tg.kind === "ground") return ITEMS[tg.item.id].name;
  if (tg.kind === "portal") return "Ancient portal";
  if (tg.kind === "station") return (typeof STATIONS !== "undefined" && STATIONS[tg.node.type] && STATIONS[tg.node.type].name) || "station";
  if (tg.kind === "farm") { const c = tg.node.crop && CROPS[tg.node.crop.kind]; return c ? c.name : "crop plot"; }
  if (tg.kind === "unlitfire" || tg.kind === "dynstation") return "fire";
  if (tg.node) { const nt = NODE_TYPES[tg.node.type]; return nt ? nt.name : "it"; }
  return "it";
}

canvas.addEventListener("mousemove", e => {
  const t = canvasTile(e);
  if (!world || !world.inMap(t.x, t.y)) { hover = null; setHoverText(""); return; }
  const targets = targetsAt(t.x, t.y);
  hover = { tileX: t.x, tileY: t.y };
  setHoverText(targets.length ? hoverLabel(targets[0]) : "");
});
canvas.addEventListener("mouseleave", () => { hover = null; setHoverText(""); });
// Callers (3):
//  gameplay/input.js:68,71,73
function setHoverText(t) { document.getElementById("hovertext").textContent = t; }

canvas.addEventListener("click", e => {
  hideCtx();
  if (!world) return;
  const t = canvasTile(e);
  if (!world.inMap(t.x, t.y)) return;
  // left-click runs the DEFAULT (first) action of the tile's action menu — the
  // same thing that sits at the top of the right-click menu (Attack / Talk /
  // Gather / Take / …). buildTileMenu always ends with "Walk here", so on empty
  // ground items[0] is that fallback.
  const items = buildTileMenu(t);
  if (items.length) items[0].fn();
});

// Callers (2):
//  gameplay/input.js:82,118
function doTarget(tg) {
  if (tg.kind === "door") setGoal({ type: "door", door: tg.door }, tg.door.x, tg.door.y, 1);
  else if (tg.kind === "ladder") setGoal({ type: "ladder", b: tg.b, m: tg.m, dir: tg.dir }, tg.m.ladder.x, tg.m.ladder.y, 1);
  else if (tg.kind === "livestock") setGoal({ type: (typeof husbGoalType === "function" ? husbGoalType(tg.mon) : (tg.mon.husbSpent ? "husbFeed" : "husbHarvest")), mon: tg.mon }, tg.mon.x, tg.mon.y, 1);
  else if (tg.kind === "monster") setGoal({ type: "combat", mon: tg.mon }, tg.mon.x, tg.mon.y, styleRange());
  else if (tg.kind === "riding") { if (typeof disembark === "function") disembark(); }
  else if (tg.kind === "placed") {
    const t2 = ITEMS[tg.ent.id].ride ? "board" : "placedPickup";
    setGoal({ type: t2, ent: tg.ent }, tg.ent.x, tg.ent.y, 1);
  }
  else if (tg.kind === "npc") setGoal({ type: "npc", npc: tg.npc }, tg.npc.x, tg.npc.y, 1);
  else if (tg.kind === "unlitfire") setGoal({ type: "lightFire", node: tg.node }, tg.node.x, tg.node.y, 1);
  else if (tg.kind === "dynstation") setGoal({ type: "station", node: tg.node }, tg.node.x, tg.node.y, (tg.node.wide || 0) + 1);
  else if (tg.kind === "obstacle") setGoal({ type: "obstacle", ob: tg.ob }, tg.ob.x, tg.ob.y, 1);
  // wide stations (3x3 models like the furnace) have their whole footprint
  // blocked, so reach=1 (immediately adjacent) is never satisfiable — widen
  // the reach radius past the footprint instead
  else if (tg.kind === "portal") setGoal({ type: "portal", node: tg.node }, tg.node.x, tg.node.y, 1);
  else if (tg.kind === "station") setGoal({ type: "station", node: tg.node }, tg.node.x, tg.node.y, (tg.node.wide || 0) + 1);
  else if (tg.kind === "farm") setGoal({ type: "farm", node: tg.node }, tg.node.x, tg.node.y, 1);
  else if (tg.kind === "node") setGoal({ type: "gather", node: tg.node }, tg.node.x, tg.node.y, 1);
  else if (tg.kind === "ground") setGoal({ type: "pickup", item: tg.item }, tg.item.x, tg.item.y, 1);
}

// Callers (2):
//  gameplay/input.js:83,130
function walkTo(x, y) {
  if (player.forced) return;
  cancelAction();
  closeModals();
  const p = findPath(x, y, passable(x, y) ? 0 : 1);
  if (p === null) { log("You can't reach that.", "warn"); return; }
  player.path = p;
}

// context menu
// Callers (8):
//  gameplay/input.js:135,139,145,148,149,150,152,153
// ---- interaction-mode toggle (sidebar button): "husbandry" lists Tend/Feed
// first on animals, "combat" lists Attack first. targetsAt() reads it to order
// the livestock/monster targets (menu top + left-click default). Persisted as a
// client preference in localStorage; default husbandry (the old behaviour). ----
window.interactMode = (() => { try { return localStorage.getItem("emberfall_interactmode") === "combat" ? "combat" : "husbandry"; } catch (e) { return "husbandry"; } })();
const interactModeBtn = document.getElementById("interactmodebtn");
function syncInteractModeBtn() {
  if (!interactModeBtn) return;
  const combat = window.interactMode === "combat";
  interactModeBtn.textContent = combat ? "Mode: ⚔ Combat" : "Mode: 🌾 Husbandry";
  interactModeBtn.classList.toggle("combat", combat);
  interactModeBtn.classList.toggle("husbandry", !combat);
}
if (interactModeBtn) {
  interactModeBtn.addEventListener("click", () => {
    window.interactMode = window.interactMode === "combat" ? "husbandry" : "combat";
    try { localStorage.setItem("emberfall_interactmode", window.interactMode); } catch (e) {}
    syncInteractModeBtn();
    if (typeof log === "function") log(window.interactMode === "combat"
      ? "Interaction mode: Combat — Attack is now the default action on animals."
      : "Interaction mode: Husbandry — Tend/Feed is now the default action on animals.", "sys");
  });
  syncInteractModeBtn();
}

// sidebar Character button — same as the C key (CharSelect.toggle()).
{
  const charBtn = document.getElementById("charbtn");
  if (charBtn) charBtn.addEventListener("click", () => { if (typeof CharSelect !== "undefined") CharSelect.toggle(); });
}
// sidebar Soap button — same as Left-Shift+S (the soaps comparison menu).
{
  const soapBtn = document.getElementById("soapbtn");
  if (soapBtn) soapBtn.addEventListener("click", () => { if (typeof toggleSoapsMenu === "function") toggleSoapsMenu(); });
}

const ctxEl = document.getElementById("ctxmenu");
canvas.addEventListener("contextmenu", e => {
  e.preventDefault();
  if (!world) return;
  const t = canvasTile(e);
  if (!world.inMap(t.x, t.y)) return;
  showCtx(buildTileMenu(t), e.clientX, e.clientY);
});

// The ordered action list for a tile: every interactive target's primary action
// (+ an Examine), then a decoration's Take/Examine, then "Walk here". The FIRST
// entry is the default action — used by both left-click and the right-click menu.
// Callers (2): the click + contextmenu handlers above.
function buildTileMenu(t) {
  const targets = targetsAt(t.x, t.y);
  const items = [];
  const groundHere = groundItems.filter(g => g.x === t.x && g.y === t.y && (g.level | 0) === (player.level | 0));
  for (const tg of targets) {
    if (tg.kind === "ground") continue;   // handled together below (Take All + per-item)
    // livestock: one menu entry per unlocked husbandry action (or Feed when spent);
    // left-click runs the first entry. Then an Examine for the animal.
    if (tg.kind === "livestock" && typeof husbMenu === "function") {
      for (const act of husbMenu(tg.mon)) {
        const id = act.id;
        items.push({
          label: act.label, fn: () => {
            if (id === "__feed") setGoal({ type: "husbFeed", mon: tg.mon }, tg.mon.x, tg.mon.y, 1);
            else if (id && id[0] !== "_") setGoal({ type: "husbAction", mon: tg.mon, act: id }, tg.mon.x, tg.mon.y, 1);
            else if (typeof log === "function") log(act.label, "warn");
          },
        });
      }
      const lex = typeof husbExamine === "function" && husbExamine(tg.mon);
      if (lex) items.push({ label: `Examine ${targetName(tg)}`, fn: () => log(lex, "sys") });
      continue;
    }
    // picked-bare Pomiculture fruit tree: WATER it (regrow the fruit) or CHOP it.
    // With a watering can, Water is the default (left-click) so you never fell a
    // tree you're tending by accident; chopping is then a right-click choice.
    if (tg.kind === "farm" && tg.node.crop && CROPS[tg.node.crop.kind] && CROPS[tg.node.crop.kind].tree) {
      const node = tg.node, crop = CROPS[node.crop.kind];
      if (now >= node.crop.plantedAt + crop.time && node.crop.picked) {
        const hasCan = typeof hasTool === "function" && hasTool("watering_can");
        const ready = now >= (node.crop.pickedAt || 0) + respawnFor(crop.req);
        const water = { label: ready ? "Water tree" : "Water tree — resting", fn: () => setGoal({ type: "farmWater", node }, node.x, node.y, 1) };
        const chop = { label: "Chop tree", fn: () => doTarget(tg) };
        if (hasCan) { items.push(water, chop); } else { items.push(chop); }
        items.push({ label: `Examine ${targetName(tg)}`, fn: () => log("A bare fruit tree — water it to regrow the fruit once it's rested, or fell it for logs.", "sys") });
        continue;
      }
    }
    items.push({ label: hoverLabel(tg), fn: () => doTarget(tg) });
    // heat stations can be stoked with logs (fuels the pilot fire)
    if (tg.kind === "station" && typeof stationIsHeat === "function" && stationIsHeat(tg.node)) {
      const bi = typeof bestLogIndex === "function" ? bestLogIndex() : -1;
      items.push({
        label: bi >= 0 ? `Stoke fire (${stationHeatNow(tg.node)}°)` : "Stoke fire — no logs",
        fn: () => setGoal({ type: "stokeFire", node: tg.node }, tg.node.x, tg.node.y, (tg.node.wide || 0) + 1),
      });
    }
    let exam = null;
    if (tg.kind === "monster") exam = `It's a ${MONSTERS[tg.mon.kind].name}, level ${MONSTERS[tg.mon.kind].lvl}.`;
    else if (tg.kind === "npc") exam = (typeof npcAsleep === "function" && npcAsleep(tg.npc)) ? `${tg.npc.name} is fast asleep.`
      : tg.npc.trader ? (typeof shopClosed === "function" && shopClosed(tg.npc) ? "A merchant — shop's shut for the night." : "A merchant. Fair prices, mostly.")
      : `${tg.npc.name}, a villager.`;
    else if (tg.kind === "door") exam = (typeof lockExamine === "function" && lockExamine(tg.door))
      || (tg.door.kind === "gate" ? "Sturdy gates keep the wilds out." : "The door is " + (world.isDoorOpen(tg.door.x, tg.door.y) ? "open." : "closed."));
    else if (tg.kind === "ladder") exam = tg.dir > 0 ? "It leads to the floor above." : "It leads back down.";
    else if (tg.kind === "riding") exam = "You're aboard. Click to step ashore.";
    else if (tg.kind === "unlitfire") exam = "A stack of logs laid ready to burn — strike a spark (bladed weapon + flint) to light it.";
    else if (tg.kind === "farm") exam = tg.node.crop ? "Something is growing here."
      : tg.node.tilled === false ? `Untilled ${tg.node.skill || "farm"} soil — break it with a hoe.`
      : `Tilled ${tg.node.skill || "farm"} soil, ready for ${tg.node.skill || "any"} seed.`;
    else if (tg.kind === "placed") {
      exam = EXAMINE[tg.ent.id] || ITEMS[tg.ent.id].name;
      if (ITEMS[tg.ent.id].ride)
        items.push({ label: `Pick up ${ITEMS[tg.ent.id].name}`,
          fn: () => setGoal({ type: "placedPickup", ent: tg.ent }, tg.ent.x, tg.ent.y, 1) });
    }
    else if (tg.kind === "obstacle") exam = `${tg.ob.name} — a shortcut for the nimble.${tg.ob.fail ? " Lose your footing and you'll take a tumble." : ""} Agility ${tg.ob.req}.`;
    else if (tg.node) {
      const nt2 = NODE_TYPES[tg.node.type];
      exam = NODE_EXAMINE[tg.node.type] || (nt2 ? `${nt2.name}. (${nt2.skill} ${nt2.req})` : null);
    }
    if (exam) items.push({ label: `Examine ${targetName(tg)}`, fn: () => log(exam, "sys") });
  }
  // items lying on the tile: "Take All" first (so left-click grabs everything),
  // then a "Take <item>" line per stack — placed at the FRONT of the menu.
  if (groundHere.length) {
    const g0 = [];
    if (groundHere.length > 1)
      g0.push({ label: `Take All (${groundHere.length} items)`, fn: () => setGoal({ type: "pickupAll", x: t.x, y: t.y }, t.x, t.y, 1) });
    for (const g of groundHere) {
      const nm = (ITEMS[g.id] && ITEMS[g.id].name) || g.id;
      g0.push({ label: `Take ${nm}${g.qty > 1 ? ` (x${g.qty})` : ""}`, fn: () => setGoal({ type: "pickup", item: g }, g.x, g.y, 1) });
    }
    items.unshift(...g0);
  }
  // decorations aren't interactive targets, so they're not in targetsAt — offer
  // Take (pick it up; respawns after 300s) + Examine for whatever decoration
  // sits on this tile. Skipped while the decor is picked (hidden, awaiting return).
  if (world.getDecor && typeof decorExamine === "function") {
    const dk = world.getDecor(t.x, t.y);
    const picked = typeof decorPicked === "function" && decorPicked(t.x, t.y);
    if (dk && !picked) {
      if (typeof decorPickable === "function" && decorPickable(dk))
        items.push({ label: `Take ${decorName(dk)}`, fn: () => setGoal({ type: "decorPick", x: t.x, y: t.y, key: dk }, t.x, t.y, 1) });
      if (!items.some(it => it.label.startsWith("Examine "))) {
        const dex = decorExamine(dk);
        if (dex) items.push({ label: `Examine ${decorName(dk)}`, fn: () => log(dex, "sys") });
      }
    }
  }
  // village lamplighter candles aren't decor tiles (they're conjured per frame
  // from the candle-spot list, daynight.js), but they still Examine: a burning
  // stand in the street, or a household candle glowing indoors.
  if (typeof candleSpotAt === "function" && !items.some(it => it.label.startsWith("Examine "))) {
    const cs = candleSpotAt(t.x, t.y);
    if (cs) {
      const standName = { candlestand_iron: "wrought-iron", candlestand_wood: "turned-wood", candlestand_brass: "polished brass" }[cs.stand];
      const dex = cs.inside
        ? "A household candle burns within, its glow seeping out through shutters and thatch."
        : `A fine wax candle burns atop a ${standName || "sturdy"} stand — set out by the lamplighters at dusk and gathered in again at dawn.`;
      items.push({ label: `Examine ${cs.inside ? "candle" : "candle stand"}`, fn: () => log(dex, "sys") });
    }
  }
  items.push({ label: "Walk here", fn: () => walkTo(t.x, t.y) });
  return items;
}

// Callers (3):
//  gameplay/input.js:131 main/ui.js:77 storage.js:137
function showCtx(items, x, y) {
  ctxEl.innerHTML = "";
  const title = document.createElement("div");
  title.className = "ctxtitle";
  title.textContent = "Choose option";
  ctxEl.appendChild(title);
  for (const it of items) {
    const d = document.createElement("div");
    d.className = "ctxitem";
    d.textContent = it.label;
    d.onclick = () => { hideCtx(); it.fn(); };
    ctxEl.appendChild(d);
  }
  // fixed positioning in viewport coords: show first so offsetWidth/Height
  // are real, then clamp the menu fully on-screen at the pointer
  ctxEl.style.display = "block";
  const mw = ctxEl.offsetWidth || 180, mh = ctxEl.offsetHeight || items.length * 26 + 30;
  ctxEl.style.left = Math.max(0, Math.min(x, window.innerWidth - mw - 2)) + "px";
  ctxEl.style.top = Math.max(0, Math.min(y, window.innerHeight - mh - 2)) + "px";
}
// Callers (3):
//  gameplay/input.js:77,144,153
function hideCtx() { ctxEl.style.display = "none"; }
document.addEventListener("click", e => { if (!ctxEl.contains(e.target)) hideCtx(); });

window.addEventListener("keydown", e => {
  // typing in a text field (e.g. the bank search) must never move the player
  // or trigger hotkeys
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
  // option+C toggles cheat mode (checked before the plain-C character screen;
  // e.code because option+c types "ç" on mac keyboards)
  if (e.altKey && e.code === "KeyC") {
    CHEAT_MODE = !CHEAT_MODE;
    log(`Cheat mode ${CHEAT_MODE ? "ON" : "OFF"}.`, CHEAT_MODE ? "gold" : "sys");
    e.preventDefault();
    return;
  }
  if (e.code === "ShiftLeft") keys.ShiftLeft = true;
  // Left-Shift+S opens the Soaps comparison menu (gameplay/stink.js)
  if (e.code === "KeyS" && keys.ShiftLeft && typeof toggleSoapsMenu === "function") { toggleSoapsMenu(); e.preventDefault(); return; }
  if (e.key === "Escape" && typeof soapsMenuOpen === "function" && soapsMenuOpen()) { closeSoapsMenu(); return; }
  if (e.key === "m" || e.key === "M") { wm.open ? closeWorldMap() : openWorldMap(); return; }
  if (e.key === "c" || e.key === "C") { CharSelect.toggle(); return; }
  if (e.key === "Escape" && CharSelect.isOpen) { CharSelect.close(); return; }
  if (e.key === "Escape" && wm.open) { closeWorldMap(); return; }
  // retired prototype renderer: hold ←/→ to rotate the camera smoothly through 360°
  // (and ↑/↓ tilt it — handled in LC3D.frame). Fallback renderer keeps the
  // original 90°-step snaps.
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    if (typeof LC3D !== "undefined" && REN === LC3D) keys[e.key] = true;
    else if (!e.repeat) camStep = (camStep + (e.key === "ArrowRight" ? 1 : 3)) & 3;
    e.preventDefault();
    return;
  }
  if (["w", "a", "s", "d", "ArrowUp", "ArrowDown"].includes(e.key)) {
    keys[e.key] = true;
    e.preventDefault();
  }
  // Shift+WASD = combat footwork: back away without dropping the fight
  // (movement.js stepPlayer / combat.js tickCombat)
  if (e.key === "Shift") keys.Shift = true;
});
window.addEventListener("keyup", e => { keys[e.key] = false; if (e.code === "ShiftLeft") keys.ShiftLeft = false; });
