#!/usr/bin/env python3
"""Generate STATE-conditioned Emberfall NPC SFT data where NPCs REACT to the
player's live condition — stink, wounds, combat renown, and how heavily armed
they are — on top of the existing location/time/weather/mood/relationship/shop
schema. Output matches js/gameplay/npc-chat.js → npcPersona so training == inference.

Usage: python gen_npc_data_v2.py --n 4500 --out emberfall_npc_reactions.jsonl [--seed 11]
"""
import argparse, json, random, hashlib

# role -> (skill, location, voice, traits, stock)  — mirrors the game's NPC_ROLE_INFO
ROLE_INFO = {
 "fisher":("Fishing","harbour","weathered","patient, plain-spoken","hooks, line, bait, smoked eel"),
 "farmer":("Farming","lower fields","rough","hardy, blunt","seed, onions, beans, oats"),
 "miller":("Milling","mill","steady","precise, tired","wheat flour, barley meal, oat flour, bran"),
 "baker":("Baking","bakehouse","warm","cheerful, floury","bread, oatcakes, meat pies, berry tarts"),
 "cook":("Cooking","inn kitchen","boisterous","busy, generous","stew, roast meat, fish pie, whitebait fritters"),
 "brewer":("Brewing","brew shed","mellow","easygoing, proud","small ale, cider, malt, yeast"),
 "beekeeper":("Beekeeping","orchard hives","soft","calm, careful","honey, beeswax, candles, propolis"),
 "herbalist":("Foraging","herb garden","quiet","knowing, wry","dried herbs, roots, flowers, salves"),
 "apothecary":("Potionmaking","apothecary","precise","clinical, dry","empty vials, tonics, salves, dried ingredients"),
 "woodcutter":("Woodcutting","forest edge","gruff","strong, direct","logs, kindling, handles, split timber"),
 "carpenter":("Carpentry","work yard","craftsmanlike","measured, exact","planks, pegs, tool handles, simple furniture"),
 "fletcher":("Fletching","fletcher's bench","focused","steady, terse","arrows, shafts, bowstrings, feathers"),
 "miner":("Ore-mining","mine mouth","rough","tough, grim","iron ore, copper, coal, a lump of tin"),
 "blacksmith":("Smithing","the forge","gruff","solid, proud","nails, hinges, axe heads, blades"),
 "armourer":("Smithing","armoury","stern","exacting, blunt","helms, mail rings, buckles, plate"),
 "mason":("Stone-mining","stoneyard","solid","slow, deliberate","cut stone, slate, lime, gravel"),
 "potter":("Pottery","kiln","calm","patient, tidy","pots, jugs, bowls, crocks"),
 "tanner":("Tanning","tanning racks","salt-dry","blunt, brisk","leather, hide, straps, pouches"),
 "weaver":("Weaving","loom-house","rhythmic","focused, wry","wool, cloth, thread, a warm cloak"),
 "dyer":("Dyeing","dye yard","colourful","lively, stained","dyed wool, woad, madder, fixed cloth"),
 "tailor":("Tailoring","tailor's shop","refined","neat, particular","tunics, cloaks, caps, mended garments"),
 "jeweller":("Jewelry","jeweller's bench","elegant","delicate, sharp-eyed","rings, amulets, cut gems, gold wire"),
 "hunter":("Hunting","the lodge","low","watchful, spare","furs, venison, snares, a bundle of arrows"),
 "forager":("Foraging","forest edge","wandering","curious, gentle","berries, mushrooms, nuts, wild herbs"),
 "sailor":("Sailing","the docks","salt-dry","hearty, rough","rope, salt, canvas, a sea-charm"),
 "ferryman":("Sailing","the ferry landing","slow","laconic, dry","a crossing, a pole, a bailing pail"),
 "merchant":("Trading","the market stall","smooth","shrewd, chatty","tools, cloth, spices, trinkets"),
 "innkeeper":("Cooking","the tavern","welcoming","jovial, quick","a mug of ale, a hot meal, a bed for the night"),
 "guard":("Melee","the gate","strict","watchful, curt","none listed"),
 "healer":("Potionmaking","the sickhouse","gentle","kind, tired","bandages, tonics, poultices, clean water"),
 "dockworker":("Sailing","the docks","rough-friendly","burly, blunt","crates, rope, a hand with your load"),
 "stablehand":("Husbandry","the stables","soft-spoken","quiet, steady","feed, tack, a stall for the night"),
 "shepherd":("Husbandry","the pasture","mellow","calm, weather-worn","wool, mutton, cheese, a fleece"),
 "orchardist":("Farming","the orchard","warm","patient, sunny","apples, pears, cider, dried fruit"),
 "boatbuilder":("Shipwrighting","the boatyard","craftsmanlike","careful, proud","planks, pitch, oars, a small skiff"),
 "cartwright":("Carpentry","the cart shed","mechanical","practical, terse","wheels, axles, cart parts, grease"),
 "scribe":("Bookbinding","the scriptorium","academic","precise, formal","ink, parchment, quills, a copied page"),
 "storyteller":("Storytelling","the tavern","lyrical","colourful, warm","a tale, a song, a rumour or two"),
 "elder":("Lore","the meeting hall","reflective","dignified, slow","none listed"),
 "mapmaker":("Cartography","the map room","measured","meticulous, calm","maps, charts, a compass, ink"),
}
ROLES = list(ROLE_INFO)

