// ===== Taiao — examine text for world decoration objects =====
// Every decoration tile (world.getDecor(x,y) — flowers, rocks, furniture, civic
// props, trade goods, walls…) can be right-click Examined. `decorExamine(key)`
// resolves a line for ANY decor key: curated flavour first, then per-family
// prefix rules, then an item's own examine/name, then a humanised fallback — so
// nothing is ever un-examinable.
"use strict";

// ---- curated one-liners (atlas decor + named civic / natural props) ----
const DECOR_EXAMINE = {
  // flora
  flower_white: "A little white blossom, nodding in the breeze.",
  flower_blue: "A blue wildflower.",
  flower_orange: "A bright orange bloom.",
  flower_purple: "A violet wildflower.",
  bush: "A leafy shrub.", bush2: "A dense, thorny bush.",
  berrybush: "A bush heavy with ripe berries.",
  leaflitter: "A scatter of fallen leaves.",
  fallen_log: "A mossy log, slowly returning to the soil.",
  mushroom: "A cluster of small mushrooms.",
  mushroom_big: "A fat toadstool, taller than your boot.",
  mushroom_big2: "An enormous cap mushroom.",
  lily: "A water lily resting on the surface.",
  lily2: "Broad lily pads crowd the shallows.",
  lily3: "A pink lotus blooms among the pads.",
  reed: "Reeds whisper at the water's edge.",
  wheat_plant: "A stand of ripening grain.",
  herb_plant: "A leafy herb, fragrant when crushed.",
  haybale: "A tightly-bound bale of hay.",
  coral_red: "Red coral, delicate and sharp.",
  seashell: "A seashell washed up on the sand.",
  // stone & earth
  boulder: "A weathered boulder.",
  moss_rock: "A rock furred with green moss.",
  rock_dead: "A cracked, spent rock.",
  stepstone: "A flat stepping stone.",
  stump: "A tree stump, rings counting its years.",
  crystal_shard: "A jagged crystal shard, faintly glowing.",
  crystal_cluster_blue: "A cluster of blue crystals.",
  crystal_cluster_purple: "A cluster of amethyst crystals.",
  crystal_cluster_green: "A cluster of green crystals.",
  geode: "A geode split to show its glittering heart.",
  salt_crystal: "A crust of pale salt crystals.",
  skull: "A bleached skull. Someone's bad day.",
  goldpile: "A glinting pile of coins. Not yours, sadly.",
  // civic / village
  city_fountain: "A carved fountain, water trickling merrily.",
  fountain_small: "A modest stone fountain.",
  city_bench: "A public bench, worn smooth by many sitters.",
  city_planter: "A planter box brimming with flowers.",
  planter_box: "A wooden planter of herbs and flowers.",
  planter_ceramic: "A glazed planter.",
  flowerpot: "A little clay flowerpot.",
  birdbath: "A stone birdbath. A sparrow eyes you.",
  well_roofed: "A roofed well, bucket swaying on its rope.",
  well: "A deep stone well.",
  statue_marble: "A marble statue of some forgotten worthy.",
  statue: "A weathered statue.",
  lamppost: "A wrought-iron lamppost.",
  candlestand_iron: "A wrought-iron candle stand, wax-spattered from many nights' service.",
  candlestand_wood: "A turned-wood candle stand, scorched dark around the drip pan.",
  candlestand_brass: "A polished brass candle stand, bright even unlit.",
  banner_pole: "A tall pole flying the town's colours.",
  signpost_directions: "A signpost pointing the way to distant places.",
  signpost_blank: "A blank signpost. Someone forgot to paint it.",
  sign: "A painted wooden sign.",
  aqueduct: "An arched aqueduct carrying water across the land.",
  bridge_arch: "A graceful arched bridge.",
  stone_bridge: "A sturdy stone bridge.",
  cart: "A wooden handcart.",
  cart_gold: "A merchant's cart, laden with goods.",
  stall_awn: "A market stall beneath a striped awning.",
  stall: "A market stall.",
  // shrine / ruin / graveyard
  altar_stone: "An ancient altar stone, stained by old rites.",
  altar: "A stone altar.",
  column_stone: "A fluted stone column.",
  pillar_stone: "A weathered stone pillar.",
  archway_stone: "A crumbling stone archway.",
  cathedral_stone: "Soaring worked stone, humbling to stand beneath.",
  gargoyle: "A leering gargoyle, keeping its stony watch.",
  gravestone: "A leaning gravestone, its name worn away.",
  gravestone2: "A moss-covered gravestone.",
  gravestone3: "A cracked headstone.",
  burial_urn: "A funerary urn.",
  urn_garden: "A large garden urn.",
  // camp / wild
  campfire: "A campfire, embers still glowing.",
  campfire_ring: "A ring of stones around cold ashes.",
  bedroll: "A rolled-out bedroll.",
  tent: "A canvas tent.", tent2: "A larger canvas tent.",
  tent_l: "The flap of a canvas tent.", tent_r: "A canvas tent.",
  tent2_l: "A large canvas tent.", tent2_r: "A large canvas tent.",
  tent_bundle: "A tent, bundled up for travel.",
  scarecrow: "A straw scarecrow on its cross of poles.",
  beehive: "A humming straw beehive.",
  beehive_box: "A wooden beehive, thick with bees.",
  crab_pot: "A woven crab pot.",
  fishing_net: "A fishing net, hung out to dry.",
  hanging_carcass: "A carcass strung up to cure.",
  torch: "A burning torch in a bracket.",
  brazier_iron: "An iron brazier, coals glowing.",
  brazier_bronze: "A bronze brazier.",
  brazier: "A brazier of hot coals.",
  // wood / masonry stock
  boards_stacked: "A neat stack of sawn boards.",
  timber_beam: "A squared timber beam.",
  roof_tiles_stack: "A stack of clay roof tiles.",
  // walls (structural or free-standing)
  wall_wood: "A rough timber wall.",
  wall_stone: "A sturdy stone wall.",
  wall_brick: "A course of brickwork.",
  wall_plaster: "A plastered wall.",
  wall_rubble: "A wall of piled rubble.",
  wall_keep: "The thick wall of a keep.",
  fence_wood: "A wooden fence.",
  fence_broken: "A broken-down fence.",
  driftwood: "A tangle of sea-bleached driftwood.",
};

