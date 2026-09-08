// ===== Isle of Emberfall — panels, inventory UI, shops, banks, crafting, and dialog =====
"use strict";

// ---------- UI ----------
// Callers (4):
//  main/ui.js:1,7,14,233
const panels = ["inv", "equip", "skills", "help"];
// Callers (11):
//  main/ui.js:11,12,15,139,189,259,264,277,282,297,303
function showPanel(name) {
  for (const p of panels)
    document.getElementById("panel-" + p).classList.toggle("active", p === name);
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  uiDirty = true; // panels render lazily — fill the newly shown one
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => showPanel(t.dataset.tab));
document.querySelectorAll(".closebtn").forEach(b => b.onclick = () => showPanel("inv"));
// Callers (2):
//  gameplay/input.js:102 gameplay/pathing.js:50
function closeModals() {
  closeTrade();
}

// ---------- centred trade window (shops + banks) ----------
// tradeCtx pins the window to the shopkeeper / bank chest it was opened at;
// tickTrade() (called every frame from main.js) closes it automatically once
// the player walks out of reach.
let tradeCtx = null; // { mode: "shop" | "bank", x, y }
function openTrade(mode, title, x, y) {
  document.getElementById("trade-title").textContent = title;
  for (const m of ["shop", "bank", "craft"])
    document.getElementById("trade-" + m).style.display = mode === m ? "" : "none";
  const t = document.getElementById("trade");
  t.classList.toggle("bankmode", mode === "bank");
  t.classList.add("open");
  tradeCtx = { mode, x, y };
  uiDirty = true; // inventory clicks change meaning while the bank/shop is open
}
function closeTrade() {
  if (!tradeCtx) return;
  document.getElementById("trade").classList.remove("open");
  tradeCtx = null;
  if (typeof activeMarket !== "undefined") activeMarket = null;
  hideCtx();
  uiDirty = true; // restore normal inventory click behaviour
}
document.getElementById("tradeclose").onclick = closeTrade;
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && tradeCtx) { e.stopPropagation(); closeTrade(); }
}, true);
// Callers (1): main.js frame loop
function tickTrade() {
  if (!tradeCtx) return;
  if (Math.max(Math.abs(player.x - tradeCtx.x), Math.abs(player.y - tradeCtx.y)) > 3)
    closeTrade();
}

// right-click amount menu for a trade slot: <verb> 5 / 10 / 50 / X… / max
function amountMenu(e, verb, maxLabel, fn) {
  e.preventDefault();
  e.stopPropagation();
  const items = [5, 10, 50].map(n => ({ label: `${verb} ${n}`, fn: () => fn(n) }));
  items.push({ label: `${verb} X…`, fn: () => {
    const v = parseInt(prompt(`${verb} how many?`), 10);
    if (v > 0) fn(v);
  } });
  items.push({ label: `${verb} ${maxLabel}`, fn: () => fn(Infinity) });
  showCtx(items, e.clientX, e.clientY);
}

// Callers (5):
//  main/ui.js:54,147,171,197,218
function slotEl(iconKey, qty, title) {
  const d = document.createElement("div");
  d.className = "slot";
  if (iconKey) {
    const cv = document.createElement("canvas");
    cv.width = 32; cv.height = 32;
    cv.getContext("2d").drawImage(icon(iconKey), 0, 0);
    d.appendChild(cv);
  }
  if (qty !== undefined && qty !== 1) {
    const q = document.createElement("span");
    q.className = "qty";
    q.textContent = qty >= 100000 ? Math.floor(qty / 1000) + "k" : qty;
    d.appendChild(q);
  }
  if (title) d.title = title;
  return d;
}

// Callers (1):
//  gameplay/world.js:642
function renderUI() {
  document.getElementById("hpbar").style.width = (100 * player.hp / maxHp()) + "%";
  const wellFed = player.wellFedUntil && now < player.wellFedUntil;
  const candleLit = player.candleLitUntil && now < player.candleLitUntil;
  const hpt = document.getElementById("hptext");
  hpt.textContent = `${player.hp} / ${maxHp()}` + (wellFed ? "  🍖" : "") + (candleLit ? " 🕯" : "");
  hpt.title = [wellFed ? "Well fed — you recover HP faster." : "", candleLit ? "Carrying a lit candle — it lights your way at night." : ""].filter(Boolean).join(" ");
  document.getElementById("cmblevel").textContent = `Combat level: ${combatLevel()}`;
  if (typeof renderStink === "function") renderStink();
  // lazy panels: only rebuild what is actually on screen — renderSkills alone
  // rebuilds ~64 rows and used to run on every uiDirty tick (HP regen!),
  // which was the "banking is laggy" culprit
  const active = panels.find(p => document.getElementById("panel-" + p).classList.contains("active"));
  if (active === "inv" || active === "equip") renderInv();
  if (active === "skills") renderSkills();
  if (tradeCtx && tradeCtx.mode === "shop") renderShop();
  if (tradeCtx && tradeCtx.mode === "bank") renderBank();
}

// Examine an inventory stack: base flavour + produced quality + maker history.
// Finished goods recite their whole production chain; commodities show a batch
// summary. (Provenance/quality live on the stack via the production engine.)
function examineItem(s) {
  const def = ITEMS[s.id];
  log(EXAMINE[s.id] || def.name, "sys");
  if (s.q != null && typeof qualityLabel === "function")
    log(`Quality: ${qualityLabel(s.q)} (${s.q}/100).`, "sys");
  if (s.prov == null || typeof provRegistry === "undefined") return;
  const ev = provRegistry[s.prov];
  if (!ev) return;
  if (def.stack) {
    const verb = (typeof RECIPE_VERB !== "undefined" && RECIPE_VERB[ev.skill]) || "Made";
    log(`Batch ${ev.id}: ${verb} by ${ev.producer} · avg quality ${ev.quality}.`, "gold");
  } else if (typeof provenanceStory === "function") {
    for (const line of provenanceStory(s.prov))
      log(`${"   ".repeat(line.depth)}${line.text}.`, "gold");
  }
}

// Callers (1):
//  main/ui.js:41
// drag-and-drop reordering of the inventory grid. Filled slots are draggable;
// every slot accepts a drop, swapping the two inventory positions (dropping onto
// an empty slot just moves the item there). Source index rides in dataTransfer
// so it survives even if the grid re-renders mid-drag; invDragFrom is a fallback.
let invDragFrom = null;
function wireInvDrag(d, i, filled) {
  d.dataset.slot = i;
  if (filled) {
    d.draggable = true;
    d.addEventListener("dragstart", e => {
      invDragFrom = i;
      if (e.dataTransfer) { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; }
      d.classList.add("dragging");
    });
    d.addEventListener("dragend", () => { d.classList.remove("dragging"); invDragFrom = null; });
  }
  d.addEventListener("dragover", e => {
    if (invDragFrom == null) return;            // not an inventory drag
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    d.classList.add("dragover");
  });
  d.addEventListener("dragleave", () => d.classList.remove("dragover"));
  d.addEventListener("drop", e => {
    e.preventDefault();
    d.classList.remove("dragover");
    let from = invDragFrom;
    const dt = e.dataTransfer && e.dataTransfer.getData("text/plain");
    if (dt != null && dt !== "") { const n = parseInt(dt, 10); if (!isNaN(n)) from = n; }
    const to = i;
    if (from == null || from === to || from < 0 || from >= player.inv.length) return;
    const tmp = player.inv[to];
    player.inv[to] = player.inv[from];
    player.inv[from] = tmp;
    invDragFrom = null;
    uiDirty = true;
  });
}