TIMES   = ["dawn","morning","midday","afternoon","dusk","evening"]
WEATHER = ["clear","windy","cold","warm","misty","light rain","steady rain","storm threatening"]
MOODS   = ["busy","calm","tired","curious","concerned","pleased","cheerful","irritated"]
RELS    = [("hostile",-55),("wary",-25),("unfamiliar",0),("neutral",15),("friendly",35),("trusted",60),("close",80)]
SKILLS  = ["novice","beginner","competent","skilled","expert"]
STINK   = ["fresh","whiffy","rank","reeking"]
HEALTH  = ["hale","hurt","wounded","bloodied","near death"]
COMBAT  = ["green","seasoned","veteran","renowned","legendary"]
ARMED   = ["unarmed","armed","armed and armoured"]
NAMES = ["Mira","Bram","Ketha","Sten","Torin","Wrenna","Alden","Peca","Ysolde","Garrick","Nessa","Corin",
 "Halda","Dob","Elga","Fenn","Marga","Osric","Petra","Rulf","Selam","Tupa","Karim","Nezahual","Wilf",
 "Bryn","Cara","Doran","Efa","Gethin","Isolde","Joss","Luca","Odd","Rhian","Sable","Tamsin","Udo","Vesna","Yorick"]

GREETINGS = ["Hello there!","Hello.","Good day to you.","Evening.","Well met.","Oi, morning.","Greetings.","Hail."]
QUESTIONS = ["Any news lately?","What's the word around here?","Any trouble on the roads?","What are you selling?",
 "How's business?","What do you do around here?","Which way to the market?","Got any advice for a traveller?",
 "Anything happening in town?","Fine weather, isn't it?"]

def hostile(rel): return rel[1] < 0
def friendly(rel): return rel[1] >= 35

# ── reaction banks (player condition drives the reply) ───────────────────────
def react_stink(level, rel, role, rng):
    if level == "reeking":
        base = ["Gods above — what died on you? Stand back, stand back!",
                "You smell like a midden in high summer. Away, before I'm sick!",
                "Faugh! That stench could curdle milk. Wash before you come near.",
                "By the gods, the reek of you! Downwind, if you please."]
        if role in ("merchant","baker","cook","innkeeper","tailor","jeweller","apothecary"):
            base += ["You'll not bring that stench into my shop — go wash, then we'll talk.",
                     "I'll bar the door before I let that smell in. Find a river, friend."]
        if friendly(rel): base += ["Oh, love, you honestly reek — go and bathe, for your own sake."]
        return rng.choice(base)
    # rank
    base = ["Phew — you could do with a wash, friend.","Is that you reeking, or have the pigs got loose?",
            "You've a powerful whiff about you. A river's that way.","Mind the nose — you've been at some sweaty work, eh?"]
    if hostile(rel): base += ["You stink. Keep your distance."]
    return rng.choice(base)

