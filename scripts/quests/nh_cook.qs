// Cook Bess (Newhaven plaza) — a gather and a delivery (to Dockmaster Pell).
opnpc1("nh_cook")

// --- Quest 1: Daily Bread (gather wheat) ---
if (quests[ck_wheat] == 0) {
    chatnpc("The bakehouse is out of flour and I'm clean out of wheat. Bring me ten sheaves from the farm rings round the walls?")
    p_choice("I'll gather it.", response = 0, "No time.", response = 1)
    if (response == 0) { quests[ck_wheat] = 1; mes("Quest started: Daily Bread — bring 10 wheat.") }
    else chatnpc("A city marches on its stomach, remember.")
    stop()
}
if (quests[ck_wheat] == 1) {
    if (invTotal(wheat) >= 10) {
        invDel(wheat, 10)
        quests[ck_wheat] = 2
        invAdd(coins, 180)
        invAdd(cooked_meat, 3)
        give_xp(Cooking, 140)
        questpoint_add(1)
        chatnpc("Bless you — fresh loaves by morning. Here, a hot meal to see you off.")
        mes("Quest complete: Daily Bread.")
    } else chatnpc("Ten sheaves of wheat, from the farm rings round the walls.")
    stop()
}

// --- Quest 2: Meals on Legs (deliver a pie to Dockmaster Pell) ---
if (quests[ck_pie] == 0) {
    chatnpc("Do me a kindness — run this hot pie down to Dockmaster Pell before it goes cold. The man forgets to eat.")
    invAdd(hot_pie, 1)
    quests[ck_pie] = 1
    mes("Quest started: Meals on Legs — take the hot pie to Dockmaster Pell.")
    stop()
}
if (quests[ck_pie] == 1) {
    if (find_uid(hot_pie) == TRUE) {
        chatnpc("You've still got the pie! Pell's down by the harbour — off you go before it's stone cold.")
    } else {
        quests[ck_pie] = 2
        invAdd(coins, 90)
        give_xp(Cooking, 60)
        questpoint_add(1)
        chatnpc("He got it, then? Good soul. Here's for the wear on your boots.")
        mes("Quest complete: Meals on Legs.")
    }
    stop()
}

chatnpc("Kitchen's warm and the stores are full. Come back hungry.")