// ---- per-family prefix rules (whole categories of trade / prop objects) ----
const _cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const _art = s => (/^[aeiou]/i.test(s) ? "An " : "A ") + s;
// the descriptive tail of a key, e.g. barrel_ale -> "ale"
const _tail = k => k.split("_").slice(1).join(" ").replace(/[0-9]+$/, "").trim();
const DECOR_PREFIX = [
  ["flower_", k => `${_art(_tail(k) || "wild")} flower.`],
  ["mushroom", () => "A cluster of mushrooms."],
  ["barrel_", k => `A wooden barrel${_tail(k) ? ", stamped “" + _tail(k) + "”" : ""}.`],
  ["cask_", () => "A sealed oak cask."],
  ["powder_keg", () => "A powder keg. Best not left near a flame."],
  ["wine_tun", () => "A great tun of wine."],
  ["brewery_tun", () => "A brewer's tun, fermenting quietly."],
  ["candle_", () => "A candle, wax pooled at its foot."],
  ["candelabra", () => "A branched candelabra."],
  ["chandelier", () => "A hanging chandelier."],
  ["lock_", () => "A sturdy lock, cold to the touch."],
  ["lockbox", () => "A small locked box."],
  ["strongbox", () => "An iron-bound strongbox."],
  ["treasure_chest", () => "A treasure chest. Probably someone's."],
  ["chest_", () => "A storage chest."],
  ["crate", () => "A wooden crate."],
  ["sail_", () => "A canvas sail, neatly furled."],
  ["ship_", () => "A moored ship, rocking gently."],
  ["boat_", () => "A small boat drawn up on the shore."],
  ["raft_", () => "A lashed-together raft."],
  ["skiff", () => "A little skiff."],
  ["rigging", () => "A coil of ship's rigging."],
  ["glass_", () => "A piece of blown glassware."],
  ["stainedglass_", () => "A panel of stained glass, jewelling the light."],
  ["clay_", k => `${_art(_tail(k) || "clay")} of fired clay.`],
  ["vase_", () => "A glazed vase."],
  ["amphora", () => "A tall clay amphora."],
  ["jar_", () => "A storage jar."],
  ["pot_", () => "An earthenware pot."],
  ["oil_", () => "An oil lamp, wick trimmed."],
  ["crystal_", () => "A cluster of crystals, faintly aglow."],
  ["rock_", () => "An ore-flecked rock."],
  ["boulder", () => "A weathered boulder."],
  ["tree_", () => "A tree."],
  ["nz_", () => "A tree."],
  ["wall_", () => "A section of wall."],
  ["tower_", () => "The wall of a tower."],
  ["gate_", () => "A heavy gate."],
  ["door_", () => "A wooden door."],
  ["bed_", () => "A bed, invitingly made up."],
  ["cask", () => "A wooden cask."],
  ["anvil", () => "A heavy iron anvil."],
  ["loom", () => "A weaver's loom."],
  ["kiln", () => "A brick kiln, warm to the hand."],
  ["spinning_wheel", () => "A spinning wheel."],
];

