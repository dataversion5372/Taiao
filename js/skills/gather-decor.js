// ===== Isle of Emberfall — gatherable natural decorations =====
// Turns three families of scenery into gatherable resource nodes:
//   • boulders      → mined (Ore-mining) for stone-type items
//   • mossy boulders→ mined for stone-type items AND moss
//   • wildflowers   → picked (Foraging) for cut flowers
// The world-scatter (world/chunks.js) reads GATHER_NODE_DECOR to place these
// keys as nodes instead of static decor; the reward logic lives in
// skills/gathering.js (stoneNode → level-gated STONE_TIERS, moss flag → moss).
"use strict";

(function () {
  const _rs = (typeof respawnFor === "function") ? respawnFor : (r => 8000 + r * 500);

  // ---- items ----
  if (typeof SPR !== "undefined" && !SPR.i_moss)
    SPR.i_moss = ["t", 25, 9, { filter: "saturate(1.4) brightness(0.78) hue-rotate(-12deg)" }]; // darkened bush → mossy clump
  if (typeof ITEMS !== "undefined") {
    if (!ITEMS.moss) ITEMS.moss = { name: "Moss", icon: "i_moss", stack: true, value: 3 };
    const FLOWERS = [["white", "White"], ["blue", "Blue"], ["orange", "Orange"], ["purple", "Purple"]];
    for (const [c, C] of FLOWERS) {
      const id = "flower_" + c;
      if (!ITEMS[id]) ITEMS[id] = { name: C + " flower", icon: id, stack: true, value: 2 };
      if (typeof EXAMINE !== "undefined") EXAMINE[id] = EXAMINE[id] || `A freshly-picked ${c} flower.`;
    }
    if (typeof EXAMINE !== "undefined") EXAMINE.moss = EXAMINE.moss || "A damp clump of green moss.";
  }

  // ---- nodes ----
  if (typeof NODE_TYPES !== "undefined") {
    NODE_TYPES.boulder = {
      name: "Boulder", spr: "boulder", skill: "Stone-mining", req: 1, xp: 12,
      item: "limestone", tool: "pickaxe", tick: 1700, depleteCh: 0.4,
      respawn: _rs(1), deadSpr: "rock_dead", stoneNode: true,
    };
    NODE_TYPES.moss_rock = {
      name: "Mossy boulder", spr: "moss_rock", skill: "Stone-mining", req: 1, xp: 14,
      item: "limestone", tool: "pickaxe", tick: 1750, depleteCh: 0.4,
      respawn: _rs(1), deadSpr: "rock_dead", stoneNode: true, moss: true,
    };
    for (const [c, C] of [["white", "White"], ["blue", "Blue"], ["orange", "Orange"], ["purple", "Purple"]]) {
      NODE_TYPES["flower_" + c] = {
        name: C + " flower", spr: "flower_" + c, skill: "Foraging", req: 1, xp: 8,
        item: "flower_" + c, tool: null, tick: 1200, depleteCh: 1,
        respawn: _rs(1), deadSpr: null, gatherVerb: "Pick",
      };
    }
  }

  // world-scatter diversion table (key → blocking flag for addNode). Boulders
  // block like ore rocks; flowers stay walkable.
  if (typeof window !== "undefined")
    window.GATHER_NODE_DECOR = {
      boulder: true, moss_rock: true,
      flower_white: false, flower_blue: false, flower_orange: false, flower_purple: false,
    };
})();
