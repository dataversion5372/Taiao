// Te Kairaranga, the Weaver — QuestScript port of gameplay/wizard.js. A plaza
// NPC who folds the player through the veil to their tower, gifts a wand + starter
// runes (once), and teaches the chant-sentence grammar. A second body waits at the
// tower so the lesson is re-readable. towerPos() stays a JS service (elevation math).
opwizard("*")
say("Kia ora.")
sfx("book")

// At the plaza: pitch the lesson, and on acceptance fold through to the tower.
if (at_tower() == FALSE) {
    if (quests[weaver_taught] == 0) {
        dialog("Te Kairaranga — the Weaver",
            "\"You hear it too, eh? Underneath the gulls and the hammering — the world hums. Wind, water, stone: one long song.\"\n\"What towners call magic is just joining in. You speak a sentence INTO the weave — each word a rune, burnt from your pouch as it leaves your lips.\"",
            "Teach me the weave", response = 0, "Another time", response = 1)
    } else {
        dialog("Te Kairaranga — the Weaver",
            "\"Sentence not landing? Substance then verb — 'air strike'. Runes pouched, wand in hand, Enter or V.\"\n\"Want the tower again? The veil remembers the way.\"",
            "To the tower", response = 0, "Just passing", response = 1)
    }
    if (response != 0) stop()
    teleport(weaver_tower_x(), weaver_tower_y())
}

// At the tower (arrived just now, or the player was already here): gift once, teach.
if (quests[weaver_gift] == 0) {
    invAdd(wand, 1)
    invAdd(air_rune, 30)
    invAdd(rune_1, 30)
    invAdd(fire_rune, 12)
    quests[weaver_gift] = 1
    mes("Gift received: Wand, 30x Air rune, 30x Strike rune, 12x Fire rune.")
}

if (quests[weaver_taught] == 0) {
    quests[weaver_taught] = 1
    dialog("The tower between",
        "\"Welcome to my tower. Every wizard keeps one, and every wizard's knees despise the stairs — so we came the other way.\"\n\"A weave is a SUBSTANCE and a VERB, in order. 'Air strike.' 'Fire strike.' A wand holds two words; a staff, three.\"",
        "Continue", response = 0)
    dialog("Your first sentence",
        "\"Take this wand, and runes enough to be dangerous — mostly to yourself. Pouch each rune stack, wield the wand, then press Enter to type your sentence — or V to speak it.\"\n\"Find something that deserves an 'air strike' and give it one.\"",
        "Send me home", response = 0, "I'll look around first", response = 1)
} else {
    dialog("The Weaver, at the tower",
        "\"Substance, then verb: 'air strike', 'fire strike'. Pouch the runes, wield the wand, Enter to type or V to speak.\"\n\"The deeper runes — modifiers, wildcards — you'll meet as your Runecrafting grows.\"",
        "Send me home", response = 0, "Thanks", response = 1)
}
if (response == 0) teleport(spawn_x(), spawn_y())
