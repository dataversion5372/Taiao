// ===== Isle of Emberfall — tiered tools, weapons, armour & jewelry (auto-generated) =====
// Specializes the 48 smeltable bars (32 METALS + 16 alloys — see content.js
// and alloys.js) into three EXCLUSIVE 16-bar rosters by metallurgical
// character: sharp/hard metals forge weapons & tools, tough/resilient metals
// forge armour, luxurious/precious metals become jewelry. Every metal is
// used in exactly one trade. Each roster is re-ranked 0..15 by its own
// "power" (a base metal's METALS index, or an alloy's highest-tier ore
// component).
//
// Within a metal's rank n (1-indexed: n = rank+1), its item KINDS split into
// two level tiers: "lesser" kinds unlock at level 2n-1, "greater" kinds at
// level 2n — so all 16 ranks together exactly fill levels 1..32 (MAX_LEVEL),
// two levels per metal, one lesser and one greater kind-group per level pair.
// `p = levelIndex = req-1` (0..31) feeds the ORIGINAL 0..31-shaped tierVal/
// tierXp/power/block curves from the previous single-tier-per-metal version
// of this file, so a greater-tier item is a genuine step up from its metal's
// own lesser-tier item, not just a relabelling.
//
// Loaded after content.js (METALS/tierVal/tierXp/defineIcon), metalcraft.js
// (Jewelry skill + jewelers_bench station) and alloys.js (the 16 alloy bars
// + their `alloyTier` field) and toolcraft.js (tool_handle item).
"use strict";

