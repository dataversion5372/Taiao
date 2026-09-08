// ===== Isle of Emberfall — markets, NPC demand & contracts =====
// Turns the deep production graph into a living economy. Every settlement has an
// economic PROFILE derived from its biome (port / farm / mine / forest / city);
// each profile DEMANDS some kinds of goods (paying a premium to buy them from
// you) and has a SURPLUS of others (selling those cheaply). NPC traders also
// post CONTRACTS — "deliver 20 barrels", "the port needs 40 rope" — that pay
// coins and REPUTATION, which in turn lifts the prices you're offered.
//
// Goods are tagged by the trade that makes them, so a barrel reads as "cordage/
// wood", a cheese as "food", a crown as "luxury". Loaded after leathercraft.js
// (needs every recipe defined to tag items and stock contracts).
"use strict";

// ---------- item tagging (by producing trade) ----------
const MARKET_SKILL_TAG = {
  Shipwrighting: "ship", Sailmaking: "ship", Ropemaking: "cordage",
  Jewelry: "luxury", Assaying: "luxury", "Wire-drawing": "metal",
  Toolmaking: "tool", Locksmithing: "craft", Papermaking: "craft", Bookbinding: "luxury",
  Candlemaking: "craft", Soapmaking: "craft",
  Weaponsmithing: "metal", Armoursmithing: "metal", Smelting: "metal", Milling: "food", Malting: "food",
  Brewing: "drink", Baking: "food", Cooking: "food", Cheesemaking: "food",
  Husbandry: "food", Farming: "food",
  Spinning: "textile", Dyeing: "textile", Weaving: "textile", Fulling: "textile", Tailoring: "textile",
  Leatherworking: "leather", Cordwaining: "leather", Saddlery: "leather", Tanning: "leather",
  Sawing: "wood", Seasoning: "wood", Coopering: "cordage", Carpentry: "wood", Fletching: "arms",
  Charcoaling: "fuel", Limeburning: "stone", Masonry: "stone",
  Pottery: "pottery", Glassblowing: "glass",
  Potionmaking: "potion", Runecrafting: "arcane", Alchemy: "arcane", Crafting: "craft",
};
const MARKET_CAT_TAG = { "Food & Drink": "food", Woodworking: "wood", Metalworking: "metal",
  "Textiles & Leather": "textile", "Stone & Earth": "stone", "Crafts & Arcana": "craft",
  Combat: "arms", Gathering: "raw", Utility: "misc" };