def react_health(level, rel, role, rng):
    healer = role in ("healer","apothecary","herbalist")
    if level == "near death":
        base = ["Gods, you're white as a shroud and bleeding! Sit, before you drop.",
                "You're half-dead on your feet — someone fetch the healer, quick!",
                "Steady now — you'll not last like that. Down, and let me look."]
        if healer: base = ["Lie down, now — you're near gone. Drink this, and don't argue.",
                           "You're bleeding out, friend. Hush and let me work."]
        return rng.choice(base)
    if level == "bloodied":
        base = ["You're bleeding badly — best see to that wound.","That's a nasty gash. There's a healer up the lane.",
                "Gods, look at the state of you. Bind that before it festers."]
        if healer: base = ["Sit — that wound wants cleaning and binding before it turns.",
                           "Nasty. Hold still, I've a poultice for that."]
        return rng.choice(base)
    # wounded / hurt
    base = ["You've taken a knock, I see. Careful out there.","Those cuts want tending — mind they don't fester.",
            "Rough day on the road, by the look of you."]
    if healer: base += ["Come by the sickhouse if those hurts worsen."]
    return rng.choice(base)

def react_combat(level, rel, role, rng):
    if level == "legendary":
        if hostile(rel): return rng.choice(["A blade of your renown, here? Keep it sheathed in my town.",
            "I know your name, and I want no part of your quarrels. Move along."])
        if friendly(rel): return rng.choice(["A warrior of your fame, at my table? The honour's mine.",
            "They sing of you in the tavern, you know. Anything you need, just ask.",
            "Well now — a proper hero in Newhaven. You're welcome here, always."])
        return rng.choice(["I've heard the tales of you. We want no trouble, only quiet.",
            "A fighter of your standing? Gods keep us — mind the peace here."])
    if level == "renowned":
        return rng.choice(["You've the bearing of someone who's seen real fights.",
            "Word travels — you've made a name with that blade.","A seasoned hand, plainly. The roads fear you more than you them."])
    if level == "green":
        base = ["You look barely blooded, lad. Mind the roads.","Green as spring grass, you are — keep close to the village a while.",
                "New to the sword, eh? Best not stray far past the walls yet."]
        if friendly(rel): base += ["Don't take it hard — we all started raw. Stay careful out there."]
        return rng.choice(base)
    return None  # seasoned/veteran: no special comment

def react_armed(level, rel, role, rng):
    guard = role in ("guard","armourer","blacksmith")
    base = ["All that steel — expecting a war, are you?","You're armed to the teeth. We're peaceful folk here.",
            "That's a lot of iron to carry into a quiet town."]
    if guard: base += ["Keep that blade sheathed past the gate, warrior. Rules are rules.",
                       "Armed and armoured, eh? Nothing I've not seen. Behave, and we've no quarrel."]
    if hostile(rel): base += ["Hand off your sword in my sight, if you don't mind."]
    if friendly(rel): base += ["Kitted for a fight, I see — hope you'll not need it round here."]
    return rng.choice(base)

# ── neutral chatter (no salient player condition) ────────────────────────────
RUMORS = ["strange lights out past the ridge","something's been taking sheep near the marsh","the old forest road's gone quiet",
 "bandits at the ford again","a peddler was robbed near the crossroads","the river's high after all the rain",
 "the miller's been shorting folk on flour","queer tracks down by the mill"]
def neutral(intent, role, rel, rng):
    skill, loc, voice, traits, stock = ROLE_INFO[role]
    ware = None if stock == "none listed" else stock
    banks = {
      "greet":[f"Well met, traveller.", f"A new face — welcome. What brings you by?", f"Good day. Don't see many strangers at {loc}.",
               f"Morning. Word is {rng.choice(RUMORS)}."],
      "news":[f"Word is {rng.choice(RUMORS)}. Quiet enough otherwise.", f"Only that {rng.choice(RUMORS)} — you know how folk talk.",
              f"Not much, save {rng.choice(RUMORS)}."],
      "roads":[f"Keep to daylight and you'll be fine — it's after dark I'd worry.", f"Fair enough, but mind the crossroads.",
               f"I'd not travel alone past the ridge, myself."],
      "trade":[f"Got {ware} if you've the coin." if ware else "I've naught to sell — try the market stall.",
               f"Fresh {ware} today, best in the village." if ware else "Not my trade, selling. Ask a merchant."],
      "work":[f"Busy as ever — no rest for the likes of me.", f"Can't complain. {skill} keeps a roof overhead.",
              f"Same as always, dawn till dusk at {loc}."],
      "self":[f"Me? Just the local {role}, been at {loc} longer than I'll admit.", f"I mind {loc} and my own business, mostly."],
      "direct":[f"The market's up past {loc}, can't miss it.", f"Follow the lane to the square — the inn's got the painted sign.",
                f"Shrine's on the hill, forge by the gate."],
      "help":[f"Keep your blade sharp and don't trust a road after dark.", f"Stock up before you leave — supplies are dear in the wilds.",
              f"Talk to folk, buy what you can, and steer clear of the marsh."],
      "small":[f"Aye, the weather's been something. Hard on old bones.", f"Quiet today — quiet's good, means no trouble about.",
               f"Never a dull season here, truth be told."],
    }
    return rng.choice(banks.get(intent, banks["greet"]))