function renderInv() {
  const grid = document.getElementById("invgrid");
  grid.innerHTML = "";
  player.inv.forEach((s, i) => {
    // a stale item id (e.g. left over from a save made before an id scheme
    // changed) must never throw here — that would abort renderInv() and skip
    // every render call after it (renderSkills, etc.) for the whole frame
    const def = s && ITEMS[s.id];
    const bankOpen = tradeCtx && tradeCtx.mode === "bank";
    const reqNote = def && def.wieldReq ? ` (Melee ${def.wieldReq})`
      : def && def.wearReq ? ` (Defence ${def.wearReq})`
      : def && def.rangeReq ? ` (Archery ${def.rangeReq})`
      : def && def.magicReq ? ` (Magic ${def.magicReq})` : "";
    const d = def ? slotEl(def.icon, s.qty, bankOpen ? `Deposit ${def.name}` : def.name + reqNote) : slotEl(null);
    if (s && def) {
      d.onclick = e => {
        // while the bank window is open, the inventory IS the deposit grid
        if (tradeCtx && tradeCtx.mode === "bank") { depositToBank(i, e.altKey ? s.qty : e.shiftKey ? 5 : 1); return; }
        if (def.heals || def.potion) eatItem(i);
        else if (def.equip) equipItem(i);
        else if (def.log && typeof placeLogs === "function") placeLogs(i);
        else if (def.place) placeItem(i); // furniture/vessels set down in the world
        else if (def.soap && typeof washWithSoap === "function") washWithSoap(i); // wash off stink
        else if (def.readable && typeof readBook === "function") readBook(i);     // study a book for xp
        else if (def.reveal && typeof useReveal === "function") useReveal(i);     // map/atlas/spyglass
        else if (def.light && typeof lightCandle === "function") lightCandle(i);  // strike a candle alight
        else examineItem(s);
      };
      d.oncontextmenu = e => {
        e.preventDefault();
        const items = [];
        if (tradeCtx && tradeCtx.mode === "bank") {
          for (const n of [5, 10, 50]) items.push({ label: `Deposit ${n}`, fn: () => depositToBank(i, n) });
          items.push({ label: "Deposit X…", fn: () => {
            const v = parseInt(prompt("Deposit how many?"), 10);
            if (v > 0) depositToBank(i, v);
          } });
          items.push({ label: "Deposit all", fn: () => depositToBank(i, s.qty) });
        }
        if (def.potion) items.push({ label: `Drink ${def.name}`, fn: () => eatItem(i) });
        else if (def.heals) items.push({ label: `Eat ${def.name}`, fn: () => eatItem(i) });
        if (def.equip) items.push({ label: `Equip ${def.name}`, fn: () => equipItem(i) });
        if (def.place) items.push({ label: def.ride ? `Launch ${def.name}` : `Place ${def.name}`, fn: () => placeItem(i) });
        if (def.log && typeof placeLogs === "function") items.push({ label: "Lay a fire", fn: () => placeLogs(i) });
        if (def.soap && typeof washWithSoap === "function") items.push({ label: `Wash with ${def.name}`, fn: () => washWithSoap(i) });
        if (def.readable && typeof readBook === "function") items.push({ label: `Read ${def.name}`, fn: () => readBook(i) });
        if (def.reveal && typeof useReveal === "function") items.push({ label: `Consult ${def.name}`, fn: () => useReveal(i) });
        if (def.light && typeof lightCandle === "function") items.push({ label: `Light ${def.name}`, fn: () => lightCandle(i) });
        items.push({ label: `Examine ${def.name}`, fn: () => examineItem(s) });
        items.push({ label: `Drop ${def.name}`, fn: () => {
          dropOnGround(s.id, s.qty, player.x, player.y, player.level | 0);
          player.inv[i] = null;
          uiDirty = true;
        }});
        showCtx(items, e.clientX, e.clientY);
      };
    } else if (s && !def) {
      // unknown item occupying a slot — drop it silently rather than soft-lock the slot
      player.inv[i] = null;
    }
    wireInvDrag(d, i, !!(s && def));
    grid.appendChild(d);
  });
  // --- equipment: a dynamic grid (inventory-style, same-size slots) showing
  // only what's worn, in the order it was equipped. There are no fixed
  // per-item slots — the panel grows with the number of equipped items. Which
  // items displace which (things sharing body space) is resolved at equip time
  // in gameplay/items.js; here we just list what ended up worn.
  const eg = document.getElementById("equipgrid");
  if (!eg) return;
  eg.innerHTML = "";
  player.equipOrder = player.equipOrder || [];
  // one visible cell per equipped item, keyed by its primary anatomical slot
  // (a multi-slot item is stored across several slots but shown once)
  const inst = {};
  for (const sl of EQUIP_SLOTS) {
    const val = player.equip[sl];
    if (!val) continue;
    const stack = QUIVER_SLOTS.has(sl);
    const eid = stack ? val.id : val;
    const edef = eid && ITEMS[eid];
    if (!edef) { player.equip[sl] = null; continue; }                       // stale ref
    if (!stack && Array.isArray(edef.equip) && edef.equip[0] !== sl) continue; // secondary slot
    inst[sl] = { def: edef, qty: stack ? val.qty : undefined, stack };
  }
  // display order = equip order, then any leftovers in slot order; reconcile
  // the stored order down to the live set so it never grows unbounded
  const ordered = [], seen = new Set();
  for (const k of player.equipOrder) if (inst[k] && !seen.has(k)) { ordered.push(k); seen.add(k); }
  for (const k of EQUIP_SLOTS) if (inst[k] && !seen.has(k)) { ordered.push(k); seen.add(k); }
  player.equipOrder = ordered;
  for (const k of ordered) {
    const it = inst[k];
    const title = it.stack ? `${it.def.name} x${it.qty} (click to unload)`
                           : `${it.def.name} (click to unequip)`;
    const cell = slotEl(it.def.icon, it.stack ? it.qty : undefined, title);
    cell.onclick = () => unequip(k);
    eg.appendChild(cell);
  }
  if (!ordered.length) {
    const hint = document.createElement("div");
    hint.className = "equip-empty";
    hint.textContent = "Nothing equipped. Click gear in your pack to wear it.";
    eg.appendChild(hint);
  }
}
// "back_of_head" -> "Back Of Head", "rune3" -> "Rune slot 3" — the empty-slot
// tooltip fallback (renderInv() would otherwise blank the HTML's initial
// title on the very first render, since it unconditionally overwrites it).
// Callers (1):
//  main/ui.js:200
function slotLabel(slot) {
  const m = slot.match(/^rune(\d)$/);
  if (m) return "Rune slot " + m[1];
  // "pauldron1" -> "Pauldron 1" (a trailing digit needs its own space before
  // title-casing, unlike the snake_case slots which already have one)
  return slot.replace(/_/g, " ").replace(/(\d+)$/, " $1").replace(/\b\w/g, c => c.toUpperCase());
}
// combat style is derived from what's in the main hand (combat.js
// combatStyle()) — there is no style selector any more

// Callers (1):
//  main/ui.js:42
// which categories the player has collapsed (session-only)
const collapsedCats = new Set();
// four even bands across the 1-32 level range, from newest to most mastered
function lvlTierClass(lvl) {
  return lvl <= 8 ? "lvl-t1" : lvl <= 16 ? "lvl-t2" : lvl <= 24 ? "lvl-t3" : "lvl-t4";
}
function skillRowHtml(s) {
  const lvl = skillLvl(s);
  const xp = player.skills[s];
  const cur = XP_TABLE[lvl], next = lvl >= MAX_LEVEL ? cur : XP_TABLE[lvl + 1];
  const frac = lvl >= MAX_LEVEL ? 1 : (xp - cur) / (next - cur);
  const b = player.buffs[s];
  const buffed = b && now < b.until;
  const row = document.createElement("div");
  row.className = "skillrow";
  row.title = `${Math.floor(xp)} xp — ${lvl >= MAX_LEVEL ? "max" : Math.ceil(next - xp) + " xp to level " + (lvl + 1)}`;
  row.innerHTML = `<div class="skillname"><b>${s}</b><span class="skv"><button class="skillinfo" data-skill="${s}" title="Progression guide">?</button><span class="${buffed ? "buffed" : lvlTierClass(lvl)}">${buffed ? eff(s) : lvl}</span></span></div><div class="xbar"><div style="width:${Math.floor(frac * 100)}%"></div></div>`;
  return row;
}
// Skills grouped into collapsible categories. The UI is fully dynamic in the
// number of skills — professions can be added to SKILLS/SKILL_CATEGORY freely.
function renderSkills() {
  const p = document.getElementById("panel-skills");
  p.innerHTML = "";
  const catOf = s => (typeof SKILL_CATEGORY !== "undefined" && SKILL_CATEGORY[s]) || "Other";
  const order = (typeof SKILL_CATEGORY_ORDER !== "undefined" ? SKILL_CATEGORY_ORDER : []).slice();
  const byCat = {};
  for (const s of SKILLS) (byCat[catOf(s)] || (byCat[catOf(s)] = [])).push(s);
  for (const c in byCat) if (!order.includes(c)) order.push(c);
  let total = 0;
  for (const cat of order) {
    const sks = byCat[cat];
    if (!sks) continue;
    const collapsed = collapsedCats.has(cat);
    const header = document.createElement("div");
    header.className = "skillcat";
    header.innerHTML = `<span class="skillcat-arrow">${collapsed ? "▸" : "▾"}</span>${cat}<span class="skillcat-n">(${sks.length})</span>`;
    header.onclick = () => { collapsed ? collapsedCats.delete(cat) : collapsedCats.add(cat); renderSkills(); };
    p.appendChild(header);
    const grid = document.createElement("div");
    grid.className = "skillgrid";
    if (collapsed) grid.style.display = "none";
    for (const s of sks) { total += skillLvl(s); grid.appendChild(skillRowHtml(s)); }
    p.appendChild(grid);
  }
  p.querySelectorAll(".skillinfo").forEach(b => b.onclick = e => { e.stopPropagation(); openSkillGuide(b.dataset.skill); });
  const t = document.createElement("div");
  t.className = "total";
  const rj = typeof readyJobCount === "function" ? readyJobCount() : 0;
  t.textContent = `Combat level: ${combatLevel()} — Total level: ${total}` + (rj ? `  ·  ${rj} job${rj > 1 ? "s" : ""} ready` : "");
  p.appendChild(t);
}