let _makerSkill = null, _tagItems = null;
function marketMakerSkill(id) {
  if (!_makerSkill) {
    _makerSkill = {};
    for (const cat in RECIPES) for (const r of RECIPES[cat]) {
      const outs = typeof recipeOutputs === "function" ? recipeOutputs(r) : [{ id: r.out }];
      for (const o of outs) if (o.id && !_makerSkill[o.id]) _makerSkill[o.id] = r.skill;
    }
  }
  return _makerSkill[id];
}
// Pseudo equip-tags that aren't real slot names and aren't armour either —
// EQUIP_CHOICES jewelry (ring/bracelet/anklet — state.js), plus the
// stack-slot tags (quiver/rune) and weapon/neck, all with their own
// dedicated shop logic elsewhere.
const NON_ARMOR_EQUIP_TAGS = new Set(["weapon", "neck", "quiver", "rune", "ring", "bracelet", "anklet"]);
// True for any wearable body-armour/shield piece — single-slot ("torso",
// "shield") or multi-slot (a chestplate's array of anatomical slots) — but
// not the tags above. Replaces an old hardcoded
// ["armor","helm","chest","legs","boots","shield"] allowlist that assumed
// equip was always one of those 6 literal strings; the 30-slot anatomical
// redesign made that list both incomplete (dozens of new slot names) and
// wrong for multi-slot items (equip is an array there).
function isBodyArmor(equipVal) {
  return !!equipVal && !NON_ARMOR_EQUIP_TAGS.has(equipVal);
}
function itemTag(id) {
  const d = ITEMS[id];
  if (!d) return "misc";
  if (d.tool) return "tool";
  if (d.potion) return "potion";
  if (d.equip === "weapon" || d.equip === "shield") return "arms";
  if (d.boat) return "ship";
  const sk = marketMakerSkill(id);
  if (sk) return MARKET_SKILL_TAG[sk] || MARKET_CAT_TAG[typeof SKILL_CATEGORY !== "undefined" ? SKILL_CATEGORY[sk] : ""] || "misc";
  return "raw"; // gathered / bought raw materials
}
// representative producible goods per tag (for contracts)
function tagItems(tag) {
  if (!_tagItems) {
    _tagItems = {};
    for (const cat in RECIPES) for (const r of RECIPES[cat]) {
      const out = (r.outputs && r.outputs[0] && r.outputs[0].id) || r.out;
      if (!out || !ITEMS[out]) continue;
      const t = itemTag(out);
      (_tagItems[t] || (_tagItems[t] = [])).push({ id: out, value: ITEMS[out].value || 1 });
    }
    for (const t in _tagItems) { // dedupe, sort by value
      const seen = new Set();
      _tagItems[t] = _tagItems[t].filter(x => (seen.has(x.id) ? false : seen.add(x.id))).sort((a, b) => a.value - b.value);
    }
  }
  return _tagItems[tag] || [];
}

// ---------- town economic profiles ----------
// demand: tag → sell-price multiplier (>1 the town pays a premium for it).
// surplusTags: kinds it produces and stocks cheaply. stock: extra ids on sale.
const MARKET_PROFILES = {
  port:   { label: "Port", demand: { ship: 1.7, cordage: 1.6, textile: 1.35, food: 1.3, wood: 1.25, stone: 1.2, leather: 1.2 },
            surplusTags: ["food", "raw"], stock: ["raw_fish", "rope", "sail"] },
  farm:   { label: "Farming town", demand: { tool: 1.5, metal: 1.4, textile: 1.3, pottery: 1.3, glass: 1.25, luxury: 1.5, leather: 1.3 },
            surplusTags: ["food", "raw"], stock: ["wheat", "flour", "flatbread", "wool_yarn", "fleece"] },
  mine:   { label: "Mining town", demand: { food: 1.6, wood: 1.4, tool: 1.3, textile: 1.25, leather: 1.3, drink: 1.4 },
            surplusTags: ["metal", "stone", "raw"], stock: ["iron_bar", "charcoal", "building_stone", "limestone", "copper_ore"] },
  forest: { label: "Forest settlement", demand: { food: 1.4, metal: 1.45, tool: 1.35, pottery: 1.25, drink: 1.3 },
            surplusTags: ["wood", "fuel"], stock: ["logs", "planks", "charcoal", "boards"] },
  city:   { label: "City market", demand: { luxury: 1.7, glass: 1.35, pottery: 1.3, arms: 1.4, food: 1.2, textile: 1.2, leather: 1.25, ship: 1.2 },
            surplusTags: ["metal", "textile", "craft"], stock: ["cloth", "iron_bar", "candle", "vial"] },
};
// biome → profile key (uses the global B biome-id table)
function marketProfileForBiome(biome) {
  const b = typeof B !== "undefined" ? B : {};
  if ([b.SAND, b.REEF, b.OASIS, b.SALT].includes(biome)) return MARKET_PROFILES.port;
  if ([b.FARM, b.MEADOW, b.SAVANNA, b.STEPPE].includes(biome)) return MARKET_PROFILES.farm;
  if ([b.ROCK, b.ROCKY, b.SNOW, b.BADLANDS, b.CANYON, b.VOLCANO, b.TUNDRA, b.GLACIER].includes(biome)) return MARKET_PROFILES.mine;
  if ([b.FOREST, b.JUNGLE, b.TAIGA, b.SWAMP, b.WETLAND, b.BAMBOO, b.CHERRY].includes(biome)) return MARKET_PROFILES.forest;
  return MARKET_PROFILES.city;
}

