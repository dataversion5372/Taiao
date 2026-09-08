# Placeholder sprites — production economy

These items don't have bespoke pixel art yet. Each currently renders with a
**tinted copy of an existing sprite** as a stand-in. Replace with real art when
available, then remove the item from this list and from the
`registerPlaceholder(...)` calls in `js/skills/economy.js`.

**Runtime source of truth:** open the game console and run
`listPlaceholderSprites()` (or inspect `window.PLACEHOLDER_SPRITES`). This file
is the human-readable mirror of that array.

How placeholders are made:
- Intermediates reuse `defineIcon(key, baseIcon, hue, …)` tints of an existing item icon.
- Cooperage vessels reuse a hue/saturation/brightness-filtered copy of the world
  `barrel` sprite (`SPR["i_vessel_<id>"]`), tinted per family (`VESSEL_FAM_TINT`).

---

## Intermediate goods (14) — reused tinted item icons

| id | name | placeholder base |
|----|------|------------------|
| `boards` | Wooden boards | `i_planks` tint |
| `oak_boards` | Oak boards | `i_planks` tint |
| `oak_staves` | Oak staves | `i_planks` tint |
| `seasoned_staves` | Seasoned oak staves | `i_planks` tint |
| `wood_offcuts` | Wood offcuts | `i_logs` tint |
| `iron_hoops` | Iron hoops | `i_bar_fe` tint |
| `malt` | Pale malt | `i_wheat` tint |
| `dark_malt` | Dark malt | `i_wheat` tint |
| `malt_grist` | Malt grist | `i_flour` tint |
| `dark_grist` | Dark grist | `i_flour` tint |
| `bran` | Bran | `i_flour` tint |
| `ale` | Ale | `i_pot_hp` tint |
| `dark_ale` | Dark ale | `i_pot_hp` tint |
| `barrel_of_ale` | Barrel of ale | `barrel` tint |

## Coopering vessels (32) — tinted `barrel` sprite, coloured by family

Family tint lives in `VESSEL_FAM_TINT`. Real art should visually distinguish the
seven families (tubs vs. casks vs. large tuns vs. vats vs. luxury casks).

**Domestic (5):** `bucket`, `oak_bucket`, `butter_churn`, `wash_tub`, `storage_tub`
**Food storage (4):** `flour_barrel`, `pickle_barrel`, `salt_meat_barrel`, `fish_barrel`
**Brewing (5):** `ale_cask`, `beer_barrel`, `fermentation_vat`, `brewery_tun`, `grand_tun`
**Wine (4):** `wine_barrel`, `charred_wine_barrel`, `ageing_cask`, `wine_tun`
**Transport (5):** `water_cask`, `cargo_barrel`, `export_cask`, `ships_cask`, `export_barrel`
**Industrial (5):** `tanning_vat`, `dye_vat`, `brine_vat`, `chemical_cask`, `powder_keg`
**Luxury (4):** `polished_oak_cask`, `carved_cask`, `silver_hooped_cask`, `master_cooper_cask`

## Textiles chain (Phase 3) — tinted cloth / forage / garment icons

Spun/dyed/fulled goods reuse tinted `i_cloth`; dyes reuse `i_berries`/`i_herb`;
fleece reuses `i_cotton`; garments reuse `i_robe`/`i_body`.

- **Fibre/yarn:** `fleece`, `wool_yarn`, and one `yarn_<fibre>` per fibre crop
  (flax→"Linen thread", silkgrass→"Silk thread", hemp/jute/etc.→"twine", cotton→"yarn").
- **Dyes (16-colour palette):** `madder_dye`, `weld_dye`, `woad_dye`, `verdigris_dye`,
  `walnut_dye`, `ochre_dye`, `crimson_dye`, `indigo_dye`, `saffron_dye`, `tyrian_dye`,
  `irongall_dye`, `scarlet_dye`, `ember_dye`, `frost_dye`, `void_dye`, `starlight_dye`.
- **Dyed yarn:** `dyed_wool_yarn`, `dyed_linen_thread`, `dyed_cotton_yarn`, `dyed_silk_thread`.
- **Dyed cloth:** `dyed_wool_cloth`, `dyed_linen_cloth`, `dyed_cotton_cloth`, `dyed_silk_cloth`.
- **Fulled cloth (material classes):** `finished_wool_cloth`, `finished_linen_cloth`,
  `finished_cotton_cloth`, `finished_hempcloth`, `finished_silk_cloth`, `finished_felt`,
  `finished_tweed`, `finished_luxury_cloth`.
