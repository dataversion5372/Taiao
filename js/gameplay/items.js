// ===== Isle of Emberfall — ground items, consuming, and equipment =====
"use strict";

// The equipment panel shows worn items in the order they were equipped
// (state.js player.equipOrder holds their primary-slot keys). These keep that
// order in sync as gear goes on/off; renderInv() also reconciles it to reality.
function equipOrderTouch(key) {
  if (!player.equipOrder) player.equipOrder = [];
  const a = player.equipOrder, i = a.indexOf(key);
  if (i >= 0) a.splice(i, 1);
  a.push(key); // most-recently equipped goes last
}
function equipOrderDrop(key) {
  if (!player.equipOrder) return;
  const i = player.equipOrder.indexOf(key);
  if (i >= 0) player.equipOrder.splice(i, 1);
}

// Callers (1):
//  gameplay/pathing.js:71
function pickUp(item) {
  if (!groundItems.includes(item)) return;
  if (!addItem(item.id, item.qty)) { log("Your inventory is full.", "warn"); return; }
  groundItems.splice(groundItems.indexOf(item), 1);
  sfx(item.id === "coins" ? "coins" : "pickup", 0.6);
  log(`You pick up: ${ITEMS[item.id].name}${item.qty > 1 ? " x" + item.qty : ""}.`);
}
// Take every item stacked on a tile in one go (from the "Take All" menu entry).
// Callers (1):
//  gameplay/pathing.js
function pickUpAll(x, y) {
  const lv = player.level | 0;
  const here = groundItems.filter(g => g.x === x && g.y === y && (g.level | 0) === lv);
  let took = 0;
  for (const it of here) {
    if (!groundItems.includes(it)) continue;
    if (!addItem(it.id, it.qty)) { log("Your inventory is full.", "warn"); break; }
    groundItems.splice(groundItems.indexOf(it), 1);
    took++;
  }
  if (took) { sfx("pickup", 0.6); log(`You gather up ${took} item${took > 1 ? "s" : ""} from the ground.`); }
}
// Callers (2):
//  main/ui.js:73 skills/combat.js:89
function dropOnGround(id, qty, x, y, level) {
  const lv = level | 0;   // monsters drop at ground level; the player drops on their storey
  const ex = groundItems.find(g => g.x === x && g.y === y && (g.level | 0) === lv && g.id === id && ITEMS[id].stack);
  if (ex) ex.qty += qty;
  else groundItems.push({ id, qty, x, y, level: lv, expireAt: now + 90000 });
}