// ---------- prices ----------
function reputation() { return (player.reputation | 0); }
function repMult() { return 1 + Math.min(0.5, reputation() * 0.0008); }
function demandMult(profile, id) { return profile.demand[itemTag(id)] || 0.85; }
// what the town pays you for one unit (base value ×0.5, lifted by demand,
// quality and your reputation)
function marketSellPrice(profile, id, q) {
  const qMult = q != null ? 0.6 + 0.8 * (q / 100) : 1;
  return Math.max(1, Math.round((ITEMS[id].value || 1) * 0.5 * demandMult(profile, id) * qMult * repMult()));
}
// what the town charges you to buy one unit (cheaper if it's a local surplus)
function marketBuyPrice(profile, id) {
  const surplus = profile.surplusTags.includes(itemTag(id)) || (profile.stock || []).includes(id);
  return Math.max(1, Math.round((ITEMS[id].value || 1) * (surplus ? 0.9 : 1.15)));
}
// Merchants only stock the early seed tiers; higher-level seeds must be found
// or grown up to, not bought outright.
const MERCHANT_MAX_SEED_LEVEL = 4;
let _seedReq = null;
function seedReq(id) {
  if (!_seedReq) {
    _seedReq = {};
    for (const k in CROPS) { const c = CROPS[k]; if (c.seed) _seedReq[c.seed] = c.req; }
  }
  return _seedReq[id];
}
// Merchants sell seeds, not the crops grown from them — the harvest has to be
// grown or gathered, not bought outright.
let _cropHarvestItems = null;
function isCropHarvest(id) {
  if (!_cropHarvestItems) {
    _cropHarvestItems = new Set();
    for (const k in CROPS) { const c = CROPS[k]; if (c.item) _cropHarvestItems.add(c.item); }
  }
  return _cropHarvestItems.has(id);
}
function marketStock(profile) {
  const out = [];
  const push = id => {
    if (!ITEMS[id] || out.includes(id)) return;
    const req = seedReq(id);
    if (req != null && req > MERCHANT_MAX_SEED_LEVEL) return;
    if (isCropHarvest(id)) return;
    out.push(id);
  };
  (typeof SHOP_STOCK !== "undefined" ? SHOP_STOCK : []).forEach(push);
  (profile.stock || []).forEach(push);
  return out.filter(id => ITEMS[id]); // drop any placeholder ids that don't exist
}

// ---------- contracts (deterministic per town) ----------
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
function townKeyOf(x, y) { return Math.round(x / 8) + "," + Math.round(y / 8); }
function townContracts(townKey, profile) {
  const wanted = Object.keys(profile.demand).sort((a, b) => profile.demand[b] - profile.demand[a]);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const h = hashStr(townKey + ":" + i);
    const tag = wanted[h % Math.min(wanted.length, 4)];
    const pool = tagItems(tag);
    if (!pool.length) continue;
    // unsigned shifts: h has its top bit set for some towns, and a SIGNED
    // shift there gave a negative index (crashed the market for those towns)
    const item = pool[(h >>> 4) % pool.length];
    const qty = 4 + ((h >>> 8) % 12);
    const premium = 1.6 + ((h >>> 12) % 90) / 100; // 1.6–2.5×
    const key = townKey + ":" + i;
    if (player.contractsDone && player.contractsDone.includes(key)) continue;
    out.push({ key, itemId: item.id, qty, reward: Math.max(qty, Math.round(item.value * qty * premium)), rep: 3 + Math.round(item.value * qty / 60) });
  }
  return out;
}
function fulfilContract(c) {
  if (countItem(c.itemId) < c.qty) { log("You don't have the goods for that contract.", "warn"); return false; }
  removeItem(c.itemId, c.qty);
  addItem("coins", c.reward);
  player.reputation = reputation() + c.rep;
  (player.contractsDone || (player.contractsDone = [])).push(c.key);
  log(`Contract fulfilled: ${c.qty} × ${ITEMS[c.itemId].name} for ${c.reward} coins (+${c.rep} rep).`, "gold");
  uiDirty = true;
  return true;
}

