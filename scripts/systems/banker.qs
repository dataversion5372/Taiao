// Banker interaction — runs when the player talks to any banker. If they already
// hold an account on this bank network, open the vault; otherwise pitch a signup.
opbanker("*")
if (has_account() == TRUE) {
    open_bank()
} else {
    chatnpc("Care to open an account with us? It comes with a welcome gift.")
    p_choice("Open an account", response = 0, "Not now", response = 1)
    if (response == 0) {
        bank_open_account()
        open_bank()
    } else chatnpc("Very well — the offer stands whenever you're ready.")
}
