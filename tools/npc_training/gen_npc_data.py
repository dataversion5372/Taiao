#!/usr/bin/env python3
"""Generate synthetic SFT training data for an Emberfall-NPC LFM2.5-230M model.

Template-based: personas, player lines and NPC replies are composed from curated,
lore-consistent banks with combinatorial slot-filling, then de-duplicated. Output
is JSONL in the {"messages": [...]} chat format that Nets' finetune.py (and the
Colab notebook) consume. The SYSTEM prompt mirrors the one the live game sends
(js/gameplay/npc-chat.js → npcPersona) so training matches inference.

Usage:  python gen_npc_data.py --n 3500 --out emberfall_npc_sft.jsonl [--seed 7]
"""
import argparse, json, random, hashlib

# ─────────────────────────── Emberfall lore banks ───────────────────────────
BIOMES = ["Plains", "Forest", "Swamp", "Desert", "Mountains", "Snowy Peaks", "Farmland",
          "Badlands", "Jungle", "Meadow", "Savanna", "Wetlands", "Canyon", "Steppe",
          "Taiga", "Oasis", "Ruins", "Bamboo Grove", "Blossom Grove", "Heather Moor",
          "Giant Mushroom Forest", "Bone Fields", "Ashen Forest", "Red Desert"]
TOWNS = ["Newhaven", "the village", "Newhaven", "our little hamlet", "the market town"]
CREATURES = ["goblins", "wild boar", "bandits", "wolves", "a pack of wolves", "giant rats",
             "restless skeletons", "a bog lurker", "hill trolls", "cave spiders",
             "a stray griffon", "buffalo", "an old aurochs", "will-o'-wisps"]
PLACES = ["the old forest road", "the ford", "the river mouth", "the ridge", "the bandit camp",
          "the ruined tower", "the runecircle", "the hunter's camp", "the mines", "the marsh",
          "the crossroads", "the high pass", "the quarry", "the docks", "the north fields"]
ITEMS = ["iron ore", "a good axe", "fresh bread", "salted fish", "wool", "leather", "a length of rope",
         "a clay pot", "healing herbs", "a whetstone", "tanned hide", "a wheel of cheese",
         "shrimp", "whitebait", "a bundle of arrows", "a fishing net", "an empty pail"]
WEATHER = ["a bitter frost", "fog thick as porridge", "rain that won't quit", "a fair wind",
           "an early thaw", "unseasonable heat", "a red sky at dawn", "the first snow"]
RUMORS = [
    "strange lights out past {place}", "something's been taking sheep near {place}",
    "a peddler was robbed blind at {place}", "the old well's gone bad again",
    "they found queer tracks down by {place}", "a hermit's moved into {place}",
    "the {creature} have grown bold this season", "there's talk of buried coin near {place}",
    "the miller's been shorting folk on flour", "a runestone lit up on its own at {place}",
    "the river's running high after all the rain", "the crops are failing over toward {place}",
]

def _cap(s): return s[:1].upper() + s[1:]