// ---------- equip requirements for crafted gear ----------
// Any equippable produced by a recipe inherits its recipe tier as its
// wield/wear requirement (tailored garments, leather gear, carpentry staves…)
// unless the item already declared one (geartiers.js stamps its own). Runs
// here because market.js loads after every recipe-defining skill file.
for (const cat in RECIPES) for (const r of RECIPES[cat]) {
  const out = (r.outputs && r.outputs[0] && r.outputs[0].id) || r.out;
  const d = out && ITEMS[out];
  if (!d || !d.equip || !r.req) continue;
  if (d.equip === "weapon") {
    if (d.bowPower) { if (d.rangeReq == null) d.rangeReq = r.req; }        // ranged: Archery
    else if (d.magicPower) { if (d.magicReq == null) d.magicReq = r.req; } // wands/staves: Magic
    else if (d.wieldReq == null) d.wieldReq = r.req;                       // melee weapon: wieldReq gates the Melee skill
  } else if (isBodyArmor(d.equip) && d.wearReq == null)
    d.wearReq = r.req;
}

// ---------- station artwork (2026-09 art drop) ----------
// Every production station gets its own world object instead of the 8
// shared generics: either a NEW single-view object (objects-data.js,
// packed from assets/objects_source/station_*) or an existing unused
// object that already depicts it. The value pair is [newSprKey,
// oldSprFallback] — the fallback is aliased under the new key so the
// renderer's flat-atlas path never lacks a sprite while textures load.
(function () {
  const ART = {
    sawmill: ["sawmill", "workbench"], cooperage: ["cooperage", "workbench"],
    malthouse: ["malthouse", "furnace"], fulling_mill: ["fulling_mill", "tanrack"],
    masons_yard: ["masons_yard", "anvil"], assay_furnace: ["assay_furnace", "furnace"],
    drawbench: ["drawbench", "anvil"], leather_bench: ["leather_bench", "workbench"],
    cobblers_bench: ["cobblers_bench", "workbench"], saddlers_bench: ["saddlers_bench", "workbench"],
    toolsmith: ["toolsmith", "anvil"], locksmith_bench: ["locksmith_bench", "anvil"],
    paper_mill: ["paper_mill", "mill"], bindery: ["bindery", "workbench"],
    soap_works: ["soap_works", "cauldron"], seasoning_yard: ["seasoning_yard", "tanrack"],
    charcoal_clamp: ["charcoal_clamp", "campfire"], lime_kiln: ["lime_kiln", "furnace"],
    ropewalk: ["ropewalk", "workbench"], shipyard: ["shipyard", "workbench"],
    barn: ["barn", "crate"], creamery: ["creamery", "cauldron"],
    tailors_bench: ["tailors_bench", "workbench"], altar: ["altar_rune", "altar"],
    // repoints to objects that already existed unused in the pack
    bakehouse: ["bread_oven", "campfire"], brewery: ["brewery_tun", "cauldron"],
    spinning_wheel: ["spinning_wheel", "loom"], dyeworks: ["dye_vat", "cauldron"],
    pottery_kiln: ["kiln", "furnace"], jewelers_bench: ["jewelrytable", "workbench"],
    sail_loft: ["sailmaker_spindle", "loom"], chandlery: ["chandler_set", "workbench"],
  };
  for (const type in ART) {
    if (!STATIONS[type]) continue;
    const [key, fb] = ART[type];
    STATIONS[type].spr = key;
    if (typeof SPR !== "undefined" && !SPR[key] && SPR[fb]) SPR[key] = SPR[fb];
  }
})();

