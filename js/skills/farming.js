// ===== Isle of Emberfall — farming =====
"use strict";

// Callers (1):
//  gameplay/pathing.js:73
function useFarmPlot(node) {
  if (node.crop) {
    const crop = CROPS[node.crop.kind];
    const mature = now >= node.crop.plantedAt + crop.time;
    // Pomiculture fruit tree: pick fruit when ripe, then chop the bare tree for logs
    if (crop.tree) {
      if (!mature) { log("The fruit tree is still growing...", "sys"); return; }
      if (!node.crop.picked) {
        player.act = { kind: "harvest", node, nextAt: now + 1200 };
        log(`You begin to pick the ${crop.name}...`);
        return;
      }
      if (skillLvl("Woodcutting") < 1) { log("You need Woodcutting level 1 to fell this tree.", "warn"); return; }
      player.act = { kind: "chop", node, nextAt: now + 1400 };
      log("You begin to chop down the tree...");
      return;
    }
    if (!mature) {
      log(`The ${crop.name} ${crop.name.endsWith("s") ? "are" : "is"} still growing...`, "sys");
      return;
    }
    player.act = { kind: "harvest", node, nextAt: now + 1200 };
    log("You begin to harvest...");
    return;
  }
  // untilled soil must be broken with a hoe before it will take seed
  if (node.tilled === false) {
    if (typeof hasTool === "function" && !hasTool("hoe")) {
      log("You need a hoe to till this soil. The general store sells them.", "warn");
      return;
    }
    player.act = { kind: "till", node, nextAt: now + 900 };
    log("You begin to till the soil...");
    return;
  }
  openPlantPanel(node);
}
// Callers (1):
//  gameplay/actions.js
function tickTill(act) {
  const node = act.node;
  node.tilled = true;
  if (node.skill) addXp(node.skill, 6);
  if (world.persistAt) world.persistAt(node.x, node.y);
  log("You till the soil — it's ready for seeds.");
  player.act = null;
  uiDirty = true;
}
// Callers (1):
//  main/ui.js:277
function plantCrop(node, kind) {
  const crop = CROPS[kind];
  const sk = crop.skill || "Farming";
  // each field is dedicated to ONE agriculture skill; only its seeds take here
  if (node.skill && crop.skill && crop.skill !== node.skill) {
    log(`Only ${node.skill} crops grow in this field.`, "warn"); return;
  }
  if (node.tilled === false) { log("Till the soil with a hoe first.", "warn"); return; }
  if (skillLvl(sk) < crop.req) { log(`You need ${sk} level ${crop.req} for that.`, "warn"); return; }
  if (countItem(crop.seed) < 1) { log("You don't have the seeds.", "warn"); return; }
  removeItem(crop.seed, 1);
  node.crop = { kind, plantedAt: now };
  addXp(sk, crop.plantXp);
  if (world.persistAt) world.persistAt(node.x, node.y); // survive a refresh right after planting
  log(`You plant the ${ITEMS[crop.seed].name.toLowerCase()}.`);
}

// Callers (1):
//  gameplay/actions.js:14
function tickHarvest(act) {
  const node = act.node;
  if (!node.crop) { player.act = null; return; }
  const crop = CROPS[node.crop.kind];
  if (now < node.crop.plantedAt + crop.time) { player.act = null; return; }
  const qty = crop.yield[0] + Math.floor(Math.random() * (crop.yield[1] - crop.yield[0] + 1));
  if (!addItem(crop.item, qty)) { log("Your inventory is full.", "warn"); player.act = null; return; }
  addXp(crop.skill || "Farming", crop.xp);
  // self-seeding: a harvest returns a seed or two so farming is sustainable
  addItem(crop.seed, 1 + (Math.random() < 0.5 ? 1 : 0));
  if (crop.tree) {
    // fruit tree keeps standing (now bare); pick removes the fruit only. Record
    // when it was picked so it can be re-fruited with a watering can after the
    // standard tiered respawn time (waterFruitTree below).
    node.crop.picked = true;
    node.crop.pickedAt = now;
    log(`You pick the ${crop.name} — ${ITEMS[crop.item].name} x${qty}. The tree stands bare; water it later to regrow the fruit.`);
  } else {
    log(`You harvest: ${ITEMS[crop.item].name} x${qty}.`);
    node.crop = null;
  }
  if (world.persistAt) world.persistAt(node.x, node.y); // persist the harvested/bare state
  player.act = null;
}
// Callers (1):
//  gameplay/actions.js
// Fell a picked-bare fruit tree for logs (Woodcutting); the plot returns to
// tilled soil so a new fruit tree can be planted.
function tickChop(act) {
  const node = act.node;
  if (!node.crop) { player.act = null; return; }
  const q = 1 + (Math.random() < 0.6 ? 1 : 0);
  if (!addItem("logs", q)) { log("Your inventory is full.", "warn"); player.act = null; return; }
  addXp("Woodcutting", 25);
  log(`You chop down the fruit tree — ${q} logs.`);
  node.crop = null;   // back to tilled soil, ready to replant
  player.act = null;
}

// Callers (1): gameplay/pathing.js (executeGoal "farmWater")
// Water a picked-bare Pomiculture fruit tree to REGROW its fruit. Needs a
// watering can, and only works once the tree has rested for the standard tiered
// respawn time (data.js respawnFor). Re-fruits indefinitely until the tree is
// chopped down.
function waterFruitTree(node) {
  if (!node || !node.crop) { log("There's nothing here to water.", "warn"); return; }
  const crop = CROPS[node.crop.kind];
  if (!crop || !crop.tree) { log("There's nothing here to water.", "warn"); return; }
  if (!node.crop.picked) { log(`The ${crop.name} tree is already in fruit — harvest it first.`, "sys"); return; }
  if (typeof hasTool === "function" && !hasTool("watering_can")) {
    log("You need a watering can to tend the tree. The general store sells them.", "warn"); return;
  }
  const readyAt = (node.crop.pickedAt || 0) + respawnFor(crop.req);
  if (now < readyAt) {
    log(`The tree needs to rest before it can fruit again — about ${Math.ceil((readyAt - now) / 1000)}s.`, "sys");
    return;
  }
  // it's long past its original grow time, so clearing `picked` makes it ripe
  node.crop.picked = false;
  node.crop.pickedAt = 0;
  addXp(crop.skill || "Farming", Math.max(4, Math.round(crop.xp * 0.4)));
  if (world.persistAt) world.persistAt(node.x, node.y);
  log(`You water the tree — fresh ${crop.name} ripen on the branches.`);
}

// ---- watering can (Pomiculture re-fruiting tool) ----
(function () {
  if (typeof ITEMS === "undefined" || ITEMS.watering_can) return;
  if (typeof defineIcon === "function") defineIcon("i_watering_can", "i_vial", 905, " hue-rotate(120deg) saturate(0.55) brightness(0.95)");
  ITEMS.watering_can = { name: "Watering can", icon: "i_watering_can", value: 40, tool: "watering_can" };
  if (typeof EXAMINE !== "undefined") EXAMINE.watering_can = "A watering can — tend a picked fruit tree with it (once it's rested) to regrow the fruit.";
  if (typeof registerPlaceholder === "function") registerPlaceholder("watering_can", "Watering can", "tool — tinted vial-icon placeholder");
  if (typeof SHOP_STOCK !== "undefined" && SHOP_STOCK.indexOf("watering_can") < 0) SHOP_STOCK.push("watering_can");
})();