- **Garments/sails:** `cloth_cap`, `cloth_tunic`, `linen_shirt`, `hemp_smock`, `felt_hat`,
  `cotton_dress`, `wool_cloak`, `dyed_tunic`, `travelers_cloak`, `padded_jerkin`, `tweed_coat`,
  `hooded_robe`, `dyed_cloak`, `fine_robe`, `silk_gown`, `embroidered_gown`,
  `cloth_of_gold_mantle`, `sail`.

_(The 32 base woven cloths reuse existing `defineIcon` art from content.js and are NOT placeholders.)_

## Husbandry (animal production) — tinted food/material icons

- **Animal products:** `milk`, `egg`, `feathers`, `honey`, `beeswax`, `tallow`.
- **Downstream goods:** `cheese`, `butter`, `cooked_egg`, `cake`, `mead`, `candle`, `down_cloak`.

_(The 32 tending recipes reuse existing animal/product art where it exists — fleece, hide, raw_meat.)_

## Cheesemaking — tinted bread / cotton icons

- **Intermediates:** `curds`, `whey`.
- **Cheeses (~29 new, food):** `cottage_cheese`, `ricotta`, `paneer`, `quark`, `herb_cheese`,
  `mozzarella`, `feta`, `cheddar`, `chevre`, `gouda`, `mascarpone`, `edam`, `halloumi`,
  `waxed_gouda`, `emmental`, `gruyere`, `brie`, `camembert`, `gorgonzola`, `stilton`,
  `roquefort`, `parmesan`, `smoked_cheese`, `cave_aged`, `manchego`, `aged_gruyere`,
  `truffle_cheese`, `moon_brie`, `kings_cheese`.

_(The existing `cheese` item is reused as "Farmhouse cheese" — not a new placeholder.)_

## Ropemaking — tinted log/shaft icons

- **Cordage commodities:** `rope`, `cord`, `cable`, `hawser`, `tarred_rope`, `standing_rigging`, `running_rigging`.
- **Finished goods:** `cargo_net`, `net_bag`, `hammock`, `climbing_rope`, `rope_ladder`, `well_rope`,
  `bell_rope`, `lasso`, `snare`, `bullwhip`, `dog_leash`, `halter`, `rope_mat`, `rope_fender`,
  `mooring_line`, `tow_line`, `cargo_sling`, `anchor_cable`, `master_hawser`.

_(`small_net` / `big_net` are the existing Fishing tools, reused — not placeholders.)_

## Sailmaking — tinted cloth icons

- **Sails:** `sail` (reused), `lugsail`, `lateen_sail`, `gaff_sail`, `square_sail`, `topsail`,
  `topgallant`, `jib`, `staysail`, `spanker`, `mainsail`, `foresail`, `mizzen_sail`, `spinnaker`,
  `studding_sail`, `storm_jib`, `royal_sail`, `master_mainsail`.
- **Rigged sets:** `rigged_lugsail`, `rigged_mainsail`, `rigged_square_rig`, `full_ship_rig`.
- **Canvas goods:** `tarpaulin`, `groundsheet`, `kit_bag`, `sea_sack`, `oilcloth`, `canvas_hammock`,
  `awning`, `canvas_tent`, `cargo_cover`, `boat_cover`.

## Shipwrighting — tinted ship icons

- **Vessels (29 new, finished):** `raft`, `log_raft`, `coracle`, `punt`, `skiff`, `rowboat`,
  `dinghy`, `dory`, `catboat`, `fishing_smack`, `sloop`, `barge`, `cutter`, `ketch`, `cog`,
  `longship`, `junk`, `caravel`, `schooner`, `carrack`, `brig`, `brigantine`, `galley`, `barque`,
  `galleon`, `frigate`, `clipper`, `dhow`, `man_o_war`.

_(The sailable `canoe` / `sailboat` / `ship` reuse their existing boat sprites — not placeholders.)_

## Stone & fuel (Charcoaling / Limeburning / Masonry) — tinted stone/flour/brick icons

- **Raw (Mining by-product + shop):** `limestone`, `building_stone`, `marble`, `clay`, `sand`.
- **Charcoaling:** `charcoal`, `wood_tar`, `wood_ash`, `pitch`.
- **Limeburning:** `quicklime`, `slaked_lime`, `hydraulic_lime`, `mortar`, `hydraulic_mortar`,
  `lime_plaster`, `whitewash`, `grout`.
