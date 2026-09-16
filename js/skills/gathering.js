// ===== Taiao — gathering skills =====
"use strict";

// Callers (1):
//  gameplay/pathing.js:67
function startGather(node) {
  const nt = NODE_TYPES[node.type];
  if (!node.alive) { log("It's been used up. Wait for it to return.", "warn"); return; }
  if (!hasTool(nt.tool)) {
    const tn = (typeof FISH_TOOL_NAME !== "undefined" && FISH_TOOL_NAME[nt.tool])
      || (nt.tool === "rod" ? "fishing rod" : nt.tool);
    log(`You need a ${tn} for that. The general store sells them.`, "warn");
    return;
  }
  if (skillLvl(nt.skill) < nt.req) {
    log(`You need ${nt.skill} level ${nt.req} for that.`, "warn");
    return;
  }
  player.act = { kind: "gather", node, nextAt: now + 400 };
  const verbs = { Woodcutting: "chop the tree", Mining: "mine the rock", "Ore-mining": "mine the rock",
    "Gem-mining": "work the gem vein", "Stone-mining": "cut the stone", Fishing: "fish", Foraging: "forage" };
  log(`You begin to ${verbs[nt.skill] || "work"}...`);
}

// Callers (1):
//  skills/gathering.js:43
function gatherItem(nt) {
  // each fishing spot is a specific fish — you always catch that one
  if (nt.skill === "Fishing" && nt.fish != null) return nt.item;
  if (nt.skill === "Foraging") {
    if (nt.item === "herb" && typeof HERBS !== "undefined") {
      const pool = HERBS.filter(h => h.req <= eff("Foraging"));
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)].id;
    }
    if (nt.item === "berries" && typeof FORAGE !== "undefined") {
      const pool = FORAGE.filter(f => f.req <= eff("Foraging"));
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)].id;
    }
  }
  // boulders / mossy boulders yield a stone type, gated by mining level (better
  // stone at higher levels — same pool as the ore/gem by-product)
  if (nt.stoneNode && typeof STONE_TIERS !== "undefined") {
    const lvl = eff("Stone-mining");   // stone quality is gated by Stone-mining
    const pool = STONE_TIERS.filter(s => s.req <= lvl && ITEMS[s.id]);
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)].id;
  }
  return nt.item;
}

// A "wild" resource node yields a BATCH of 5-10 resources before it depletes,
// then takes proportionally longer to respawn (user request 2026-09-15). This is
// every gather node that has a skill EXCEPT fishing spots — those already carry
// their own creation-time 5-10 catch counter (chunks.js). Applies EVERYWHERE,
// Tūhura Isle included (user: don't exempt the tutorial).
// Callers (2): tickGather (roll + respawn scale)
function wildNodeCharged(nt) {
  return !!(nt && nt.skill && nt.skill !== "Fishing");
}

