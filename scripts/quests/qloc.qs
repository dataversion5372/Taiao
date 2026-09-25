// World objects for the Newhaven retrieve quests (world/quest-anchors.js paints
// these at fixed plaza tiles; oploc fires on click). Each only yields its prize
// while the matching quest stage is active — otherwise it's just scenery.

// The urchin's locket, behind the harbour-side planter.
oploc1("qloc_locket")
if (quests[ur_locket] == 1) {
    invAdd(locket, 1)
    loc_del(^loc_respawn_none)
    mes("You prise a tarnished locket from behind the planter.")
} else mes("A city planter. Nothing hidden here — for now.")

// The ranger's strongbox, stashed in the cold west-wall brazier.
oploc1("qloc_cache")
if (quests[rg_cache] == 1) {
    invAdd(road_cache, 1)
    loc_del(^loc_respawn_none)
    mes("You lever open the ranger's cache and lift out the strongbox.")
} else mes("A cold brazier. Nothing to take.")
