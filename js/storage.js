// ===== Isle of Emberfall — localStorage save/load/reset and new-player setup =====
"use strict";

// ---------- save / load ----------
// Callers (5):
//  storage.js:20,44,66,117,132
const SAVE_KEY = "emberfall_save_v2";
// Callers (2):
//  storage.js:80,100
const OLD_KEY = "emberfall_save_v1";
let resetting = false; // doReset writes a modified save; don't clobber it on unload
let gameReady = false;  // guards against beforeunload/autosave firing before init() has loaded/created a player
// Slot names retired by the 30-slot anatomical equip redesign (2026-09) —
// "weapon"/"shield" survived unchanged so aren't here. A save written before
// that redesign can have an item sitting in one of these; validateEquip()
// below only knows about CURRENT EQUIP_SLOTS, so on its own it would just
// silently drop whatever's in a retired slot. recoverRetiredEquip() puts
// each one back on properly — into whatever slot(s) that SAME item now
// occupies under the new scheme (an old "chest" plate re-equips across
// torso+both shoulders+both arms, not just returned loose to the bag) —
// bypassing wieldReq/wearReq gates since the player already met them to
// have it equipped in the first place. If two retired items now both claim
// an overlapping slot (e.g. old "armor" and old "chest" both landing on
// "torso"), the later one in RETIRED_EQUIP_SLOTS order wins and the
// displaced item falls back to the inventory instead of being lost.
const RETIRED_EQUIP_SLOTS = ["armor", "helm", "chest", "legs", "boots", "amulet"];
// MIGRATION: the legacy Carpentry boat items (content.js: raft_logs, boat_coracle,
// ship_*, …) were superseded by the Shipwrighting vessels (log_raft, coracle, …),
// which are the placeable/rideable ones. Swap any stored occurrence to its
// equivalent so an old save's boat becomes launchable. skiff/canoe/sailboat/ship
// are shared ids and need no swap.
const BOAT_MIGRATE = {
  boat_coracle: "coracle", raft_logs: "log_raft", raft_planks: "punt",
  boat_dinghy: "dinghy", boat_dory: "dory", boat_catboat: "catboat",
  boat_barge: "barge", ship_smack: "fishing_smack", ship_cutter: "cutter",
  ship_dhow: "dhow", ship_schooner: "schooner", ship_longship: "longship",
  ship_junk: "junk", ship_caravel: "caravel", ship_brig: "brig",
  ship_brigantine: "brigantine", ship_galley: "galley", ship_barque: "barque",
  ship_carrack: "carrack", ship_clipper: "clipper", ship_frigate: "frigate",
  ship_galleon: "galleon", ship_manofwar: "man_o_war",
};
// Retired "giant_<item>" husbandry products (giant beasts now just yield 2x the
// ordinary item). Fold any legacy stacks back onto the base item on load.
const GIANT_MIGRATE = {};
for (const _g of ["egg", "milk", "fleece", "feathers", "hide", "honey", "beeswax", "scales"]) GIANT_MIGRATE["giant_" + _g] = _g;
// Deprecated items removed from the game, folded onto their current equivalent on load:
//  • the legacy generic farm seeds seed_1..31 (superseded by the per-skill
//    seed_<agri>_<i> system; their old CROPS.c_i were wiped by agriculture.js) → the
//    matching current crop's seed (mapped by crop name).
//  • rough_yarn / fine_yarn (old fillout placeholders, in no recipe) → wool_yarn.
const DEPRECATED_MIGRATE = {
  seed_1: "seed_olericulture_0", seed_2: "seed_olericulture_1", seed_3: "seed_olericulture_2",
  seed_4: "seed_olericulture_3", seed_5: "seed_fibriculture_0", seed_7: "seed_olericulture_0",
  seed_8: "seed_cerealiculture_1", seed_9: "seed_fibriculture_2", seed_10: "seed_cerealiculture_4",
  seed_11: "seed_olericulture_20", seed_12: "seed_fibriculture_3", seed_13: "seed_pomiculture_11",
  seed_14: "seed_cerealiculture_3", seed_15: "seed_fibriculture_4", seed_16: "seed_pomiculture_16",
  seed_17: "seed_cerealiculture_2", seed_18: "seed_fibriculture_5", seed_19: "seed_olericulture_23",
  seed_20: "seed_olericulture_7", seed_21: "seed_fibriculture_6", seed_22: "seed_olericulture_8",
  seed_23: "seed_olericulture_9", seed_24: "seed_fibriculture_7", seed_25: "seed_olericulture_25",
  seed_26: "seed_olericulture_27", seed_27: "seed_fibriculture_8", seed_28: "seed_pomiculture_27",
  seed_29: "seed_cerealiculture_21", seed_30: "seed_fibriculture_9", seed_31: "seed_pomiculture_16",
  rough_yarn: "wool_yarn", fine_yarn: "wool_yarn",
  // legacy generic starter gear/food → current tiered equivalents (removed from data.js)
  bronze_sword: "shortsword_iron", axe: "axe_iron", pickaxe: "pickaxe_iron", bread: "flatbread",
  // deprecated wheat/cotton/herb seeds (CROPS wiped) → matching current per-skill seed
  wheat_seeds: "seed_cerealiculture_0", cotton_seeds: "seed_fibriculture_0", herb_seeds: "seed_herbiculture_0",
  // rune essence (mined ore removed) → State Rune (the general monster-dropped raw rune;
  // split isn't 1:1, State covers the substances/modifiers most spells need).
  rune_essence: "state_rune",
  wooden_shield: "heater_bronze", // Wooden shield removed → Bronze Heater shield
  // generic "Leather armour" retired → the tiered leather-armour sets (one per
  // leather tier); fold the old stack onto the Boar-leather body (base tier).
  leather_body: "body_leather",
  // plain `gem` folded into the tiered system: it survives only as the recipe
  // family-head token; any gem HELD in an old save becomes a rough Quartz (the
  // base tier). All new gem loot rolls a tier via rollGemId.
  gem: "gem_0",
};
const migrateBoatId = id => {
  if (BOAT_MIGRATE[id] && ITEMS[BOAT_MIGRATE[id]]) return BOAT_MIGRATE[id];
  if (GIANT_MIGRATE[id] && ITEMS[GIANT_MIGRATE[id]]) return GIANT_MIGRATE[id];
  if (DEPRECATED_MIGRATE[id] && ITEMS[DEPRECATED_MIGRATE[id]]) return DEPRECATED_MIGRATE[id];
  return id;
};
// Callers (2):
//  storage.js:141,183
function recoverRetiredEquip(raw) {
  for (const slot of RETIRED_EQUIP_SLOTS) {
    const id = raw && raw[slot];
    if (!id || !ITEMS[id]) continue;
    const def = ITEMS[id];
    if (!def.equip) { addItem(id, 1); continue; } // no longer equippable at all — just hand it back
    // EQUIP_CHOICES pseudo-tags (ring/bracelet/anklet) resolve to whichever
    // slot is actually free at recovery time, same preference-order logic
    // as equipChoice() (gameplay/items.js) — a fixed array is a genuine
    // multi-slot span instead and always occupies every slot listed.
    const choice = EQUIP_CHOICES[def.equip];
    const slots = choice ? [choice.find(sl => !player.equip[sl]) || choice[0]]
      : Array.isArray(def.equip) ? def.equip : [def.equip];
    const oldIds = [...new Set(slots.map(sl => player.equip[sl]).filter(Boolean))];
    for (const oldId of oldIds) {
      if (Array.isArray(ITEMS[oldId].equip)) {
        for (const sl of ITEMS[oldId].equip) if (player.equip[sl] === oldId) player.equip[sl] = null;
      } else {
        for (const sl of slots) if (player.equip[sl] === oldId) player.equip[sl] = null;
      }
      addItem(oldId, 1);
    }
    for (const sl of slots) player.equip[sl] = id;
  }
}
// Rebuilds a full, validated 30-slot equip object from a saved (possibly
// partial/stale/old-format) `raw` object: every EQUIP_SLOTS key gets padded
// in (old saves simply lack slots added since they were written — same
// mechanism that already handled helm/chest/legs/boots arriving after the
// original 4 slots), then each value is re-validated against the CURRENT
// ITEMS table so a since-removed/renamed id can never reach the UI. Gear
// slots hold a bare item id; QUIVER_SLOTS (quiver, rune1..8) hold a
// {id,qty} stack instead — validated and clamped separately.
// Callers (3):
//  storage.js:130,161,192
function validateEquip(raw) {
  const out = {};
  for (const slot of EQUIP_SLOTS) {
    const v = (raw || {})[slot];
    if (QUIVER_SLOTS.has(slot)) {
      out[slot] = (v && typeof v === "object" && ITEMS[v.id] && v.qty > 0) ? { id: v.id, qty: v.qty } : null;
    } else {
      out[slot] = (v && ITEMS[v]) ? v : null;
    }
  }
  return out;
}
// Callers (2):
//  storage.js:20,25
function buildSaveData() {
  return {
    inf: true, // position uses infinite-world coordinates
    style: player.style, character: player.character, outfit: player.outfit,
    skills: player.skills, inv: player.inv, equip: player.equip, equipOrder: player.equipOrder,
    // bank networks: one vault per road-connected network (see ui.js openBank).
    // `bank` mirrors the main vault so a pre-network build can still read it.
    banks: player.banks || { main: player.bank || [] },
    bank: (player.banks && player.banks.main) || player.bank || [],
    // opened bank accounts: network id -> 1 (main-branch signup, ui.js)
    bankAccounts: player.bankAccounts || {},
    x: player.x, y: player.y, hp: player.hp, level: player.level | 0,
    seen: [...seenChunks],
    // production economy: recipe-family mastery, passive jobs, provenance registry
    mastery: player.mastery, jobs: player.jobs,
    prov: typeof provRegistry !== "undefined" ? provRegistry : {},
    provSeq: typeof provSeq !== "undefined" ? provSeq : 1,
    reputation: player.reputation | 0, contractsDone: player.contractsDone || [],
    portals: player.portals || {}, // attuned portal network: "x,y" -> name
    portalsFresh: true,            // set once the one-time portal-network reset has run (see load)
    kills: player.kills || {},     // bestiary: monster kind -> number slain
    unlocked: player.unlocked || {}, // opened door/gate locks: canonical "x,y" -> 1 (gameplay/locks.js)
    quests: player.quests || {},   // quest progress (gameplay/quests.js): active/done/flags/revealed
    stink: player.stink && player.stink.fl ? player.stink : { fl: {} }, // stink metre (gameplay/stink.js)
    // player-placed furniture & vessels (gameplay/placing.js)
    // persist only permanent placed objects (furniture/vessels); temporary
    // set-down decorations (entry.expireAt) are transient and not saved
    placed: typeof placed !== "undefined" ? placed.filter(e => e.expireAt == null) : [],
    // right-click "Take"-en decor still regrowing: [tileKey, wall-clock respawn-at]
    pickedDecor: typeof pickedDecor !== "undefined" ? [...pickedDecor] : [],
    // husbandry cooldowns keyed by an animal's spawn tile, so a tended animal
    // stays spent across a refresh (you can't reset recovery by reloading)
    husbCooldowns: typeof husbCooldowns !== "undefined" ? [...husbCooldowns] : [],
    // station pilot-fire heat: [tileKey, {peak,stokedAt,burnMs,tier}] — wall-clock
    // decay means a fire keeps cooling while the game is closed
    stationHeat: typeof stationHeat !== "undefined" ? [...stationHeat] : [],
  };
}
// Callers (4):
//  gameplay/world.js:35 main.js:30 storage.js:115,150
function saveGame() {
  if (resetting || !gameReady) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(buildSaveData())); } catch (e) {}
  // flush every loaded chunk's live node state (planted crops, depleted/respawning
  // nodes) to IDB so a refresh keeps them even before the chunk is evicted.
  try { if (world && world.flushChunks) world.flushChunks(); } catch (e) {}
}