// ---------- shop types ----------
// Specialty shopkeepers (assigned per building by world/chunks.js
// deriveNpcs). Each type SELLS a themed stock list and only BUYS what its
// trade deals in — the general store buys a broad range of everyday goods
// but turns everything exotic away; specialists pay a 20% premium for the
// goods they want. `sells` is a lazy builder so tiered items defined by
// later-loading skill files are picked up.
// even value-spread sample: sort by coin value (value tracks tier/level) and
// pick n items spanning cheapest → most expensive, so a specialist's shelf
// covers the whole 1-32 progression instead of just the starter tiers
function shopSample(ids, n) {
  ids = [...new Set(ids.filter(id => ITEMS[id]))]
    .sort((a, b) => (ITEMS[a].value || 0) - (ITEMS[b].value || 0));
  if (ids.length <= n) return ids;
  const out = [];
  for (let i = 0; i < n; i++)
    out.push(ids[Math.min(ids.length - 1, Math.round(i * (ids.length - 1) / (n - 1)))]);
  return [...new Set(out)];
}
const _idsByTag = {};
function idsByTag(tag) {
  if (!_idsByTag[tag]) _idsByTag[tag] = Object.keys(ITEMS).filter(id => itemTag(id) === tag);
  return _idsByTag[tag];
}
const SHOP_TYPES = {
  general: {
    name: "General store", line: `"Welcome! Buy tools, sell me your goods."`,
    sells: null, // the town-market stock (profile surplus + basics + contracts)
    buys: (id, d) => !!(d.tool || d.heals || ["raw", "wood", "food", "drink", "fuel"].includes(itemTag(id))),
  },
  woodcutter: {
    name: "Woodcutter's shop", line: `"Finest axes for miles. I pay well for good timber."`,
    sells: () => shopSample(Object.keys(ITEMS).filter(id => ITEMS[id].tool === "axe"), 17),
    buys: (id, d) => d.tool === "axe" || !!d.log || itemTag(id) === "wood",
  },
  mining: {
    name: "Mining supplies", line: `"Picks, and coin for whatever you dig up."`,
    sells: () => shopSample(Object.keys(ITEMS).filter(id => ITEMS[id].tool === "pickaxe"), 17),
    buys: (id, d) => d.tool === "pickaxe" || (typeof bankCat === "function" && bankCat(id) === "ores"),
  },
  fishmonger: {
    name: "Fishmonger", line: `"Fresh off the boats! Rods and nets too."`,
    sells: () => Object.keys(ITEMS).filter(id => ["rod", "net", "big_net", "harpoon", "cage"].includes(ITEMS[id].tool)),
    buys: (id, d) => ["rod", "net", "big_net", "harpoon", "cage"].includes(d.tool) || /^raw_/.test(id) || /fish/.test(id),
  },
  armoury: {
    name: "Armoury", line: `"Steel between you and the wilds. Buying and selling."`,
    sells: () => shopSample(Object.keys(ITEMS).filter(id => isBodyArmor(ITEMS[id].equip)), 16),
    buys: (id, d) => isBodyArmor(d.equip),
  },
  weaponsmith: {
    name: "Weaponsmith", line: `"Sharp edges, fair prices."`,
    sells: () => shopSample(Object.keys(ITEMS).filter(id => ITEMS[id].equip === "weapon"), 15)
      .concat(ITEMS.arrows ? ["arrows"] : []),
    buys: (id, d) => d.equip === "weapon" || !!d.arrowPower || id === "arrows" || id === "arrow_shafts",
  },
  seedsman: {
    name: "Seed merchant", line: `"Everything grows from something. Buying produce too."`,
    // the SPECIALIST carries the whole seed ladder, level 1 right up to 32
    // (the general store's market stock keeps its low-tier-seeds-only gate)
    sells: () => shopSample(Object.values(CROPS).filter(c => c.seed && ITEMS[c.seed]).map(c => c.seed), 16),
    buys: (id, d) => (typeof bankCat === "function" && bankCat(id) === "seeds") || isCropHarvest(id),
  },
  herbalist: {
    name: "Herbalist", line: `"Herbs, tinctures and vials. Bring me what you forage."`,
    sells: () => ["vial"].filter(id => ITEMS[id])
      .concat(shopSample(Object.keys(ITEMS).filter(id => ITEMS[id].potion), 12)),
    buys: (id, d) => !!d.potion || id === "vial" || /^herb/.test(id),
  },
  jeweller: {
    name: "Jeweller", line: `"Gold, gems and fine things. I know worth when I see it."`,
    sells: () => ["gem"].filter(id => ITEMS[id]).concat(shopSample(idsByTag("luxury"), 12)),
    buys: (id, d) => itemTag(id) === "luxury" || id === "gem" || /gem|ring|amulet|necklace|bracelet|pendant|crown|tiara|diadem|circlet/.test(id),
  },
  clothier: {
    name: "Clothier", line: `"Cloth, thread and leathers — spun, woven or tanned."`,
    sells: () => shopSample(["cloth", "cotton", "leather", "robe"]
      .concat(idsByTag("textile"), idsByTag("leather")), 14),
    buys: (id, d) => ["textile", "leather"].includes(itemTag(id)) || ["cloth", "cotton", "leather", "hide"].includes(id),
  },
  provisioner: {
    name: "Provisioner", line: `"Hot bread, cured meat — and I'll buy your surplus."`,
    sells: () => shopSample(Object.keys(ITEMS).filter(id => ITEMS[id].heals), 14),
    buys: (id, d) => !!d.heals || ["food", "drink"].includes(itemTag(id)),
  },
  timberwright: {
    name: "Timber yard", line: `"Boards, beams and seasoned stock — buying and selling."`,
    sells: () => shopSample(["logs", "planks", "boards", "beam"]
      .concat(Object.keys(ITEMS).filter(id => ITEMS[id].log), idsByTag("wood")), 16),
    buys: (id, d) => !!d.log || itemTag(id) === "wood",
  },
};
const SHOP_TYPE_KEYS = Object.keys(SHOP_TYPES).filter(k => k !== "general");
// lazy stock cache (some sells-lists scan all ITEMS)
const _shopStock = {};
function shopStockFor(typeKey) {
  if (!_shopStock[typeKey]) {
    const t = SHOP_TYPES[typeKey];
    _shopStock[typeKey] = (typeof t.sells === "function" ? t.sells() : t.sells || [])
      .filter(id => ITEMS[id]).slice(0, 20);
  }
  return _shopStock[typeKey];
}