// ---------- per-skill progression guide ----------
const SKILL_INTRO = {
  Melee: "Melee accuracy. Fight monsters with a melee weapon in your main hand — tougher foes give more XP. Each Melee level also unlocks a higher tier of melee weapon to wield.",
  Strength: "Melee power. Fight monsters with a melee weapon (or your fists) to raise max hit and Strength XP.",
  Defence: "Melee defence. Take hits while fighting to gain Defence XP. Each Defence level also unlocks a higher tier of armour and shields to wear.",
  Archery: "Ranged combat. Wield a bow with arrows in your quiver and shoot monsters from a distance — each shot leads a moving target, and your Archery level sets how reliably you predict its path. Damage falls off near a bow's maximum reach, and an offhand dagger covers you up close. Each Archery level also unlocks a higher tier of bow to wield.",
  Magic: "Weave spells with a wand or staff — spells are SENTENCES. Every rune is a word: a substance (Fire burns, Frost chills, Bone brittles, Storm arcs…), a verb (Strike hits, Bind roots, Drain heals you, Burst spreads, Law forbids retaliation, Shadow routs…) or a modifier (Twin, Wrath, Time…). Each cast draws the next rune from your pouch in slot order; a wand speaks 2-word sentences, a staff 3. Your pouch loadout is your spellbook — a sentence with no verb collapses into a weak raw surge.",
  Health: "Your hit points. Trains passively whenever you deal or take damage in combat — no direct training needed.",
  Mining: "Swing a pickaxe at ore rocks. Mine the highest-tier rock you can for the best XP; ore respawns after a short delay.",
  Smelting: "Smelt ores into bars at a furnace. Each metal tier needs the matching Smelting level.",
  Weaponsmithing: "Hammer bars into weapons — swords, daggers, spears, maces, the exotic curved blades and arrowheads — at an anvil. Each tier follows your metal bars.",
  Armoursmithing: "Hammer bars into armour, shields and heavy iron fittings at an anvil. Each tier follows your metal bars.",
  Woodcutting: "Chop trees with an axe. Higher-tier trees (and the many native species) give more Woodcutting XP.",
  Firemaking: "Light logs on the ground to make a campfire. Burn the highest-tier logs you have for the most XP.",
  Carpentry: "Build furniture, tools and boats at a carpentry workbench.",
  Fletching: "Craft arrows and bows at a workbench. Arrow tiers follow your metal bars.",
  Fishing: "Each fish needs the right tool (net, rod, big net, harpoon or lobster cage) and is found at a matching spot: shallow <b>Fishing spots</b> (Lv 1+), <b>Deep fishing spots</b> (Lv 11+) and <b>Abyssal fishing spots</b> (Lv 25+). Bring the tool for what you want to catch — the general store sells them.",
  Cooking: "Cook raw fish and meat on a campfire or furnace. Higher levels burn food less often.",
  Farming: "Plant seeds in farm plots and return later to harvest. Higher-tier crops need more Farming.",
  Foraging: "Gather berries, mushrooms and herbs from bushes and patches out in the wild.",
  Potionmaking: "Brew potions from herbs and vials at a cauldron. Each herb tier unlocks a stronger potion — heals, combat and skill boosts, up to fantasy elixirs.",
  Alchemy: "Transmute items into coins and materials at an alchemy table.",
  Runecrafting: "Craft runes from rune essence at a runestone altar.",
  Crafting: "Craft leather armour and other goods at a workbench.",
  Tanning: "Tan raw hides into leather at a tanning rack.",
  Textiles: "Weave cloth and textiles from fibre at a loom.",
  Milling: "Mill grain into flour at a millstone.",
  Jewelry: "Craft rings and amulets from gold bars and gems at a furnace.",
  Agility: "Cross agility obstacles found in the wild — stepping stones, mossy crossings, rock scrambles and cliff ledges over rivers and ravines. Harder crossings need a higher Agility level, give more XP, and risk a slip (a stumble that stuns you and costs a little health). Training Agility also makes you nimbler on your feet — you move a touch faster and slip less often the higher your level.",
  Sailing: "Build boats with Carpentry, then sail open water. Better boats need a higher Sailing level and earn XP as you travel.",
};

