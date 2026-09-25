// Dockmaster Pell (Newhaven harbour side) — the Harbour Ledger arc (start +
// finale), and he accepts Cook Bess's pie delivery.
opnpc1("nh_dockmaster")

// Cook's delivery (Meals on Legs): take the pie off the player's hands.
if (quests[ck_pie] == 1) {
    if (find_uid(hot_pie) == TRUE) {
        invDel(hot_pie, 1)
        chatnpc("A hot pie? From Bess? ...I don't deserve that woman. Tell her thank you — and that I ate it, all of it.")
        stop()
    }
}

// --- Harbour Ledger, stage 1: fetch the master tally from Archivist Wren ---
if (quests[hl] == 0) {
    chatnpc("Cargo won't tally. Either I've forgotten how to count, or someone's skimming my harbour. Fetch the master copy from Archivist Wren — she keeps the true numbers.")
    p_choice("I'll get the ledger.", response = 0, "Not my business.", response = 1)
    if (response == 0) { quests[hl] = 1; mes("Harbour Ledger (1/4): see Archivist Wren, north of the plaza.") }
    else chatnpc("Suit yourself. But smuggling is everyone's business, eventually.")
    stop()
}
if (quests[hl] == 1) { chatnpc("Wren keeps the archive, north side of the plaza. She'll have the sealed tally."); stop() }

// stage 3: player brought the sealed tally back — read it, set the hunt
if (quests[hl] == 2) {
    if (find_uid(sealed_tally) == TRUE) {
        invDel(sealed_tally, 1)
        quests[hl] = 3
        quests[hl_bandit_base] = kills(bandit)
        chatnpc("Let's see, by the tides... there. The missing crates went east — the road bandits are fencing my cargo. Break four of them and search what they've stashed for proof.")
        mes("Harbour Ledger (3/4): break the road bandits (0/4).")
    } else chatnpc("Bring me Wren's sealed tally and we'll know who's lying to me.")
    stop()
}
if (quests[hl] == 3) {
    if (kills(bandit) - quests[hl_bandit_base] >= 4) {
        quests[hl] = 4
        chatnpc("Four down, and the fence's name in your hand. Now the hard part: the smuggler is one of my own dockhands. Do we hand him to the Watch — or keep it quiet for a share?")
    } else chatnpc("Four of the road bandits. That's the proof I need.")
    stop()
}

// stage 4: the finale choice
if (quests[hl] == 4) {
    p_choice("Hand him to the Watch.", response = 0, "Keep it quiet — take the cut.", response = 1)
    if (response == 0) {
        quests[hl] = 5
        invAdd(coins, 500)
        give_xp(Melee, 200)
        questpoint_add(2)
        chatnpc("The honest road. The Watch has him, the harbour's clean, and Newhaven won't forget who set it right.")
        mes("Harbour Ledger complete — justice served.")
    } else {
        quests[hl] = 6
        invAdd(coins, 800)
        chatnpc("...quietly, then. Here's your share. We never spoke — and Newhaven never knew.")
        mes("Harbour Ledger complete — hushed up.")
    }
    stop()
}

chatnpc("The harbour runs smooth these days. Mostly. Fair winds to you.")
