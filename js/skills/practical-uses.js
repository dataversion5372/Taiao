// ===== Isle of Emberfall — practical uses for the "paper" & "glass" trades =====
// Gives more crafted goods a real job, the way soap (stink), candles (light) and
// food (well-fed) do:
//   • Bookbinding — READ a book to study: a burst of skill XP (consumed). Themed
//     books teach their subject; a plain book helps your weakest skill along.
//   • Bookbinding cartography (maps/atlases/charts) — a REUSABLE reference: use
//     it to reveal the world map around wherever you're standing.
//   • Glassblowing — a SPYGLASS (built from lenses): reveal the map even wider.
// Perfume (dab a fine soap on to mask stink) lives in gameplay/stink.js.
"use strict";

// which skill a book teaches (unlisted books just help your lowest skill along)
var BOOK_SKILL = {
  scroll: "Magic", codex: "Magic", tome: "Magic", grimoire: "Magic", spellbook: "Magic",
  missal: "Magic", psalter: "Magic", bible: "Magic", jeweled_bible: "Magic",
  illuminated_manuscript: "Magic", master_grand_tome: "Magic",
  herbal: "Herbiculture", almanac: "Cerealiculture", bestiary: "Foraging",
};

function lowestTrainableSkill() {
  if (typeof SKILLS === "undefined") return null;
  var best = null, bl = 1e9;
  for (var i = 0; i < SKILLS.length; i++) {
    var s = SKILLS[i]; if (s === "Health") continue;
    var l = (typeof skillLvl === "function") ? skillLvl(s) : 1;
    if (l < (typeof MAX_LEVEL !== "undefined" ? MAX_LEVEL : 32) && l < bl) { bl = l; best = s; }
  }
  return best;
}

// read a book for a burst of XP (the book is used up)
function readBook(i) {
  var s = player.inv[i]; if (!s) return;
  var def = ITEMS[s.id]; if (!def || !def.readable) return;
  var rb = def.readable;
  var skill = rb.skill === "__lowest" ? lowestTrainableSkill() : rb.skill;
  if (!skill || (typeof skillLvl === "function" && skillLvl(skill) >= (typeof MAX_LEVEL !== "undefined" ? MAX_LEVEL : 32))) {
    // fall back to any skill still worth training
    skill = lowestTrainableSkill();
  }
  if (skill) {
    addXp(skill, rb.xp, true);
    log("You pore over the " + def.name.toLowerCase() + " — +" + rb.xp + " " + skill + " xp.", "gold");
  } else {
    log("You read the " + def.name.toLowerCase() + ", but there's nothing left for it to teach you.", "sys");
  }
  s.qty -= 1; if (s.qty <= 0) player.inv[i] = null;
  uiDirty = true;
}

// use a map/atlas/spyglass to reveal the world map around the player (reusable)
function useReveal(i) {
  var s = player.inv[i]; if (!s) return;
  var def = ITEMS[s.id]; if (!def || !def.reveal || typeof world === "undefined" || !world) return;
  var R = def.reveal, CS = world.CHUNK;
  var pcx = Math.floor(player.x / CS), pcy = Math.floor(player.y / CS), added = 0;
  for (var dy = -R; dy <= R; dy++)
    for (var dx = -R; dx <= R; dx++) {
      var key = (pcx + dx) + "," + (pcy + dy);
      if (typeof seenChunks !== "undefined" && !seenChunks.has(key)) { seenChunks.add(key); added++; }
    }
  log("You study the " + def.name.toLowerCase() + " — the map fills in around you" + (added ? " (" + added + " new areas charted)." : "; nothing new here."), "sys");
  uiDirty = true;
}

// ---- enrich Bookbinding output into readable books / reveal references ----
(function () {
  if (typeof ITEMS === "undefined" || typeof RECIPES === "undefined" || !RECIPES.bookbinding) return;
  var REVEAL_R = { map: 4, sea_chart: 5, atlas: 7, royal_atlas: 9 };
  for (var i = 0; i < RECIPES.bookbinding.length; i++) {
    var r = RECIPES.bookbinding[i], id = r.out, def = ITEMS[id];
    if (!def) continue;
    if (r.family === "cartography" || REVEAL_R[id]) {
      def.reveal = REVEAL_R[id] || 5;          // reusable map/atlas/chart
    } else {
      def.readable = { skill: BOOK_SKILL[id] || "__lowest", xp: 25 + (r.req || 1) * 16 };
      if (typeof EXAMINE !== "undefined" && !/read/i.test(EXAMINE[id] || ""))
        EXAMINE[id] = def.name + " — read it (study) for a burst of "
          + (BOOK_SKILL[id] ? BOOK_SKILL[id] : "skill") + " experience.";
    }
  }
})();

// ---- SPYGLASS (Glassblowing) — a reusable far-seeing map tool from lenses ----
(function () {
  if (typeof ITEMS === "undefined" || ITEMS.spyglass) return;
  if (typeof defineIcon === "function") defineIcon("i_spyglass", "i_rod", 912, " sepia(0.5) saturate(1.2) brightness(0.9)");
  ITEMS.spyglass = { name: "Spyglass", icon: "i_spyglass", value: 160, reveal: 6 };
  if (typeof EXAMINE !== "undefined") EXAMINE.spyglass = "A brass spyglass — look through it to chart the world map far around you.";
  if (typeof registerPlaceholder === "function") registerPlaceholder("spyglass", "Spyglass", "tool — tinted rod-icon placeholder");
  if (typeof RECIPES !== "undefined" && RECIPES.glassblowing && ITEMS.lens &&
      !RECIPES.glassblowing.some(function (r) { return r.out === "spyglass"; })) {
    RECIPES.glassblowing.push({
      id: "assemble_spyglass", out: "spyglass", name: "Assemble a spyglass", skill: "Glassblowing",
      req: 18, xp: 130, in: { lens: 2, boards: 1 }, tick: 2000, family: "optics",
      stations: ["glass_furnace", "workbench", "furnace"],
    });
  }
})();