function _humanize(key) {
  const parts = key.split("_").filter(Boolean).map(p => p.replace(/[0-9]+$/, "")).filter(Boolean);
  if (!parts.length) return "You examine it. It's a decoration.";
  // keep the key's own word order — leftover keys reaching here are mostly
  // <material>_<noun> (milk_bottle, oil_lamp) which read right as written; the
  // <noun>_<adjective> ones (flower_white, statue_marble) are all curated above.
  return _cap(_art(parts.join(" ")).trim()) + ".";
}

// ---- short display names, for the "Examine <name>" menu label ----
const DECOR_NAME = {
  flower_white: "white flower", flower_blue: "blue flower", flower_orange: "orange flower", flower_purple: "purple flower",
  bush: "bush", bush2: "bush", berrybush: "berry bush", leaflitter: "fallen leaves", fallen_log: "fallen log",
  mushroom: "mushrooms", mushroom_big: "giant toadstool", mushroom_big2: "giant mushroom",
  lily: "water lily", lily2: "lily pads", reed: "reeds", wheat_plant: "grain", herb_plant: "herbs", haybale: "hay bale",
  coral_red: "red coral", seashell: "seashell", boulder: "boulder", moss_rock: "mossy rock", rock_dead: "spent rock",
  stepstone: "stepping stone", stump: "tree stump", crystal_shard: "crystal shard",
  crystal_cluster_blue: "blue crystals", crystal_cluster_purple: "amethyst crystals", crystal_cluster_green: "green crystals",
  geode: "geode", salt_crystal: "salt crystals", skull: "skull", goldpile: "pile of coins",
  city_fountain: "fountain", fountain_small: "fountain", city_bench: "bench", city_planter: "planter", planter_box: "planter",
  planter_ceramic: "planter", flowerpot: "flowerpot", birdbath: "birdbath", well_roofed: "well", well: "well",
  statue_marble: "marble statue", statue: "statue", lamppost: "lamppost", banner_pole: "banner",
  signpost_directions: "signpost", signpost_blank: "signpost", sign: "sign", aqueduct: "aqueduct",
  bridge_arch: "arched bridge", stone_bridge: "stone bridge", cart: "handcart", cart_gold: "merchant's cart",
  stall_awn: "market stall", stall: "market stall", altar_stone: "altar", altar: "altar",
  column_stone: "stone column", pillar_stone: "stone pillar", archway_stone: "stone archway", cathedral_stone: "stonework",
  gargoyle: "gargoyle", gravestone: "gravestone", gravestone2: "gravestone", gravestone3: "gravestone",
  burial_urn: "burial urn", urn_garden: "garden urn", campfire: "campfire", campfire_ring: "fire ring",
  bedroll: "bedroll", tent: "tent", tent2: "tent", tent_l: "tent", tent_r: "tent", tent2_l: "tent", tent2_r: "tent",
  tent_bundle: "bundled tent", scarecrow: "scarecrow", beehive: "beehive", beehive_box: "beehive",
  crab_pot: "crab pot", fishing_net: "fishing net", hanging_carcass: "hanging carcass", torch: "torch",
  brazier_iron: "brazier", brazier_bronze: "brazier", brazier: "brazier", driftwood: "driftwood",
  boards_stacked: "stacked boards", timber_beam: "timber beam", roof_tiles_stack: "roof tiles",
  wall_wood: "timber wall", wall_stone: "stone wall", wall_brick: "brick wall", wall_plaster: "plastered wall",
  wall_rubble: "rubble wall", wall_keep: "keep wall", fence_wood: "fence", fence_broken: "broken fence",
};

// A concise name for the decoration on a tile, for the context-menu label.
function decorName(raw) {
  if (!raw || typeof raw !== "string") return "it";
  const key = raw.split("#")[0];
  if (DECOR_NAME[key]) return DECOR_NAME[key];
  if (key.startsWith("wall_")) return "wall";
  if (typeof ITEMS !== "undefined" && ITEMS[key] && ITEMS[key].name) return ITEMS[key].name.toLowerCase();
  const parts = key.split("_").filter(Boolean).map(p => p.replace(/[0-9]+$/, "")).filter(Boolean);
  return parts.join(" ") || "it";
}

function decorExamine(raw) {
  if (!raw || typeof raw !== "string") return null;
  const key = raw.split("#")[0];
  if (DECOR_EXAMINE[key]) return DECOR_EXAMINE[key];
  for (const [pre, fn] of DECOR_PREFIX) if (key.startsWith(pre)) return fn(key);
  if (typeof EXAMINE !== "undefined" && EXAMINE[key]) return EXAMINE[key];
  if (typeof ITEMS !== "undefined" && ITEMS[key] && ITEMS[key].name) return _art(ITEMS[key].name.toLowerCase()) + ".";
  return _humanize(key);
}

if (typeof window !== "undefined") { window.decorExamine = decorExamine; window.decorName = decorName; window.DECOR_EXAMINE = DECOR_EXAMINE; }