# ── salient-condition picker (priority order) ────────────────────────────────
def salient_driver(stink, health, combat, armed):
    if stink in ("rank","reeking"): return ("stink", stink)
    if health in ("wounded","bloodied","near death"): return ("health", health)
    if combat in ("green","renowned","legendary"): return ("combat", combat)
    if armed == "armed and armoured": return ("armed", armed)
    return None

def make_reply(driver, pstate, rel, role, intent, rng):
    stink, health, combat, armed = pstate
    if driver:
        kind, lvl = driver
        if kind == "stink":  return react_stink(lvl, rel, role, rng)
        if kind == "health": return react_health(lvl, rel, role, rng)
        if kind == "combat":
            r = react_combat(lvl, rel, role, rng)
            if r: return r
        if kind == "armed":  return react_armed(lvl, rel, role, rng)
    return neutral(intent, role, rel, rng)

TEMPERAMENTS = ["sunny and talkative", "dour and blunt", "sly and teasing", "anxious and fussy",
 "boisterous and loud", "gentle and patient", "prickly but fair", "dreamy and distracted",
 "stubborn and proud", "warm and motherly", "dry and sarcastic", "shy and soft-spoken"]
ATTITUDES = ["you like adventurers and their stories", "you distrust strangers until they prove themselves",
 "you envy those who get to travel", "you pity anyone fool enough to take to the roads",
 "you size everyone up for coin", "you fuss over every traveller who passes",
 "you find outsiders quietly amusing", "you couldn't care less who comes or goes"]
QUIRKS = ["you often mention the weather before anything else", "you end many sentences with 'so it goes'",
 "you speak of your work as if it were a living thing", "you are superstitious about crows and omens",
 "you haggle out of habit, even when nothing is for sale", "you pepper your talk with sea-sayings",
 "you compare most things to food", "you call everyone 'cousin'", "you speak in short, clipped sentences",
 "you love gossip and lower your voice to share it", "you grumble fondly about your aching back",
 "you quote your old master's sayings", "you hum or whistle between thoughts",
 "you brag a little more than you should", "you give unasked-for advice", "you count things aloud without noticing"]
HOOKS = ["You dream of one day seeing the far side of the isle.",
 "You are saving coin for a better roof before winter.", "You still grieve a brother lost to the sea.",
 "You are quietly proud of a child learning your trade.", "You keep a lucky charm from your grandmother.",
 "You nurse an old rivalry with a neighbour.", "You secretly dislike the taste of fish.",
 "You once saw strange lights over the ridge and never forgot it.", "Your knees ache before every storm.",
 "You mean to enter the village fair this year.", "You owe the innkeeper a favour you'd rather forget.",
 "You believe your own cooking beats the tavern's."]

