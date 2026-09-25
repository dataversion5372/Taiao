// Herbalist Maeve (Newhaven plaza) — two gathers from the meadow and hedgerows.
// Gather progress is checked at turn-in against the pack (invTotal), then consumed.
opnpc1("nh_herbalist")

// --- Quest 1: Simples for the Sick ---
if (quests[hb_herb] == 0) {
    chatnpc("Fever's going round the lower ward. I need eight sprigs of herb from the meadow — will you gather them?")
    p_choice("I'll fetch them.", response = 0, "No time.", response = 1)
    if (response == 0) { quests[hb_herb] = 1; mes("Quest started: Simples for the Sick — bring 8 herb.") }
    else chatnpc("Don't dawdle. Fever waits for no one.")
    stop()
}
if (quests[hb_herb] == 1) {
    if (invTotal(herb) >= 8) {
        invDel(herb, 8)
        quests[hb_herb] = 2
        invAdd(coins, 200)
        invAdd(potion_health, 2)
        give_xp(Foraging, 220)
        questpoint_add(1)
        chatnpc("Bless you — that's the ward mended. Here, two draughts for your own trouble.")
        mes("Quest complete: Simples for the Sick.")
    } else chatnpc("Eight sprigs of herb, mind. The meadow's thick with it if you look low.")
    stop()
}

// --- Quest 2: A Sweeter Remedy (needs berries) ---
if (quests[hb_berry] == 0) {
    chatnpc("The children won't take bitter physic. Bring me twelve berries and I'll sugar it.")
    p_choice("Berries it is.", response = 0, "Another day.", response = 1)
    if (response == 0) { quests[hb_berry] = 1; mes("Quest started: A Sweeter Remedy — bring 12 berries.") }
    else chatnpc("The hedgerows are heavy with them just now.")
    stop()
}
if (quests[hb_berry] == 1) {
    if (invTotal(berries) >= 12) {
        invDel(berries, 12)
        quests[hb_berry] = 2
        invAdd(coins, 180)
        give_xp(Foraging, 160)
        questpoint_add(1)
        chatnpc("There — they'll swallow it smiling now. My thanks.")
        mes("Quest complete: A Sweeter Remedy.")
    } else chatnpc("Twelve berries. Sweet ones, from the hedgerows past the gate.")
    stop()
}

chatnpc("The stores are stocked, thanks to you. Come back if you find anything unusual growing.")