(function () {
  const idxByBar = {};
  METALS.forEach((m, i) => { idxByBar[m.bar] = i; });
  // a bar's "power" for ranking within its assigned trade: a base metal's
  // METALS index, or an alloy's highest-tier ore component (alloys.js)
  const powerOf = barId => idxByBar[barId] != null ? idxByBar[barId] : (ITEMS[barId].alloyTier || 0);
  const displayName = barId => ITEMS[barId].name.replace(/ bar$/, "");
  const shortBar = barId => barId.replace(/^bar_/, "m").replace(/_bar$/, "");
  const rankOf = bars => bars.slice().sort((a, b) => powerOf(a) - powerOf(b) || a.localeCompare(b));
  // lesser kind of rank r (0-indexed) unlocks at level 2r+1, greater at 2r+2;
  // p is the 0..31 level-index (req-1) that feeds the value/xp/power/block curves
  const lesserReq = rank => rank * 2 + 1;
  const greaterReq = rank => rank * 2 + 2;

  // ---------------------------------------------------------------
  // the three exclusive 16-bar rosters (every one of the 48 bars appears in
  // exactly one — verified: 12 base metals + 4 alloys each for weapons/tools
  // and armour, 8 base metals + 8 alloys for jewelry = 32 base + 16 alloys)
  // ---------------------------------------------------------------
  const WEAPON_TOOL_BARS = ["iron_bar", "bar_7", "tool_steel_bar", "bar_10", "ferrotitanium_bar",
    "bar_14", "bar_15", "bar_16", "damasteel_bar", "bar_17", "bar_18", "dragonsteel_bar",
    "bar_19", "bar_21", "bar_23", "bar_24"]; // Iron/Cobalt/Tool steel/Tungsten/Ferrotitanium/
    // Adamantite/Darksteel/Meteorite/Damasteel/Runite/Dragonite/Dragonsteel/Voidsteel/Bloodiron/Emberite/Stormsteel
  const ARMOUR_BARS = ["bronze_bar", "bar_3", "bar_4", "bar_6", "bar_11", "bar_12", "bar_13",
    "bar_20", "bar_22", "bar_25", "bar_26", "bar_30", "voidforged_bar", "twilight_bar",
    "nickel_silver_bar", "cupronickel_bar"]; // Bronze/Zinc/Lead/Nickel/Titanium/Mithril/Orichalcum/
    // Starmetal/Frostiron/Duskmetal/Dawnmetal/Chronite/Voidforged steel/Twilight alloy/Nickel silver/Cupronickel
  const JEWELRY_BARS = ["bar_1", "brass_bar", "pewter_bar", "bar_5", "sterling_silver_bar",
    "gold_bar", "rose_gold_bar", "giltsilver_bar", "bar_9", "white_gold_bar", "bar_27",
    "bar_28", "skysteel_bar", "bar_29", "bar_31", "chronesteel_bar"]; // Tin/Brass/Pewter/Silver/
    // Sterling silver/Gold/Rose gold/Giltsilver/Platinum/White gold/Aetherium/Celestium/Skysteel/Infernium/Eternium/Chronesteel

  const wtSorted = rankOf(WEAPON_TOOL_BARS);
  const arSorted = rankOf(ARMOUR_BARS);
  const jwSorted = rankOf(JEWELRY_BARS);

  let pi = 620;
  const mkItem = (id, name, icon, props) => {
    if (ITEMS[id]) return false;
    ITEMS[id] = Object.assign({ name, icon }, props);
    return true;
  };

  // ====================================================================
  // TOOLS — 16 sharp/hard metals; hoe/shovel/sickle lesser, pickaxe/axe/hammer greater
  // ====================================================================
  const TOOL_KINDS = [
    ["hoe", "Hoe", "i_pick", 0], ["shovel", "Shovel", "i_pick", 0], ["sickle", "Sickle", "i_pick", 0],
    ["pickaxe", "Pickaxe", "i_pick", 1], ["axe", "Axe", "i_axe", 1], ["hammer", "Hammer", "i_pick", 1],
  ];
  RECIPES.toolmaking = RECIPES.toolmaking || [];
  wtSorted.forEach((bar, rank) => {
    const mname = displayName(bar);
    for (const [kind, label, fallbackIcon, greater] of TOOL_KINDS) {
      const req = greater ? greaterReq(rank) : lesserReq(rank);
      const p = req - 1, xp = tierXp(p, 40);
      const id = `${kind}_${shortBar(bar)}`;
      const name = `${mname} ${label}`;
      const iconKey = "i_" + id;
      defineIcon(iconKey, fallbackIcon, pi++, "");
      const made = mkItem(id, name, iconKey, { value: 12 + Math.round(tierVal(p) * 1.4), tool: kind, toolPower: p });
      if (!made) continue;
      EXAMINE[id] = `${name}.`;
      const barQty = 1 + (p > 15 ? 1 : 0);
      RECIPES.toolmaking.push({
        id: `forge_${id}`, out: id, name: `Forge ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()}`,
        skill: "Toolmaking", req, xp, in: { [bar]: barQty, tool_handle: 1 },
        tick: 1700 + req * 25, family: "tiered_tools", stations: ["toolsmith", "anvil", "workbench"],
      });
    }
  });

  // ====================================================================
  // WEAPONS — same 16 metals; dagger/shortsword/spear/mace lesser,
  // longsword/greatsword/battleaxe/warhammer/halberd greater
  // ====================================================================
  const WEAPON_KINDS = [
    ["dagger", "Dagger", 0.70, 1, "i_sw_fe", 0], ["shortsword", "Shortsword", 0.85, 2, "i_sw_fe", 0],
    ["spear", "Spear", 0.90, 2, "i_sw_fe", 0], ["mace", "Mace", 1.05, 2, "i_sw_fe", 0],
    ["longsword", "Longsword", 1.00, 2, "i_sw_fe", 1], ["greatsword", "Greatsword", 1.25, 3, "i_sw_fe", 1],
    ["battleaxe", "Battleaxe", 1.15, 2, "i_axe", 1], ["warhammer", "Warhammer", 1.30, 2, "i_pick", 1],
    ["halberd", "Halberd", 1.20, 3, "i_axe", 1],
    // exotic blade kinds (2026-09 art drop — see gear-icons-data.js): the
    // curved-blade family. Tantō and kris are dagger-class sidearms
    // (offhand-capable, below), the rest span the one-handed ladder.
    ["tanto", "Tantō", 0.72, 1, "i_sw_fe", 0], ["kris", "Kris", 0.78, 1, "i_sw_fe", 0],
    ["kukri", "Kukri", 0.85, 1, "i_sw_fe", 0], ["wakizashi", "Wakizashi", 0.92, 2, "i_sw_fe", 0],
    ["scimitar", "Scimitar", 1.05, 2, "i_sw_fe", 1], ["dao", "Dao", 1.08, 2, "i_sw_fe", 1],
    ["khopesh", "Khopesh", 1.10, 2, "i_sw_fe", 1], ["kilij", "Kilij", 1.12, 2, "i_sw_fe", 1],
    ["shamshir", "Shamshir", 1.15, 2, "i_sw_fe", 1], ["katana", "Katana", 1.18, 3, "i_sw_fe", 1],
  ];
  RECIPES.weaponsmithing = RECIPES.weaponsmithing || [];
  RECIPES.armoursmithing = RECIPES.armoursmithing || [];
  wtSorted.forEach((bar, rank) => {
    const mname = displayName(bar);
    for (const [kind, label, mult, barQty, fallbackIcon, greater] of WEAPON_KINDS) {
      const req = greater ? greaterReq(rank) : lesserReq(rank);
      const p = req - 1, xp = tierXp(p, 50);
      const id = `${kind}_${shortBar(bar)}`;
      const name = `${mname} ${label}`;
      const iconKey = "i_" + id;
      defineIcon(iconKey, fallbackIcon, pi++, "");
      const power = Math.max(1, Math.round((1 + p * 0.7) * mult));
      // wieldReq: melee weapons need the Melee level of their tier.
      // Daggers are offhand-capable: with a bow in the main hand they equip
      // into the shield slot as the archer's sidearm (see equipItem/combat).
      const props = { value: 30 + Math.round(tierVal(p) * 3.2), equip: "weapon", power, wieldReq: req };
      if (kind === "dagger" || kind === "tanto" || kind === "kris") props.offhand = true;
      const made = mkItem(id, name, iconKey, props);
      if (!made) continue;
      EXAMINE[id] = `${name}.`;
      RECIPES.weaponsmithing.push({
        id: `smith_${id}`, out: id, name: `Smith ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()}`,
        skill: "Weaponsmithing", req, xp, in: { [bar]: barQty },
        tick: 1900 + req * 25, family: "tiered_weapons", stations: ["anvil"],
      });
    }
  });

  // ====================================================================
  // ARMOUR — 16 tough/resilient metals; helm/boots lesser, chest/legs greater
  // ====================================================================
  // 7th element: the anatomical EQUIP_SLOTS this kind covers (state.js) — a
  // full helm covers hair/face/back_of_head at once, boots cover both feet
  // AND ankles, a chestplate covers torso+both shoulders+both arms, leg
  // armour covers both legs. `kind` stays the id/family prefix; `equip`
  // below is this slot LIST, not `kind` itself.
  const ARMOR_KINDS = [
    ["helm", "Helm", 0.15, 1, "i_shield", 0, ["hair", "face", "back_of_head"]],
    ["boots", "Boots", 0.20, 1, "i_shield", 0, ["left_foot", "right_foot", "anklet1", "anklet2"]],
    ["chest", "Chestplate", 0.35, 3, "i_body", 1, ["torso", "pauldron1", "pauldron2", "left_arm", "right_arm"]],
    ["legs", "Legs", 0.30, 2, "i_body", 1, ["left_leg", "right_leg"]],
    // 2026-09 art drop: lighter piecemeal armour — a lesser-tier torso
    // option and slot-fillers for the anatomical slots the chestplate
    // otherwise monopolises (gloves displace rings from the hand slots)
    ["chainbody", "Chainbody", 0.26, 2, "i_body", 0, ["torso"]],
    ["pauldrons", "Pauldrons", 0.10, 1, "i_shield", 0, ["pauldron1", "pauldron2"]],
    ["platearms", "Plate arms", 0.14, 1, "i_shield", 1, ["left_arm", "right_arm"]],
    ["gloves", "Gauntlets", 0.09, 1, "i_shield", 0, ["left_hand", "right_hand"]],
    // SHIELDS — one family per shield kind, all in the offhand "shield" slot.
    // Icons repointed per metal by js/sprites/shield-icons-data.js (2 matrix
    // sheets: 5 martial + 6 cultural kinds x the 16 armour metals).
    ["heater",   "Heater shield", 0.70, 2, "i_shield", 1, ["shield"]],
    ["kite",     "Kite shield",   0.72, 2, "i_shield", 1, ["shield"]],
    ["round",    "Round shield",  0.65, 2, "i_shield", 1, ["shield"]],
    // Buckler removed from the metal shield family: bucklers are now exclusively the
    // carpentry wooden bucklers (woodcraft.js wc_buckler_*), so the name isn't shared.
    // (shield-icons-data.js keeps a "buckler" sheet row; it just repoints nothing now.)
    ["tower",    "Tower shield",  1.00, 3, "i_shield", 1, ["shield"]],
    ["aspis",    "Aspis",         0.80, 3, "i_shield", 1, ["shield"]],
    ["scutum",   "Scutum",        0.90, 3, "i_shield", 1, ["shield"]],
    ["targe",    "Targe",         0.65, 2, "i_shield", 0, ["shield"]],
    ["chimalli", "Chimalli",      0.60, 2, "i_shield", 0, ["shield"]],
    ["dhal",     "Dhal",          0.45, 2, "i_shield", 0, ["shield"]],
    ["pavise",   "Pavise",        1.10, 3, "i_shield", 1, ["shield"]],
  ];
  arSorted.forEach((bar, rank) => {
    const mname = displayName(bar);
    for (const [kind, label, share, barQty, fallbackIcon, greater, slots] of ARMOR_KINDS) {
      const req = greater ? greaterReq(rank) : lesserReq(rank);
      const p = req - 1, xp = tierXp(p, 45);
      const totalBlock = 0.04 + p * 0.011;
      const id = `${kind}_${shortBar(bar)}`;
      const name = `${mname} ${label}`;
      const iconKey = "i_" + id;
      defineIcon(iconKey, fallbackIcon, pi++, "");
      const block = Math.round(totalBlock * share * 1000) / 1000;
      // wearReq: armour needs the Defence level of its tier
      const made = mkItem(id, name, iconKey, { value: 25 + Math.round(tierVal(p) * 2.4), equip: slots, block, wearReq: req });
      if (!made) continue;
      EXAMINE[id] = `${name}.`;
      RECIPES.armoursmithing.push({
        id: `smith_${id}`, out: id, name: `Smith ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()}`,
        skill: "Armoursmithing", req, xp, in: { [bar]: barQty },
        tick: 1900 + req * 25, family: "tiered_armor", stations: ["anvil"],
      });
    }
  });

  // ====================================================================
  // JEWELRY — 16 luxurious metals; ring/bracelet lesser, necklace greater
  // (all three equippable — ring/bracelet as EQUIP_CHOICES pseudo-tags,
  // "any hand"/"any bracelet slot" default-right; necklace fixed to neck,
  // hitBonus). Ring and bracelet share the same "ring" shape (see
  // jewelry-icons-data.js) — matches the pre-existing convention
  // (metalcraft.js's own gold_bracelet/beaded_bracelet already reuse i_ring).
  // ====================================================================
  RECIPES.jewelry = RECIPES.jewelry || [];
  jwSorted.forEach((bar, rank) => {
    const mname = displayName(bar);
    for (const [kind, label] of [["ring", "ring"], ["bracelet", "bracelet"], ["anklet", "anklet"]]) {
      const req = lesserReq(rank), p = req - 1, xp = tierXp(p, 35);
      const id = `${kind}_${shortBar(bar)}`;
      const name = `${mname} ${label}`;
      const iconKey = "i_" + id;
      defineIcon(iconKey, "i_ring", pi++, "");
      const made = mkItem(id, name, iconKey, { value: 20 + Math.round(tierVal(p) * 2.0), finished: true, stack: true, equip: kind });
      if (!made) continue;
      EXAMINE[id] = `${name}.`;
      RECIPES.jewelry.push({
        id: "jewel_" + id, out: id, name: `Craft a ${name.toLowerCase()}`, skill: "Jewelry", req, xp,
        in: { [bar]: 1 }, tick: 1800 + req * 20, family: "tiered_rings", stations: ["jewelers_bench", "furnace"],
      });
    }
    // necklace — equippable (neck slot), modest hitBonus scaling with rank
    // (0..5, matching the existing curated amulets' max hitBonus of 5)
    {
      const req = greaterReq(rank), p = req - 1, xp = tierXp(p, 35);
      const id = "necklace_" + shortBar(bar);
      const name = `${mname} necklace`;
      const iconKey = "i_" + id;
      defineIcon(iconKey, "i_amulet", pi++, "");
      const hitBonus = Math.round(rank / 3);
      const made = mkItem(id, name, iconKey, { value: 60 + Math.round(tierVal(p) * 4.5), equip: "neck", hitBonus });
      if (made) {
        EXAMINE[id] = hitBonus ? `${name}. +${hitBonus} max hit.` : `${name}.`;
        RECIPES.jewelry.push({
          id: "jewel_" + id, out: id, name: `Craft a ${name.toLowerCase()}`, skill: "Jewelry", req, xp: xp + 15,
          in: { [bar]: 2 }, tick: 2000 + req * 20, family: "tiered_amulets", stations: ["jewelers_bench", "furnace"],
        });
      }
    }
  });

  // ====================================================================
  // ASSAYING PARITY — the assay furnace refines the SAME 16 luxurious metals
  // the jewelry trade works, one per rank at the lesser level (2n-1), so the
  // two trades share a roster exactly and Assaying starts at level 1 (Tin).
  // Gold, Silver and Platinum are skipped — metalcraft.js already has richer
  // refine/cupel/assay chains for those three.
  // ====================================================================
  RECIPES.assaying = RECIPES.assaying || [];
  jwSorted.forEach((bar, rank) => {
    const mname = displayName(bar);
    if (/^(Gold|Silver|Platinum)$/.test(mname)) return;
    const req = lesserReq(rank);
    const out = rank >= 10 ? "fine_platinum" : /gold|brass/i.test(mname) ? "fine_gold" : "fine_silver";
    RECIPES.assaying.push({
      id: "assay_" + shortBar(bar), out,
      name: `Assay ${mname.toLowerCase()}`,
      skill: "Assaying", req, xp: 26 + req * 4, in: { [bar]: 1 + (rank > 7 ? 1 : 0) },
      passive: true, time: 10000 + req * 250, tick: 10000 + req * 250,
      family: "refining", stations: ["assay_furnace", "furnace"],
    });
  });

  // ====================================================================
  // ARROWHEADS & ARROWS — same 16 sharp/hard metals as weapons/tools.
  // A proper two-step chain (unlike content.js's plain 32-tier `arrows_i`,
  // which stays untouched as the simple one-step option for all 32 metals):
  // Weaponsmithing forges the arrowhead (lesser tier, level 2n-1), then Fletching
  // assembles arrowhead + shafts into a full batch of arrows (greater tier,
  // level 2n) — mirrors how every other pair here shares a metal's rank but
  // splits into two level slots, just across two different skills instead
  // of one. `bestArrow`/combat.js pick these up automatically since it only
  // ever looks for `.arrowPower`, not a specific id pattern.
  // ====================================================================
  RECIPES.fletching = RECIPES.fletching || [];
  wtSorted.forEach((bar, rank) => {
    const mname = displayName(bar);
    // arrowhead — lesser tier, Weaponsmithing, sellable component
    const headReq = lesserReq(rank), headP = headReq - 1, headXp = tierXp(headP, 30);
    const headId = "arrowhead_" + shortBar(bar);
    const headName = `${mname} Arrowhead`;
    defineIcon("i_" + headId, "i_sw_fe", pi++, "");
    if (mkItem(headId, headName, "i_" + headId, { value: 4 + Math.round(tierVal(headP) * 0.6), stack: true, finished: true })) {
      EXAMINE[headId] = `${headName}.`;
      RECIPES.weaponsmithing.push({
        id: `smith_${headId}`, out: headId, qty: 15, name: `Smith ${headName.toLowerCase()}s`,
        skill: "Weaponsmithing", req: headReq, xp: headXp, in: { [bar]: 1 },
        tick: 1800 + headReq * 20, family: "tiered_arrowheads", stations: ["anvil"],
      });
    }
    // arrow — greater tier, Fletching, equippable-ammo (arrowPower)
    const arrReq = greaterReq(rank), arrP = arrReq - 1, arrXp = tierXp(arrP, 40);
    const arrId = "arrow_" + shortBar(bar);
    const arrName = `${mname} Arrows`;
    defineIcon("i_" + arrId, "i_arrows", pi++, "");
    if (mkItem(arrId, arrName, "i_" + arrId, { value: 2 + Math.round(tierVal(arrP) * 0.4), stack: true, arrowPower: 1 + Math.round(arrP * 0.55), equip: "quiver" })) {
      EXAMINE[arrId] = `${arrName}.`;
      RECIPES.fletching.push({
        id: `fletch_${arrId}`, out: arrId, qty: 15, name: `Fletch ${arrName.toLowerCase()}`,
        skill: "Fletching", req: arrReq, xp: arrXp, in: { arrow_shafts: 15, [headId]: 15 },
        tick: 1900 + arrReq * 20, family: "tiered_arrows", stations: ["workbench"],
      });
    }
  });

  for (const cat in RECIPES) RECIPES[cat].forEach((r, i) => {
    if (!r.id) r.id = cat + ":" + (r.out || i) + ":" + i;
    if (!r.family) r.family = cat;
  });
})();