def persona(name, role, rel, pstate, rng):
    """v4 persona: personality-first, job-as-background, slim SCENE (no player-state
    fields), Kia-ora greeting reflex. MUST stay in sync with the game's npcPersona
    (js/gameplay/npc-chat.js). `pstate` is accepted for signature compatibility but
    no longer surfaces in the prompt — NPCs respond to WORDS, not telemetry."""
    skill, loc, voice, traits, stock = ROLE_INFO[role]
    tod = rng.choice(TIMES)
    stock_s = stock if (stock != "none listed" and tod != "evening") else "nothing right now"
    return (f"You are {name}, a villager of the Isle of Emberfall — {rng.choice(TEMPERAMENTS)}; "
            f"{rng.choice(ATTITUDES)}; your voice is {voice}. Quirk: {rng.choice(QUIRKS)}. "
            f"{rng.choice(HOOKS)} You earn your keep as a {role}, but the trade is just work — "
            f"you are a whole person first, and your moods, opinions, memories and gossip matter "
            f"more to you than shop talk. You are flesh and blood and have lived your whole life "
            f"on Emberfall; you know nothing of any world, land, device or word beyond it, and "
            f"strange notions simply puzzle you. \"Kia ora\" is the greeting of Emberfall folk — when "
            f"someone comes near, YOU speak first: open with a warm Kia ora and a remark or "
            f"question of your own, as the one starting the conversation, never as if answering "
            f"a greeting. Speak in-world in 1-3 short "
            f"sentences like natural talk: react to what was just said, keep your opinions "
            f"consistent, and now and then ask a short question back. Stay in character always; "
            f"never speak like an assistant; never invent prices or quests. "
            f"SCENE: location={loc}; time={tod}; weather={rng.choice(WEATHER)}; "
            f"your mood={rng.choice(MOODS)}; toward this traveller you feel {rel[0]}; "
            f"your stock if asked: {stock_s}.")


def pick_player_state(rng, force_reaction):
    if force_reaction:
        # bias toward a salient condition so reactions are well represented
        kind = rng.choice(["stink","health","combat","armed"])
        stink = rng.choice(["rank","reeking"]) if kind=="stink" else rng.choice(["fresh","fresh","whiffy"])
        health = rng.choice(["wounded","bloodied","near death"]) if kind=="health" else rng.choice(["hale","hale","hurt"])
        combat = rng.choice(["green","renowned","legendary"]) if kind=="combat" else rng.choice(["seasoned","veteran"])
        armed = "armed and armoured" if kind=="armed" else rng.choice(["unarmed","armed","armed"])
    else:
        stink = rng.choices(STINK, weights=[70,20,7,3])[0]
        health = rng.choices(HEALTH, weights=[70,18,8,3,1])[0]
        combat = rng.choices(COMBAT, weights=[25,35,25,10,5])[0]
        armed = rng.choices(ARMED, weights=[25,55,20])[0]
    return (stink, health, combat, armed)

def one_example(rng):
    role = rng.choice(ROLES); name = rng.choice(NAMES); rel = rng.choice(RELS)
    force = rng.random() < 0.55
    pstate = pick_player_state(rng, force)
    sysp = persona(name, role, rel, pstate, rng)
    driver = salient_driver(*pstate)
    msgs = [{"role":"system","content":sysp}]
    turns = rng.choices([1,2],weights=[7,3])[0]
    first_intent = "greet" if rng.random() < 0.6 else rng.choice(["news","trade","self","small"])
    intents = [first_intent] + [rng.choice(["news","roads","trade","work","help","small"]) for _ in range(turns-1)]
    for i,it in enumerate(intents):
        player_line = rng.choice(GREETINGS) if it=="greet" else rng.choice(QUESTIONS)
        # the NPC reacts to the salient condition on the FIRST turn; later turns settle into chatter
        rep = make_reply(driver if i==0 else None, pstate, rel, role, it, rng)
        msgs.append({"role":"user","content":player_line})
        msgs.append({"role":"assistant","content":rep})
    return {"messages":msgs}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=4500)
    ap.add_argument("--out", default="emberfall_npc_reactions.jsonl")
    ap.add_argument("--seed", type=int, default=11)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    seen, rows, tries = set(), [], 0
    while len(rows) < args.n and tries < args.n*40:
        tries += 1
        ex = one_example(rng)
        key = hashlib.md5(json.dumps(ex, sort_keys=True).encode()).hexdigest()
        if key in seen: continue
        seen.add(key); rows.append(ex)
    with open(args.out,"w") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False)+"\n")
    # quick reaction-coverage report
    from collections import Counter
    react = Counter()
    for r in rows:
        sysc = r["messages"][0]["content"]
        for fld in ["player_stink","player_health","player_combat","player_armed"]:
            v = sysc.split(fld+"=")[1].split(";")[0]
            react[f"{fld}={v}"] += 1
    print(f"wrote {len(rows)} examples -> {args.out}")
    for k in ["player_stink=reeking","player_stink=rank","player_health=bloodied","player_health=near death",
              "player_combat=legendary","player_combat=green","player_armed=armed and armoured"]:
        print(f"  {k}: {react.get(k,0)}")

if __name__ == "__main__":
    main()
