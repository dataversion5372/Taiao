// ===== Taiao — farming =====
"use strict";

// Crops follow the wild-resource batch model (user request 2026-09-15): planting
// costs 5 seeds, a mature plot yields 5-10 crops, each harvested crop has a 0.6
// chance to also drop a seed back, and crops grow CROP_GROW_MULT× longer to match
// the bigger harvest. cropGrowMs is the SINGLE source of a crop's true grow time —
// the maturity checks here AND render3d's growth-stage art both read it, so the
// on-screen stages stay in sync with when the crop is actually harvestable.
const CROP_GROW_MULT = 3;
const CROP_SEED_COST = 5;              // seeds to plant one plot
const CROP_YIELD = [5, 10];            // harvest count per mature plot
const CROP_SEED_RETURN = 0.6;          // chance PER harvested crop to also drop a seed
const CROP_HARVEST_TICK = 1200;        // ms per crop — harvested ONE at a time, like a tree/rock
function cropGrowMs(crop) { return ((crop && crop.time) || 0) * CROP_GROW_MULT; }

// Callers (1):
//  gameplay/pathing.js:73
function useFarmPlot(node) {
  if (node.crop) {
    const crop = CROPS[node.crop.kind];
    const mature = now >= node.crop.plantedAt + cropGrowMs(crop);
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
  addXp("Farming", 6);   // tilling trains the single Farming skill (node.skill is the field's crop CATEGORY, not a skill)
  if (world.persistAt) world.persistAt(node.x, node.y);
  log("You till the soil — it's ready for seeds.");
  player.act = null;
  uiDirty = true;
}
// Callers (1):
//  main/ui.js:277
function plantCrop(node, kind) {
  const crop = CROPS[kind];
  const sk = crop.skill || "Farming";   // one Farming skill trains ALL crops now
  // each field grows ONE CATEGORY of crop (its soil type, node.skill); the five
  // categories (Cerealiculture/Olericulture/… — no longer separate skills, just
  // crop groups) still restrict which seeds take in which soil.
  if (node.skill && crop.cat && crop.cat !== node.skill) {
    log(`Only ${node.skill} crops grow in this field.`, "warn"); return;
  }
  if (node.tilled === false) { log("Till the soil with a hoe first.", "warn"); return; }
  if (skillLvl(sk) < crop.req) { log(`You need ${sk} level ${crop.req} for that.`, "warn"); return; }
  if (countItem(crop.seed) < CROP_SEED_COST) { log(`You need ${CROP_SEED_COST} ${ITEMS[crop.seed].name.toLowerCase()} to sow this plot.`, "warn"); return; }
  removeItem(crop.seed, CROP_SEED_COST);
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
  if (now < node.crop.plantedAt + cropGrowMs(crop)) { player.act = null; return; }
  // A mature plot yields 5-10 crops harvested ONE AT A TIME — like felling a tree
  // or mining a rock. Roll the batch on the first pull, then take one per tick.
  if (node.crop.left == null)
    node.crop.left = CROP_YIELD[0] + Math.floor(Math.random() * (CROP_YIELD[1] - CROP_YIELD[0] + 1));
  if (!addItem(crop.item, 1)) { log("Your inventory is full.", "warn"); player.act = null; return; }
  addXp(crop.skill || "Farming", crop.xp);
  if (typeof Tutorial !== "undefined" && Tutorial.onHarvest) Tutorial.onHarvest(node.crop.kind, crop.item, 1);
  if (Math.random() < CROP_SEED_RETURN) addItem(crop.seed, 1); // per-crop self-seeding
  node.crop.left -= 1;
  log(`You harvest: ${ITEMS[crop.item].name}.`);
  if (node.crop.left > 0) {                       // more crops on the plot — keep going
    if (world.persistAt) world.persistAt(node.x, node.y);
    act.nextAt = now + CROP_HARVEST_TICK;
    return;
  }
  // plot exhausted
  if (crop.tree) {
    // fruit tree keeps standing (now bare); re-fruit it with a watering can later
    // (waterFruitTree). left cleared so a regrown tree rolls a fresh batch.
    node.crop.picked = true; node.crop.pickedAt = now; node.crop.left = null;
    log("The tree stands bare — water it later to regrow the fruit.");
  } else node.crop = null;
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