# ─────────────────────────── NPC roles / archetypes ─────────────────────────
# role: (article+title, workplace, wares[], craft_verb, boast, gripe)
ROLES = {
    "baker":       ("a baker", "the bakehouse", ["fresh bread", "honey cakes", "meat pies"], "baking",
                    "My rye keeps half the town on its feet.", "Flour's dear since the miller got greedy."),
    "blacksmith":  ("the blacksmith", "the forge", ["nails", "a good axe", "horseshoes", "blades"], "hammering iron",
                    "There's no finer edge this side of the mountains than mine.", "Charcoal costs a fortune these days."),
    "fisherman":   ("a grizzled fisherman", "the docks", ["salted fish", "shrimp", "whitebait", "eel"], "mending nets",
                    "Pulled a trout the size of my leg last week, I swear it.", "Nets don't mend themselves, more's the pity."),
    "farmer":      ("a farmer", "the fields", ["turnips", "barley", "a sack of grain", "wool"], "working the land",
                    "Best barley in the valley grows on my strip.", "Crows had half my seed before I could blink."),
    "weaver":      ("a weaver", "the loom-house", ["wool", "a bolt of cloth", "a warm cloak"], "at the loom",
                    "My cloth's warm enough for a winter on the peaks.", "Loom's been jammed since the frost, cursed thing."),
    "hunter":      ("a hunter", "the lodge", ["furs", "venison", "a bundle of arrows"], "tracking game",
                    "I've never come home with an empty snare.", "Game's gone shy since the wolves moved in."),
    "miner":       ("a miner", "the mines", ["iron ore", "copper", "a lump of coal"], "swinging a pick",
                    "I know every seam in that hill by touch.", "Deeper we dig, the worse the air gets."),
    "herbalist":   ("an old herbalist", "the herb garden", ["healing herbs", "a salve", "dried roots"], "grinding herbs",
                    "There's a cure in these hills for near enough anything.", "Folk only visit when they're already half dead."),
    "innkeeper":   ("the innkeeper", "the tavern", ["a mug of ale", "a hot meal", "a bed for the night"], "pulling ale",
                    "No traveller leaves my table hungry.", "Rowdy lot last night — near broke my good bench."),
    "guard":       ("a town guard", "the gate", [], "keeping watch",
                    "Nothing gets past this gate on my watch.", "Long hours and colder nights, that's the guard's lot."),
    "trader":      ("a trader", "the market stall", ["tools", "cloth", "trinkets", "spices"], "minding the stall",
                    "I've goods from every corner of the isle.", "Prices are daylight robbery, but what can you do."),
    "tanner":      ("a tanner", "the tanning racks", ["leather", "tanned hide", "a leather pouch"], "scraping hides",
                    "My leather outlasts the boots it's stitched into.", "The stink never washes out, they warn you not."),
    "potter":      ("a potter", "the kiln", ["a clay pot", "a jug", "bowls"], "at the wheel",
                    "My pots hold water tighter than a miser's fist.", "One bad firing and a week's work cracks to bits."),
    "sailor":      ("a weathered sailor", "the harbour", ["rope", "salt", "a sea-charm"], "coiling rope",
                    "I've sailed clean round the isle and back.", "Sea takes more than she gives, mark me."),
    "priest":      ("a village priest", "the shrine", [], "tending the shrine",
                    "The old powers still watch over Newhaven.", "Fewer come to pray each year, sad to say."),
    "shepherd":    ("a shepherd", "the pasture", ["wool", "mutton", "cheese"], "minding the flock",
                    "Not one of my ewes lost to wolves this year.", "Lambing season's hard on an old back."),
    "woodcutter":  ("a woodcutter", "the lumber camp", ["firewood", "planks", "a log"], "felling trees",
                    "I can drop an oak clean between two stumps.", "Axe wants sharpening twice a day in this hard timber."),
    "runecrafter": ("a runecrafter", "the runestone altar", ["a carved rune", "a charm"], "carving runes",
                    "I can bind a word of power into plain stone.", "Rune-dust gets everywhere, itches something fierce."),
}
ROLE_KEYS = list(ROLES.keys())

# ─────────────────────────── player utterances by intent ────────────────────
PLAYER = {
    "greet":  ["Hello there!", "Hello.", "Good day to you.", "Evening.", "Well met, friend.",
               "Oi, morning.", "Hail, traveller finds you well?", "Greetings."],
    "news":   ["Any news lately?", "What's the word around here?", "Heard anything worth knowing?",
               "Anything happening in town?", "Any gossip going round?", "What's new in {town}?"],
    "roads":  ["Any trouble on the roads?", "Is the road ahead safe?", "What's out past the walls?",
               "Are the roads clear these days?", "Danger about, is there?"],
    "trade":  ["What are you selling?", "Got anything for sale?", "What have you got, then?",
               "Anything worth buying here?", "Can I buy something off you?"],
    "work":   ["Busy day?", "How's business?", "How's the work treating you?",
               "Trade going well?", "Making a living, are you?"],
    "self":   ["Who are you, then?", "What do you do around here?", "Lived here long?",
               "What's your trade?", "Tell me about yourself."],
    "place":  ["What's this place like?", "Tell me about {town}.", "What's it like living out here?",
               "Anything to see around here?", "Is this a good place to settle?"],
    "direct": ["Which way to the market?", "Where can I find an inn?", "Where's the nearest shrine?",
               "How do I get to the docks?", "Point me to the blacksmith?"],
    "help":   ["Can you help me?", "I'm new here, any advice?", "Got any tips for a traveller?",
               "Where should a stranger start?", "What should I know before I head out?"],
    "small":  ["Cold enough for you?", "Fine weather, isn't it?", "Long day, eh?",
               "Quiet round here today.", "You look like you've a story or two."],
    "bye":    ["I'll be on my way.", "Take care, then.", "Farewell.", "Good luck to you.",
               "Best be going."],
}

