// Ranger Ash (Newhaven plaza) — the road out of town, and a lost cache.
opnpc1("nh_ranger")

// --- Quest 1: Clear the Road (hunt bandits) ---
if (quests[rg_bandit] == 0) {
    chatnpc("Bandits are working the east road out of Newhaven. Put down four and the rest will think twice about robbing travellers.")
    p_choice("I'll clear the road.", response = 0, "Not today.", response = 1)
    if (response == 0) {
        quests[rg_bandit_base] = kills(bandit)
        quests[rg_bandit] = 1
        mes("Quest started: Clear the Road (0/4 bandits).")
    } else chatnpc("Travellers keep vanishing on that road. Don't wait too long.")
    stop()
}
if (quests[rg_bandit] == 1) {
    if (kills(bandit) - quests[rg_bandit_base] >= 4) {
        quests[rg_bandit] = 2
        invAdd(coins, 400)
        give_xp(Melee, 300)
        questpoint_add(1)
        chatnpc("The road's quiet again. That was dangerous work — and good work.")
        mes("Quest complete: Clear the Road.")
    } else chatnpc("Four bandits. They camp where the road bends east, past the last farm.")
    stop()
}

// --- Quest 2: The Ranger's Cache (retrieve from the world) ---
if (quests[rg_cache] == 0) {
    chatnpc("I stashed a strongbox before the bandits jumped me — tucked in the old cold brazier by the west wall. Bring it back and it's half yours.")
    p_choice("I'll recover it.", response = 0, "Later.", response = 1)
    if (response == 0) { quests[rg_cache] = 1; mes("Quest started: The Ranger's Cache — search the west-wall brazier.") }
    else chatnpc("It won't stay hidden forever.")
    stop()
}
if (quests[rg_cache] == 1) {
    if (find_uid(road_cache) == TRUE) {
        invDel(road_cache, 1)
        quests[rg_cache] = 2
        invAdd(coins, 220)
        invAdd(iron_bar, 2)
        questpoint_add(1)
        chatnpc("My thanks — and the bars are yours, I've no forge to use them.")
        mes("Quest complete: The Ranger's Cache.")
    } else chatnpc("The strongbox is in the cold brazier by the west wall. Can't miss it.")
    stop()
}

chatnpc("Roads are as safe as they get, for now. Watch yourself past the walls.")
