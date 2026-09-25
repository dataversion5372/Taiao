// Bob's Lost Axe — the first QuestScript. Talk to Bob to start; find his rusty
// axe out in the world and bring it back for a reward.
//
// Trigger: talking to the NPC named "bob".
opnpc1("bob")
if (quests[bobs_axe_quest] == 0) {
    chatnpc("Ugh, I've lost my axe somewhere out there. Could you find it for me?")
    p_choice("Yes, I'll help.", response = 0, "No thanks.", response = 1)

    if (response == 0) {
        quests[bobs_axe_quest] = 1
        mes("Quest stage: Bob's Lost Axe started.")
    }
    else chatnpc("Oh well, let me know if you change your mind.")
}

if (quests[bobs_axe_quest] == 1) {
    if (find_uid("rusty_axe") == TRUE) {
        invDel(rusty_axe, 1)
        invAdd(coins, 500)
        quests[bobs_axe_quest] = 2
        chatnpc("My axe! Thank you so much — here's 500 coins for your trouble.");
        questpoint_add(1);
        mes("Quest stage: Bob's Lost Axe completed!")
    } else chatnpc("Still haven't found it, eh? It's probably near the old stump.")
}

if (quests[bobs_axe_quest] == 2) chatnpc("Thanks again for finding my axe!")

// Picking up the axe object in the world.
oploc1("rusty_axe")
if (quests[bobs_axe_quest] == 1) {
    invAdd("rusty_axe", 1)
    loc_del(^loc_respawn_none)
    mes("You pick up the rusty axe.")
} else mes("Nothing interesting happens.")