// Callers (3):
//  main/ui.js:58,67,68
function eatItem(i) {
  const s = player.inv[i];
  if (!s) return;
  const def = ITEMS[s.id];
  if (def.potion) {
    const p = def.potion;
    if (p.heal) {
      if (player.hp >= maxHp()) { log("You're already at full health."); return; }
      player.hp = Math.min(maxHp(), player.hp + p.heal);
      log(`You drink the ${def.name.toLowerCase()}. It restores ${p.heal} HP.`);
    } else if (p.buff) {
      for (const sk of p.buff) player.buffs[sk] = { amt: p.amt, until: now + p.dur };
      log(`You drink the ${def.name.toLowerCase()}. You feel stronger!`, "sys");
      addFloat(`+${p.amt} ${p.buff.join("/")}`, player.px, player.py - 40, "#7fd4ff", 14);
    }
    s.qty -= 1;
    if (s.qty <= 0) player.inv[i] = null;
    sfx("drink", 0.7);
    uiDirty = true;
    return;
  }
  // plain food: heals, and (for crafted artisan food) may leave you WELL FED
  // (faster HP regen for a while — Cheesemaking/Baking) or, for a drink, grant a
  // timed skill buff (Brewing ales/wines). Buff foods are edible even at full HP.
  const hasExtra = def.wellFed || def.drinkBuff;
  if (!def.heals && !hasExtra) return;
  if (player.hp >= maxHp() && def.heals && !hasExtra) { log("You're already at full health."); return; }
  const healed = def.heals ? Math.min(def.heals, maxHp() - player.hp) : 0;
  if (healed > 0) player.hp += healed;
  if (def.wellFed) player.wellFedUntil = Math.max(player.wellFedUntil || 0, now + def.wellFed);
  if (def.drinkBuff) player.buffs[def.drinkBuff.skill] = { amt: def.drinkBuff.amt, until: now + def.drinkBuff.dur };
  s.qty -= 1;
  if (s.qty <= 0) player.inv[i] = null;
  sfx(def.drinkBuff ? "drink" : "eat", 0.7);
  if (def.drinkBuff) {
    log(`You drink the ${def.name.toLowerCase()}.${healed ? ` (+${healed} HP)` : ""} You feel your ${def.drinkBuff.skill.toLowerCase()} surge.`, "sys");
    addFloat(`+${def.drinkBuff.amt} ${def.drinkBuff.skill}`, player.px, player.py - 40, "#7fd4ff", 14);
  } else {
    log(`You eat the ${def.name.toLowerCase()}.${healed ? ` It heals ${healed} HP.` : ""}${def.wellFed ? " You feel well fed." : ""}`);
    if (def.wellFed) addFloat("Well fed", player.px, player.py - 40, "#ffd75e", 13);
  }
  uiDirty = true;
}
// Arrows (equip:"quiver") and runes (equip:"rune" — any of the 8 identical
// rune-pouch slots, not a literal slot name) deposit a whole stack instead
// of swapping a single gear item. Prefers a slot already holding the same
// id (merge), else the first empty candidate, else swaps out slot 0's
// contents (mirrors ordinary gear-swap: the displaced stack goes back to
// the inventory, same as an old weapon would).
// Callers (1):
//  gameplay/items.js:74
function depositStack(i) {
  const s = player.inv[i];
  const def = ITEMS[s.id];
  const isRune = def.equip === "rune";
  const candidates = isRune ? RUNE_SLOTS : ["quiver"];
  let target = candidates.find(sl => player.equip[sl] && player.equip[sl].id === s.id);
  if (!target) target = candidates.find(sl => !player.equip[sl]);
  if (!target) {
    target = candidates[0];
    const old = player.equip[target];
    if (old && !addItem(old.id, old.qty)) { log("Your inventory is full.", "warn"); return; }
  }
  const moveQty = s.qty;
  if (player.equip[target] && player.equip[target].id === s.id) player.equip[target].qty += moveQty;
  else player.equip[target] = { id: s.id, qty: moveQty };
  equipOrderTouch(target);
  player.inv[i] = null;
  log(`You load ${moveQty} ${def.name.toLowerCase()}${moveQty > 1 ? "s" : ""} into your ${isRune ? "rune pouch" : "quiver"}.`);
  uiDirty = true;
}
// Rings/bracelets/anklets (EQUIP_CHOICES, state.js) occupy exactly ONE of
// their candidate slots — never several at once, unlike a multi-slot
// span — so this is ordinary single-slot gear-swap logic, just with the
// target slot resolved from a preference list instead of being fixed.
// Callers (1):
//  gameplay/items.js:90
function equipChoice(i, candidates) {
  const s = player.inv[i];
  const def = ITEMS[s.id];
  let slot = candidates.find(sl => !player.equip[sl]);
  if (!slot) slot = candidates[0]; // all taken — bump whatever's in the default (first/"right") slot
  const old = player.equip[slot];
  if (s.qty > 1) s.qty -= 1;
  else player.inv[i] = null;
  player.equip[slot] = s.id;
  equipOrderTouch(slot);
  if (old) addItem(old, 1);
  sfx("equip", 0.6);
  log(`You equip the ${def.name.toLowerCase()}.`);
  uiDirty = true;
}
// Callers (2):
//  main/ui.js:59,69
function equipItem(i) {
  const s = player.inv[i];
  if (!s) return;
  const def = ITEMS[s.id];
  if (!def.equip) return;
  if (def.equip === "rune" || def.equip === "quiver") { depositStack(i); return; }
  if (EQUIP_CHOICES[def.equip]) { equipChoice(i, EQUIP_CHOICES[def.equip]); return; }
  // tiered gear gates: melee weapons need the Melee level of their tier,
  // armour (incl. shields) the matching Defence level
  if (def.wieldReq && skillLvl("Melee") < def.wieldReq) {
    log(`You need Melee level ${def.wieldReq} to wield the ${def.name.toLowerCase()}.`, "warn");
    return;
  }
  if (def.wearReq && skillLvl("Defence") < def.wearReq) {
    log(`You need Defence level ${def.wearReq} to wear the ${def.name.toLowerCase()}.`, "warn");
    return;
  }
  if (def.rangeReq && skillLvl("Archery") < def.rangeReq) {
    log(`You need Archery level ${def.rangeReq} to wield the ${def.name.toLowerCase()}.`, "warn");
    return;
  }
  if (def.magicReq && skillLvl("Magic") < def.magicReq) {
    log(`You need Magic level ${def.magicReq} to wield the ${def.name.toLowerCase()}.`, "warn");
    return;
  }
  let slots = Array.isArray(def.equip) ? def.equip : [def.equip];
  // an offhand-capable blade (a dagger) backs up a wielded bow, wand or
  // staff from the shield slot — the sidearm for enemies that close to
  // melee (combat.js playerAttack switches to it automatically at range <= 1)
  const mw = player.equip.weapon && ITEMS[player.equip.weapon];
  if (def.offhand && mw && (mw.bowPower || mw.magicPower)) slots = ["shield"];
  // A multi-slot item can displace several different items at once (e.g. a
  // full chestplate bumping separately-worn bracers AND a torso garment).
  // Fully unequip every distinct item touching any target slot before
  // placing the new item. Only ARRAY equip values name a fixed slot list to
  // clear in full (a genuine multi-slot span); a plain string equip value
  // might be a CHOICE pseudo-tag ("ring") rather than a literal slot name,
  // so for those just clear wherever within THIS item's own target `slots`
  // it actually sits — it only ever occupies one slot at a time anyway.
  const oldIds = [...new Set(slots.map(sl => player.equip[sl]).filter(Boolean))];
  for (const oldId of oldIds) {
    if (Array.isArray(ITEMS[oldId].equip)) {
      for (const sl of ITEMS[oldId].equip) if (player.equip[sl] === oldId) player.equip[sl] = null;
    } else {
      for (const sl of slots) if (player.equip[sl] === oldId) player.equip[sl] = null;
    }
  }
  if (s.qty > 1) s.qty -= 1;
  else player.inv[i] = null;
  for (const sl of slots) player.equip[sl] = s.id;
  equipOrderTouch(slots[0]); // primary slot represents this item in the panel
  for (const oldId of oldIds) addItem(oldId, 1);
  sfx("equip", 0.6);
  log(`You equip the ${def.name.toLowerCase()}.`);
  uiDirty = true;
}
// Callers (2):
//  main/ui.js:91,93
function unequip(slot) {
  const val = player.equip[slot];
  if (!val) return;
  if (QUIVER_SLOTS.has(slot)) {
    if (!addItem(val.id, val.qty)) { log("Your inventory is full.", "warn"); return; }
    player.equip[slot] = null;
    equipOrderDrop(slot);
    uiDirty = true;
    return;
  }
  const def = ITEMS[val];
  if (!addItem(val, 1)) { log("Your inventory is full.", "warn"); return; }
  // Only an ARRAY equip value spans multiple real slots that all need
  // clearing; a plain string is either a genuine single slot (which IS the
  // clicked `slot`) or a CHOICE pseudo-tag ("ring" etc, not a literal slot
  // name at all) — either way clearing just the clicked slot is correct.
  if (Array.isArray(def.equip)) {
    for (const sl of def.equip) if (player.equip[sl] === val) player.equip[sl] = null;
  } else {
    player.equip[slot] = null;
  }
  equipOrderDrop(slot);
  uiDirty = true;
}
