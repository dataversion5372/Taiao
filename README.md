# Isle of Emberfall

An offline, single-player RPG in the spirit of old-school tile-based browser MMOs
(RPG MO / early RuneScape), rendered in **3D** (HD-2D style: a WebGL world with a tilted
chase camera, depth fog, and billboarded pixel-art sprites — think Octopath Traveler).
Runs entirely in your browser — no server, no internet, saves locally.

The world is **infinite**: terrain streams in chunk by chunk as you
explore, in any direction, forever. The town anchors the origin; the further out you
roam, the more dangerous the wildlife (and the richer the mines, camps, dragon lairs,
runestone circles and wilderness outposts you'll stumble on). Regional colour-graded
biomes — meadows, savanna, pine and leafy forest, badlands, lakes — blend into each
other. The Reset button (in the ? tab) offers three flavours: **reset exploration**
(clear discovered map and return to Newhaven), **reset character** (fresh levels,
inventory and bank), or both.

## The retired prototype engine (new renderer)

The game now renders through the **retired prototype** software 3D engine (the legacy-2004
client, TypeScript port, including its custom voxel-world mode): terrain becomes
a heightmapped voxel scene with cliff skirts, trees/rocks/stations/walls are
real retired prototype locs with their models and animations, the player is a composed
3D body-kit model with walk/run/turn animations, and monsters, villagers and
fishing spots render as retired prototype NPC models. Movement uses the retired prototype
collision map + client BFS pathfinder, and wandering retired prototype NPCs (Hans, the
guards, a wizard, citizens…) roam Newhaven with dialogue ported from the
original legacy scripts. If the engine fails to load, the game falls back to the
original three.js billboard renderer (`js/render3d.js`).

The terrain wears **Isle of Emberfall's own painted tiles**: every ground key
(all 37 biomes' art, roads, floors, farm soil, water) is converted into an
engine texture at runtime and drawn on the voxel cube tops, with **darkened
variants on the cliff faces**. The camera is fully **360° rotatable** (hold
←/→), **tilts up/down** (↑/↓) and **zooms with trackpad scroll** — WASD stays
camera-relative at any angle.

The bestiary is (temporarily) the **retired prototype bestiary**: ~85 monsters from
the legacy-2004 roster — rats to king dragons — each with its real model and
animations, an IoE-scale combat level, theme-appropriate drops from IoE's item
pool (beasts leave butcherable carcasses), and hand-assigned spawn biomes
across all 37 regions. Cities, villages and points of interest are **populated
with retired prototype NPCs**: guards, bankers, shopkeepers, priests, cooks and
citizens in towns; dwarves at mine camps, druids at stone circles, foresters
at lumber camps, fishermen at ponds, bartenders at inns, wizards in their
towers — all wandering, talkable, with dialogue ported from the original
legacy scripts (see `js/lc-bestiary.js` and the population tables in
`js/legacy3d.js`).

The camera zooms from close-up out to a full overview (trackpad scroll) where
the character is a dot and the whole 104-tile scene stays drawn (the engine's
draw window and model far-clip widen with zoom *and* with a lowered camera).
Terrain is hilly — up to 18 voxel tiers derived from the world altitude
field — and the camera can drop to a near-ground RS angle (↑ raises, ↓
lowers), clamping itself above intervening terrain. The view is never black:
a sky-gradient backdrop sits behind everything, every tile (including the
scene rim) is dressed the moment a region builds (shared textured-box models
make dressing near-free), and the engine's close-camera visibility matrix is
widened/bypassed so hills and distant rows can't be falsely culled into
black strips. Zoomed out, tile textures swap to box-filtered variants and
the upscale turns bilinear, so distant terrain reads calm instead of
shimmering. Cliff step-walls block walking and pathing consistently. Scene
rebuilds while travelling are pre-collected incrementally and finished in
one short frame. The world map keeps its rendered chunk images in IndexedDB
and pre-renders newly explored chunks in idle time, so it opens instantly
with everything you've explored.

Pieces:

- `libs/legacy-engine.js` — the engine bundle (Draw3D, Model, World/World3D,
  VoxelWorld, CollisionMap, config decoders, entities). Rebuild from a retired prototype
  checkout with `npx webpack --config webpack.lcengine.config.js` in
  `Client2-main` (entry `src/js/lcengine.ts`), then copy
  `dist-lcengine/legacy-engine.js` here.
- `js/sprites/lc-cache-data.js` — base64 cache archives (config, models,
  textures, bz2.wasm) + name→id tables. Regenerate with
  `node tools/build-lc-cache.js "/path/to/retired prototype"`.
- `js/legacy3d.js` — the bridge: maps Emberfall chunks/biomes to floor types and
  heights, decor/nodes to locs, monsters to NPC types; drives animation ticks,
  the camera, picking, pathfinding, and the overlay HUD.

## Play

Open `index.html` in any modern browser (double-click it), or serve the folder:

```
python3 -m http.server 8000    # then visit http://localhost:8000
```

## Controls

| Input | Action |
|---|---|
| Left-click | Walk / gather / attack / talk / steal / harvest |
| Right-click | Context menu (attack, examine, walk here…) |
| WASD | Walk (relative to the current camera angle) |
| ← → | Rotate camera view (45° steps around the player) |
| ↑ ↓ or mouse wheel | Zoom camera |
| M | World map (scroll = zoom, drag = pan, hover = info) |
| C | Character selector (pick which character you play as) |
| Click food or potion in inventory | Eat / drink |
| Click gear in inventory | Equip (weapon, shield, armour, amulet) |
| Click logs in inventory | Light a fire (Firemaking) |
| Shift / Alt + click in shop or bank | Trade 5 / all |

## The 28 skills

**Combat** — Accuracy, Strength, Defence (train by taking hits), Archery (bow + arrows),
Magic (runes), Health. Switch styles with the Melee / Archery / Magic buttons.

**Gathering** — Mining (copper/iron/gold/rune essence), Fishing, Woodcutting (+pines),
Foraging (berry bushes, herb patches), Farming (plant seeds in town plots, harvest later).

**Artisan** — Smelting & Jewelry (furnace), Smithing (anvil), Cooking (fires),
Firemaking, Carpentry, Fletching & Crafting (workbench), Textiles (loom), Tanning (rack),
Butchering (animal carcasses), Milling (millstone), Herblore (cauldron — potions with
buffs!), Alchemy (transmute items to coins), Runecrafting (altar).

**Adventure** — Agility (stepping stones over the lake, rock scrambles to gated gold),
Thieving (the market stall, or the goblins' supply crate — getting caught hurts).

## The world

The terrain engine is a faithful port of the **Endless Scape world map** (Map.html):
domain-warped coastlines with archipelago islands, rivers that bridge where roads
cross them, and the full **37-biome** classifier — Plains, Forest, Swamp, Desert,
Mountains, Snowy Peaks, Frozen Wastes, Farmland, Badlands, Jungle, Meadow, Savanna,
Rockyland, Labyrinth (walk the hedge mazes!), Volcano, Wilderness, Taiga, Oasis,
Coral Reef, Ruins, Salt Flats, Wetlands, Canyon, Steppe, Red Desert, Giant Mushroom
Forest, Bone Fields, Dream Forest, Ashen Forest, Heather Moor, Glacier, Bamboo
Grove, Blossom Grove and Crystal Fields. **Every biome has its own bestiary** —
yetis and ice elementals on the glaciers, minotaurs in the labyrinths, funguys under
the giant mushrooms, liches in the bone fields, krakens in the deep.

You spawn in **Newhaven**, the walled city at the origin, with every crafting
station, a bank, Sten's store, and farm plots. Beyond it, settlements follow the
civilization field (rare walled cities, common villages, long wild stretches),
named points of interest dot the land — inns, graveyards, mills, mine camps, stone
circles, ponds with stepping stones — and wilderness resource clusters and monster
camps fill the spaces between. Monsters only auto-attack if their level is more
than twice your combat level, so the frontier moves with you.

## Content

- A **334-creature bestiary** built from the Tiny Creatures sheet — zombies to
  gelatinous cubes, kobolds to krakens, chickens to Godlings — plus tinted
  Giant/Dire/Elder/Ancient elite variants of each, with stats, drops, and
  butcherable carcasses scaled to level.
- **32 tiers each** of fish, trees/logs, ores, metal bars, crops (food & fibers),
  herbs, runes (each powering its own spell), textiles, forageables, hides &
  leathers, and arrows — all with distinct colour-graded icons, level requirements
  from 1 to 93, and matching recipes at the right stations. Resource tiers rise
  with distance from town.

## Credits

- Painted biome terrain, item, log/ingot/bush and fish tilesheets: custom-generated for this game
- Art: [Kenney.nl](https://kenney.nl) — "Roguelike/RPG pack" & "Roguelike Characters" (CC0)
- Creatures: "Tiny Creatures" by Clint Bellanger — clintbellanger.net (CC0)
- A few custom item sprites drawn for this game (CC0)
- 3D engine: [three.js](https://threejs.org) r147 (MIT), vendored in `libs/` for offline play
- License texts in `assets/`. Code written by Claude.