// ---------- save file export / import (real files on disk, independent of browser storage) ----------
// Callers (1):
//  storage.js:47
function exportSave() {
  const data = buildSaveData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `emberfall-save-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  log("Save exported to your downloads.", "sys");
}
// Callers (1):
//  storage.js:54
function importSaveFromText(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { alert("That file isn't a valid save (bad JSON)."); return; }
  if (!d || typeof d !== "object" || !d.skills || !d.inv) { alert("That file doesn't look like an Isle of Emberfall save."); return; }
  if (!confirm("Load this save? Your current in-browser character will be overwritten.")) return;
  resetting = true; // prevent beforeunload autosave from clobbering the imported data before reload
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) { alert("Couldn't write the save to browser storage: " + e.message); resetting = false; return; }
  location.reload();
}
document.getElementById("exportbtn").onclick = e => { e.stopPropagation(); exportSave(); };
document.getElementById("importbtn").onclick = e => { e.stopPropagation(); document.getElementById("importfile").click(); };
document.getElementById("importfile").onchange = e => {
  const file = e.target.files[0];
  e.target.value = ""; // allow re-selecting the same file later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importSaveFromText(reader.result);
  reader.onerror = () => alert("Couldn't read that file.");
  reader.readAsText(file);
};
// Callers (4):
//  storage.js:69,83,122,154
function freshSkills() {
  const s = {};
  for (const k of SKILLS) s[k] = 0;
  return s;
}
// Callers (1):
//  main.js:5
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      // swap any legacy Carpentry boat id (inventory, bank, or placed-on-water)
      // to its Shipwrighting equivalent before the id-validity filters below
      if (Array.isArray(d.inv)) for (const it of d.inv) if (it && it.id) it.id = migrateBoatId(it.id);
      if (Array.isArray(d.bank)) for (const it of d.bank) if (it && it.id) it.id = migrateBoatId(it.id);
      if (d.banks && typeof d.banks === "object")
        for (const k in d.banks) if (Array.isArray(d.banks[k]))
          for (const it of d.banks[k]) if (it && it.id) it.id = migrateBoatId(it.id);
      if (Array.isArray(d.placed)) for (const p of d.placed) if (p && p.id) p.id = migrateBoatId(p.id);
      // also migrate EQUIPPED legacy ids (e.g. an equipped bronze_sword → shortsword_iron)
      // before validateEquip/recoverRetiredEquip run, so they aren't dropped as unknown
      if (d.equip && typeof d.equip === "object") for (const sl in d.equip) {
        const v = d.equip[sl];
        if (typeof v === "string") d.equip[sl] = migrateBoatId(v);
        else if (v && typeof v === "object" && v.id) v.id = migrateBoatId(v.id);
      }
      // MIGRATION: freshSkills() seeds every skill in the (now larger, dynamic)
      // SKILLS list at 0, then spreads the saved XP over it — so newly-added
      // professions (Sawing, Malting, Brewing, Coopering, Baking, …) simply
      // appear at level 0 while ALL legacy broad-skill XP (Crafting, Textiles,
      // Carpentry, Cooking, Milling…) is preserved untouched. No skill id is
      // ever dropped, so old characters keep every bit of progress.
      player.skills = { ...freshSkills(), ...d.skills };
      // MIGRATION: the split-parent skills were removed — carry their old XP into
      // a successor so returning players keep their levels, then drop the orphans.
      for (const [old, succ] of [["Mining", "Ore-mining"], ["Farming", "Cerealiculture"], ["Textiles", "Weaving"], ["Crafting", "Leatherworking"], ["Accuracy", "Melee"], ["Butchering", "Tanning"]]) {
        const xp = d.skills && d.skills[old];
        if (xp && !player.skills[succ]) player.skills[succ] = xp;
        delete player.skills[old];
      }
      // Smithing was SPLIT into Weaponsmithing + Armoursmithing — both inherit
      // its old XP so a returning smith keeps their level in each new trade.
      if (d.skills && d.skills.Smithing) {
        const sx = d.skills.Smithing;
        if (!player.skills.Weaponsmithing) player.skills.Weaponsmithing = sx;
        if (!player.skills.Armoursmithing) player.skills.Armoursmithing = sx;
        delete player.skills.Smithing;
      }
      // Thieving was removed entirely (folded into no successor) — drop its XP.
      delete player.skills.Thieving;
      // Quarrying was folded into Ore-mining (which may already hold XP) — keep the higher.
      if (d.skills && d.skills.Quarrying) {
        player.skills["Ore-mining"] = Math.max(player.skills["Ore-mining"] || 0, d.skills.Quarrying);
        delete player.skills.Quarrying;
      }
      player.mastery = d.mastery || {};
      player.jobs = Array.isArray(d.jobs) ? d.jobs : [];
      player.kills = (d.kills && typeof d.kills === "object") ? d.kills : {};
      player.unlocked = (d.unlocked && typeof d.unlocked === "object") ? d.unlocked : {};
      player.quests = (d.quests && typeof d.quests === "object") ? d.quests : {};
      player.stink = (d.stink && d.stink.fl && typeof d.stink.fl === "object") ? d.stink : { fl: {} };
      player.reputation = d.reputation | 0;
      player.contractsDone = Array.isArray(d.contractsDone) ? d.contractsDone : [];
      player.portals = (d.portals && typeof d.portals === "object") ? d.portals : {};
      // ONE-TIME MIGRATION: wipe any pre-existing portal network so the "you can
      // only travel to portals you've ATTUNED" rule starts fresh. Runs once per
      // save — the portalsFresh flag is written on the next save so it won't
      // clear again (and newly-attuned portals from here on persist normally).
      if (!d.portalsFresh) player.portals = {};
      // placed furniture & vessels: drop entries whose item id no longer exists
      if (typeof placed !== "undefined") {
        placed = Array.isArray(d.placed)
          ? d.placed.filter(p => p && ITEMS[p.id] && Number.isFinite(p.x) && Number.isFinite(p.y))
          : [];
        // saved mid-ride: remount the vessel under the player's feet so they
        // don't wake up treading water beside their own boat
        ridingIdx = placed.findIndex(p => ITEMS[p.id].ride && p.x === d.x && p.y === d.y);
      }
      // regrowing picked decor + husbandry cooldowns (wall-clock, so they keep
      // ticking down while the game is closed) — restore the Maps from the save
      if (typeof pickedDecor !== "undefined" && Array.isArray(d.pickedDecor)) pickedDecor = new Map(d.pickedDecor);
      if (typeof husbCooldowns !== "undefined" && Array.isArray(d.husbCooldowns)) husbCooldowns = new Map(d.husbCooldowns);
      if (typeof stationHeat !== "undefined" && Array.isArray(d.stationHeat)) stationHeat = new Map(d.stationHeat);
      if (d.prov && typeof provRegistry !== "undefined") provRegistry = d.prov;
      if (d.provSeq && typeof provSeq !== "undefined") provSeq = d.provSeq;
      // MIGRATION: item ids occasionally get restructured (e.g. geartiers.js's
      // tiered-gear scheme changed under a save made against the old one) —
      // drop any inv/bank/equip reference to an id that no longer exists so a
      // stale item can never reach renderInv()/renderSkills() and crash the UI.
      player.inv = (d.inv || []).map(x => x && ITEMS[x.id] ? x : null);
      while (player.inv.length < 48) player.inv.push(null); // packs grew 24 → 32 → 48 (6×8) slots
      player.equip = validateEquip(d.equip);
      recoverRetiredEquip(d.equip);
      player.equipOrder = Array.isArray(d.equipOrder) ? d.equipOrder.slice() : [];
      // bank networks: load every network's vault (old saves have only `bank`,
      // which becomes the mainland network's vault)
      const rawBanks = (d.banks && typeof d.banks === "object") ? d.banks : { main: d.bank || [] };
      player.banks = {};
      for (const k in rawBanks) player.banks[k] = (rawBanks[k] || []).filter(x => x && ITEMS[x.id]);
      if (!player.banks.main) player.banks.main = [];
      player.bank = player.banks.main;
      // bank accounts (main-branch signup — see ui.js). A save from before
      // accounts existed is ported INTO the Bank of Newhaven: every regional
      // vault folds into the main vault, a main account is opened free of
      // charge, and every other network starts unopened.
      if (d.bankAccounts && typeof d.bankAccounts === "object") {
        player.bankAccounts = { ...d.bankAccounts };
      } else {
        const main = player.banks.main;
        for (const k in player.banks) {
          if (k === "main") continue;
          for (const s of player.banks[k]) {
            const b = main.find(x => x.id === s.id);
            if (b) b.qty += s.qty; else main.push({ id: s.id, qty: s.qty });
          }
        }
        player.banks = { main };
        player.bank = main;
        player.bankAccounts = { main: 1 };
      }
      player.style = d.style || "melee";
      player.character = (d.character == null ? null : d.character);
      player.outfit = d.outfit || "Idle";
      player.x = d.x; player.y = d.y; player.hp = d.hp;
      player.level = d.level | 0;
      for (const k of d.seen || []) seenChunks.add(k);
      // saves from the finite-island era: coordinates don't map to the new
      // infinite world — keep progress, respawn in town
      return { pos: !!d.inf };
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const d = JSON.parse(old);
      const s = freshSkills();
      const o = d.skills || {};
      s.Melee = o.Attack || 0;
      s.Strength = o.Attack || 0;
      s.Health = o.Hitpoints || 0;
      s.Woodcutting = o.Woodcutting || 0;
      s["Ore-mining"] = o.Mining || 0;
      s.Fishing = o.Fishing || 0;
      s.Cooking = o.Cooking || 0;
      s.Weaponsmithing = o.Smithing || 0;
      s.Armoursmithing = o.Smithing || 0;
      s.Smelting = o.Smelting || o.Smithing || 0;
      player.skills = s;
      player.inv = (d.inv || []).map(x => x && ITEMS[x.id] ? x : null);
      while (player.inv.length < 32) player.inv.push(null);
      player.equip = validateEquip(d.equip);
      recoverRetiredEquip(d.equip);
      player.equipOrder = Array.isArray(d.equipOrder) ? d.equipOrder.slice() : [];
      player.bank = (d.bank || []).filter(x => ITEMS[x.id]);
      player.banks = { main: player.bank };
      player.bankAccounts = { main: 1 }; // ported straight into the Bank of Newhaven
      player.hp = Math.min(d.hp || 10, 10 + 3 * (levelFromXp(s.Health) - 1));
      localStorage.removeItem(OLD_KEY);
      log("Your save was upgraded to the new skill system!", "gold");
      return { pos: false };
    }
  } catch (e) {}
  return null;
}
// Bank-network vault re-keying — called from main.js init AFTER genWorld
// (the road graph must exist). The network edge rules changed (chunk v43:
// banks span the WHOLE road web, no trunk/sea-deck cutoffs), so a save can
// hold vaults/accounts keyed by regional ids ("roadnet:cx,cy") that no
// longer name a component: recompute each id's cell and fold the vault +
// account onto the network it resolves to today (usually "main").
// Callers (1):
//  main.js:23
function migrateBankNets() {
  if (!player.banks || typeof world === "undefined" || !world || !world.roadNetId) return;
  for (const k of Object.keys(player.banks)) {
    const m = /^roadnet:(-?\d+),(-?\d+)$/.exec(k);
    if (!m) continue;
    const now = world.roadNetId(+m[1], +m[2]);
    if (!now || now === k) continue;
    const dst = player.banks[now] || (player.banks[now] = []);
    for (const s of player.banks[k]) {
      const b = dst.find(x => x.id === s.id);
      if (b) b.qty += s.qty; else dst.push({ id: s.id, qty: s.qty });
    }
    delete player.banks[k];
    if (player.bankAccounts && player.bankAccounts[k]) {
      player.bankAccounts[now] = 1;
      delete player.bankAccounts[k];
    }
  }
  player.bank = player.banks.main;
}
// starter kit as raw save data (mirrors newPlayer)
// Callers (1):
//  storage.js:123
function starterInv() {
  const inv = new Array(32).fill(null);
  [["coins", 40], ["flatbread", 3], ["axe_iron", 1], ["pickaxe_iron", 1], ["fishing_rod", 1], ["shortsword_iron", 1]]
    .forEach(([id, qty], i) => { inv[i] = { id, qty }; });
  return inv;
}
// Callers (4):
//  storage.js:7,139,142,145
function doReset(resetMap, resetChar) {
  saveGame();
  resetting = true;
  const d = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (resetMap) {
    d.seen = [];
  }
  if (resetChar) {
    d.skills = freshSkills();
    d.inv = starterInv();
    d.equip = validateEquip(null);
    d.bank = [];
    d.banks = { main: [] };
    d.bankAccounts = {}; // a fresh character signs up at a main branch again
    d.hp = 10;
    d.style = "melee";
    d.mastery = {}; d.jobs = []; d.prov = {}; d.provSeq = 1;
    d.kills = {};
    d.reputation = 0; d.contractsDone = [];
  }
  // either way you wake up in the starting village
  d.x = world.playerStart.x;
  d.y = world.playerStart.y;
  localStorage.setItem(SAVE_KEY, JSON.stringify(d));
  location.reload();
}
document.getElementById("resetbtn").onclick = e => {
  e.stopPropagation(); // the document click-away handler would instantly close the menu
  showCtx([
    { label: "Reset exploration (return to Newhaven)", fn: () => {
      if (confirm("Clear your explored map and return to Newhaven? Your character is kept.")) doReset(true, false);
    }},
    { label: "Reset character (keep world)", fn: () => {
      if (confirm("Reset your character? Levels return to default and your inventory and bank are cleared. The world is kept.")) doReset(false, true);
    }},
    { label: "Reset both (fresh start)", fn: () => {
      if (confirm("Completely fresh start? Your character and explored map are reset.")) doReset(true, true);
    }},
    { label: "Cancel", fn: () => {} },
  ], e.clientX, e.clientY);
};
window.addEventListener("beforeunload", saveGame);

// ---------- init ----------
// Callers (2):
//  main.js:9 storage.js:107
function newPlayer() {
  player.skills = freshSkills();
  player.hp = 10;
  addItem("coins", 40);
  addItem("flatbread", 3);
  addItem("axe_iron", 1);
  addItem("pickaxe_iron", 1);
  addItem("fishing_rod", 1);
  addItem("shortsword_iron", 1);
}