// Build a data-driven list of {lvl,label,xp} training milestones for a skill,
// sourced from the same recipe / node / crop / monster tables the game runs on.
function guideTiers(skill) {
  // the inventory-icon key for an item id (guarded — missing ids → no icon)
  const iconFor = id => (id && ITEMS[id] && ITEMS[id].icon) || null;
  const fromRecipes = () => {
    const o = [];
    for (const cat in RECIPES) for (const r of RECIPES[cat]) if (r.skill === skill) {
      const oid = (r.outputs && r.outputs[0] && r.outputs[0].id) || r.out;
      o.push({ lvl: r.req, label: r.name, xp: r.xp, icon: iconFor(oid) });
    }
    return o;
  };
  // legacy base-tree nodes (data.js) superseded by content.js's treeT0 "Tree" /
  // treeT4 "Pine" — never placed in the world, so keep their dead duplicates
  // (incl. the stray "Pine tree") out of the progression guide.
  const GUIDE_HIDE_NODES = new Set(["tree", "tree_or", "tree_ap", "pine"]);
  const fromNodes = () => {
    const o = [];
    for (const k in NODE_TYPES) { if (GUIDE_HIDE_NODES.has(k)) continue; const nt = NODE_TYPES[k]; if (nt.skill === skill) o.push({ lvl: nt.req, label: nt.name, xp: nt.xp, icon: iconFor(nt.item) }); }
    return o;
  };
  switch (skill) {
    case "Woodcutting": case "Mining": case "Ore-mining": case "Gem-mining": case "Stone-mining": return fromNodes();
    case "Fishing":
      if (typeof FISH !== "undefined")
        return FISH.map(f => ({ lvl: f.req, label: `${f.name} — ${f.toolName}, ${f.spotName}`, xp: f.xp, icon: iconFor(f.raw) }))
          .sort((a, b) => a.lvl - b.lvl);
      return fromNodes();
    case "Foraging": {
      const o = fromNodes();
      if (typeof FORAGE !== "undefined") for (const f of FORAGE) o.push({ lvl: f.req, label: "Forage " + f.name.toLowerCase(), xp: f.xp, icon: iconFor(f.id) });
      return o;
    }
    case "Farming": case "Cerealiculture": case "Olericulture": case "Pomiculture":
    case "Herbiculture": case "Fibriculture": {
      const o = [];
      for (const k in CROPS) { const c = CROPS[k]; if ((c.skill || "Farming") === skill) o.push({ lvl: c.req, label: "Grow " + c.name, xp: c.xp, icon: iconFor(c.item) }); }
      return o;
    }
    case "Weaponsmithing": case "Armoursmithing":
      // each forge trade lists its own catalogue (weapons+arrowheads, or
      // armour+shields+fittings); tiered tools have their own Toolmaking guide.
      return fromRecipes();
    case "Smelting": case "Cooking": case "Fletching": case "Potionmaking":
    case "Runecrafting": case "Textiles": case "Tanning": case "Carpentry": case "Crafting":
    case "Jewelry": case "Milling": return fromRecipes();
    case "Firemaking": {
      const o = [], seen = new Set();
      for (const id in ITEMS) {
        const it = ITEMS[id];
        if (!it.log || seen.has(it.logTier)) continue;
        seen.add(it.logTier);
        const tier = it.logTier || 0;
        const lvl = tier + 1;
        o.push({ lvl, label: "Burn " + it.name.toLowerCase(), xp: Math.round(30 * (1 + tier * 0.55)), icon: it.icon });
      }
      return o;
    }
    case "Melee": {
      // the weapon tiers each level unlocks (wieldReq)
      // one row per weapon — every wieldable weapon, its own line + icon
      const o = [];
      for (const id in ITEMS) {
        const d = ITEMS[id];
        if (!d.wieldReq || d.equip !== "weapon") continue;
        o.push({ lvl: d.wieldReq, label: `Wield ${d.name}`, xp: 0, icon: d.icon });
      }
      return o;
    }
    case "Defence": {
      // one row per armour piece — every wearable item, its own line + icon
      const o = [];
      for (const id in ITEMS) {
        const d = ITEMS[id];
        if (!d.wearReq) continue;
        o.push({ lvl: d.wearReq, label: `Wear ${d.name}`, xp: 0, icon: d.icon });
      }
      return o;
    }
    case "Strength": {
      // base max hit rises one point every 4 levels (melee formula)
      const o = [{ lvl: 1, label: "Base max hit 2 (plus weapon power)", xp: 0 }];
      for (let l = 4; l <= MAX_LEVEL; l += 4)
        o.push({ lvl: l, label: `Base max hit reaches ${2 + Math.floor(l / 4)} (plus weapon power)`, xp: 0 });
      return o;
    }
    case "Health": {
      const o = [{ lvl: 1, label: "Max HP 10 — trains passively from combat", xp: 0 }];
      for (let l = 4; l <= MAX_LEVEL; l += 4)
        o.push({ lvl: l, label: `Max HP reaches ${10 + 3 * (l - 1)}`, xp: 0 });
      return o;
    }
    case "Archery": {
      // the bow tiers each level unlocks (rangeReq)
      const o = [];
      const byReq = new Map(), reqIcon = new Map();
      for (const id in ITEMS) {
        const d = ITEMS[id];
        if (!d.rangeReq) continue;
        if (!byReq.has(d.rangeReq)) byReq.set(d.rangeReq, []);
        byReq.get(d.rangeReq).push(d.name);
        if (!reqIcon.has(d.rangeReq)) reqIcon.set(d.rangeReq, d.icon);
      }
      for (const [req, names] of byReq) {
        names.sort();
        o.push({ lvl: req, label: `Wield: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3} more` : ""}`, xp: 0, icon: reqIcon.get(req) });
      }
      return o;
    }
    case "Magic": {
      const o = [
        { lvl: 1, label: "The Weave: spells are sentences — each cast draws the next rune (word) from your pouch; at your weapon's capacity the sentence casts", xp: 0 },
        { lvl: 1, label: "Substances mark the target (Fire burns, Water/Frost chill, Stone staggers, Veil blinds, Bone brittles, Light exposes, Blood feeds you, Storm arcs, Spirit pierces)", xp: 0 },
        { lvl: 2, label: "Verbs deliver (Strike hits, Bind roots, Rend sunders, Drain heals you, Burst spreads, Echo re-strikes, Chaos gambles, Law pacifies, Shadow routs, Death executes, Ward shields, Void banishes)", xp: 0 },
        { lvl: 13, label: "Modifiers warp the cast: Twin doubles, Soul lingers, War hastens, Time recurs, Astral cannot miss, Wrath empowers — Genesis/Eternity become whatever the weave lacks", xp: 0 },
        { lvl: 8, label: "Secret techniques: certain word pairs transcend their parts entirely — mages whisper of Petrify, Vanish, Rift Hurl, Sanctum, Stasis… experiment", xp: 0 },
      ];
      for (const id of ["wand", "staff", "pine_wand", "pine_staff"]) {
        const d = ITEMS[id];
        if (d) o.push({ lvl: d.magicReq, label: `Wield the ${d.name.toLowerCase()} (${d.weave}-word sentences, range ${d.range})`, xp: 0, icon: d.icon });
      }
      for (let l = 4; l <= MAX_LEVEL; l += 4)
        o.push({ lvl: l, label: `Spell damage bonus +${Math.floor(l / 4)}`, xp: 0 });
      return o;
    }
    case "Sailing": { const o = []; const ids = (typeof BOAT_ORDER !== "undefined") ? BOAT_ORDER : ["canoe", "sailboat", "ship"]; for (const id of ids) if (ITEMS[id]) o.push({ lvl: ITEMS[id].sailReq, label: "Sail a " + ITEMS[id].name.toLowerCase(), xp: 2 + ITEMS[id].boat * 2, icon: ITEMS[id].icon }); return o; }
    case "Agility": return (typeof OBSTACLE_ORDER !== "undefined" ? OBSTACLE_ORDER : []).map(k => { const ot = OBSTACLE_TYPES[k]; return { lvl: ot.req, label: "Cross " + ot.name.toLowerCase() + (ot.fail ? " (slip risk)" : ""), xp: ot.xp }; });
    case "Alchemy": return [
      { lvl: 1, label: "Transmute any item into coins at an alchemy table", xp: 0 },
      { lvl: 16, label: "Improved yield — ~58% of the item's value", xp: 0 },
      { lvl: 32, label: "Master yield — ~66% of the item's value", xp: 0 },
    ];
    // any other production profession is driven entirely by its recipe data
    default: return fromRecipes();
  }
}

// sort by level, drop duplicate methods, guarantee at least one row per
// distinct level, then evenly sample any remaining budget from the rest
function trimTiers(list, max = MAX_LEVEL + 8) {
  list = list.filter(t => t.lvl != null).sort((a, b) => a.lvl - b.lvl || String(a.label).localeCompare(String(b.label)));
  const seen = new Set();
  list = list.filter(t => (seen.has(t.label) ? false : (seen.add(t.label), true)));
  if (list.length <= max) return list;
  const byLevel = new Map();
  for (const t of list) if (!byLevel.has(t.lvl)) byLevel.set(t.lvl, t);
  const required = [...byLevel.values()];
  if (required.length >= max) return required.slice(0, max);
  const rest = list.filter(t => byLevel.get(t.lvl) !== t);
  const budget = max - required.length, step = rest.length / budget;
  const pickedIdx = new Set();
  for (let i = 0; i < budget; i++) pickedIdx.add(Math.min(rest.length - 1, Math.floor(i * step)));
  const out = required.concat([...pickedIdx].map(i => rest[i]));
  return out.sort((a, b) => a.lvl - b.lvl || String(a.label).localeCompare(String(b.label)));
}

// recipe-driven guides list EVERY recipe (the body scrolls); only the
// combat / node / monster guides still get sampled down to a digest — a
// smith wants the complete catalogue, not 40 rows picked from 350
function skillHasRecipes(skill) {
  for (const cat in RECIPES) for (const r of RECIPES[cat]) if (r.skill === skill) return true;
  return false;
}

function openSkillGuide(skill) {
  const body = document.getElementById("skillguide-body");
  document.getElementById("skillguide-title").textContent = skill + " — progression guide";
  const cur = skillLvl(skill);
  const intro = SKILL_INTRO[skill] || (typeof PROD_SKILL_INTRO !== "undefined" && PROD_SKILL_INTRO[skill]) || "";
  let html = intro ? `<div class="sgintro">${intro}</div>` : "";
  // Gathering guides list EVERY node species (the body scrolls) instead of a
  // per-level digest — otherwise the 67 Woodcutting trees collapse to ~one per
  // level and most species (kauri, kahikatea, …) vanish from the progression.
  const fullList = skillHasRecipes(skill)
    || ["Melee", "Defence", "Archery"].includes(skill)
    || (typeof SKILL_CATEGORY !== "undefined" && SKILL_CATEGORY[skill] === "Gathering");
  const tiers = trimTiers(guideTiers(skill), fullList ? Infinity : undefined);
  // the tier table is built with real DOM below (icons are canvases); leave a
  // placeholder in the HTML so it lands in the right spot between intro & mastery
  if (tiers.length) html += `<div id="sg-tierswrap"></div>`;
  // recipe-family mastery — repeated practice within a niche (see production.js)
  const mast = player.mastery && player.mastery[skill];
  if (mast && Object.keys(mast).length && typeof masteryLevel === "function") {
    const fams = Object.keys(mast).sort((a, b) => masteryLevel(skill, b) - masteryLevel(skill, a));
    html += `<div class="sgmastery"><div class="sgintro">Mastery — repeated practice within a family raises quality, and two makers of the same level can specialise differently:</div>`;
    for (const f of fams) html += `<div class="mrow"><span>${f.replace(/_/g, " ")}</span><b>${masteryLevel(skill, f)}</b></div>`;
    html += `</div>`;
  }
  html += `<div class="sgintro" style="margin-top:12px">You are currently level ${cur}${cur >= MAX_LEVEL ? " (max)" : ""}. Greyed rows are already unlocked.</div>`;
  body.innerHTML = html;
  // fill the placeholder with the tier table (icon column = a 24px canvas per row)
  const wrap = document.getElementById("sg-tierswrap");
  if (wrap && tiers.length) {
    const table = document.createElement("table");
    table.innerHTML = `<thead><tr><th class="sgicon"></th><th>Lvl</th><th>What to do</th><th>XP</th></tr></thead>`;
    const tb = document.createElement("tbody");
    for (const t of tiers) {
      const tr = document.createElement("tr");
      if (cur >= t.lvl) tr.style.opacity = ".55";
      const tdIcon = document.createElement("td");
      tdIcon.className = "sgicon";
      if (t.icon && typeof SPR !== "undefined" && SPR[t.icon]) {
        const cv = document.createElement("canvas");
        cv.width = 24; cv.height = 24;
        try { cv.getContext("2d").drawImage(icon(t.icon), 0, 0, 24, 24); } catch (e) { /* missing sheet */ }
        tdIcon.appendChild(cv);
      }
      tr.appendChild(tdIcon);
      const tdLvl = document.createElement("td"); tdLvl.className = "sglvl"; tdLvl.textContent = t.lvl; tr.appendChild(tdLvl);
      const tdWhat = document.createElement("td"); tdWhat.textContent = t.label; tr.appendChild(tdWhat);
      const tdXp = document.createElement("td"); tdXp.className = "sgxp"; tdXp.textContent = t.xp ? Math.round(t.xp) + " xp" : ""; tr.appendChild(tdXp);
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    wrap.replaceWith(table);
  }
  document.getElementById("skillguide").classList.add("open");
}
function closeSkillGuide() { document.getElementById("skillguide").classList.remove("open"); }
document.getElementById("sgclose").onclick = closeSkillGuide;
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.getElementById("skillguide").classList.contains("open")) { e.stopPropagation(); closeSkillGuide(); }
}, true);

// shop
// Callers (1):
//  gameplay/pathing.js:70
function talkTo(npc) {
  // shopkeepers: no trading once the shop is shut for the night
  if (npc.trader && typeof shopClosed === "function" && shopClosed(npc)) {
    log(`${npc.name}'s shop is closed for the night. Come back in the morning.`, "warn");
    return;
  }
  // everyone else: don't wake a sleeping villager
  if (!npc.trader && typeof npcAsleep === "function" && npcAsleep(npc)) {
    log(`${npc.name} is fast asleep.`, "sys");
    return;
  }
  // mix NPCs speak overhead (a bubble the renderer draws above their head)
  if (npc.mix) npc._say = { text: npc.line || "...", until: performance.now() + 4000 };
  // main-branch bankers: open an account, or serve an existing one (ui.js)
  if (npc.banker) { bankerTalk(npc); return; }
  if (npc.trader) {
    // too rank? the shopkeeper bars the door (gameplay/stink.js)
    if (typeof stinkBlocksShops === "function" && stinkBlocksShops()) {
      log(`${npc.name} recoils and bars the door: "Faugh — you stink! Go wash before you set foot in my shop."`, "warn");
      return;
    }
    if (typeof openMarket === "function") openMarket(npc);
    else { log(`${npc.name}: "Welcome! Buy tools, sell me your goods."`, "sys"); openShop(npc); }
  } else if (npc._questGiver && typeof Quests !== "undefined") {
    Quests.talkGiver(npc);                 // offer / advance / reward a quest
  } else if (typeof Quests !== "undefined" && Quests.onTalk(npc)) {
    // this NPC was a quest "contact" — the talk-step was just completed
  } else if (typeof npcFocusChat === "function" && npcFocusChat(npc)) {
    // AI dialogue is live (Nets bridge) — clicking a townsperson opens the chat
    // bar so you can speak to them (and anyone else in earshot).
  } else {
    log(`${npc.name}: "${npc.line}"`, "sys");
  }
}
// Buy up to n of an item at a fixed price, logging what actually happened.
// Returns how many were bought. Shared by the legacy shop and the market.
function tradeBuy(id, price, n) {
  const def = ITEMS[id];
  let bought = 0;
  for (let k = 0; k < n && k < 10000; k++) {
    if (countItem("coins") < price) { if (!bought) log("You don't have enough coins.", "warn"); break; }
    if (invFull(id)) { if (!bought) log("Your inventory is full.", "warn"); break; }
    removeItem("coins", price);
    addItem(id, 1);
    bought++;
  }
  if (bought) { sfx("coins", 0.7); log(`You buy ${bought > 1 ? bought + " × " : ""}${def.name} for ${price * bought} coins.`); }
  return bought;
}
// Callers (1):
//  main/ui.js:133
function openShop(npc) {
  openTrade("shop", "Trading Post", npc ? npc.x : player.x, npc ? npc.y : player.y);
  renderShop();
}
// Callers (4):
//  main/ui.js:43,140,161,181
function renderShop() {
  // town markets (with demand pricing + contracts) supersede the legacy shop
  if (typeof activeMarket !== "undefined" && activeMarket && typeof renderMarket === "function") return renderMarket();
  const grid = document.getElementById("shopgrid");
  grid.innerHTML = "";
  for (const id of SHOP_STOCK) {
    const def = ITEMS[id];
    const d = slotEl(def.icon, undefined, `${def.name} — ${def.value} coins`);
    const pr = document.createElement("span");
    pr.className = "price";
    pr.textContent = def.value;
    d.appendChild(pr);
    d.onclick = e => { tradeBuy(id, def.value, e.shiftKey ? 5 : 1); renderShop(); };
    d.oncontextmenu = e => amountMenu(e, "Buy", "max", n => { tradeBuy(id, def.value, n); renderShop(); });
    grid.appendChild(d);
  }
  // (the sell grid — filtered to what the shop buys — is rendered by
  // renderMarket in market.js; the legacy no-market path has no sell grid)
}

// bank
// The vault grid only rebuilds when the bank actually changes (bankRev):
// renderUI runs on every uiDirty (HP regen ticks, XP drops, …) and a full
// rebuild of hundreds of slot canvases each time made banking visibly laggy.
let bankRev = 0, bankShownRev = -1;
// vault filtering: category tabs + live search. The controls are static DOM
// (never rebuilt), so the search box keeps focus while the grid re-renders.
const bankFilter = { cat: "all", q: "" };
const BANK_CATS = [["all", "All"], ["gear", "Gear"], ["ores", "Ores"], ["bars", "Bars"],
  ["logs", "Logs"], ["timber", "Timber"], ["seeds", "Seeds"], ["food", "Food"],
  ["herbs", "Herbs"], ["cloth", "Cloth"], ["other", "Other"]];
// resource-type id sets, built once from the same tables the game runs on
let _bankSets = null;
function bankSets() {
  if (!_bankSets) {
    const s = { seeds: new Set(), ores: new Set(), bars: new Set() };
    for (const k in CROPS) if (CROPS[k].seed) s.seeds.add(CROPS[k].seed);
    if (typeof METALS !== "undefined")
      for (const m of METALS) { if (m.ore) s.ores.add(m.ore); if (m.bar) s.bars.add(m.bar); }
    _bankSets = s;
  }
  return _bankSets;
}
function bankCat(id) {
  const d = ITEMS[id];
  if (!d) return "other";
  const S = bankSets();
  if (S.seeds.has(id) || /_seeds$/.test(id)) return "seeds";
  if (S.ores.has(id) || /_ore$/.test(id) || id === "rune_essence" || id === "gem") return "ores";
  if (S.bars.has(id) || /_bar$|^bar_\d+$/.test(id)) return "bars";
  if (d.log) return "logs";
  if (/^herb/.test(id)) return "herbs";
  if (d.equip || d.tool || d.arrowPower || d.boat) return "gear";
  if (d.heals || d.potion || /^raw_/.test(id)) return "food";
  const tag = typeof itemTag === "function" ? itemTag(id) : "misc";
  if (tag === "food" || tag === "drink") return "food";
  if (tag === "textile" || tag === "leather") return "cloth";
  if (tag === "wood") return "timber";
  return "other";
}
{
  const cats = document.getElementById("bankcats");
  for (const [key, label] of BANK_CATS) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.cat = key;
    if (key === "all") b.classList.add("active");
    b.onclick = () => {
      bankFilter.cat = key;
      cats.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
      bankShownRev = -1;
      renderBank();
    };
    cats.appendChild(b);
  }
  document.getElementById("banksearch").oninput = e => {
    bankFilter.q = e.target.value.trim().toLowerCase();
    bankShownRev = -1;
    renderBank();
  };
  // Deposit all = the whole inventory; almost all = everything below the top
  // two rows (slots 0-11 at 6 columns), where players keep tools and food
  document.getElementById("depositallbtn").onclick = () => depositRange(0);
  document.getElementById("depositmostbtn").onclick = () => depositRange(12);
  // native scroll only inside the trade window — never the camera zoom
  document.getElementById("trade-body").addEventListener("wheel", e => e.stopPropagation(), { passive: true });
}
// deposit every stack from inventory slot `startSlot` onward
function depositRange(startSlot) {
  let stacks = 0;
  for (let i = startSlot; i < player.inv.length; i++) {
    const s = player.inv[i];
    if (!s) continue;
    const b = player.bank.find(b2 => b2.id === s.id);
    if (b) b.qty += s.qty;
    else player.bank.push({ id: s.id, qty: s.qty });
    player.inv[i] = null;
    stacks++;
  }
  if (stacks) {
    log(`You deposit ${stacks} stack${stacks === 1 ? "" : "s"}.`);
    bankRev++;
    uiDirty = true;
    renderBank();
  }
}
// ---- bank networks ----
// Settlements linked by the road web share ONE vault; a landmass roads can't
// reach (an island, a walled-off basin) keeps its own separate vault. Every
// chest resolves to the network of the ground it stands on (world.bankNetId),
// so a chest anywhere on the mainland opens the same "main" vault, while a
// chest on an isolated isle opens that isle's — items banked there can only
// be withdrawn there.
function bankNetFor(x, y) {
  if (typeof world !== "undefined" && world) {
    if (world.bankNetAt) return world.bankNetAt(x, y);   // road-web network (nearest settlement)
    if (world.bankNetId) return world.bankNetId(x, y);   // pre-roadnet fallback
  }
  return "main";
}
// { title, branch, members } for a settled network, null for hermit vaults
function bankInfoFor(net) {
  return (typeof world !== "undefined" && world && world.bankNetInfo) ? world.bankNetInfo(net) : null;
}
// the vault ARRAY for a network id — player.banks holds one per network;
// player.bank stays an alias of the active one so all the deposit/withdraw
// code (and the save) keeps working on a plain array.
function bankArrFor(net) {
  if (!player.banks) player.banks = { main: player.bank || [] };
  if (!player.banks[net]) player.banks[net] = [];
  return player.banks[net];
}
// the name shown at the top of the bank window: settled networks are titled
// by bankNetInfo ("Bank of Newhaven", "Bank of Braadford and Hildford");
// unsettled hermit vaults keep a deterministic name hashed from the id
function bankNetName(net) {
  const info = bankInfoFor(net);
  if (info) return info.title;
  if (net === "main") return "Bank of Emberfall";
  let h = 0;
  for (let i = 0; i < net.length; i++) h = (h * 131 + net.charCodeAt(i)) >>> 0;
  const A = ["Gull", "Drift", "Mist", "Storm", "Pearl", "Kelp", "Wreck", "Tide", "Fog", "Salt", "Reef", "Gale"];
  const B = ["rock", "haven", "watch", "hold", "moor", "strand", "cove", "reach", "point", "rest", "shoal", "sound"];
  return "Vault of " + A[h % A.length] + B[(h >>> 4) % B.length];
}
// ---- bank accounts ---------------------------------------------------------
// A network with a main branch only serves ACCOUNT HOLDERS: its chests stay
// shut until you've signed the ledger with a banker at the main branch.
// Hermit networks (no city, nobody to keep a ledger) open freely, as before.
function hasBankAccount(net) {
  return !!(player.bankAccounts && player.bankAccounts[net]);
}
// The bank's guaranteed kit: an account is NEVER without these — withdraw the
// last one and the bank restocks it on the spot. Fire, light, wood, ore and a
// wash: enough to work your way out of a sticky wilderness situation (stuck
// out at nightfall, too stinky for the city gates…) from any wayside chest.
const BANK_PERMANENTS = [["flint", 1], ["candle", 1], ["axe_iron", 1], ["pickaxe_iron", 1], ["lye_soap", 1]];
// signup incentives, deterministic per bank: Newhaven runs the flagship
// new-adventurer package; regional city banks hash their own coin bonus and
// gifts; tiny village co-op banks make a modest but heartfelt offer
function bankPerksFor(net) {
  if (net === "main") return { coins: 1000, gifts: [["dagger_iron", 1], ["shortbow", 1], ["arrows", 500]] };
  let h = 0;
  for (let i = 0; i < net.length; i++) h = (h * 131 + net.charCodeAt(i)) >>> 0;
  const pool = [["dagger_iron", 1], ["shortbow", 1], ["arrows", 300], ["spear_iron", 1], ["mace_iron", 1], ["shortsword_iron", 1]];
  const info = bankInfoFor(net);
  if (info && !info.branch) {
    const gifts = [pool[(h >>> 5) % pool.length]];
    if ((h >>> 3) % 2) gifts.push(pool[((h >>> 5) + 2) % pool.length]);
    return { coins: 250 + (h % 5) * 50, gifts };
  }
  const gifts = [];
  const n = 2 + (h >>> 3) % 2;
  for (let i = 0; i < n; i++) gifts.push(pool[((h >>> 5) + i * 2) % pool.length]);
  return { coins: 400 + (h % 7) * 100, gifts };
}
// top the guaranteed kit back up; true if anything was restocked
function ensureBankPermanents(net) {
  if (!hasBankAccount(net) || !bankInfoFor(net)) return false;
  const arr = bankArrFor(net);
  let changed = false;
  for (const [id, q] of BANK_PERMANENTS) {
    if (!ITEMS[id]) continue;
    const s = arr.find(b => b.id === id);
    if (!s) { arr.push({ id, qty: q }); changed = true; }
    else if (s.qty < q) { s.qty = q; changed = true; }
  }
  if (changed) bankRev++;
  return changed;
}
// "(214 tiles north-west)" pointer for the ledger-refusal message
function bankCompassHint(tx, ty) {
  const dx = tx - player.x, dy = ty - player.y;
  const d = Math.round(Math.hypot(dx, dy));
  if (d < 40) return ""; // it's right here in town
  const dirs = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) & 7;
  return ` (${d} tiles ${dirs[a]})`;
}
// Callers (1):
//  skills/crafting.js:5
function openBank(node) {
  const bx = node ? node.x : player.x, by = node ? node.y : player.y;
  const net = bankNetFor(bx, by);
  const info = bankInfoFor(net);
  if (info && !hasBankAccount(net)) {
    let where;
    if (info.branch) {
      where = `with a banker at the main branch in ${info.branch.name}${bankCompassHint(info.branch.x, info.branch.y)}`;
    } else {
      // a tiny village co-op: any member village's bank clerk signs you up
      const names = info.members.map(m => m.name);
      const list = names.length === 1 ? names[0]
        : names.length === 2 ? names[0] + " or " + names[1]
        : names.slice(0, -1).join(", ") + ", or " + names[names.length - 1];
      let nm = info.members[0], nd = Infinity;
      for (const m of info.members) {
        const d = (m.x - player.x) * (m.x - player.x) + (m.y - player.y) * (m.y - player.y);
        if (d < nd) { nd = d; nm = m; }
      }
      where = `with the bank clerk in ${list}${bankCompassHint(nm.x, nm.y)}`;
    }
    log(`The chest is sealed by the ${info.title} — and its ledger holds no account in your name. Open one ${where}.`, "warn");
    return;
  }
  if (player.bankNet !== net) bankRev++;        // different vault: force a rebuild
  player.bankNet = net;
  player.bank = bankArrFor(net);
  ensureBankPermanents(net);                    // the guaranteed kit is always in place
  openTrade("bank", bankNetName(net), bx, by);
  bankFilter.q = "";
  document.getElementById("banksearch").value = "";
  bankShownRev = -1;
  renderBank();
}
// signing the ledger: the account opens, the bonus + gifts land in the vault
function openBankAccountFor(net, npc) {
  player.bankAccounts = player.bankAccounts || {};
  player.bankAccounts[net] = 1;
  const arr = bankArrFor(net), perks = bankPerksFor(net);
  const add = (id, q) => {
    const b = arr.find(x => x.id === id);
    if (b) b.qty += q; else arr.push({ id, qty: q });
  };
  add("coins", perks.coins);
  for (const [id, q] of perks.gifts) if (ITEMS[id]) add(id, q);
  ensureBankPermanents(net);
  bankRev++;
  uiDirty = true;
  sfx("coins", 0.8);
  log(`${npc ? npc.name + " stamps the ledger — w" : "W"}elcome to the ${bankNetName(net)}! ` +
    `${perks.coins} coins and the bank's welcome gifts are waiting in your new vault.`, "gold");
}
// the banker's counter pitch (main-branch signup dialog)
let bankSignupEl = null;
function openBankSignup(npc, net) {
  const perks = bankPerksFor(net), bname = bankNetName(net);
  const nameOf = id => (ITEMS[id] && ITEMS[id].name) || id;
  const giftList = perks.gifts.map(([id, q]) => q > 1 ? `${q} × ${nameOf(id)}` : nameOf(id)).join(", ");
  const permList = BANK_PERMANENTS.map(([id]) => nameOf(id)).join(", ");
  if (!bankSignupEl) {
    bankSignupEl = document.createElement("div");
    bankSignupEl.id = "banksignup";
    document.body.appendChild(bankSignupEl);
  }
  bankSignupEl.innerHTML =
    `<div class="bswin"><div class="bshead"></div><div class="bsbody"></div>` +
    `<div class="bsbtns"><button class="bsyes">Open an account</button><button class="bsno">Not today</button></div></div>`;
  const sInfo = bankInfoFor(net);
  bankSignupEl.querySelector(".bshead").textContent =
    bname + (sInfo && sInfo.branch ? " — Main Branch" : " — Village Counter");
  bankSignupEl.querySelector(".bsbody").innerHTML =
    `<p>${npc.name} slides a ledger across the counter:</p>` +
    `<p>“Open an account today and the ${bname} deposits a welcome of <b>${perks.coins} coins</b> ` +
    `with <b>${giftList}</b> straight into your vault.”</p>` +
    `<p>“And our standing promise: your account is never without <b>${permList}</b> — ` +
    `withdraw the last one at any of our chests, wherever you are, and the bank replaces it.”</p>`;
  const close = () => { bankSignupEl.style.display = "none"; };
  bankSignupEl.style.display = "flex";
  bankSignupEl.onclick = e => { if (e.target === bankSignupEl) close(); };
  bankSignupEl.querySelector(".bsno").onclick = close;
  bankSignupEl.querySelector(".bsyes").onclick = () => {
    close();
    openBankAccountFor(net, npc);
    openBank(npc); // straight to the fresh vault so the welcome gift is visible
  };
}
// talking to a main-branch banker: signup pitch, or straight to your vault
function bankerTalk(npc) {
  const net = bankNetFor(npc.x, npc.y);
  if (hasBankAccount(net)) {
    log(`${npc.name}: "Good day! Your ${bankNetName(net)} account stands ready."`, "sys");
    openBank(npc);
  } else {
    openBankSignup(npc, net);
  }
}
// Deposit up to n from inventory slot i into the vault. Used by the normal
// inventory panel while the bank window is open (there is no separate
// deposit grid any more).
function depositToBank(i, n) {
  const s = player.inv[i];
  if (!s) return;
  n = Math.min(n, s.qty);
  if (n <= 0) return;
  const b = player.bank.find(b2 => b2.id === s.id);
  if (b) b.qty += n;
  else player.bank.push({ id: s.id, qty: n });
  s.qty -= n;
  if (s.qty <= 0) player.inv[i] = null;
  bankRev++;
  uiDirty = true;
}
// Callers (4):
//  main/ui.js:44,190,208,227
// per-item slot element cache: the icon canvas is drawn ONCE per item id and
// reused across every rebuild — with a big vault, recreating hundreds of
// canvases per deposit/withdraw was most of the remaining bank lag
const bankSlotCache = new Map(); // id -> { el, qtyEl, lastQty }
function bankSlotFor(s) {
  const def = ITEMS[s.id];
  let c = bankSlotCache.get(s.id);
  if (!c) {
    const el = document.createElement("div");
    el.className = "slot";
    const cv = document.createElement("canvas");
    cv.width = 32; cv.height = 32;
    cv.getContext("2d").drawImage(icon(def.icon), 0, 0);
    el.appendChild(cv);
    const q = document.createElement("span");
    q.className = "qty";
    el.appendChild(q);
    el.title = def.name;
    c = { el, qtyEl: q, lastQty: -1 };
    bankSlotCache.set(s.id, c);
  }
  if (c.lastQty !== s.qty) {
    c.qtyEl.textContent = s.qty === 1 ? "" : s.qty >= 100000 ? Math.floor(s.qty / 1000) + "k" : s.qty;
    c.lastQty = s.qty;
  }
  return c.el;
}
function renderBank() {
  if (bankShownRev === bankRev) return;
  bankShownRev = bankRev;
  const grid = document.getElementById("bankgrid");
  // show the biggest stacks first, not insertion order; apply the category
  // tab and search box
  const sortedBank = player.bank.slice().sort((a, b) => b.qty - a.qty)
    .filter(s => (bankFilter.cat === "all" || bankCat(s.id) === bankFilter.cat) &&
      (!bankFilter.q || (ITEMS[s.id] && ITEMS[s.id].name.toLowerCase().includes(bankFilter.q))));
  const frag = document.createDocumentFragment();
  sortedBank.forEach(s => {
    const d = bankSlotFor(s);
    const withdraw = n => {
      n = Math.min(n, s.qty);
      let moved = 0;
      for (let k = 0; k < n; k++) {
        if (!addItem(s.id, 1)) break;
        moved++;
      }
      if (!moved) { log("Your inventory is full.", "warn"); return; }
      s.qty -= moved;
      if (s.qty <= 0) player.bank.splice(player.bank.indexOf(s), 1);
      // the bank's guaranteed kit: withdrawing the last one restocks it, so
      // an account is never without its flint/candle/axe/pick/soap
      if (s.qty <= 0 && ensureBankPermanents(player.bankNet))
        log(`The ${bankNetName(player.bankNet)} restocks your ${(ITEMS[s.id] ? ITEMS[s.id].name : s.id).toLowerCase()} — account holders are never without one.`, "sys");
      bankRev++;
      uiDirty = true;
      renderBank();
    };
    d.onclick = e => withdraw(e.altKey ? s.qty : e.shiftKey ? 5 : 1);
    d.oncontextmenu = e => amountMenu(e, "Withdraw", "all", withdraw);
    frag.appendChild(d);
  });
  if (!sortedBank.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = player.bank.length ? "Nothing in the vault matches." : "Your bank is empty.";
    frag.appendChild(p);
  }
  grid.replaceChildren(frag);
}

// craft / plant / alchemy windows (share the #trade modal's craft section)
// Callers (3):
//  main/ui.js:258,276,296
function craftRow(iconKey, title, sub, locked, onclick) {
  const d = document.createElement("div");
  d.className = "recipe" + (locked ? " locked" : "");
  const cv = document.createElement("canvas");
  cv.width = 32; cv.height = 32;
  cv.getContext("2d").drawImage(icon(iconKey), 0, 0);
  d.appendChild(cv);
  const info = document.createElement("div");
  info.className = "rinfo";
  info.innerHTML = `<div class="rname">${title}</div><div class="rreq">${sub}</div>`;
  d.appendChild(info);
  d.onclick = onclick;
  return d;
}

// batch amount for the crafting panel: 1 / 5 / 10 / max. "max" = run an active
// recipe until materials run out, or queue the biggest affordable passive batch.
let craftQty = "max";
function craftAmount(recipe) {
  if (craftQty !== "max") return +craftQty;
  let m = Infinity;
  for (const [id, q] of Object.entries(recipe.in)) m = Math.min(m, Math.floor(countItem(id) / q));
  return recipe.passive ? Math.max(1, m === Infinity ? 1 : m) : Infinity;
}
function primaryOut(r) { return (r.outputs && r.outputs[0] && r.outputs[0].id) || r.out; }

// Callers (1):
//  skills/crafting.js:9
function openCraft(node, recipes) {
  openTrade("craft", node.dyn ? "Campfire" : STATIONS[node.type].name,
    node.x != null ? node.x : player.x, node.y != null ? node.y : player.y);
  const list = document.getElementById("craftlist");
  list.innerHTML = "";
  // batch selector
  const bar = document.createElement("div");
  bar.className = "batchbar";
  ["1", "5", "10", "max"].forEach(v => {
    const b = document.createElement("button");
    b.textContent = v === "max" ? "Max" : v;
    b.className = "batchbtn" + (craftQty === v ? " active" : "");
    b.onclick = () => { craftQty = v; openCraft(node, recipes); };
    bar.appendChild(b);
  });
  list.appendChild(bar);
  // ---- output box: passive jobs at this station. Finished goods sit here
  // (like a little bank slot on the station) until the player collects them;
  // unfinished ones show a countdown.
  const pending = (player.jobs || []).filter(j => node.type == null || j.station == null || j.station === node.type);
  const ready = pending.filter(j => Date.now() >= j.doneAt);
  if (pending.length) {
    const box = document.createElement("div");
    box.className = "outputbox";
    const hdr = document.createElement("div");
    hdr.className = "contracthdr";
    hdr.textContent = "Station output:";
    box.appendChild(hdr);
    const row = document.createElement("div");
    row.className = "outputrow";
    for (const j of pending) {
      const r = typeof jobRecipe === "function" ? jobRecipe(j) : null;
      const outId = r ? primaryOut(r) : null;
      const done = Date.now() >= j.doneAt;
      const left = Math.max(0, Math.ceil((j.doneAt - Date.now()) / 1000));
      const d = slotEl(outId && ITEMS[outId] ? ITEMS[outId].icon : null, j.qty,
        (r ? r.name : "Job") + (done ? " — ready!" : ` — ${left}s left`));
      if (done) {
        d.classList.add("ready");
        d.onclick = () => { collectReadyJobs(node.type); openCraft(node, recipes); };
      } else {
        d.classList.add("cooking");
        const t = document.createElement("span");
        t.className = "cooktime";
        t.textContent = left + "s";
        d.appendChild(t);
      }
      row.appendChild(d);
    }
    box.appendChild(row);
    if (ready.length) {
      const btn = document.createElement("button");
      btn.className = "collectbtn";
      btn.textContent = `Collect finished goods (${ready.reduce((n, j) => n + j.qty, 0)})`;
      btn.onclick = () => { collectReadyJobs(node.type); openCraft(node, recipes); };
      box.appendChild(btn);
    }
    list.appendChild(box);
    // live countdowns: refresh once a second while jobs are still cooking
    if (pending.some(j => Date.now() < j.doneAt)) {
      clearTimeout(openCraft._tick);
      openCraft._tick = setTimeout(() => {
        if (tradeCtx && tradeCtx.mode === "craft") openCraft(node, recipes);
      }, 1000);
    }
  }
  // ---- pilot-fire panel: heat stations show their current heat and a Stoke
  // button. Firemaking-fuelled trades can't run until the fire is hot enough.
  const heatStation = typeof isHeatSkill === "function" && recipes.some(r => isHeatSkill(r.skill));
  let curHeat = 0;
  if (heatStation) {
    curHeat = stationHeatNow(node);
    const left = stationBurnLeft(node);
    const box = document.createElement("div");
    box.className = "heatbox";
    // conserve premium fuel: default stoke burns the cheapest log hot enough for
    // what you can craft here; right-click forces the hottest fuel (charcoal).
    const bi = bestLogIndex(stationTargetHeat(node));
    const hi = bestLogIndex(Infinity);
    const lit = curHeat > 0;
    const info = document.createElement("div");
    info.className = "heatinfo";
    info.innerHTML = `<span class="heatflame">${lit ? "🔥" : "🪵"}</span> Fire heat: <b>${curHeat}°</b>`
      + `<span class="heatmax"> / ${HEAT_MAX}°</span>` + (lit ? ` · ${left}s left` : " · cold");
    box.appendChild(info);
    const btn = document.createElement("button");
    btn.className = "stokebtn";
    if (bi >= 0) {
      const logName = ITEMS[player.inv[bi].id].name;
      btn.textContent = `🔥 Stoke fire (burn 1 ${logName})`;
      btn.title = hi >= 0 && hi !== bi
        ? `Right-click to stoke with your hottest fuel (${ITEMS[player.inv[hi].id].name}) instead`
        : "Burns the cheapest fuel hot enough for what you can craft here";
      btn.onclick = () => { stokeFire(node, bi); openCraft(node, recipes); };
      btn.oncontextmenu = e => { e.preventDefault(); stokeFire(node, hi); openCraft(node, recipes); };
    } else {
      btn.textContent = "🔥 Stoke fire — no logs in your pack";
      btn.disabled = true;
    }
    box.appendChild(btn);
    list.appendChild(box);
    // live-decay the readout while the panel is open
    clearTimeout(openCraft._heatTick);
    openCraft._heatTick = setTimeout(() => {
      if (tradeCtx && tradeCtx.mode === "craft") openCraft(node, recipes);
    }, 1000);
  }
  // Only show recipes the player's skill level actually allows — locked
  // higher-tier recipes stay hidden until the level is reached.
  const unlocked = recipes.filter(r => skillLvl(r.skill) >= r.req);
  for (const r of unlocked) {
    const outId = primaryOut(r);
    const haveMats = Object.entries(r.in).every(([id, q]) => countItem(id) >= q);
    const need = heatStation && isHeatSkill(r.skill) ? reqHeat(r) : 0;
    const hotEnough = need <= curHeat;
    const dur = r.passive ? (r.time || r.tick || 0) : 0;
    const fireLasts = !need || !r.passive || stationBurnLeft(node) * 1000 >= dur;
    const have = haveMats && hotEnough && fireLasts;
    const needs = Object.entries(r.in).map(([id, q]) => `${q} ${ITEMS[id].name}`).join(", ");
    const bys = (r.byproducts || []).map(b => ITEMS[b.id] && ITEMS[b.id].name).filter(Boolean);
    let sub = `${r.skill} ${r.req} — needs ${needs}`;
    if (need) sub += ` · 🔥 ${need}°${hotEnough ? "" : " (too cold)"}`;
    if (bys.length) sub += ` · yields ${bys.join(", ")}`;
    if (r.passive) sub += ` · passive ~${Math.ceil((r.time || r.tick || 0) / 1000)}s${need && !fireLasts ? " (fire too brief)" : ""}`;
    list.appendChild(craftRow(ITEMS[outId].icon, r.name, sub, !have, () => {
      if (!haveMats) { log("You don't have the materials.", "warn"); return; }
      if (!hotEnough) { log(`The fire isn't hot enough (${curHeat}° / ${need}°). Stoke it with logs.`, "warn"); return; }
      if (!fireLasts) { log(`The fire won't last the ~${Math.ceil(dur / 1000)}s firing. Stoke it with charcoal — it burns far longer.`, "warn"); return; }
      closeTrade(); beginCraft(r, node, craftAmount(r));
    }));
  }
}

// Callers (1):
//  skills/farming.js:5
function openPlantPanel(node) {
  openTrade("craft", node.skill ? node.skill + " field" : "Farm plot", node.x, node.y);
  const list = document.getElementById("craftlist");
  list.innerHTML = "";
  // A field is dedicated to one agriculture skill — only show that skill's crops.
  // Otherwise (legacy plots) show any crop you have seeds for or have unlocked.
  const kinds = Object.keys(CROPS).filter(k => {
    const c = CROPS[k];
    if (node.skill && c.skill !== node.skill) return false;
    return countItem(c.seed) > 0 || skillLvl(c.skill || "Farming") >= c.req;
  }).sort((a, b) => (CROPS[a].skill || "").localeCompare(CROPS[b].skill || "") || CROPS[a].req - CROPS[b].req);
  for (const kind of kinds) {
    const crop = CROPS[kind], sk = crop.skill || "Farming";
    const ok = skillLvl(sk) >= crop.req;
    const have = countItem(crop.seed) >= 1;
    const sub = `${sk} ${crop.req} — needs 1 ${ITEMS[crop.seed].name} (have ${countItem(crop.seed)})`;
    list.appendChild(craftRow(ITEMS[crop.item].icon, `Plant ${crop.name}`, sub, !(ok && have), () => {
      if (ok && have) { closeTrade(); plantCrop(node, kind); }
      else if (!ok) log(`You need ${sk} level ${crop.req} for that.`, "warn");
      else log("You don't have the seeds.", "warn");
    }));
  }
  if (!kinds.length) list.innerHTML = "<p class='hint'>You have no seeds. Buy some from a trader, then plant here.</p>";
}

// Callers (1):
//  skills/crafting.js:7
function openAlchemy(node) {
  openTrade("craft", "Alchemy table", node.x, node.y);
  const list = document.getElementById("craftlist");
  list.innerHTML = "";
  const rate = Math.min(0.8, 0.5 + eff("Alchemy") * 0.005);
  const seen = new Set();
  for (const s of player.inv) {
    if (!s || s.id === "coins" || seen.has(s.id)) continue;
    seen.add(s.id);
    const def = ITEMS[s.id];
    const gold = Math.max(1, Math.floor(def.value * rate));
    list.appendChild(craftRow(def.icon, `Transmute ${def.name}`, `${gold} coins each (${Math.round(rate * 100)}% value)`, false, () => {
      closeTrade();
      player.act = { kind: "alch", itemId: s.id, node, nextAt: now + 600 };
      log("You focus on the transmutation...");
    }));
  }
  if (!seen.size) list.innerHTML = "<p class='hint'>Nothing to transmute. Bring items!</p>";
}