# ─────────────────────── reply builders (in-character) ──────────────────────
def _rumor(rng):
    r = rng.choice(RUMORS)
    return r.format(place=rng.choice(PLACES), creature=rng.choice(CREATURES), weather=rng.choice(WEATHER))

def reply(intent, role, rng):
    art, place, wares, verb, boast, gripe = ROLES[role]
    town = rng.choice(TOWNS)
    ware = rng.choice(wares) if wares else None
    def sell_line():
        if ware: return rng.choice([
            f"Got {ware} if you've the coin for it.",
            f"Fresh {ware} today — best you'll find in {town}.",
            f"I deal in {ware}, mostly. Fair prices, mind.",
            f"Looking for {ware}? You've come to the right stall.",
        ])
        return rng.choice([
            "I've naught to sell, friend — try the market stall.",
            "Not my line of work, selling. Ask a trader.",
        ])
    banks = {
        "greet": [
            f"Well met, traveller. {boast}",
            f"Hah, a new face. What brings you to {town}?",
            f"Aye, good day to you. Don't see many strangers by {place}.",
            f"Morning. Mind how you go — {_rumor(rng)}.",
            f"Welcome, welcome. You've the look of the road about you.",
        ],
        "news": [
            f"Word is {_rumor(rng)}. Beyond that, quiet enough.",
            f"Only that {_rumor(rng)}. Best keep your wits about you.",
            f"Folk are saying {_rumor(rng)} — though you know how folk talk.",
            f"Not much, save {_rumor(rng)}.",
        ],
        "roads": [
            f"I'd steer clear of {rng.choice(PLACES)} if I were you — {rng.choice(CREATURES)} about.",
            f"Road's fair enough, but watch {rng.choice(PLACES)}. {_cap(_rumor(rng))}.",
            f"Keep to the daylight and you'll be fine. It's {rng.choice(CREATURES)} you want to avoid past dark.",
            f"Safe as it ever is. Just don't wander off toward {rng.choice(PLACES)} alone.",
        ],
        "trade": [sell_line(), sell_line()],
        "work": [
            f"Busy as ever — {gripe}",
            f"Can't complain. {boast}",
            f"Same as always, friend. {verb.capitalize()} from dawn till dusk.",
            f"Ah, {gripe} Still, a body's got to eat.",
        ],
        "self": [
            f"Me? I'm {art}, been at {place} longer than I care to count.",
            f"Just {art}, minding {place} and my own business.",
            f"{art.capitalize()}, that's me. {boast}",
        ],
        "place": [
            f"{town.capitalize()}? Quiet, mostly — until {_rumor(rng)}.",
            f"It's a hard living out here, but honest. {boast}",
            f"You could do worse than settle here. Folk look after their own.",
            f"Pretty enough when the weather's kind. Right now it's {rng.choice(WEATHER)}.",
        ],
        "direct": [
            f"The market's up past {place}, can't miss it.",
            f"Follow the lane to the square — the inn's the big place with the painted sign.",
            f"Shrine's on the hill, the blacksmith by the gate. Ask again if you get turned around.",
            f"Straight on to the docks, then left at {rng.choice(PLACES)}.",
        ],
        "help": [
            f"Advice? Keep your blade sharp and don't trust a road after dark.",
            f"Stock up before you leave — {ware or 'supplies'} won't be so cheap out in the wilds.",
            f"Mind the {rng.choice(CREATURES)} out past the walls, and you'll do well enough.",
            f"New here? Talk to folk, buy what you can, and steer clear of {rng.choice(PLACES)}.",
        ],
        "small": [
            f"Aye, {rng.choice(WEATHER)} — hard on old bones, this.",
            f"Quiet's good. Quiet means the {rng.choice(CREATURES)} are keeping their distance.",
            f"Story or two? Hah. Stick around {place} long enough and you'll hear plenty.",
            f"Fine enough, till {_rumor(rng)}. Never a dull season here.",
        ],
        "bye": [
            "Safe travels, then. Mind the road.",
            "Off already? Go well, traveller.",
            "Aye, take care. Come back if you've coin to spend.",
            "Farewell. Keep your hood up past dark.",
        ],
    }
    return rng.choice(banks[intent])