- **Masonry intermediates:** `dressed_stone`, `dressed_marble`, `bricks`, `roof_tiles`, `floor_tiles`.
- **Masonry structures (finished):** `cobblestone_paving`, `brick_wall`, `stone_wall`, `stone_pillar`,
  `stone_archway`, `stone_column`, `fireplace`, `chimney`, `bread_oven`, `masonry_kiln`, `stone_well`,
  `cistern`, `fountain`, `marble_statue`, `gargoyle`, `obelisk`, `tombstone`, `altar_stone`,
  `hearthstone`, `aqueduct_arch`, `stone_bridge_span`, `keep_wall`, `rampart`, `plastered_wall`,
  `tiled_floor`, `tiled_roof`, `cathedral_masonry`.

## Pottery & Glassblowing — tinted vial icons

- **Pottery:** `glaze`, `oil_lamp`, and wares `flowerpot`, `clay_bowl`, `clay_plate`, `clay_cup`,
  `glazed_mug`, `clay_jug`, `glazed_pitcher`, `cooking_pot`, `storage_jar`, `glazed_vase`, `oil_jar`,
  `teapot`, `burial_urn`, `amphora`, `crucible`, `water_filter`, `brazier`, `censer`, `planter`,
  `birdbath`, `chimney_pot`, `retort`, `figurine`, `tureen`, `jardiniere`, `garden_urn`,
  `grand_amphora`, `master_vase`.
- **Glassblowing:** `frit`, `glass`, and wares `glass_bottle`, `glass_jar`, `glass_flask`,
  `drinking_glass`, `glass_bead`, `phial`, `marble_glass`, `window_pane`, `goblet`, `bauble`,
  `decanter`, `carboy`, `demijohn`, `bell_jar`, `glass_ornament`, `prism`, `lens`,
  `stained_glass_blue`, `magnifier`, `stained_glass_red`, `spectacles`, `mirror`, `terrarium`,
  `chandelier_crystal`, `snow_globe`, `crystal_goblet`, `grand_mirror`.

_(`vial` is the existing Potionmaking item, now given a maker — not a placeholder.)_

## Assaying / Wire-drawing / Jewelry — tinted bar/gem/ring icons

- **Assaying:** `fine_gold`, `fine_silver`, `fine_platinum`, `electrum`, `cut_gem`, `brilliant_gem`,
  `diamond`, `ruby`, `sapphire`, `emerald`, `pearl`.
- **Wire-drawing:** `copper_wire`, `iron_wire`, `gold_wire`, `silver_wire`, `fine_wire`, `platinum_wire`,
  `chain`, `gold_chain`, `silver_chain`, `jump_rings`, `filigree`, `master_chain`, and findings
  `needle`, `pin`, `fish_hook`, `wire_hook`, `hairpin`, `brooch_pin`, `fibula`, `spring`, `staples`,
  `tacks`, `wire_mesh`, `mesh_sieve`, `wire_frame`, `birdcage`, `wire_snare`, `lock_spring`,
  `clock_spring`, `harp_string`, `gold_mesh`, `mail_links`.
- **Jewelry (~30 new):** `silver_ring`, `copper_band`, `beaded_bracelet`, `signet_ring`, `gem_ring`,
  `silver_pendant`, `glass_necklace`, `pearl_earrings`, `gold_bracelet`, `brooch`, `ruby_pendant`,
  `sapphire_ring`, `emerald_brooch`, `filigree_pendant`, `amulet_of_power`, `torc`, `anklet`,
  `cufflinks`, `locket`, `circlet`, `diadem`, `diamond_ring`, `signet_of_state`, `electrum_amulet`,
  `tiara`, `chain_of_office`, `platinum_amulet`, `royal_crown`, `imperial_crown`, `masterwork_amulet`.

_(`gold_ring` / `gem_amulet` are existing items, reused — not placeholders.)_

## Leatherworking / Cordwaining / Saddlery — tinted leather icons

- **Materials:** `waxed_thread`, `dyed_leather`.
- **Leatherworking (~30):** `strap`, `belt`, `pouch`, `sheath`, `coin_purse`, `leather_cap`,
  `waterskin`, `scabbard`, `satchel`, `bracers`, `quiver`, `book_cover`, `apron`, `backpack`,
  `tool_roll`, `armguard`, `leather_jerkin`, `holster`, `map_case`, `flask_jack`, `bellows`,
  `leather_drum`, `cuir_bouilli`, `gauntlets`, `chaps`, `long_coat`, `fine_pouch`, `tooled_belt`,
  `embossed_case`, `gilded_bracers`, `master_cuirass`.
