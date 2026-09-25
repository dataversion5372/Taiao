// Trader interaction policy — runs when the player talks to any shopkeeper.
// Owns the two gates that used to be hard-wired in talkTo(): the stink lock and
// the night-closed check. If neither bars the way, open the shop.
optrader("*")
if (stink_blocks_shops() == TRUE) {
    chatnpc("Faugh — you reek! Go wash before you set foot in my shop.")
    stop()
}
if (shop_closed() == TRUE) {
    chatnpc("We're closed for the night. Come back in the morning.")
    stop()
}
open_shop()