# ─────────────────────────── persona (matches game) ─────────────────────────
def persona(name, role, rng):
    art = ROLES[role][0]
    biome = rng.choice(BIOMES)
    where = rng.choice([f" Your home lies in the {biome}.", ""])
    return (f"You are {name}, {art} on the Isle of Emberfall, a medieval fantasy land.{where} "
            f"You are speaking with a passing adventurer. Stay fully in character as a plain-spoken "
            f"commoner. Reply with ONE or TWO short spoken sentences of natural, casual talk — a "
            f"greeting, some local gossip or a rumour, a complaint, or an offer of your wares. Do not "
            f"answer like an assistant and never give lists, bullet points, headings or facts about the "
            f"world. Never mention being an AI, a model, or a game. No asterisks, no stage directions, "
            f"no quotation marks — just speak plainly.")

NAMES = ["Mira", "Bram", "Ketha", "Sten", "Torin", "Wrenna", "Alden", "Peca", "Ysolde", "Garrick",
         "Nessa", "Corin", "Halda", "Dob", "Elga", "Fenn", "Marga", "Osric", "Petra", "Rulf",
         "Selam", "Tupa", "Karim", "Nezahual", "Wilf", "Bryn", "Cara", "Doran", "Efa", "Gethin"]

def one_example(rng):
    role = rng.choice(ROLE_KEYS)
    name = rng.choice(NAMES)
    sys = persona(name, role, rng)
    msgs = [{"role": "system", "content": sys}]
    town = rng.choice(TOWNS)
    turns = rng.choices([1, 2, 3], weights=[5, 3, 2])[0]
    # first turn is usually a greeting (matches the game's invisible "hello")
    intents = [rng.choices(list(PLAYER), weights=[6,4,4,3,3,3,3,2,3,3,1])[0] for _ in range(turns)]
    if rng.random() < 0.55:
        intents[0] = "greet"
    for it in intents:
        pl = rng.choice(PLAYER[it]).format(town=town)
        rp = reply(it, role, rng)
        msgs.append({"role": "user", "content": pl})
        msgs.append({"role": "assistant", "content": rp})
    return {"messages": msgs}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=3500)
    ap.add_argument("--out", default="emberfall_npc_sft.jsonl")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    seen, rows = set(), []
    tries = 0
    while len(rows) < args.n and tries < args.n * 40:
        tries += 1
        ex = one_example(rng)
        key = hashlib.md5(json.dumps(ex, sort_keys=True).encode()).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        rows.append(ex)
    with open(args.out, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    # tiny report
    roles = {}
    turns = {}
    for r in rows:
        n = (len(r["messages"]) - 1) // 2
        turns[n] = turns.get(n, 0) + 1
    print(f"wrote {len(rows)} unique examples -> {args.out}")
    print("turns/example:", dict(sorted(turns.items())))
    print("sample:", json.dumps(rows[0]["messages"][1:], ensure_ascii=False)[:200])

if __name__ == "__main__":
    main()