// Callers (1):
//  gameplay/actions.js:10
function tickGather(act) {
  const node = act.node;
  const nt = NODE_TYPES[node.type];
  if (!nt || !node.alive) { player.act = null; return; }
  const item = gatherItem(nt);
  if (!addItem(item, 1)) { log("Your inventory is full.", "warn"); player.act = null; return; }
  // a stone item collected from mining (a boulder's yield, or the ore/gem
  // by-product below) trains Stone-mining; anything else trains the node's skill
  const sxp = typeof STONE_XP !== "undefined" ? STONE_XP[item] : undefined;
  if (sxp != null) addXp("Stone-mining", sxp);
  else addXp(nt.skill, item === nt.item ? nt.xp : Math.max(nt.xp, ITEMS[item].value * 3));
  log(`You get: ${ITEMS[item].name}.`);
  sfxGather(nt.skill);
  // gem by-product is folded into the tiered system: a rough gem, its tier
  // capped by your mining level (better miners turn up better stones)
  if (nt.gemCh && Math.random() < nt.gemCh) {
    const gemId = (typeof rollGemId === "function") ? rollGemId(skillLvl(nt.skill)) : "gem";
    if (addItem(gemId, 1)) log(`You also find a ${ITEMS[gemId].name.toLowerCase()}!`, "gold");
  }
  // mining ore or gems randomly turns up stone (Quarrying folded in) — the tier of
  // stone you can dig up is gated by your mining level, better stone at higher levels
  if (/mining$/.test(nt.skill) && typeof STONE_TIERS !== "undefined" && Math.random() < 0.3) {
    const lvl = skillLvl("Stone-mining");   // stone quality gated by Stone-mining
    const pool = STONE_TIERS.filter(s => s.req <= lvl && ITEMS[s.id]);
    if (pool.length) {
      const sid = pool[Math.floor(Math.random() * pool.length)].id;
      if (addItem(sid, 1)) {
        log(`You also dig up ${ITEMS[sid].name.toLowerCase()}.`, "sys");
        addXp("Stone-mining", (typeof STONE_XP !== "undefined" && STONE_XP[sid]) || 6);
      }
    }
  }
  // mossy boulders also yield moss every strike
  if (nt.moss && addItem("moss", 1)) log("You strip off some moss.", "sys");
  // Depletion. Fishing spots hold a fixed 5-10 catch counter (node.left set at
  // creation). Every other wild resource (trees, ore rocks, gem veins, boulders,
  // bushes, herbs, flowers — wildNodeCharged) rolls a 5-10 batch counter here on
  // the first strike (lazily, so already-generated chunks get it too). Either way
  // a depleted node goes dormant and returns after its respawn (see below).
  const charged = wildNodeCharged(nt);
  let deplete = false;
  if (charged && node.left == null) {
    node.leftMax = 5 + Math.floor(Math.random() * 6);   // 5-10 resources before depletion
    node.left = node.leftMax;
  }
  if (node.left != null) { node.left -= 1; if (node.left <= 0) deplete = true; }
  else if (nt.depleteCh && Math.random() < nt.depleteCh) deplete = true;
  // Tūhura Isle stage tasks (gameplay/tutorial.js REQS): trees felled,
  // whitebait netted — fires once per successful gather tick
  if (typeof Tutorial !== "undefined" && Tutorial.onGather) Tutorial.onGather(node, nt, item, deplete);
  if (deplete) {
    node.alive = false;
    // a charged node just gave leftMax resources this cycle, so its respawn
    // stretches proportionally (per-resource rate ≈ the old single-strike node).
    // Fishing spots + tutorial/probabilistic nodes keep their flat respawn.
    node.respawnAt = now + nt.respawn * (charged ? (node.leftMax || 1) : 1);
    if (nt.respawn) depletedNodes.push(node);
    player.act = null;
    return;
  }
  act.nextAt = now + nt.tick / (1 + bestToolPower(nt.tool) * 0.025 + gatherHelperBonus(nt.skill));
}

// A secondary FIELD tool carried in the pack (a mattock for digging, a sickle
// for reaping…) speeds the matching gather a little on top of the primary
// axe/pickaxe's power — giving those Toolmaking tools a real job. Bonus scales
// with the tool's tier (~13% up to ~30% faster with a master-tier field tool).
const GATHER_HELPERS = {
  Mining:         ["mattock", "shovel"],
  "Ore-mining":   ["mattock", "shovel"],
  "Gem-mining":   ["mattock"],
  "Stone-mining": ["crowbar", "mattock", "shovel"],
  Foraging:       ["sickle", "scythe", "rake"],
  Fishing:        ["fish_hook"], // a box of spare hooks rigs the line faster
};
function gatherHelperBonus(skill) {
  const list = GATHER_HELPERS[skill];
  if (!list || typeof countItem !== "function") return 0;
  let best = 0;
  for (const id of list) if (ITEMS[id] && countItem(id) > 0) best = Math.max(best, ITEMS[id].toolTier || 1);
  return best > 0 ? 0.12 + best * 0.01 : 0;
}
