// Quartermaster Yorick (Newhaven plaza) — two hunts that keep the wilds honest.
// Hunt progress uses the bestiary tally: snapshot kills() at start, check the
// delta at turn-in.
opnpc1("nh_quartermaster")

// --- Quest 1: Cull the Goblins ---
if (quests[qm_goblin] == 0) {
    chatnpc("Goblins are massing past the north fields. Thin them out — five should teach the rest some manners.")
    p_choice("I'll cull them.", response = 0, "Not just now.", response = 1)
    if (response == 0) {
        quests[qm_goblin_base] = kills(goblin)
        quests[qm_goblin] = 1
        mes("Quest started: Cull the Goblins (0/5).")
    } else chatnpc("The fields will still be there when you change your mind.")
    stop()
}
if (quests[qm_goblin] == 1) {
    if (kills(goblin) - quests[qm_goblin_base] >= 5) {
        quests[qm_goblin] = 2
        invAdd(coins, 300)
        give_xp(Melee, 250)
        questpoint_add(1)
        chatnpc("Five fewer to worry about — Newhaven owes you. Take these coins, with thanks.")
        mes("Quest complete: Cull the Goblins.")
    } else chatnpc("Still green hides out past the fields. Five goblins — keep at it.")
    stop()
}

// --- Quest 2: Boar Trouble (unlocks after the goblins) ---
if (quests[qm_boar] == 0) {
    chatnpc("Now the boar are trampling the farm rows. Put down three of the tuskers, would you?")
    p_choice("Consider it done.", response = 0, "Later.", response = 1)
    if (response == 0) {
        quests[qm_boar_base] = kills(boar)
        quests[qm_boar] = 1
        mes("Quest started: Boar Trouble (0/3).")
    } else chatnpc("Mind the rows aren't bare by the time you get to it.")
    stop()
}
if (quests[qm_boar] == 1) {
    if (kills(boar) - quests[qm_boar_base] >= 3) {
        quests[qm_boar] = 2
        invAdd(coins, 250)
        give_xp(Melee, 180)
        questpoint_add(1)
        chatnpc("Good hunting. The farmers will sleep easier tonight.")
        mes("Quest complete: Boar Trouble.")
    } else chatnpc("Three boar. The rows won't mend themselves.")
    stop()
}

chatnpc("Nothing new just now. Keep the wilds honest, and the walls will hold.")
