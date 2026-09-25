// Sparrow the Urchin (Newhaven plaza) — a retrieve quest and a moral choice.
opnpc1("nh_urchin")

// --- Quest 1: The Urchin's Locket (retrieve from the world) ---
if (quests[ur_locket] == 0) {
    chatnpc("I lost my ma's locket — dropped it behind the big stone planter over on the harbour side. Fetch it back? I'll make it worth your while.")
    p_choice("I'll find it.", response = 0, "Sorry, no.", response = 1)
    if (response == 0) { quests[ur_locket] = 1; mes("Quest started: The Urchin's Locket — search the planter near the docks.") }
    else chatnpc("...fine. Everyone's too busy for a street rat.")
    stop()
}
if (quests[ur_locket] == 1) {
    if (find_uid(locket) == TRUE) {
        invDel(locket, 1)
        quests[ur_locket] = 2
        invAdd(coins, 150)
        give_xp(Foraging, 90)
        questpoint_add(1)
        chatnpc("You found it! ...Thank you. Truly. Here — it's not much, but it's honestly yours.")
        mes("Quest complete: The Urchin's Locket.")
    } else chatnpc("Behind the stone planter on the harbour side, I swear it. Big square one.")
    stop()
}

// --- Quest 2: Finders Keepers (a choice) ---
if (quests[ur_purse] == 0) {
    chatnpc("Here's a game. I found a fat purse a merchant dropped. Help me decide — hand it back like an honest soul, or split it and say nothing?")
    p_choice("Hand it back. It's the honest thing.", response = 0, "Split it — finders keepers.", response = 1)
    if (response == 0) {
        quests[ur_purse] = 2
        invAdd(coins, 120)
        give_xp(Foraging, 80)
        questpoint_add(1)
        chatnpc("...yeah. Yeah, alright. The Watch gave a finder's reward — half's yours, the honest half.")
        mes("Quest complete: Finders Keepers (returned).")
    } else {
        quests[ur_purse] = 3
        invAdd(coins, 300)
        chatnpc("Ha — knew I liked you. Don't go spending it where the Watch can see.")
        mes("Quest complete: Finders Keepers (kept).")
    }
    stop()
}

chatnpc("Keep your ears open round the plaza. I hear things — might have work again soon.")