- **Cordwaining (32):** `sandals`, `slippers`, `moccasins`, `clogs`, `espadrilles`, `shoes`,
  `buskins`, `brogues`, `ankle_boots`, `work_boots`, `walking_boots`, `court_shoes`, `hobnail_boots`,
  `riding_boots`, `dancing_shoes`, `thigh_boots`, `sea_boots`, `snow_boots`, `hunting_boots`,
  `marching_boots`, `jester_shoes`, `noble_shoes`, `cavalier_boots`, `knee_boots`, `ranger_boots`,
  `fur_boots`, `dress_boots`, `riding_tall_boots`, `ceremonial_shoes`, `courtly_boots`,
  `royal_slippers`, `master_boots`.
- **Saddlery (32):** `halter_leather`, `lead_rein`, `reins`, `bridle`, `girth`, `stirrup_leathers`,
  `saddle_blanket`, `saddlebag`, `crupper`, `breastplate_horse`, `martingale`, `harness`,
  `pack_saddle`, `riding_saddle`, `collar`, `cart_harness`, `plough_harness`, `hunting_saddle`,
  `side_saddle`, `cavalry_saddle`, `war_saddle`, `barding`, `racing_saddle`, `dressage_saddle`,
  `caparison`, `parade_harness`, `jousting_saddle`, `gilded_bridle`, `royal_saddle`,
  `ceremonial_barding`, `state_harness`, `master_saddle`.

_(`leather_body` is the existing leather armour, migrated from Crafting — not a placeholder.)_

---

_Total placeholders: ~1082 (…941 as before… + ~13 shared intermediates + ~128 brewing/baking/carpentry/smithing/tailoring goods).
Run `listPlaceholderSprites()` in-game for the exact current list._

## Toolmaking / Locksmithing — tinted pick/bar/plank icons

- **Toolmaking:** `tool_handle`, `whetstone`, and tools `mallet`, `hammer`, `knife`, `awl`, `chisel`,
  `file`, `shovel`, `trowel`, `saw`, `hoe`, `shears`, `sickle`, `tongs`, `rake`, `pliers`, `plane`,
  `scythe`, `adze`, `hand_drill`, `mattock`, `crowbar`, `wrench`, `vice`, `toolbox`, `master_tools`.
- **Locksmithing:** `key`, `hinge`, `keyring`, `latch`, `bolt_lock`, `hasp`, `mechanism`, `birdcage_lock`,
  `padlock`, `manacles`, `door_lock`, `shackles`, `chest_lock`, `lockbox`, `warded_lock`, `jewelry_box`,
  `tumbler_lock`, `skeleton_key`, `strongbox`, `mantrap`, `gate_lock`, `combination_lock`, `music_box`,
  `warded_chest`, `safe`, `puzzle_lock`, `clockwork`, `masterkey`, `portcullis_winch`, `treasure_chest`,
  `vault_lock`, `grand_vault`.

_(`axe`/`pickaxe`/`fishing_rod`/`harpoon`/`lobster_cage` are existing tool items, now player-forgeable — not placeholders.)_

## Papermaking / Bookbinding — tinted flour/leather/robe icons

- **Papermaking:** `pulp`, `paper`, `fine_paper`, `cardstock`, `parchment`, `vellum`, `papyrus`,
  `ink`, `iron_gall_ink`, `gold_ink`, `hide_glue`, `sealing_wax`, `quill`.
- **Bookbinding:** `scroll`, `letter`, `pamphlet`, `chapbook`, `notebook`, `sketchbook`, `journal`,
  `diary`, `ledger`, `almanac`, `songbook`, `book`, `hardback`, `folio`, `map`, `herbal`, `bestiary`,
  `sea_chart`, `codex`, `dictionary`, `atlas`, `missal`, `psalter`, `tome`, `grimoire`, `encyclopedia`,
  `spellbook`, `illuminated_manuscript`, `bible`, `royal_atlas`, `jeweled_bible`, `master_grand_tome`.

## Specialised agriculture (Cerealiculture/Olericulture/Pomiculture/Herbiculture/Fibriculture)

- **Seeds:** 160 `seed_<skill>_<i>` (tinted `i_seeds_w`) — one per crop.
- **Produce:** grain/herb/fibre crops REUSE existing item ids (GRAINS/HERBS/FIBERS — not placeholders);
  vegetables & fruit reuse existing food items by name where present, else new `<skill>_crop_<i>`
  items (~71 new, tinted `i_wheat`/`i_berries`/`i_cotton`), e.g. 22 new fibres (nettle, coir, kapok…),
  new vegetables (turnip, parsnip, kale, asparagus…) and fruit (apple, pear, grape, mango…).

