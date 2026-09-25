// Archivist Wren (Newhaven plaza, north) — the middle of the Harbour Ledger arc,
// plus a standalone gather. She keeps the zone's names and numbers.
opnpc1("nh_archivist")

// --- Harbour Ledger, stage 2: hand over the sealed tally ---
if (quests[hl] == 1) {
    chatnpc("Pell sent you? The harbour tally — sealed and true. Take it to him, and tell him the archive's numbers do not lie.")
    invAdd(sealed_tally, 1)
    quests[hl] = 2
    mes("Harbour Ledger (2/4): return the sealed tally to Dockmaster Pell.")
    stop()
}
if (quests[hl] == 2) { chatnpc("Back to Pell with that seal, if you please. I've copying to do."); stop() }

// --- Standalone: Room to Read (gather logs) ---
if (quests[ar_shelf] == 0) {
    chatnpc("The archive grows and my shelves do not. Bring me fifteen logs and I'll set the joiner to building more.")
    p_choice("I'll bring the wood.", response = 0, "Some other time.", response = 1)
    if (response == 0) { quests[ar_shelf] = 1; mes("Quest started: Room to Read — bring 15 logs.") }
    else chatnpc("Knowledge needs somewhere to sit, you know.")
    stop()
}
if (quests[ar_shelf] == 1) {
    if (invTotal(logs) >= 15) {
        invDel(logs, 15)
        quests[ar_shelf] = 2
        invAdd(coins, 220)
        give_xp(Woodcutting, 200)
        questpoint_add(1)
        chatnpc("Splendid — a whole new bay of shelves. Here, for the sweat of it.")
        mes("Quest complete: Room to Read.")
    } else chatnpc("Fifteen logs. The joiner is waiting, and so am I.")
    stop()
}

chatnpc("Every name in the zone, written and safe. Come browse when you've learned to read.")