// ---------- UI ----------
let activeMarket = null;
function openMarket(npc) {
  const biome = (typeof world !== "undefined" && world.biomeAt) ? world.biomeAt(npc.x, npc.y) : -1;
  const profile = marketProfileForBiome(biome);
  const typeKey = SHOP_TYPES[npc.shopType] ? npc.shopType : "general";
  activeMarket = { profile, npc, townKey: townKeyOf(npc.x, npc.y), typeKey };
  const t = SHOP_TYPES[typeKey];
  log(`${npc.name}: ${npc.line || t.line}`, "sys");
  openTrade("shop", t.name, npc.x, npc.y);
  renderMarket();
}
function renderMarket() {
  if (!activeMarket) return;
  const { profile, townKey, typeKey } = activeMarket;
  const type = SHOP_TYPES[typeKey];
  const general = typeKey === "general";
  document.getElementById("trade-title").textContent = general
    ? `${profile.label} — trade & contracts (Reputation ${reputation()})`
    : `${type.name} (Reputation ${reputation()})`;
  // BUY
  const grid = document.getElementById("shopgrid");
  grid.innerHTML = "";
  for (const id of (general ? marketStock(profile) : shopStockFor(typeKey))) {
    const def = ITEMS[id], price = marketBuyPrice(profile, id);
    const reqNote = def.wieldReq ? ` (Melee ${def.wieldReq})`
      : def.wearReq ? ` (Defence ${def.wearReq})`
      : def.rangeReq ? ` (Archery ${def.rangeReq})` : "";
    const d = slotEl(def.icon, undefined, `${def.name}${reqNote} — ${price} coins`);
    const pr = document.createElement("span"); pr.className = "price"; pr.textContent = price; d.appendChild(pr);
    d.onclick = e => { tradeBuy(id, price, e.shiftKey ? 5 : 1); renderMarket(); };
    d.oncontextmenu = e => amountMenu(e, "Buy", "max", n => { tradeBuy(id, price, n); renderMarket(); });
    grid.appendChild(d);
  }
  // CONTRACTS — only the general store posts town contracts
  let cbox = document.getElementById("contractlist");
  if (!cbox) { cbox = document.createElement("div"); cbox.id = "contractlist"; grid.parentNode.insertBefore(cbox, document.getElementById("sellhdr")); }
  cbox.innerHTML = "";
  if (general) {
    const contracts = townContracts(townKey, profile);
    if (contracts.length) {
      const h = document.createElement("div"); h.className = "contracthdr"; h.textContent = "Contracts wanted here:"; cbox.appendChild(h);
      for (const c of contracts) {
        const have = countItem(c.itemId), ready = have >= c.qty;
        const row = document.createElement("div");
        row.className = "contract" + (ready ? " ready" : "");
        row.innerHTML = `<span>${c.qty}× <b>${ITEMS[c.itemId].name}</b> — ${c.reward}c (+${c.rep} rep) <i>(have ${have})</i></span>`;
        const btn = document.createElement("button"); btn.textContent = ready ? "Fulfil" : "Need more";
        btn.disabled = !ready; btn.onclick = () => { if (fulfilContract(c)) renderMarket(); };
        row.appendChild(btn); cbox.appendChild(row);
      }
    }
  }
  // SELL — only what THIS shop buys, from your inventory. Specialists pay a
  // 20% premium for their own trade's goods.
  const sell = document.getElementById("sellgrid");
  sell.innerHTML = "";
  let any = 0;
  player.inv.forEach(s => {
    if (!s || s.id === "coins") return;
    const def = ITEMS[s.id];
    if (!def || !type.buys(s.id, def)) return;
    any++;
    const premium = general ? 1 : 1.2;
    const price = Math.max(1, Math.round(marketSellPrice(profile, s.id, s.q) * premium));
    const demanded = general && demandMult(profile, s.id) > 1;
    const d = slotEl(def.icon, s.qty, `Sell ${def.name}${demanded ? " (in demand here!)" : ""}${s.q != null ? ` [${qualityLabel(s.q)}]` : ""} — ${price} coins each`);
    const pr = document.createElement("span"); pr.className = "price" + (demanded || !general ? " demand" : ""); pr.textContent = price; d.appendChild(pr);
    const doSell = n => {
      n = Math.min(n, s.qty);
      if (n <= 0) return;
      removeItem(s.id, n); addItem("coins", price * n);
      sfx("coins", 0.7);
      log(`You sell ${n} × ${def.name} for ${price * n} coins.`);
      uiDirty = true;
      renderMarket();
    };
    d.onclick = e => doSell(e.altKey ? s.qty : e.shiftKey ? 5 : 1);
    d.oncontextmenu = e => amountMenu(e, "Sell", "all", doSell);
    sell.appendChild(d);
  });
  document.getElementById("sellhdr").textContent = any
    ? `${general ? "This store buys everyday goods" : type.name + " buys"} — your matching items:`
    : `${general ? "This store buys everyday goods." : type.name + " only buys its own trade's goods."} You carry nothing it wants.`;
}