## Candlemaking / Soapmaking — tinted vial/cloth icons

- **Candlemaking:** `wick`, and candles `rushlight`, `taper`, `tealight`, `dinner_candle`,
  `beeswax_candle`, `votive`, `pillar_candle`, `scented_candle`, `coloured_candle`, `floating_candle`,
  `altar_candle`, `church_candle`, `lantern_candle`, `carriage_candle`, `ship_candle`, `storm_candle`,
  `signal_candle`, `chime_candle`, `bayberry_candle`, `spiral_candle`, `three_wick`, `perfumed_candle`,
  `stained_candle`, `candelabra_set`, `chandelier_candles`, `scrying_candle`, `ember_candle`,
  `moon_candle`, `cathedral_candles`, `master_chandler_set`.
- **Soapmaking:** `lye`, and soaps `lye_soap`, `tallow_soap`, `laundry_soap`, `bath_soap`, `oatmeal_soap`,
  `castile_soap`, `rose_soap`, `lavender_soap`, `honey_soap`, `milk_soap`, `charcoal_soap`, `clay_soap`,
  `shaving_soap`, `green_soap`, `black_soap`, `marseille_soap`, `perfumed_soap`, `glycerin_soap`,
  `medicinal_soap`, `saddle_soap`, `scouring_soap`, `cream_soap`, `honeycomb_soap`, `floral_soap`,
  `luxury_soap`, `salt_soap`, `ember_soap`, `moon_soap`, `royal_soap`, `ambergris_soap`, `master_soap`.

_(`candle` is the existing light item, migrated from Crafting — not a placeholder.)_

## Specialised mining (Ore-mining / Quarrying / Gem-mining)

- **Quarrying stones (~27 new):** `sandstone`, `granite`, `slate`, `flint`, `chalk`, `gravel_stone`,
  `basalt`, `alabaster`, `gneiss`, `quartzite`, `travertine`, `schist`, `shale`, `dolomite`, `soapstone`,
  `bluestone`, `porphyry`, `pumice`, `tuff`, `obsidian_stone`, `greenstone`, `redstone`, `blackstone`,
  `frostmarble`, `emberstone`, `voidstone`, `worldstone`. (Node sprites reuse tinted `boulder`/`rock_essence`.)

_(`limestone`/`building_stone`/`marble`/`clay`/`sand` are existing stones; ore rocks and `gem` are reused — Gem-mining veins all yield the generic `gem`. Node sprites are tints, not new item art.)_

## Fill-out of thin trades (js/skills/fillout.js) — tinted plank/bread/ale/bar/robe icons

Padded nine production skills to 32 (cross-fed so no dead outputs):
- **Shared intermediates:** `beam`, `lath`, `seasoned_boards`, `seasoned_planks`, `seasoned_beam`,
  `rough_yarn`, `fine_yarn`, `rough_cloth`, `fine_cloth_x`, `crystal_malt`, `wheat_malt`, `rye_malt`, `smoked_malt`.
- **Brewing (~28 drinks):** pale/brown ale, stout, porter, lager, cider, red/white wine, mead variants … `ambrosia_brew`.
- **Baking (~30 foods):** loaves, rolls, pastries, pies, tarts, cakes … `masters_gateau`.
- **Carpentry (~29 finished):** stool, bench, wardrobe, chest, cartwheel, loom frame … `masters_cabinet`.
- **Smithing (~28 equip/hardware):** daggers, maces, plate armour, shields, nails, horseshoes, gates … `masterwork_blade`.
- **Tailoring (~13 garments):** scarf, mittens, waistcoat, winter coat, ball gown … `state_robe`.

_(Sawing/Seasoning/Malting/Spinning fill mostly reuses/consumes existing item ids; only the shared intermediates above are new.)_

## Structural billboards (render sprites, not items)

The structural billboards render3d draws (`syncStructures()`) use tinted variants
of existing wall/floor tiles as placeholders — swap `SPR.*` for bespoke art later:

- `door_wood` — dark recessed wood door (from `wall_wood`)
- `door_stone` — heavy studded castle door (from `wall_stone`)
- `gate_leaf` — iron-banded wood city-gate leaf (from `wall_wood`)
- `ladder` — wooden rungs to an upper storey (from the plank floor tile)
- `stairs` — wooden staircase (from the plank floor tile)

Tracked at runtime as `spr:door_wood` … in `PLACEHOLDER_SPRITES`.
