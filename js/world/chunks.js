// ===== world chunk generation, settlement stamping, resources, and monster spawns =====
"use strict";

// Callers (1):
//  world.js:24
function createWorldChunks(ctx) {
  const {
    S, hash2i, rand2, fbm, elevation, humidity, temperature,
    farmField, civField, weirdField, classify, biomeAtTile,
    waterBody, riversNear, roadsNear, nearPoly, ROAD_W, villagesNear, roadNear, riverNear,
    solidDoorX, riverDoors,
    poiInfo, wildIcon, atlasVariantAt, biomeGround, BIOME_VEG,
    bankNetAt, bankNetInfo, mainBranchFor,
    GRASS_LIKE_B, FOREST_LIKE_B, SWAMP_LIKE_B, WATER_LIKE_B, ROCK_LIKE_B,
    localTierCap, rollTier,
  } = ctx;
  const chunks = new Map();
  const obstacles = [];
  const npcs = [];
  resolveBiomeMobs(B);

  // ---- trade-shop interior decoration ----
  // Each settlement building carries a job (a crafting-station key). We furnish
  // its interior with thematically matching props from the pixellab object set
  // (assets/new_objects), so a cooper's holds casks, a chandler's holds candles,
  // a locksmith's holds locks, a potter's holds clay, etc. Keys here must exist
  // in OBJ_MAP (they render 8-directional via render3d objForKey) and must NOT
  // start with "wall_" (those bake as flat blocks, not billboards). Up to 8 are
  // laid around the interior perimeter, skipping the central station tile.
  const TRADE_DECOR = {
    bank:            ["strongbox", "treasure_chest", "chest_warded", "lockbox", "chest_storage", "vault_door", "coin_purse", "jewelry_box"],
    trader:          ["crate_braced", "barrel_cargo", "barrel_export", "sea_sack", "awning_rolled", "cargo_cover", "signpost_blank", "coin_purse"],
    anvil:           ["anvil2", "bellows", "whetstone", "toolbox", "crucible", "tub_storage", "wall_bracket"],
    furnace:         ["bellows", "crucible", "cauldron_iron", "barrel_scorched", "pitch_pot", "tub_storage"],
    altar:           ["candle_altar", "candle_cathedral", "censer", "iron_bell", "bell_rope", "brazier_bronze", "candle_votive", "stainedglass_blue"],
    workbench:       ["boards_stacked", "timber_beam", "offcuts", "vice", "crowbar", "ladder", "door_wood"],
    loom:            ["spinning_wheel", "sea_sack", "tarpaulin", "wallshelf", "stool", "rope_mat"],
    tanrack:         ["tanning_vat", "brine_vat", "tub_storage", "hammock", "shackles", "hearthstone"],
    cauldron:        ["cauldron_iron", "retort", "flask", "carboy", "demijohn", "candle_scrying", "terrarium"],
    alchtable:       ["retort", "flask", "bell_jar", "oil_jar", "oil_lamp", "terrarium", "carboy"],
    campfire:        ["cauldron_iron", "teapot", "mug", "tureen", "barrel_ale", "pitcher", "goblet"],
    mill:            ["barrel_flour", "sea_sack", "cartwheel", "bucket", "sideboard"],
    sawmill:         ["boards_stacked", "boards_bundle", "boards_loose", "timber_seasoned", "offcuts", "ladder_tall", "planks_seasoned"],
    malthouse:       ["cask_ale", "barrel_beer", "brewery_tun", "mead_bottle", "jar_storage", "bucket"],
    brewery:         ["brewery_tun", "brewery_tun_open", "fermentation_vat", "cask_ale", "barrel_beer", "mead_bottle"],
    cooperage:       ["cask_oak", "cask_cooper", "cask_export", "cask_water", "staves", "boards_bundle", "cask_carved", "cask_ageing"],
    bakehouse:       ["bread_oven", "barrel_flour", "pot_lidded", "jar_storage", "barrel_pickle", "pitcher"],
    spinning_wheel:  ["spinning_wheel", "wallshelf", "rope_mat", "stool", "dresser_mirror", "sea_sack"],
    dyeworks:        ["dye_vat", "tub_storage", "carboy", "cask_chemical", "demijohn", "bucket"],
    fulling_mill:    ["tub_storage", "wash_tub", "tarpaulin", "cask_water", "bucket", "stool"],
    tailors_bench:   ["wardrobe", "dresser_mirror", "hand_mirror", "sideboard", "bench_trestle", "sail_cream"],
    barn:            ["haybale", "cartwheel", "butter_churn", "milk_bottle", "bucket", "fence_wood"],
    creamery:        ["butter_churn", "milk_bottle", "brine_vat", "tureen", "jar_storage", "teapot"],
    ropewalk:        ["rope_mat", "rope_ladder", "rigging", "cargo_net", "cargo_sling", "staves"],
    sail_loft:       ["sail_cream", "sail_mainsail", "sail_jib", "sailmaker_spindle", "tarpaulin", "rigging",
                      "sail_square", "sail_squarerig", "sail_lateen", "sail_gaff", "sail_lugsail", "sail_topsail",
                      "sail_topgallant", "sail_royal", "sail_staysail", "sail_foresail", "sail_mizzen", "sail_spanker",
                      "sail_jib", "sail_stormjib", "sail_studding", "sail_fullrig", "sail_masterwork"],
    shipyard:        ["timber_beam", "planks_seasoned", "cask_ships", "rigging", "boat_dinghy", "powder_keg", "fender", "boat_cover", "boards_stacked"],
    charcoal_clamp:  ["pitch_pot", "cask_chemical", "kiln", "barrel_scorched", "bucket", "crucible"],
    lime_kiln:       ["kiln", "pot_lidded", "cask_water", "hearthstone", "bucket", "cistern"],
    masons_yard:     ["roof_tiles_stack", "roof_tiles_section", "chimney_pot", "chimney_stack", "cistern", "grille",
                      "window_frame", "gate_wood", "wall_brick", "wall_rubble", "wall_plaster", "wall_keep", "figurine"],
    pottery_kiln:    ["clay_bowl", "clay_cup", "clay_jug", "clay_plate", "amphora", "amphora_ornate", "vase_glazed", "jar_storage", "urn_garden", "planter_ceramic", "pot_lidded", "kiln"],
    glass_furnace:   ["glass_bottle", "glass_jar", "bell_jar", "decanter", "carboy", "vase_masterwork", "stainedglass_green", "stainedglass_blue", "stainedglass_red", "window_pane", "tumbler", "demijohn"],
    assay_furnace:   ["crucible", "cask_silver", "strongbox", "bellows", "retort", "tub_storage"],
    drawbench:       ["wire_frame", "wire_mesh", "grille", "cog", "mechanism", "clockwork"],
    jewelers_bench:  ["jewelry_box", "filigree", "figurine", "snow_globe", "hand_mirror", "birdcage"],
    leather_bench:   ["tanning_vat", "quiver", "pouch", "hammock_canvas", "shackles", "mantrap"],
    cobblers_bench:  ["stool", "toolbox", "sideboard", "wallshelf", "hammock", "pouch"],
    saddlers_bench:  ["quiver", "pouch", "cargo_sling", "tarpaulin", "hammock_canvas", "staves"],
    toolsmith:       ["toolbox", "anvil2", "vice", "whetstone", "crowbar", "clockwork", "gate_iron", "portcullis_winch"],
    locksmith_bench: ["lock_padlock", "lock_chest", "lock_gate", "lock_tumbler", "lock_combination", "lock_puzzle", "lock_enchanted", "lock_birdcage", "lock_plate", "lock_vault", "hasp", "hinge", "latch", "lockbox"],
    paper_mill:      ["tub_storage", "boards_stacked", "cask_water", "rope_mat", "offcuts", "bucket"],
    bindery:         ["bookshelf_small", "wallshelf", "desk", "easel", "jewelry_box", "hand_mirror"],
    chandlery:       ["candle_pillar", "candle_taper", "candle_beeswax", "candle_white", "chandler_set", "candelabra",
                      "candle_threewick", "candle_dripping", "candle_votive", "candle_dinner", "candle_bayberry",
                      "candle_colored", "candle_chime", "candle_ember", "candle_floating", "candle_rushlight",
                      "candle_carriage", "candle_signal", "candle_storm", "candle_ship", "candle_lantern"],
    soap_works:      ["cauldron_iron", "tub_storage", "cask_chemical", "wash_tub", "pot_lidded", "water_filter", "bucket"],
    _default:        ["stool", "barrel_ale", "bucket", "wallshelf", "sideboard"],
  };
  // Every hull in the sailable fleet. Their primary role is the player's boat
  // (rendered via the sailing path) + inventory icon, but a shipyard also gets
  // one "on the stocks" as decor, rotated by position so all hulls surface.
  const SHIP_FLEET = [
    "ship_barque", "ship_brig", "ship_brigantine", "ship_caravel", "ship_carrack",
    "ship_clipper", "ship_cutter", "ship_dhow", "ship_frigate", "ship_galleon",
    "ship_galley", "ship_junk", "ship_longship", "ship_manofwar", "ship_schooner",
    "ship_smack", "boat_barge", "boat_catboat", "boat_coracle", "boat_dinghy",
    "boat_dory", "raft_logs", "raft_planks", "skiff",
  ];

  // --- IndexedDB chunk cache ---
  // Keyed by fixed world id + coords.
  // Writes are fire-and-forget; reads warm the in-memory chunks Map before the
  // game loop starts so synchronous getChunk() always finds a hot entry.
  // Bumped to v5: mansions are now a 3-storey hall with three ATTACHED
  // 2-storey wings (shared walls + archways), towers are 6x6, observatories
  // 9x9 — all stamped into tiles, so older cached chunks would disagree with
  // the renderer/collision. Chunk data is fully deterministic from the seed,
  // so old chunks simply regenerate.
  // Bumped to v6: settlement buildings are now furnished by trade (casks in the
  // cooper's, candles in the chandler's, locks in the locksmith's, pottery in the
  // potter's, sails in the sail loft, a hull on the shipyard stocks, etc.) and
  // POIs/civic rings gained more props, so cached chunks must regenerate.
  // Bumped to v8: bridges span bank-to-bank (stone_bridge decor over approach
  // roads, staggered 1-tile "#p" support piers), and river-spanning buildings
  // keep a hollow channel + bank strip with a second north door.
  // Bumped to v20: climate rework — triangle latitude + warmCurve makes the
  // warm:polar land ratio ~3:1 (was ~40:60), reshuffling biomes world-wide.
  // Bumped to v21: portals moved to a sparse dedicated lattice (>= 500 game
  // tiles apart, features.js portalSite) and three new POIs (runecircle,
  // banditcamp, huntercamp) replaced the tables' portal slots.
  // Bumped to v22: boulders, mossy boulders and wildflowers now generate as
  // mineable/pickable resource NODES instead of static decor (gather-decor.js).
  // Bumped to v23: pasture livestock (chicken/sheep/cow) scattered across
  // grass/farm/meadow biomes for the roaming-animal Husbandry rework.
  // Bumped to v24: fishing spots are now per-fish (procedural rarity) with a
  // 5-10 catch counter — node types/placement changed, so regenerate.
  // Bumped to v25: new husbandry animals (quail/duck/goat/rabbit/pig) scattered
  // in pastures + griffons in the crags.
  // Bumped to v26: batch 2 (goose/turkey/buffalo/alpaca pastures; aurochs/wyrmling crags).
  // Bumped to v28: fenced farm fields (per-skill soil + gate) generate in Farmland
  // biome; Newhaven's prototype seed patch removed — node/decor layout changed.
  // v36: bank chests added to POIs (manor/towers/lighthouse/fishvillage/
  // campsite) + wayside wild chests — cached chunks must regenerate to get them
  // v37: roads crossing shallow SEA now deck over as overpass bridges (sea
  // stone_bridge tiles + 4-lattice piles + coastal approach decking)
  // v38: fishing spots are WATER-TYPE aware — freshwater (rivers/lakes) holds a
  // new "river" band (kōura + shortfin eel, hīnaki-potted) and never sea fish;
  // sea shore/deep/abyss bands no longer leak inland. Cached spots regenerate.
  // v39: parallel roads merge — later road edges re-lane along the FINAL route
  // of earlier edges (admissible corridor A*), and road jitter uses a plateau
  // envelope, so two roads to the same destination share one drawn road.
  // v40: bank MAIN BRANCHES — one deterministic city per bank network hosts a
  // grand 3-storey bank hall (kind "mainbank", its own city block) with a row
  // of teller chests and banker staff; the city's bank job moved onto it.
  // v41: bank networks follow the ROAD WEB (features.js roadNetId), not the
  // terrain flood — road-isolated cities (Keolwulfduun) become their own
  // networks and gain their own main-branch hall, so city layouts change.
  // v42: WORLD name registry — settlement/landmark names are now allocated
  // per 15000²-tile world (unique within a world, disjoint from all 8
  // neighbours); nearly every name changed and labels embed names.
  // v43: bank networks span the WHOLE road web (features.js dropped the
  // trunk-length and sea-deck edge cutoffs) — cities that were their own
  // network's main branch (Hegestesduun, Easthuus…) lose their grand bank
  // hall to Newhaven's, so their city layouts change.
  const _IDB_NAME = 'ioe-chunks-v43';
  // stale caches from earlier versions still occupy disk/origin quota — drop them
  for (const old of ['ioe-chunks-v3', 'ioe-chunks-v4', 'ioe-chunks-v5', 'ioe-chunks-v6', 'ioe-chunks-v7', 'ioe-chunks-v8', 'ioe-chunks-v9', 'ioe-chunks-v10', 'ioe-chunks-v11', 'ioe-chunks-v12', 'ioe-chunks-v13', 'ioe-chunks-v14', 'ioe-chunks-v15', 'ioe-chunks-v16', 'ioe-chunks-v17', 'ioe-chunks-v18', 'ioe-chunks-v19', 'ioe-chunks-v20', 'ioe-chunks-v21', 'ioe-chunks-v22', 'ioe-chunks-v23', 'ioe-chunks-v24', 'ioe-chunks-v25', 'ioe-chunks-v26', 'ioe-chunks-v27', 'ioe-chunks-v28', 'ioe-chunks-v29', 'ioe-chunks-v30', 'ioe-chunks-v31', 'ioe-chunks-v32', 'ioe-chunks-v33', 'ioe-chunks-v34', 'ioe-chunks-v35', 'ioe-chunks-v36', 'ioe-chunks-v37', 'ioe-chunks-v38', 'ioe-chunks-v39', 'ioe-chunks-v40', 'ioe-chunks-v41', 'ioe-chunks-v42'])
    try { indexedDB.deleteDatabase(old); } catch (e) { /* best effort */ }
  let _db = null;
  function _openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res, rej) => {
      const r = indexedDB.open(_IDB_NAME, 1);
      r.onupgradeneeded = e => e.target.result.createObjectStore('c');
      r.onsuccess = e => { _db = e.target.result; res(_db); };
      r.onerror = e => rej(e.target.error);
    });
  }
  function _ck(cx, cy) { return `${S}/${cx},${cy}`; }
  function _persistChunk(cx, cy, ch) {
    _openDB().then(db => {
      const tx = db.transaction('c', 'readwrite');
      tx.objectStore('c').put({
        g: ch.ground, d: ch.decor, b: ch.blocked,
        n: ch.nodes, s: ch.spawnDefs, bl: ch.buildings, la: ch.labels,
      }, _ck(cx, cy));
    }).catch(() => {});
  }
  // Load a specific set of "cx,cy" chunk keys from IDB into the in-memory Map.
  // Called at startup with the full seenChunks set so synchronous getChunk()
  // always finds a hot entry for every previously-explored chunk.
  async function preloadSeen(keys) {
    let db;
    try { db = await _openDB(); } catch { return; }
    const todo = [...keys].filter(k => !chunks.has(k));
    if (!todo.length) return;
    await Promise.all(todo.map(key => new Promise(res => {
      const [ccx, ccy] = key.split(',').map(Number);
      const r = db.transaction('c', 'readonly').objectStore('c').get(_ck(ccx, ccy));
      r.onsuccess = e => {
        const dt = e.target.result;
        // never clobber a chunk that was generated (or hydrated) while this
        // async read was in flight — it may already hold live runtime state
        if (dt && !chunks.has(key)) {
          const hyd = {
            cx: ccx, cy: ccy,
            ground: dt.g, decor: dt.d, blocked: new Uint8Array(dt.b),
            nodes: dt.n, spawnDefs: dt.s, buildings: dt.bl, labels: dt.la,
            activated: false,
          };
          chunks.set(key, hyd);
          deriveNpcs(hyd); // shopkeepers exist for cached chunks too
        }
        res();
      };
      r.onerror = res;
    })));
  }
  // Persist a single explored chunk to IDB. Called from markSeen() in main.js
  // when the player first enters a chunk — not on every getChunk() call.
  function persistChunk(cx, cy) {
    const ch = chunks.get(`${cx},${cy}`);
    if (ch) _persistChunk(cx, cy, ch);
  }
  // Keep the in-memory chunk Map bounded: far-away chunks are persisted (so
  // crops/node state survive) and dropped; they re-hydrate from IDB or
  // regenerate deterministically when approached again. Without this, a long
  // session (or a big cheat-mode reveal radius) retains every chunk ever
  // touched and eventually OOM-crashes the tab.
  const CHUNK_MEM_CAP = 600;
  function pruneChunks(pcx, pcy) {
    if (chunks.size <= CHUNK_MEM_CAP) return;
    for (const [key, ch] of chunks) {
      if (Math.abs(ch.cx - pcx) > 10 || Math.abs(ch.cy - pcy) > 10) {
        _persistChunk(ch.cx, ch.cy, ch);
        chunks.delete(key);
        if (chunks.size <= CHUNK_MEM_CAP - 150) break;
      }
    }
  }

  // ---------- hydraulic erosion (SimpleHydrology port) ----------
  // Runs particle-based erosion on a flat heightmap array (values 0-1).
  // Direct port of SimpleHydrology water.h / world.h erosion algorithm:
  // each droplet descends following the terrain normal, eroding steep slopes
  // and depositing sediment in flat areas. Returns the discharge accumulation
  // array (higher = more water flow = river valleys / wet floors).
  function runErosion(hm, w, h, rng) {
    const dis  = new Float32Array(w * h); // discharge accumulation
    const N    = 120;    // droplet count
    const evap = 0.001;  // evaporation rate (from SimpleHydrology)
    const dep  = 0.08;   // deposition rate
    const grav = 0.12;   // gravity scale
    const entr = 6.0;    // entrainment: discharge amplifies erosion
    const minV = 0.01;   // minimum droplet volume
    const maxA = 350;    // maximum droplet age

    for (let d = 0; d < N; d++) {
      let px = rng() * w, py = rng() * h;
      const si = Math.floor(py) * w + Math.floor(px);
      if (hm[si] < 0.46) continue; // don't spawn on water

      let vol = 1.0, sed = 0.0, vx = 0.0, vy = 0.0;

      for (let age = 0; age < maxA && vol >= minV; age++) {
        const ix = Math.floor(px), iy = Math.floor(py);
        if (ix < 1 || ix >= w - 1 || iy < 1 || iy >= h - 1) break;
        const idx = iy * w + ix;

        // Surface gradient (terrain normal x/y components)
        const gx = (hm[idx + 1]   - hm[idx - 1])   * 0.5;
        const gy = (hm[idx + w]   - hm[idx - w])   * 0.5;

        // Gravity accelerates droplet downslope; momentum dampens direction changes
        vx = (vx + grav * gx) * 0.85;
        vy = (vy + grav * gy) * 0.85;
        const spd = Math.sqrt(vx * vx + vy * vy);
        if (spd < 1e-6) break;
        vx /= spd; vy /= spd; // unit velocity

        const npx = px + vx, npy = py + vy;
        const nix = Math.floor(npx), niy = Math.floor(npy);
        if (nix < 0 || nix >= w || niy < 0 || niy >= h) break;

        // Height drop; discharge amplifies how much sediment can be transported
        const dh    = hm[idx] - hm[niy * w + nix];
        const c_eq  = Math.max(0, (1 + entr * dis[idx]) * dh);
        const cdiff = c_eq - sed;

        // Erode or deposit
        sed         += dep * cdiff;
        hm[idx]      = Math.max(0, hm[idx] - dep * cdiff);

        dis[idx] += vol;

        px = npx; py = npy;
        vol *= (1 - evap);
        sed /= (1 - evap);
      }
      // Deposit remaining sediment at final position
      const fx = Math.floor(px), fy = Math.floor(py);
      if (fx >= 0 && fx < w && fy >= 0 && fy < h)
        hm[fy * w + fx] = Math.min(1, hm[fy * w + fx] + sed);
    }
    return dis;
  }

  // ---- shopkeeper NPCs, derived from persisted building records ----
  // Every trader building gets a shopkeeper, and station buildings roll a 35%
  // chance of one too; the shop TYPE (general store / woodcutter / armoury /
  // …, see market.js SHOP_TYPES) is hash-picked per building. Because this is
  // pure derivation from ch.buildings, it runs for chunks HYDRATED from the
  // cache as well as freshly generated ones — NPCs aren't persisted, and they
  // used to silently vanish from cached chunks after a reload.
  const npcDerived = new Set(); // building key -> already spawned this session
  function deriveNpcs(ch) {
    for (const b of ch.buildings || []) {
      const bkey = b.x0 + "," + b.y0;
      if (npcDerived.has(bkey)) continue;
      // the MAIN BRANCH bank hall staffs a counter of BANKERS instead of a
      // lone keeper — talking to one opens/serves a bank account (ui.js)
      if (b.kind === "mainbank") {
        const lii2 = (x, y) => (y - ch.cy * CHUNK) * CHUNK + (x - ch.cx * CHUNK);
        const inThis2 = (x, y) => x >= ch.cx * CHUNK && x < (ch.cx + 1) * CHUNK &&
          y >= ch.cy * CHUNK && y < (ch.cy + 1) * CHUNK;
        const spots = [];
        // clerks stand one row in front of the teller chests (back wall + 2),
        // spaced along the counter; fall back to deeper rows if furnished over
        outer2: for (let dy = 2; dy <= b.h - 2 && spots.length < 3; dy++)
          for (let dx = 1; dx <= b.w - 2; dx += 3) {
            const x = b.x0 + dx, y = b.y0 + dy;
            if (!inThis2(x, y)) continue;
            if (!String(ch.ground[lii2(x, y)]).startsWith("floor")) continue;
            if (ch.blocked[lii2(x, y)] === 1 || ch.decor[lii2(x, y)]) continue;
            if (ch.nodes.some(n => n.x === x && n.y === y)) continue;
            if (npcs.some(n => n.x === x && n.y === y)) continue;
            spots.push({ x, y });
            if (spots.length >= 3) break outer2;
          }
        if (!spots.length) continue;
        npcDerived.add(bkey);
        spots.forEach((sp, i) => {
          const look = hash2i(b.x0 + i * 17, b.y0, S ^ 0xb4a2) % VILLAGER_LOOKS.length;
          npcs.push({
            name: VILLAGER_NAMES[hash2i(b.x0 + i * 13, b.y0, S ^ 0xb4a1) % VILLAGER_NAMES.length],
            x: sp.x, y: sp.y, look, spr: VILLAGER_LOOKS[look],
            banker: true,
            line: `"Welcome to the bank. Might I interest you in an account?"`,
          });
        });
        continue;
      }
      // a village bank on a tiny CITY-LESS road web ("Bank of Braadford and
      // Hildford") is a staffed co-op counter: one clerk who can open the
      // account (ui.js bankerTalk) — there is no city main branch to sign at
      if (b.job === "bank" && typeof bankNetAt === "function") {
        const net = bankNetAt(b.x0, b.y0);
        const coop = net && typeof net === "string" && net.startsWith("roadnet:") &&
          !mainBranchFor(net) && bankNetInfo(net);
        if (coop) {
          const lii3 = (x, y) => (y - ch.cy * CHUNK) * CHUNK + (x - ch.cx * CHUNK);
          const inThis3 = (x, y) => x >= ch.cx * CHUNK && x < (ch.cx + 1) * CHUNK &&
            y >= ch.cy * CHUNK && y < (ch.cy + 1) * CHUNK;
          let spot = null;
          outer3: for (let dy = 2; dy <= b.h - 2; dy++)
            for (let dx = 1; dx <= b.w - 2; dx++) {
              const x = b.x0 + dx, y = b.y0 + dy;
              if (!inThis3(x, y)) continue;
              if (!String(ch.ground[lii3(x, y)]).startsWith("floor")) continue;
              if (ch.blocked[lii3(x, y)] === 1 || ch.decor[lii3(x, y)]) continue;
              if (ch.nodes.some(n => n.x === x && n.y === y)) continue;
              if (npcs.some(n => n.x === x && n.y === y)) continue;
              spot = { x, y }; break outer3;
            }
          if (spot) {
            npcDerived.add(bkey);
            const look = hash2i(b.x0, b.y0, S ^ 0xb4a2) % VILLAGER_LOOKS.length;
            npcs.push({
              name: VILLAGER_NAMES[hash2i(b.x0, b.y0, S ^ 0xb4a1) % VILLAGER_NAMES.length],
              x: spot.x, y: spot.y, look, spr: VILLAGER_LOOKS[look],
              banker: true,
              line: `"Welcome to the ${coop.title}. Might I interest you in an account?"`,
            });
            continue;
          }
        }
      }
      const KEYS = (typeof SHOP_TYPE_KEYS !== "undefined") ? SHOP_TYPE_KEYS : ["general"];
      let type = null;
      if (b.job === "trader") {
        // the settlement's designated trader is USUALLY the general store;
        // the rest of the variety comes from station-building shopkeepers
        type = hash2i(b.x0, b.y0, S ^ 0x5107) % 3 !== 0 ? "general"
          : KEYS[hash2i(b.x0, b.y0, S ^ 0x5108) % KEYS.length];
      } else if (b.job && STATIONS[b.job] && hash2i(b.x0, b.y0, S ^ 0x5109) % 100 < 35) {
        type = KEYS[hash2i(b.x0, b.y0, S ^ 0x510a) % KEYS.length];
      }
      if (!type) continue;
      // the keeper stands on a free interior floor tile, preferring the front
      const lii = (x, y) => (y - ch.cy * CHUNK) * CHUNK + (x - ch.cx * CHUNK);
      const inThis = (x, y) => x >= ch.cx * CHUNK && x < (ch.cx + 1) * CHUNK &&
        y >= ch.cy * CHUNK && y < (ch.cy + 1) * CHUNK;
      let spot = null;
      outer: for (let dy = b.h - 2; dy >= 1; dy--)
        for (let dx = b.w - 2; dx >= 1; dx--) {
          const x = b.x0 + dx, y = b.y0 + dy;
          if (!inThis(x, y)) continue;
          if (!String(ch.ground[lii(x, y)]).startsWith("floor")) continue;
          if (ch.blocked[lii(x, y)] === 1 || ch.decor[lii(x, y)]) continue;
          if (ch.nodes.some(n => n.x === x && n.y === y)) continue;
          if (npcs.some(n => n.x === x && n.y === y)) continue;
          spot = { x, y }; break outer;
        }
      if (!spot) continue;
      npcDerived.add(bkey);
      const origin = b.job === "trader" && Math.abs(b.x0) < 70 && Math.abs(b.y0) < 70;
      const st = (typeof SHOP_TYPES !== "undefined") ? SHOP_TYPES[origin ? "general" : type] : null;
      npcs.push({
        name: origin ? "Sten" : VILLAGER_NAMES[hash2i(b.x0, b.y0, S ^ 7) % VILLAGER_NAMES.length],
        x: spot.x, y: spot.y,
        look: origin ? -1 : hash2i(b.x0, b.y0, S ^ 9) % VILLAGER_LOOKS.length,
        spr: origin ? [["body_npc"], ["shirt_orange"], ["hat_white"]] :
          VILLAGER_LOOKS[hash2i(b.x0, b.y0, S ^ 9) % VILLAGER_LOOKS.length],
        trader: true, shopType: origin ? "general" : type,
        line: (st && st.line) || `"Welcome! Buy tools, sell me your goods."`,
      });
    }
  }

  // rolling log of chunk generation times (perf triage; read via world._genLog)
  const genLog = [];
  function getChunk(ccx, ccy) {
    const key = ccx + "," + ccy;
    let ch = chunks.get(key);
    if (ch) return ch;
    const _t0 = performance.now();
    const rng = mulberry32((S ^ Math.imul(ccx, 0x9E3779B1) ^ Math.imul(ccy, 0x85EBCA77)) >>> 0);
    const bx = ccx * CHUNK, by = ccy * CHUNK;
    const N = CHUNK * CHUNK;
    const ground = new Array(N);
    const decor = new Array(N).fill(null);
    const blocked = new Uint8Array(N);
    const nodes = [];
    const spawnDefs = [];
    const buildings = [];
    // every footprint stamped into this chunk, even when the record's owner
    // (its centre) lives in a neighbouring chunk — used to keep fishing spots
    // and other water decor out of river-building undercrofts
    const stampedFeet = [];
    const labels = [];
    const li = (x, y) => (y - by) * CHUNK + (x - bx);
    const inCh = (x, y) => x >= bx && x < bx + CHUNK && y >= by && y < by + CHUNK;

    // --- field grids (chunk + 1 margin) ---
    const GS = CHUNK + 3;
    const eG  = new Float32Array(GS * GS);
    const bG  = new Int16Array(GS * GS);
    const tfG = new Float32Array(GS * GS);

    // Pass 1: raw elevation
    for (let gy = 0; gy < GS; gy++)
      for (let gx = 0; gx < GS; gx++)
        eG[gy * GS + gx] = elevation((bx + gx - 1) * 0.5, (by + gy - 1) * 0.5);

    // Hydraulic erosion (SimpleHydrology): modifies eG in-place, returns discharge.
    // Uses a separate RNG so erosion doesn't perturb the main chunk rng sequence.
    const erosionRng = mulberry32(
      (S ^ Math.imul(ccx * 7, 0x9E3779B1) ^ Math.imul(ccy * 13, 0x85EBCA77)) >>> 0);
    const disG = runErosion(eG, GS, GS, erosionRng);

    // Pass 2: biome classification using eroded elevations + discharge-boosted humidity
    for (let gy = 0; gy < GS; gy++)
      for (let gx = 0; gx < GS; gx++) {
        const wx = bx + gx - 1, wy = by + gy - 1;
        const hx = wx * 0.5, hy = wy * 0.5;
        const i  = gy * GS + gx;
        const e  = eG[i];
        // Discharge boosts local humidity (river valleys and basins are wetter)
        const disHum = Math.min(0.30, disG[i] / 120 * 0.35);
        const hum = Math.min(1, humidity(hx, hy) + disHum);
        bG[i]  = classify(e, hum, temperature(hx, hy),
          farmField(hx, hy), civField(hx, hy), weirdField(hx, hy));
        tfG[i] = fbm(hx * 0.014, hy * 0.014, S + 0x9A, 2);
      }
    const G = (tx, ty) => (ty + 1) * GS + (tx + 1);

    // river and road detection via polyline proximity (map coords = game coords / 2)
    const bxM = bx * 0.5, byM = by * 0.5, csM = CHUNK * 0.5;
    const chRivs = riversNear(bxM - 12, byM - 12, bxM + csM + 12, byM + csM + 12);
    const chRoads = roadsNear(bxM - 8, byM - 8, bxM + csM + 8, byM + csM + 8);
    const riverAt = (wx, wy) => {
      const mx = wx * 0.5, my = wy * 0.5;
      for (const rv of chRivs)
        for (const pts of rv.polys)
          if (nearPoly(pts, mx, my, 0)) return true;
      return false;
    };
    const roadAt = (wx, wy) => {
      const mx = wx * 0.5, my = wy * 0.5;
      for (const rp of chRoads)
        if (nearPoly(rp.pts, mx, my, ROAD_W)) return true;
      return false;
    };
    // river within r map units (2r game tiles) — the bridge deck spans the
    // whole bank slope, not just the water
    const riverNearAt = (wx, wy, r) => {
      const mx = wx * 0.5, my = wy * 0.5;
      for (const rv of chRivs)
        for (const pts of rv.polys)
          if (nearPoly(pts, mx, my, r)) return true;
      return false;
    };
    // water test usable slightly outside the chunk (for pier spacing): eroded
    // grid inside the margin, raw elevation beyond it
    const watAt = (wx, wy) => {
      const tx = wx - bx, ty = wy - by;
      const e = (tx >= -1 && tx <= CHUNK + 1 && ty >= -1 && ty <= CHUNK + 1)
        ? eG[G(tx, ty)] : elevation(wx * 0.5, wy * 0.5);
      return e < LAND_E || riverAt(wx, wy);
    };
    // sea only (no rivers) — same eroded-grid-then-raw fallback as watAt
    const seaAt = (wx, wy) => {
      const tx = wx - bx, ty = wy - by;
      const e = (tx >= -1 && tx <= CHUNK + 1 && ty >= -1 && ty <= CHUNK + 1)
        ? eG[G(tx, ty)] : elevation(wx * 0.5, wy * 0.5);
      return e < LAND_E;
    };
    // any sea tile within 6 game tiles (stride-2 scan — the coast is coarse):
    // the cheap gate before the road∧sea crossing scan, mirroring riverNearAt
    const seaNearAt = (wx, wy) => {
      for (let ay = -6; ay <= 6; ay += 2)
        for (let ax = -6; ax <= 6; ax += 2)
          if (seaAt(wx + ax, wy + ay)) return true;
      return false;
    };
    const landAdj = (wx, wy) =>
      !watAt(wx + 1, wy) || !watAt(wx - 1, wy) || !watAt(wx, wy + 1) || !watAt(wx, wy - 1);

    const villages = villagesNear(bx / 2, by / 2, (bx + CHUNK) / 2, (by + CHUNK) / 2, 40);
    const inVillage = (x, y) => villages.find(v => {
      const dx = x - v.x, dy = y - v.y;
      return dx * dx + dy * dy < (v.R + 2) * (v.R + 2);
    });

    // --- terrain ---
    for (let ty = 0; ty < CHUNK; ty++)
      for (let tx = 0; tx < CHUNK; tx++) {
        const wx = bx + tx, wy = by + ty;
        const i = G(tx, ty), li2 = ty * CHUNK + tx;
        const e = eG[i];
        const sea = e < LAND_E;
        const river = !sea && riverAt(wx, wy);
        const road = roadAt(wx, wy);
        const tf = Math.min(1, Math.max(0, (tfG[i] - 0.5) * 1.8 + 0.5));
        let g;
        if (sea || river) {
          const wb = bG[i] === B.DEEP ? B.DEEP : bG[i] === B.REEF ? B.REEF : B.WATER;
          g = biomeGround(wb, wx, wy);
          // bridge: the road crosses ON TOP of the water — a river, or a
          // shallow sea strait the router paid WATER_COST to ford. The ground
          // stays water (the channel runs unbroken underneath — boats sail
          // through); the stone_bridge decor marks the walkable deck, which
          // the renderer builds as real geometry (bank-top tier over rivers,
          // an elevated overpass with boat clearance over the sea).
          // "stone_bridge#p" = a solid 1-tile support pier. Beside the banks:
          // only where a mid-channel tile exists next to it (so a boat always
          // has a clear lane), staggered so they read as spaced piles. Out on
          // the open sea: a sparse 4-tile lattice of piles carries the long
          // span — the gaps between them stay sailable.
          if (road) {
            const pier = (landAdj(wx, wy) && ((wx + wy) & 1) === 0 &&
              [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([px, py]) =>
                watAt(wx + px, wy + py) && !landAdj(wx + px, wy + py)))
              || (sea && !landAdj(wx, wy) && (wx & 3) === 0 && (wy & 3) === 0);
            decor[li2] = pier ? "stone_bridge#p" : "stone_bridge";
          }
        } else if (road) {
          g = "dirt#1";                                         // path
          // bridge approach: the deck starts at the top of the bank and spans
          // the whole slope down to the water — but only around an actual
          // crossing (a road∧water tile nearby), so roads running alongside a
          // river or the coast don't become endless elevated boardwalks
          if (riverNearAt(wx, wy, 3) || seaNearAt(wx, wy)) {
            let nearCrossing = false;
            scan: for (let ay = -6; ay <= 6; ay++)
              for (let ax = -6; ax <= 6; ax++)
                if ((seaAt(wx + ax, wy + ay) || riverAt(wx + ax, wy + ay)) &&
                    roadAt(wx + ax, wy + ay)) {
                  nearCrossing = true; break scan;
                }
            if (nearCrossing) decor[li2] = "stone_bridge";
          }
        } else {
          const b = bG[i];
          g = biomeGround(b === B.FARM && inVillage(wx, wy) ? B.GRASS : b, wx, wy);
          // hedge maze walls on the 4-lattice
          if (b === B.LABYRINTH) {
            const mx2 = ((wx % 4) + 4) % 4, my2 = ((wy % 4) + 4) % 4;
            const cx2 = Math.floor(wx / 4), cy2 = Math.floor(wy / 4);
            if ((mx2 === 0 && rand2(cx2, cy2, S ^ 0xeb1) > 0.3) ||
                (my2 === 0 && rand2(cx2, cy2, S ^ 0xeb2) > 0.3)) {
              decor[li2] = "bush#1";
              blocked[li2] = 1;
            }
          }
        }
        ground[li2] = g;
        if (isWaterKey(g)) blocked[li2] = 1;
      }

    const isW = (x, y) => inCh(x, y) && isWaterKey(ground[li(x, y)]);
    const openTile = (x, y) => inCh(x, y) && !blocked[li(x, y)] && !decor[li(x, y)] &&
      !nodes.some(n => n.x === x && n.y === y) && !isWaterKey(ground[li(x, y)]) &&
      ground[li(x, y)] !== "floor_wood" && ground[li(x, y)] !== "dirt#1";
    const deco = (x, y, d, blk) => {
      if (!inCh(x, y)) return;
      decor[li(x, y)] = d;
      if (blk) blocked[li(x, y)] = 1;
    };
    const addNode = (type, x, y, blk = true, extra = {}) => {
      if (!inCh(x, y)) return null;
      const n = { id: key + ":" + nodes.length, type, x, y, alive: true, ...extra };
      nodes.push(n);
      if (blk) blocked[li(x, y)] = 1;
      return n;
    };
    // A fishing spot for a specific fish, procedurally chosen for its depth band
    // (rarer fish rarer) with a 5-10 catch counter before it depletes.
    const addFishNode = (x, y, band) => {
      if (typeof fishForBand !== "function") return addNode("fishspot_0", x, y, false, { left: 8, leftMax: 8 });
      const idx = fishForBand(band, rng());
      const left = 5 + Math.floor(rng() * 6);   // 5-10 fish before depletion
      return addNode("fishspot_" + idx, x, y, false, { left, leftMax: left });
    };
    // Scatter non-blocking prop billboards inside a stamped building. Interior
    // floor tiles are walkable (blocked 0/2); we skip walls (blocked 1), the
    // door gap, already-decorated tiles and station nodes. Props never block
    // movement (deco() with no blk flag), so furnishing can't trap the player.
    const furnishInterior = (b, items) => {
      if (!b) return;
      for (const [spr, dx, dy] of items) {
        const fx = b.x0 + dx, fy = b.y0 + dy;
        if (!inCh(fx, fy) || decor[li(fx, fy)] || blocked[li(fx, fy)] === 1) continue;
        if (!String(ground[li(fx, fy)]).startsWith("floor")) continue; // hollow river passage
        if (nodes.some(n => n.x === fx && n.y === fy)) continue;
        deco(fx, fy, spr);
      }
    };
    // Furnish a settlement building from its trade. Interior anchor slots hug the
    // perimeter (skipping the central station tile placed by placeJob) and adapt
    // to the footprint, so this works for any building 5x5 or larger.
    // Strategic interior slots, shared by trade shops and POI buildings. The
    // job station (when any) sits against the back (north) wall centre, so:
    // slots 1-2 flank it, then back corners, extra back spots on wide rooms,
    // runs down both side walls, front-corner accents last. The tile just
    // inside every door stays clear (river buildings may have side doors).
    const strategicSlots = (b) => {
      const w = b.w, h = b.h, cx2 = w >> 1;
      const excl = new Set();
      let spansRiver = false;
      for (let y = b.y0; y < b.y0 + b.h && !spansRiver; y++)
        for (let x = b.x0; x < b.x0 + b.w && !spansRiver; x++)
          if (riverAt(x, y)) spansRiver = true;
      if (spansRiver)
        for (const d2 of riverDoors(b.x0, b.y0, b.w, b.h)) {
          const [ox, oy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][d2.angle]; // inward
          excl.add((d2.x - b.x0 + ox) + "," + (d2.y - b.y0 + oy));
        }
      else excl.add(cx2 + "," + (h - 2)); // inside the south door
      const slots = [];
      const push2 = (x, y) => {
        if (x >= 1 && x <= w - 2 && y >= 1 && y <= h - 2 && !excl.has(x + "," + y) &&
            !slots.some(s2 => s2[0] === x && s2[1] === y)) slots.push([x, y]);
      };
      push2(cx2 - 1, 1); push2(cx2 + 1, 1);          // flank the station
      push2(1, 1); push2(w - 2, 1);                  // back corners
      if (w >= 9) { push2(cx2 - 2, 1); push2(cx2 + 2, 1); }
      for (let y = 2; y <= h - 3; y++) { push2(1, y); push2(w - 2, y); } // side-wall runs
      push2(1, h - 2); push2(w - 2, h - 2);          // front-corner accents
      return slots;
    };
    const furnishTrade = (b) => {
      const list = TRADE_DECOR[b.job] || TRADE_DECOR._default;
      if (!list || !list.length) return;
      const w = b.w, h = b.h;
      if (w < 5 || h < 5) return;
      // long stock lists — casks, candles, sails — repeat down the wall runs
      // like a real shop's inventory
      const slots = strategicSlots(b);
      // signature items keep their flagship spots; the rest of the list
      // rotates by building so every variant surfaces somewhere in the world
      const rest = Math.max(1, list.length - 2);
      const off = hash2i(b.x0, b.y0, S ^ 0x5d3c) % rest;
      const items = [];
      for (let i = 0; i < slots.length; i++) {
        const key = i < 2 ? list[Math.min(i, list.length - 1)]
          : list.length <= 2 ? list[list.length - 1]
          : list[2 + ((off + i - 2) % rest)];
        items.push([key, slots[i][0], slots[i][1]]);
      }
      furnishInterior(b, items);
      // a shipyard also holds one hull on the stocks (rotated so all hulls show)
      if (b.job === "shipyard") {
        const hk = SHIP_FLEET[hash2i(b.x0, b.y0, S ^ 0x51a7) % SHIP_FLEET.length];
        furnishInterior(b, [[hk, 2, h - 3]]);
      }
    };

    // --- settlement stamping ---
    const stampBuilding = (b, roof) => {
      let ok = true;
      for (let y = b.y0; y < b.y0 + b.h && ok; y++)
        for (let x = b.x0; x < b.x0 + b.w && ok; x++)
          if (elevation(x * 0.5, y * 0.5) < LAND_E) ok = false;
      if (!ok) return false;
      stampedFeet.push({ x0: b.x0, y0: b.y0, w: b.w, h: b.h });
      const doorX = b.x0 + (b.w >> 1);
      // river-spanning building: the channel plus a 1-tile bank strip stay
      // natural ("hollow") — the floor slab and walls span overhead in the
      // renderer, the river flows through underneath, and a second door opens
      // on the north side so both banks have a way in. riverAt is a pure
      // function of position, so every chunk stamping its slice of the
      // footprint derives the same hollow mask and the same river flag.
      let spansRiver = false;
      for (let y = b.y0; y < b.y0 + b.h && !spansRiver; y++)
        for (let x = b.x0; x < b.x0 + b.w && !spansRiver; x++)
          if (riverAt(x, y)) spansRiver = true;
      const hollowAt = (x, y) => spansRiver &&
        (riverAt(x, y) || riverAt(x + 1, y) || riverAt(x - 1, y) ||
         riverAt(x, y + 1) || riverAt(x, y - 1));
      // river buildings get one door per bank via riverDoors (west/east walls
      // when the channel runs north-south); positions shared with buildingMeta
      const rDoors = spansRiver ? riverDoors(b.x0, b.y0, b.w, b.h) : null;
      const doorGapAt = (x, y) => rDoors
        ? rDoors.some(d2 => d2.x === x && d2.y === y)
        : y === b.y0 + b.h - 1 && x === doorX;
      for (let y = b.y0; y < b.y0 + b.h; y++)
        for (let x = b.x0; x < b.x0 + b.w; x++) {
          if (!inCh(x, y)) continue;
          if (hollowAt(x, y)) {
            // hollow passage: keep the terrain (water blocked, bank walkable),
            // clear vegetation out of the undercroft, and plant the same
            // staggered 1-tile support piers bridges use (solid — boats and
            // under-walkers steer between them)
            decor[li(x, y)] = null;
            if (isWaterKey(ground[li(x, y)])) {
              blocked[li(x, y)] = 1;
              const pier = landAdj(x, y) && ((x + y) & 1) === 0 &&
                [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([px, py]) =>
                  watAt(x + px, y + py) && !landAdj(x + px, y + py));
              if (pier) decor[li(x, y)] = "stone_bridge#p";
            } else blocked[li(x, y)] = 0;
            continue;
          }
          ground[li(x, y)] = b.stone ? "floor_stone" : "floor_wood";
          decor[li(x, y)] = null;
          blocked[li(x, y)] = 0;
          const edge = x === b.x0 || x === b.x0 + b.w - 1 || y === b.y0 || y === b.y0 + b.h - 1;
          if (edge && doorGapAt(x, y)) continue; // door gap
          if (edge) {
            // encode which side of the footprint this tile is on (n/s/e/w, or a
            // corner pair like "nw") so the renderer can put the wall loc on the
            // OUTSIDE edge of the tile — north/west is world y0/x0 (low), south/east
            // is the high y0+h-1/x0+w-1 bound
            const westE = x === b.x0, eastE = x === b.x0 + b.w - 1;
            const northE = y === b.y0, southE = y === b.y0 + b.h - 1;
            const isSide = westE || eastE;
            const isYEdge = northE || southE;
            const isCorner = isSide && isYEdge;
            const dir = isCorner ? (northE ? "n" : "s") + (westE ? "w" : "e")
              : isSide ? (westE ? "w" : "e") : (northE ? "n" : "s");
            const mat = b.tall ? "wall_tower"
              : isCorner ? (b.stone ? "wall_stone_corner" : "wall_wood_corner")
              : isSide ? (b.stone ? "wall_stone_side" : "wall_wood_side")
              : b.stone ? "wall_stone" : "wall_wood";
            decor[li(x, y)] = mat + "#" + dir;
            blocked[li(x, y)] = 1;
          }
        }
      // roof owned by the chunk containing the building's centre
      const cxr = b.x0 + (b.w >> 1), cyr = b.y0 + (b.h >> 1);
      if (inCh(cxr, cyr))
        buildings.push({ x0: b.x0, y0: b.y0, w: b.w, h: b.h, tall: !!b.tall, stone: !!b.stone,
          kind: b.kind || null, stoneDoor: !!b.stoneDoor, river: spansRiver || undefined,
          job: b.job || null, job2: b.job2 || null, // deriveNpcs re-spawns shopkeepers from these
          roof: roof || b.roof || (b.stone ? ROOFS_STONE[hash2i(b.x0, b.y0, S) % ROOFS_STONE.length] : ROOFS[hash2i(b.x0, b.y0, S) % ROOFS.length]) });
      // sentinel 2: reserve tiles outside the building (door front + 1-tile margin)
      // so trees/rocks/decor can't grow right up against walls; cleared after vegetation
      // reserve the tiles just outside each door so vegetation can't block it
      const fronts = rDoors
        ? rDoors.map(d2 => {
            const [ox, oy] = [[-1, 0], [0, -1], [1, 0], [0, 1]][d2.angle]; // W N E S outward
            return { x: d2.x + ox, y: d2.y + oy, along: d2.angle % 2 ? [1, 0] : [0, 1] };
          })
        : [{ x: doorX, y: b.y0 + b.h, along: [1, 0] }];
      for (const f of fronts)
        for (let dd = -1; dd <= 1; dd++) {
          const fx = f.x + f.along[0] * dd, fy = f.y + f.along[1] * dd;
          if (inCh(fx, fy) && !blocked[li(fx, fy)]) blocked[li(fx, fy)] = 2;
        }
      for (let my = b.y0 - 1; my <= b.y0 + b.h; my++)
        for (let mx = b.x0 - 1; mx <= b.x0 + b.w; mx++)
          if (inCh(mx, my) && !blocked[li(mx, my)])
            blocked[li(mx, my)] = 2;
      return true;
    };
    // furnace/malthouse/bakehouse all render as the retired prototype "furnace1" loc,
    // a 3x3-tile model — one tile of clearance from the wall isn't enough
    // room for it and lets it clip into/through the wall behind it
    const WIDE_STATIONS = new Set(["furnace", "malthouse", "bakehouse"]);
    const placeJob = (b, v, alt) => {
      // primary station: back-wall centre; a building's SECOND trade (large
      // city halls, b.job2) goes front-left so the two never collide
      let cx2 = alt ? b.x0 + 2 + (WIDE_STATIONS.has(b.job) ? 1 : 0) : b.x0 + (b.w >> 1);
      let cy2 = alt ? b.y0 + b.h - 3 : b.y0 + (WIDE_STATIONS.has(b.job) ? 2 : 1);
      if (!inCh(cx2, cy2)) return;
      if (!String(ground[li(cx2, cy2)]).startsWith("floor") ||
          blocked[li(cx2, cy2)] === 1 || decor[li(cx2, cy2)]) {
        // the usual spot is over a river building's hollow channel: shift the
        // station (bank chest, anvil, trader…) to the nearest interior floor
        // tile instead of dropping it entirely
        let best = null;
        for (let yy = b.y0 + 1; yy < b.y0 + b.h - 1; yy++)
          for (let xx = b.x0 + 1; xx < b.x0 + b.w - 1; xx++) {
            if (!inCh(xx, yy) || !String(ground[li(xx, yy)]).startsWith("floor")) continue;
            if (blocked[li(xx, yy)] === 1 || decor[li(xx, yy)]) continue;
            const dd = Math.abs(xx - cx2) + Math.abs(yy - cy2);
            if (!best || dd < best.d) best = { x: xx, y: yy, d: dd };
          }
        if (!best) return;
        cx2 = best.x; cy2 = best.y;
      }
      // (trader/shopkeeper NPCs are spawned by deriveNpcs — derivable from
      // the persisted building records, so they exist for HYDRATED chunks
      // too, not just freshly generated ones)
      if (STATIONS[b.job]) {
        const wide = WIDE_STATIONS.has(b.job) ? 1 : 0;
        addNode(b.job, cx2, cy2, true, wide ? { station: true, wide } : { station: true });
        // a bank network's MAIN BRANCH hall runs a whole teller row of chests
        // along the back wall, not a lone strongbox
        if (b.kind === "mainbank" && b.job === "bank") {
          for (const ox of [-3, 3, -6, 6]) {
            const fx = cx2 + ox;
            if (!inCh(fx, cy2) || !String(ground[li(fx, cy2)]).startsWith("floor")) continue;
            if (blocked[li(fx, cy2)] === 1 || decor[li(fx, cy2)]) continue;
            if (nodes.some(n => n.x === fx && n.y === cy2)) continue;
            addNode("bank", fx, cy2, true, { station: true });
          }
        }
        if (wide) {
          // the retired prototype model already occupies a 3x3 footprint (engine
          // collision blocks it automatically via LocType width/length) —
          // reserve the same area here so our own blocked-tile grid (spawn
          // placement, click-to-walk reachability) doesn't disagree with it
          for (let ddy = -wide; ddy <= wide; ddy++)
            for (let ddx = -wide; ddx <= wide; ddx++) {
              if (!ddx && !ddy) continue;
              const fx = cx2 + ddx, fy = cy2 + ddy;
              if (inCh(fx, fy) && !blocked[li(fx, fy)]) blocked[li(fx, fy)] = 1;
            }
        }
      }
    };
    for (const v of villages) {
      // city wall ring (stone) with gates on the cross roads
      if (v.wall) {
        const R = v.R;
        // pave the entire interior with stone flags, block vegetation
        for (let y = by; y < by + CHUNK; y++)
          for (let x = bx; x < bx + CHUNK; x++) {
            const dx = x - v.x, dy = y - v.y;
            if (Math.abs(dx) < R && Math.abs(dy) < R && !isW(x, y)) {
              ground[li(x, y)] = "floor_stone";
              if (!blocked[li(x, y)]) blocked[li(x, y)] = 2; // sentinel: no vegetation on paving
            }
          }
        // stone wall ring with gates where roads cross
        for (let y = by; y < by + CHUNK; y++)
          for (let x = bx; x < bx + CHUNK; x++) {
            const dx = x - v.x, dy = y - v.y;
            const onVert = Math.abs(dx) === R && Math.abs(dy) < R;
            const onHorz = Math.abs(dy) === R && Math.abs(dx) < R;
            const onCorner = Math.abs(dx) === R && Math.abs(dy) === R;
            // never wall over a bridge deck (the road bridging a river through
            // the ring) — gatesForVillage puts a gate on the crossing instead
            if ((onVert || onHorz || onCorner) && Math.abs(dx) > 2 && Math.abs(dy) > 2 && !isW(x, y) &&
                !String(decor[li(x, y)] || "").startsWith("stone_bridge")) {
              const dir = onCorner ? (dy < 0 ? "n" : "s") + (dx < 0 ? "w" : "e")
                : onVert ? (dx < 0 ? "w" : "e") : (dy < 0 ? "n" : "s");
              deco(x, y, (onCorner ? "wall_stone_corner" : onVert ? "wall_stone_side" : "wall_stone") + "#" + dir, true);
            }
          }
      }
      // plaza + cross roads (dirt paths for non-walled villages, already stone for walled)
      for (let y = by; y < by + CHUNK; y++)
        for (let x = bx; x < bx + CHUNK; x++) {
          const dx = x - v.x, dy = y - v.y;
          if (!v.wall) {
            if (Math.abs(dx) <= 1 || Math.abs(dy) <= 1) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) < v.R && !isW(x, y) && !decor[li(x, y)]) {
                ground[li(x, y)] = "dirt#1";
                blocked[li(x, y)] = 0;
              }
            }
            if (dx * dx + dy * dy < 9 && !isW(x, y)) {
              ground[li(x, y)] = "dirt#1";
              decor[li(x, y)] = null;
              blocked[li(x, y)] = 0;
            }
          } else {
            // walled city: clear the road corridor and plaza decor
            if ((Math.abs(dx) <= 1 || Math.abs(dy) <= 1 || dx * dx + dy * dy < 9) && !isW(x, y)) {
              decor[li(x, y)] = null;
              blocked[li(x, y)] = 2;
            }
          }
        }
      // Secondary city streets: paint the block-grid roads between buildings
      if (v.streets) {
        for (let ty = by; ty < by + CHUNK; ty++)
          for (let tx = bx; tx < bx + CHUNK; tx++) {
            if (isW(tx, ty)) continue;
            const dx = tx - v.x, dy = ty - v.y;
            const onSt = v.streets.some(st =>
              (st.ox !== undefined && Math.abs(dx - st.ox) <= 1 && Math.abs(dy) < v.R) ||
              (st.oy !== undefined && Math.abs(dy - st.oy) <= 1 && Math.abs(dx) < v.R));
            if (!onSt) continue;
            if (!v.wall) {
              if (!decor[li(tx, ty)]) { ground[li(tx, ty)] = "dirt#1"; blocked[li(tx, ty)] = 0; }
            } else {
              decor[li(tx, ty)] = null;
              if (!blocked[li(tx, ty)]) blocked[li(tx, ty)] = 2;
            }
          }
      }
      if (inCh(v.x, v.y)) deco(v.x, v.y, v.wall ? "city_fountain" : "well_roofed", true);
      // city-only plaza decorations: benches, planters, flower beds
      if (v.wall) {
        const flowers = ["flower_blue", "flower_purple", "flower_orange", "flower_white"];
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]])
          if (openTile(v.x + dx, v.y + dy)) deco(v.x + dx, v.y + dy, "city_bench");
        for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
          if (openTile(v.x + dx, v.y + dy)) deco(v.x + dx, v.y + dy, flowers[((dx + dy) >> 1) & 3]);
        }
        for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]])
          if (openTile(v.x + dx, v.y + dy)) deco(v.x + dx, v.y + dy, "city_planter");
        // grander civic props for walled cities
        for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 4], [4, 4]])
          if (openTile(v.x + dx, v.y + dy)) deco(v.x + dx, v.y + dy, "brazier_iron");
        for (const [dx, dy, k, solid] of [[0, -5, "statue_marble", true], [0, 5, "birdbath", false],
          [-5, 0, "well_roofed", true], [5, 0, "urn_garden", false],
          [0, -6, "aqueduct", true], [0, 6, "planter_box", false]])
          if (openTile(v.x + dx, v.y + dy)) deco(v.x + dx, v.y + dy, k, solid);
      }
      for (const b of v.buildings) {
        if (b.x0 + b.w < bx - 2 || b.x0 > bx + CHUNK + 2 || b.y0 + b.h < by - 2 || b.y0 > by + CHUNK + 2) {
          // still stamp partial overlaps
        }
        if (b.x0 + b.w >= bx && b.x0 < bx + CHUNK && b.y0 + b.h >= by && b.y0 < by + CHUNK) {
          if (stampBuilding(b)) {
            if (b.job) placeJob(b, v);
            if (b.job2) placeJob({ ...b, job: b.job2 }, v, true);
            furnishTrade(b);
          }
        }
      }
      // Newhaven extras: market stall (the prototype seed patch was removed —
      // farm fields now generate naturally in Farmland biome, see stampFarmField)
      if (v.origin) {
        if (inCh(v.x - 4, v.y + 4)) {
          deco(v.x - 4, v.y + 4, "stall_awn", true);
        }
      }
      if (inCh(v.x, v.y - 2)) labels.push({ x: v.x, y: v.y - 2, label: v.name + (v.kind === "city" ? " (city)" : " (village)"), c: "#ffd75e" });
    }

    // --- POI stamps ---
    for (let pcy = Math.floor((by / 2 - PCELL) / PCELL); pcy <= Math.floor(((by + CHUNK) / 2 + PCELL) / PCELL); pcy++)
      for (let pcx = Math.floor((bx / 2 - PCELL) / PCELL); pcx <= Math.floor(((bx + CHUNK) / 2 + PCELL) / PCELL); pcx++) {
        const p0 = poiInfo(pcx, pcy);
        if (!p0) continue;
        const p = { ...p0, x: p0.x * 2, y: p0.y * 2 };
        // margin must cover the widest stamp (mansion wings reach 10 tiles from
        // the POI centre, fishvillage huts ~14) or border chunks lose tiles
        if (p.x < bx - 16 || p.x >= bx + CHUNK + 16 || p.y < by - 16 || p.y >= by + CHUNK + 16) continue;
        stampPoi(p);
      }
    function stampPoi(p) {
      const { x, y, type } = p;
      if (inCh(x, y - 2)) labels.push({ x, y: y - 2, label: p.name, c: "#9ecbff" });
      const house = (w, h, job, opts = {}) => {
        const b = { x0: x - (w >> 1), y0: y - (h >> 1), w, h, stone: false, ...opts, job };
        if (stampBuilding(b)) { if (job) placeJob(b, { origin: false }); return b; }
        return null;
      };
      // scatter small furniture/decor inside a stamped building. Interior tiles
      // carry the blocked=2 "reserved" sentinel (and their floor ground), so
      // openTile() is always false indoors — place directly instead, skipping
      // anything already occupied (walls, door gap, stations).
      const furnish = (b, items) => {
        if (!b) return;
        for (const [spr, dx, dy] of items) {
          const fx = b.x0 + dx, fy = b.y0 + dy;
          if (!inCh(fx, fy) || decor[li(fx, fy)] || blocked[li(fx, fy)] === 1) continue;
          if (nodes.some(n => n.x === fx && n.y === fy)) continue;
          deco(fx, fy, spr);
        }
      };
      // POI buildings share the trade shops' strategic layout: the list is in
      // importance order (first two flank the station spot on the back wall),
      // and unlike shops the list does NOT repeat — homes get one bed, not a
      // wall of them.
      const furnishPoi = (b, list) => {
        if (!b) return;
        const slots = strategicSlots(b);
        const items = [];
        for (let i = 0; i < slots.length && i < list.length; i++)
          items.push([list[i], slots[i][0], slots[i][1]]);
        furnishInterior(b, items);
      };
      switch (type) {
        case "wizardtower": case "watchtower": {
          // real towers: 6x6 footprint, 4 stacked storeys; the wizard tower
          // gets a steep dark spire roof, the watchtower open battlements
          const b2 = house(6, 6, type === "wizardtower" ? "altar" : null,
            { stone: true, tall: true, stoneDoor: true,
              kind: type === "wizardtower" ? "spire" : "tower",
              roof: type === "wizardtower" ? "roof_tower" : undefined });
          furnishPoi(b2, ["bookshelf", "desk", "bookshelf", "candle_scrying", "brazier_iron", "dresser"]);
          // many towers keep a bank chest by the door (wired to the nearest
          // bank network — the landmass's road web — when opened)
          if (rand2(x, y, S ^ 0x9119) < (type === "wizardtower" ? 0.5 : 0.4) && openTile(x, y + 4))
            addNode("bank", x, y + 4, true, { station: true });
          break;
        }
        case "manor": {
          // mansion: a 3-storey 13x9 hall with three ATTACHED 2-storey wings
          // (west/east/north) that share a wall with the hall; 1-tile archways
          // cut through the shared walls connect them on the ground floor (and
          // the renderer/passable() mirror them on the first floor). Wing
          // rects and archway tiles MUST match buildingMeta's derivation.
          const main = house(13, 9, null, { stone: true, kind: "mansion", roof: "roof_tower" });
          if (!main) break;
          furnishPoi(main, ["candelabra", "statue_marble", "bookshelf", "dresser_mirror",
            "desk", "sideboard", "cupboard", "chair"]);
          const hx0 = x - 6, hy0 = y - 4, hx1 = hx0 + 13, hy1 = hy0 + 9;
          furnish(main, [["bed_fourposter", 1, 1], ["wardrobe", 3, 1], ["bookshelf", 5, 1], ["bookshelf", 7, 1],
            ["sideboard", 9, 1], ["dresser", 11, 1], ["table2", 5, 4], ["table2", 6, 4], ["chair", 4, 4], ["chair", 7, 4],
            ["candelabra", 5, 3], ["fireplace", 1, 7], ["statue_marble", 11, 7], ["chandelier_crystal", 6, 2], ["cabinet", 11, 4]]);
          const wingsW = [
            { x0: hx0 - 4, y0: hy0 + 1, w: 5, h: 7 },
            { x0: hx1 - 1, y0: hy0 + 1, w: 5, h: 7 },
            { x0: hx0 + 3, y0: hy0 - 4, w: 7, h: 5 },
          ];
          for (const wg of wingsW) {
            const wx1 = wg.x0 + wg.w, wy1 = wg.y0 + wg.h;
            for (let wy = wg.y0; wy < wy1; wy++)
              for (let wx = wg.x0; wx < wx1; wx++) {
                if (!inCh(wx, wy)) continue;
                if (wx >= hx0 && wx < hx1 && wy >= hy0 && wy < hy1) continue; // hall owns shared tiles
                ground[li(wx, wy)] = "floor_stone";
                decor[li(wx, wy)] = null;
                const dir = (wy === wg.y0 ? "n" : wy === wy1 - 1 ? "s" : "") +
                            (wx === wg.x0 ? "w" : wx === wx1 - 1 ? "e" : "");
                if (dir) {
                  decor[li(wx, wy)] = (dir.length === 2 ? "wall_stone_corner" : (dir === "w" || dir === "e") ? "wall_stone_side" : "wall_stone") + "#" + dir;
                  blocked[li(wx, wy)] = 1;
                } else blocked[li(wx, wy)] = 2; // interior: walkable, no vegetation
              }
            // vegetation margin around the wing
            for (let my = wg.y0 - 1; my <= wy1; my++)
              for (let mx = wg.x0 - 1; mx <= wx1; mx++)
                if (inCh(mx, my) && !blocked[li(mx, my)]) blocked[li(mx, my)] = 2;
            furnish(wg, [["bed", 1, 1], ["wardrobe", wg.w - 2, 1], ["cradle", 1, wg.h - 2], ["candle_dinner", 2, 1]]);
          }
          // archways through the hall's shared walls (ground floor)
          for (const [ax, ay] of [[hx0, hy0 + 4], [hx1 - 1, hy0 + 4], [hx0 + 6, hy0]])
            if (inCh(ax, ay)) { ground[li(ax, ay)] = "floor_stone"; decor[li(ax, ay)] = null; blocked[li(ax, ay)] = 2; }
          // formal garden along the approach
          for (const [dx, dy] of [[-3, 6], [-1, 6], [1, 6], [3, 6]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, ["flower_white", "flower_purple"][(dx >> 1) & 1]);
          // an estate always banks its wealth: a chest on the approach
          if (openTile(x, y + 7)) addNode("bank", x, y + 7, true, { station: true });
          else if (openTile(x + 2, y + 6)) addNode("bank", x + 2, y + 6, true, { station: true });
          break;
        }
        case "farmstead": case "inn": case "watermill": case "windmill": {
          const b2 = house(7, 7,
            type === "inn" ? "campfire" : type === "watermill" || type === "windmill" ? "mill" :
            type === "farmstead" ? "loom" : null,
            { stone: false });
          if (type === "inn") {
            if (rand2(x, y, S ^ 0x9118) < 0.4) addNode("bank", x + 3, y + 3, true, { station: true });
            furnishPoi(b2, ["barrel_ale", "fireplace", "bed", "bed_frame", "table2", "cupboard", "candelabra", "chair"]);
          } else if (type === "farmstead") {
            furnishPoi(b2, ["butter_churn", "wash_tub", "dresser", "cupboard", "chair"]);
          } else {
            furnishPoi(b2, ["table2", "sideboard", "barrel_flour", "chair"]);
          }
          if (type === "farmstead")
            for (let i = 0; i < 4; i++)
              if (openTile(x - 4 + i, y + 4)) { ground[li(x - 4 + i, y + 4)] = "farm"; addNode("farmplot", x - 4 + i, y + 4, false, { farm: true, crop: null }); }
          break;
        }
        case "graveyard": case "barrow": case "gallows": case "battlefield":
          for (const [dx, dy] of [[-3, -2], [-1, -3], [1, -2], [3, -3], [-2, 2], [2, 3], [0, 1], [3, 1]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "gravestone", true);
          if (openTile(x - 1, y)) deco(x - 1, y, "skull");
          if (openTile(x + 1, y + 2)) deco(x + 1, y + 2, "burial_urn", true);
          if (openTile(x - 3, y + 1)) deco(x - 3, y + 1, "gravestone3", true);
          if (openTile(x + 2, y - 1)) deco(x + 2, y - 1, type === "battlefield" ? "gargoyle" : "statue_marble", true);
          // (essence-rock cluster removed — rune essence ore is deprecated)
          break;
        case "ruins": case "arena": case "obelisk": {
          const rk = type === "ruins"
            ? ["column_stone", "pillar_stone", "archway_stone", "rampart", "gargoyle"]
            : ["boulder", "column_stone", "boulder", "pillar_stone", "boulder"];
          [[-3, -1], [3, 1], [-1, 3], [2, -3], [-3, 2]].forEach(([dx, dy], i) => {
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, rk[i], true);
          });
          if (openTile(x, y)) deco(x, y, type === "obelisk" ? "cathedral_stone" : "gargoyle", true);
          break;
        }
        case "campsite":
          if (openTile(x - 1, y - 1)) deco(x - 1, y - 1, "tent_l", true);
          if (openTile(x, y - 1)) deco(x, y - 1, "tent_r", true);
          if (openTile(x, y + 1)) addNode("campfire", x, y + 1, true, { station: true });
          if (openTile(x + 2, y)) deco(x + 2, y, "tent_bundle", true);
          if (openTile(x - 2, y + 1)) deco(x - 2, y + 1, "bedroll");
          if (rand2(x, y, S ^ 0x9119) < 0.2 && openTile(x + 2, y + 2))
            addNode("bank", x + 2, y + 2, true, { station: true });
          break;
        case "pond": {
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -3; dx <= 3; dx++)
              if (inCh(x + dx, y + dy) && Math.hypot(dx / 1.6, dy) < 1.6 && !decor[li(x + dx, y + dy)]) {
                ground[li(x + dx, y + dy)] = "water#3";
                blocked[li(x + dx, y + dy)] = 1;
              }
          addFishNode(x, y, "shore");
          // agility crossing (Agility): the pond's location deterministically
          // picks an obstacle tier, so ponds across the world span the whole
          // level range — a wandering player meets ever-harder crossings.
          const otype = OBSTACLE_ORDER[hash2i(x, y, S ^ 0xA6111) % OBSTACLE_ORDER.length];
          const ot = OBSTACLE_TYPES[otype];
          const span = [];
          for (let dx = -1; dx <= 1; dx++)
            if (inCh(x + dx, y)) { decor[li(x + dx, y)] = ot.decor; span.push([x + dx, y]); }
          if (span.length === 3 && inCh(x - 2, y) && inCh(x + 2, y)) {
            const meta = { type: otype, req: ot.req, xp: ot.xp, name: ot.name, fail: ot.fail, dmg: ot.dmg };
            obstacles.push({ x: x - 1, y, path: [...span, [x + 2, y]], ...meta });
            obstacles.push({ x: x + 1, y, path: [...span.slice().reverse(), [x - 2, y]], ...meta });
          }
          break;
        }
        case "orchard":
          for (const [dx, dy] of [[-3, -2], [0, -3], [3, -2], [-3, 1], [3, 1], [0, 2], [-2, 3], [2, 3]])
            if (openTile(x + dx, y + dy)) addNode("treeT1", x + dx, y + dy, false);
          break;
        case "lumbercamp": {
          const cap = localTierCap(x, y, TREES.length);
          for (const [dx, dy] of [[-3, -1], [3, 1], [-1, 3], [2, -3], [-3, 2], [1, 1]])
            if (openTile(x + dx, y + dy)) addNode(TREES[rollTier(cap, rng)].node, x + dx, y + dy, false);
          if (openTile(x, y)) deco(x, y, "stump");
          break;
        }
        case "minecamp": case "crater": {
          const cap = localTierCap(x, y, METALS.length);
          for (const [dx, dy] of [[-2, -1], [2, 1], [-1, 2], [1, -2], [-3, 1], [3, -1]]) {
            const rockKind = (typeof mineExtraNode === "function" && mineExtraNode(rng)) || METALS[rollTier(cap, rng)].rock;
            if (openTile(x + dx, y + dy)) addNode(rockKind, x + dx, y + dy, rockKind === "essence");
          }
          if (openTile(x, y)) deco(x, y, "cart_gold", true);
          if (type === "minecamp" && rand2(x, y, S ^ 0x9118) < 0.3) addNode("bank", x + 3, y + 3, true, { station: true });
          break;
        }
        case "fishvillage": {
          // find coast direction in game-tile coordinates
          let dir = null;
          if (p.dir) dir = p.dir;
          else {
            outerDir: for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
              for (let d = 2; d <= 16; d += 2) {
                const ex = elevation((x + dx * d) / 2, (y + dy * d) / 2);
                if (ex < LAND_E) { dir = [dx, dy]; break outerDir; }
              }
            }
          }
          if (!dir) dir = [0, 1];
          const [cdx, cdy] = dir;
          // 3 huts arranged perpendicular to the pier
          for (let i = -1; i <= 1; i++) {
            const hx = x - cdy * i * 9 - cdx * 2;
            const hy = y + cdx * i * 9 - cdy * 2;
            const b2 = { x0: hx - 3, y0: hy - 3, w: 7, h: 7, stone: false,
              job: i === 0 ? "campfire" : null };
            if (b2.x0 + b2.w < bx - 2 || b2.x0 > bx + CHUNK + 2 ||
                b2.y0 + b2.h < by - 2 || b2.y0 > by + CHUNK + 2) continue;
            if (stampBuilding(b2) && b2.job) placeJob(b2, { origin: false });
          }
          // pier: floor_wood extending from village toward water
          for (let s = 0; s <= 10; s++) {
            const px2 = x + cdx * s, py2 = y + cdy * s;
            if (!inCh(px2, py2)) continue;
            const li2 = li(px2, py2);
            ground[li2] = "floor_wood";
            decor[li2] = null;
            blocked[li2] = 0;
          }
          // fishing props landward of the pier (incl. beached small craft)
          for (const [i, k] of [[-3, "barrel_fish"], [3, "crab_pot"], [-5, "skiff"], [5, "raft_logs"]]) {
            const fx = x - cdx * 2 - cdy * i, fy = y - cdy * 2 + cdx * i;
            if (inCh(fx, fy) && !isW(fx, fy) && !decor[li(fx, fy)] && !blocked[li(fx, fy)]) deco(fx, fy, k);
          }
          // most fishing villages keep a bank chest by the pier for the catch
          // money (it opens the vault of whatever network this shore belongs to)
          if (rand2(x, y, S ^ 0x9119) < 0.55 && openTile(x - cdx * 4, y - cdy * 4))
            addNode("bank", x - cdx * 4, y - cdy * 4, true, { station: true });
          // fishing spots at pier end (in water)
          for (let s = 8; s <= 13; s++) {
            for (const [ox2, oy2] of [[0,0],[cdy,-cdx],[-cdy,cdx]]) {
              const fx = x + cdx * s + ox2, fy = y + cdy * s + oy2;
              if (inCh(fx, fy) && isW(fx, fy)) addFishNode(fx, fy, "shore");
            }
          }
          break;
        }
        case "shrine": case "stonecircle":
          if (openTile(x, y)) addNode("altar", x, y, true, { station: true });
          for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "boulder");
          if (openTile(x - 2, y - 2)) deco(x - 2, y - 2, "altar_stone", true);
          break;
        case "hotspring":
          for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]])
            if (inCh(x + dx, y + dy)) { ground[li(x + dx, y + dy)] = "water#5"; blocked[li(x + dx, y + dy)] = 1; }
          if (openTile(x + 2, y + 2)) deco(x + 2, y + 2, "boulder");
          break;
        case "shack": {
          const b2 = house(5, 4, null);
          furnishPoi(b2, ["crate_braced", "toolbox", "sign"]);
          break;
        }
        case "fairyring":
          for (const [dx, dy] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "mushroom");
          break;
        case "standing":
          if (openTile(x, y)) deco(x, y, "boulder", true);
          break;
        case "hermitage": {
          const b2 = house(5, 4, "cauldron");
          furnishPoi(b2, ["bookshelf_small", "candle_church", "cauldron_iron"]);
          break;
        }
        case "totem":
          if (openTile(x, y)) deco(x, y, "boulder", true);
          for (const [dx, dy] of [[-1,0],[1,0]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "skull");
          break;
        case "apiary":
          for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "beehive_box");
          for (const [dx, dy] of [[-2,0],[2,0],[0,-2],[0,2]])
            if (openTile(x + dx, y + dy)) addNode("berrybush", x + dx, y + dy, false);
          break;
        case "statue":
          if (openTile(x, y)) deco(x, y, "statue_marble", true);
          for (const [dx, dy] of [[-1,0],[1,0]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "urn_garden", true);
          break;
        case "portal":
          // a real, usable portal (gameplay/portals.js): step up to it to
          // attune it, use it again to travel to any other attuned portal
          if (openTile(x, y)) addNode("portal", x, y, true, { portal: true });
          for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "crystal_cluster_purple", true);
          for (const [dx, dy] of [[-2,0],[2,0]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "pillar_stone", true);
          break;
        case "runecircle":
          // a wild runestone circle: craft runes far from town — the mage's
          // waystation, and fuel for the rune-priced portal network
          if (openTile(x, y)) addNode("altar", x, y, true, { station: true });
          for (const [dx, dy] of [[-2,-1],[2,-1],[-2,1],[2,1],[0,-2],[0,2]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "boulder", true);
          for (const [dx, dy] of [[-3,0],[3,0]])
            // (essence-rock vein removed — rune essence ore is deprecated)
          break;
        case "banditcamp":
          // rough company: tents, a fire, and a stash worth stealing
          if (openTile(x - 1, y - 1)) deco(x - 1, y - 1, "tent2_l", true);
          if (openTile(x, y - 1)) deco(x, y - 1, "tent2_r", true);
          if (openTile(x + 2, y - 1)) deco(x + 2, y - 1, "tent_l", true);
          if (openTile(x + 3, y - 1)) deco(x + 3, y - 1, "tent_r", true);
          if (openTile(x, y + 1)) addNode("campfire", x, y + 1, true, { station: true });
          if (openTile(x + 1, y)) deco(x + 1, y, "crate", true);
          if (openTile(x - 2, y)) deco(x - 2, y, "goldpile");
          if (openTile(x - 2, y + 1)) deco(x - 2, y + 1, "skull");
          break;
        case "huntercamp": {
          // a hunting lodge: workbench inside, tanning rack and fire outside
          const b2 = house(5, 4, "workbench");
          furnishPoi(b2, ["bedroll", "chest_storage", "hearthstone"]);
          if (openTile(x + 3, y + 1)) addNode("tanrack", x + 3, y + 1, true, { station: true });
          if (openTile(x - 3, y + 1)) addNode("campfire", x - 3, y + 1, true, { station: true });
          if (openTile(x + 3, y - 1)) deco(x + 3, y - 1, "cart", true);
          break;
        }
        case "garden":
          for (const [dx, dy] of [[-2,-1],[-1,-2],[0,-2],[1,-1],[2,0],[1,2],[0,2],[-1,1],[-2,0]]) {
            const f = ["flower_blue","flower_orange","flower_purple","flower_white"][(Math.abs(dx)+Math.abs(dy))%4];
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, f);
          }
          for (const [dx, dy, k, solid] of [[0, 0, "birdbath", false], [-2, 2, "urn_garden", false],
            [2, -2, "planter_ceramic", false], [2, 2, "statue_marble", true],
            [3, 0, "birdhouse", false], [-3, 0, "flowerpot", false],
            [0, 3, "planter_box", false], [0, -3, "bridge_arch", false]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, k, solid);
          break;
        case "tarpit":
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
              if (inCh(x+dx,y+dy) && Math.hypot(dx,dy) < 2.5 && !decor[li(x+dx,y+dy)]) {
                ground[li(x+dx,y+dy)] = "water#3"; blocked[li(x+dx,y+dy)] = 1;
              }
          break;
        case "geyser":
          for (const [dx, dy] of [[0,0],[1,0],[0,1],[-1,0],[0,-1]])
            if (inCh(x+dx,y+dy)) { ground[li(x+dx,y+dy)] = "water#5"; blocked[li(x+dx,y+dy)] = 1; }
          if (openTile(x+2,y)) deco(x+2,y,"boulder");
          break;
        case "beacon":
          if (openTile(x, y)) addNode("campfire", x, y, true, { station: true });
          for (const [dx, dy] of [[-1,0],[1,0]])
            if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "brazier_iron", true);
          if (openTile(x, y - 1)) deco(x, y - 1, "banner_pole", true);
          break;
        case "vineyard":
          for (let i = -2; i <= 2; i++)
            for (const dy of [-1, 1])
              if (inCh(x+i,y+dy)) { ground[li(x+i,y+dy)] = "farm"; addNode("farmplot",x+i,y+dy,false,{farm:true,crop:null}); }
          for (const [dx, dy, k] of [[-3,0,"barrel_wine"],[3,0,"wine_tun"]])
            if (openTile(x+dx,y+dy)) deco(x+dx,y+dy,k,true);
          break;
        case "observatory": {
          // broad 2-storey hall; the great telescope occupies the first floor
          // and pokes out through the roof (rendered by the structure system)
          const b2 = house(9, 9, "altar", { stone: true, stoneDoor: true, kind: "observatory", roof: "roof_tower" });
          furnishPoi(b2, ["bookshelf", "desk", "bookshelf", "candle_scrying", "dresser", "easel", "chair"]);
          break;
        }
        case "wishingwell":
          if (openTile(x, y)) deco(x, y, "fountain_small", true);
          for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]])
            if (openTile(x+dx,y+dy)) deco(x+dx,y+dy,"boulder");
          break;
        case "guild": {
          const b2 = house(9, 7, "bank", { stone: true });
          if (rand2(x,y,S^0x9118)<0.5) addNode("anvil",x+3,y+3,true,{station:true});
          furnishPoi(b2, ["bookshelf", "cabinet", "table2", "candelabra", "sign", "weathervane"]);
          break;
        }
        case "maze":
          for (const [dx, dy] of [
            [-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
            [-4,-2],[4,-2],[-4,-1],[-2,-1],[4,-1],
            [-4,0],[-2,0],[0,0],[2,0],[4,0],
            [-4,1],[2,1],[4,1],[-4,2],[4,2],
            [-4,3],[-3,3],[-2,3],[-1,3],[0,3],[1,3],[2,3],[3,3],[4,3]
          ])
            if (openTile(x+dx,y+dy)) deco(x+dx,y+dy,"wall_wood",true);
          break;
        case "lighthouse": {
          const b2 = house(5, 5, null, { stone: true, tall: true, stoneDoor: true, kind: "lighthouse" });
          if (openTile(x, y-3)) addNode("campfire", x, y-3, true, { station: true });
          if (rand2(x, y, S ^ 0x9119) < 0.45 && openTile(x + 2, y + 3))
            addNode("bank", x + 2, y + 3, true, { station: true });
          break;
        }
      }
    }

    // --- wayside bank chests: rare lone chests deep in the wild ---
    // One candidate spot per 192×192-tile lattice cell (hashed offset), ~30%
    // of which materialise — roughly one chest per few hundred tiles of
    // travel. Skipped in/near settlements (those have real banks). Like every
    // chest, it opens the vault of whichever bank network its ground belongs
    // to (world.bankNetId at open time), so a wayside chest on a lonely isle
    // banks into that isle's own vault.
    for (let wcy = Math.floor(by / 192); wcy <= Math.floor((by + CHUNK) / 192); wcy++)
      for (let wcx = Math.floor(bx / 192); wcx <= Math.floor((bx + CHUNK) / 192); wcx++) {
        if (rand2(wcx, wcy, S ^ 0xBA7C) > 0.3) continue;
        const wx2 = wcx * 192 + Math.floor(rand2(wcx * 3 + 1, wcy, S ^ 0xBA7D) * 192);
        const wy2 = wcy * 192 + Math.floor(rand2(wcy * 3 + 1, wcx, S ^ 0xBA7E) * 192);
        if (wx2 < bx || wx2 >= bx + CHUNK || wy2 < by || wy2 >= by + CHUNK) continue;
        let inTown = false;
        for (const v of villages) {
          const dx = wx2 / 2 - v.x, dy = wy2 / 2 - v.y;
          if (dx * dx + dy * dy < (v.R + 8) * (v.R + 8)) { inTown = true; break; }
        }
        if (inTown || !openTile(wx2, wy2)) continue;
        addNode("bank", wx2, wy2, true, { station: true });
      }

    // --- wilderness icons: resource clusters & camps ---
    for (let icy = Math.floor(by / 2 / ICELL) - 1; icy <= Math.floor((by + CHUNK) / 2 / ICELL) + 1; icy++)
      for (let icx = Math.floor(bx / 2 / ICELL) - 1; icx <= Math.floor((bx + CHUNK) / 2 / ICELL) + 1; icx++) {
        const ic0 = wildIcon(icx, icy);
        const ic = ic0 && { x: ic0.x * 2, y: ic0.y * 2, type: ic0.type };
        if (!ic || ic.x < bx - 6 || ic.x >= bx + CHUNK + 6 || ic.y < by - 6 || ic.y >= by + CHUNK + 6) continue;
        const { x, y, type } = ic;
        if (type === "fish") {
          for (const [dx, dy] of [[0, 0], [2, 1], [-2, -1]])
            if (isW(x + dx, y + dy)) {
              const deep = eG[G(x + dx - bx, y + dy - by)] < 0.44;
              addFishNode(x + dx, y + dy, deep ? "deep" : "shore");
            }
        } else if (type === "mine") {
          const cap = localTierCap(x, y, METALS.length);
          for (const [dx, dy] of [[0, 0], [2, 1], [-2, 0], [1, -2], [-1, 2]])
            if (openTile(x + dx, y + dy)) addNode((typeof mineExtraNode === "function" && mineExtraNode(rng)) || METALS[rollTier(cap, rng)].rock, x + dx, y + dy);
        } else if (type === "tree") {
          const cap = localTierCap(x, y, TREES.length);
          for (const [dx, dy] of [[0, 0], [3, 1], [-3, 0], [1, -3], [-1, 3]])
            if (openTile(x + dx, y + dy)) addNode(TREES[Math.min(TREES.length - 1, rollTier(cap, rng) + 3)].node, x + dx, y + dy);
        } else if (type === "camp") {
          // themed encampment garrisoned from the LOCAL biome's list
          const b = bG[G(Math.max(bx, Math.min(bx + CHUNK - 1, x)) - bx, Math.max(by, Math.min(by + CHUNK - 1, y)) - by)];
          const dist = Math.max(Math.abs(x), Math.abs(y)) / CHUNK;
          const cands = biomeMobsInBand(b, 1, (8 + dist * 7) * LEVEL_SCALE);
          if (cands.length) {
            const kind = cands[Math.floor(rng() * cands.length)].key;
            if (openTile(x, y)) deco(x, y, MONSTER_THEME[kind] === "h" ? "campfire" : "skull", MONSTER_THEME[kind] === "h");
            if (MONSTER_THEME[kind] === "h") {
              if (openTile(x - 1, y - 2)) deco(x - 1, y - 2, "tent_l", true);
              if (openTile(x, y - 2)) deco(x, y - 2, "tent_r", true);
              if (openTile(x + 2, y - 1)) deco(x + 2, y - 1, "crate", true);
            } else if (MONSTER_THEME[kind] === "u") {
              for (const [dx, dy] of [[-2, -1], [2, 1], [0, -2]])
                if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "gravestone", true);
            } else {
              for (const [dx, dy] of [[-2, 0], [2, 1]])
                if (openTile(x + dx, y + dy)) deco(x + dx, y + dy, "boulder");
            }
            for (let i = 0; i < 3 + Math.floor(rng() * 3); i++)
              spawnDefs.push([kind, x - 3 + Math.floor(rng() * 7), y - 3 + Math.floor(rng() * 7)]);
          }
        }
      }

    // --- biome vegetation & resources ---
    const centerB = bG[G(CHUNK >> 1, CHUNK >> 1)];
    const veg = BIOME_VEG[centerB] || BIOME_VEG[B.GRASS];
    const [treeDens, treeSpr, rockDens, decoList] = veg;
    const treeCap = localTierCap(bx + 16, by + 16, TREES.length);
    const rockCap = localTierCap(bx + 16, by + 16, METALS.length);
    const nTiles = CHUNK * CHUNK;
    // (Dream Forest illusion parked 2026-09-06 — normal vegetation density. Set
    // this back to 2.6 for B.DREAM when the effect is revived, see dream.js.)
    const dreamLush = 1;
    let tTrees = Math.round(treeDens * nTiles * (0.7 + rng() * 0.6) * dreamLush);
    let tRocks = Math.round(rockDens * nTiles * (0.7 + rng() * 0.6));
    for (let t2 = 0; t2 < 300 && (tTrees > 0 || tRocks > 0); t2++) {
      const x = bx + 1 + Math.floor(rng() * (CHUNK - 2));
      const y = by + 1 + Math.floor(rng() * (CHUNK - 2));
      if (!openTile(x, y)) continue;
      const bHere = bG[G(x - bx, y - by)];
      if (WATER_LIKE_B.has(bHere)) continue;
      if (tTrees > 0) {
        const vg = BIOME_VEG[bHere] || veg;
        if ((vg[0] || 0) > 0) {
          const nzTree = typeof nzExtraTreeNode === "function" ? nzExtraTreeNode(bHere, rng) : null;
          const n = addNode(nzTree || TREES[rollTier(treeCap, rng)].node, x, y, false);
          // sprite override: a string (single skin) or an array (pick one at
          // random per node — the Mushroom Forest's giant-mushroom canopy pool)
          const ov = vg[1] || treeSpr;
          if (n && ov) n.sprv = Array.isArray(ov) ? ov[Math.floor(rng() * ov.length)] : ov;
          tTrees--;
          continue;
        }
        tTrees--;
        continue;
      }
      if (tRocks > 0) {
        const rockKind = (typeof mineExtraNode === "function" && mineExtraNode(rng)) || METALS[rollTier(rockCap, rng)].rock;
        addNode(rockKind, x, y, rockKind === "essence");
        tRocks--;
      }
    }
    for (const [spr, dens, blk] of decoList) {
      let n2 = Math.round(dens * nTiles * dreamLush);
      for (let t2 = 0; t2 < 220 && n2 > 0; t2++) {
        const x = bx + Math.floor(rng() * CHUNK), y = by + Math.floor(rng() * CHUNK);
        if (!openTile(x, y)) continue;
        if (bG[G(x - bx, y - by)] !== centerB && rng() < 0.5) continue;
        // gatherable natural props (boulders, mossy boulders, wildflowers) are
        // placed as mine/pick NODES rather than static decor (gather-decor.js)
        if (typeof GATHER_NODE_DECOR !== "undefined" && Object.prototype.hasOwnProperty.call(GATHER_NODE_DECOR, spr)
          && typeof NODE_TYPES !== "undefined" && NODE_TYPES[spr])
          addNode(spr, x, y, GATHER_NODE_DECOR[spr]);
        else
          deco(x, y, spr, blk);
        n2--;
      }
    }
    // foraging: bushes and herbs in green biomes
    if (GRASS_LIKE_B.has(centerB) || FOREST_LIKE_B.has(centerB) || SWAMP_LIKE_B.has(centerB)) {
      for (let i = 0; i < 2; i++) {
        const x = bx + 2 + Math.floor(rng() * (CHUNK - 4)), y = by + 2 + Math.floor(rng() * (CHUNK - 4));
        if (openTile(x, y)) addNode(rng() < 0.5 ? "berrybush" : "herbpatch", x, y, rng() < 0.5);
      }
    }
    // water lilies: ONLY on water tiles in or adjacent to a WETLAND (marsh pools
    // and their fringing water) — nowhere else. Random among the three pads.
    {
      let hasWet = false;
      for (let ly = 0; ly < CHUNK && !hasWet; ly++)
        for (let lx = 0; lx < CHUNK; lx++)
          if (bG[G(lx, ly)] === B.WETLAND) { hasWet = true; break; }
      if (hasWet) {
        // a wetland LAND tile (marsh), not open water: this keeps lilies on
        // marsh pools and the water fringing wetlands, and off the open sea
        // (deep tiles can classify as WETLAND by climate but render as water).
        const wetLand = (lx, ly) => lx >= 0 && ly >= 0 && lx < CHUNK && ly < CHUNK &&
          bG[G(lx, ly)] === B.WETLAND && !isWaterKey(ground[ly * CHUNK + lx]);
        const nearWet = (lx, ly) => {
          for (let ay = -2; ay <= 2; ay++)
            for (let ax = -2; ax <= 2; ax++)
              if (wetLand(lx + ax, ly + ay)) return true;
          return false;
        };
        const PADS = ["lily", "lily2", "lily3"];
        for (let ly = 0; ly < CHUNK; ly++)
          for (let lx = 0; lx < CHUNK; lx++) {
            const x = bx + lx, y = by + ly;
            if (!isW(x, y) || decor[li(x, y)] || !nearWet(lx, ly)) continue;
            if (rng() < 0.12) deco(x, y, PADS[Math.floor(rng() * PADS.length)]);
          }
      }
    }
    // --- naturally-generated farm fields: a fenced rectangle of plantable soil
    // in Farmland biome, one agriculture skill per field, a gate for access.
    // Never inside city/village limits. Soil starts UNTILLED (hoe it first).
    {
      const AGRI = ["Cerealiculture", "Olericulture", "Pomiculture", "Herbiculture", "Fibriculture"];
      const isFarmB = (x, y) => inCh(x, y) && bG[G(x - bx, y - by)] === B.FARM;
      // Anchor fields on real farmland tiles. A field tile just needs to be solid
      // land clear of water/road/building/village/other-nodes; scattered decor
      // (flowers etc.) is cleared as the field is stamped.
      const fieldTile = (x, y) => inCh(x, y) && !blocked[li(x, y)] && !isWaterKey(ground[li(x, y)])
        && !inVillage(x, y) && !nodes.some(n => n.x === x && n.y === y);
      // collect this chunk's open farmland tiles (away from the 2-tile border)
      const farmTiles = [];
      for (let ty = 2; ty < CHUNK - 2; ty++)
        for (let tx = 2; tx < CHUNK - 2; tx++) {
          const x = bx + tx, y = by + ty;
          if (isFarmB(x, y) && !inVillage(x, y) && !blocked[li(x, y)]) farmTiles.push(x + (y << 16));
        }
      if (farmTiles.length >= 30 && rng() < 0.7) {   // a genuinely farm-covered chunk
        for (let t = 0; t < 12; t++) {
          const enc = farmTiles[(rng() * farmTiles.length) | 0];
          const ax = enc & 0xffff, ay = enc >> 16;
          const W = 5 + ((rng() * 4) | 0), H = 5 + ((rng() * 4) | 0); // 5-8 per side
          const x0 = ax - (W >> 1), y0 = ay - (H >> 1);
          let ok = true, farmN = 0;
          for (let yy = y0; yy < y0 + H && ok; yy++)
            for (let xx = x0; xx < x0 + W; xx++) {
              if (!fieldTile(xx, yy)) { ok = false; break; }
              if (isFarmB(xx, yy)) farmN++;
            }
          if (!ok || farmN < W * H * 0.35) continue;  // predominantly farmland
          const skill = AGRI[hash2i(x0, y0, S ^ 0xfa12) % AGRI.length];
          const gateX = x0 + (W >> 1), gateY = y0 + H - 1; // gate mid-way along the south edge
          for (let yy = y0; yy < y0 + H; yy++)
            for (let xx = x0; xx < x0 + W; xx++) {
              decor[li(xx, yy)] = 0; // clear any scattered decor under the field
              const edge = xx === x0 || xx === x0 + W - 1 || yy === y0 || yy === y0 + H - 1;
              if (edge) {
                if (xx === gateX && yy === gateY) deco(xx, yy, "gate_wood", false); // passable gate
                else deco(xx, yy, "fence_wood", true);                              // blocking fence
              } else {
                ground[li(xx, yy)] = "dirt"; // bare untilled earth
                addNode("cropsoil", xx, yy, false, { farm: true, skill, tilled: false, crop: null });
              }
            }
          break; // one field per chunk is plenty
        }
      }
    }

    // shoreline fishing
    {
      let fish = 0;
      for (let i = 0; i < N; i++) if (isWaterKey(ground[i])) fish++;
      let want = fish > 15 ? 1 + Math.floor(rng() * 2) : 0;
      const deepWant = fish > 500 ? 1 : 0;
      for (let t2 = 0; t2 < 80 && want + deepWant > 0; t2++) {
        const x = bx + 2 + Math.floor(rng() * (CHUNK - 4)), y = by + 2 + Math.floor(rng() * (CHUNK - 4));
        if (!isW(x, y) || decor[li(x, y)] || nodes.some(n => Math.abs(n.x - x) + Math.abs(n.y - y) < 5)) continue;
        // not inside (or within a tile of) a building's undercroft — every
        // stamped footprint is checked, even ones owned by a neighbour chunk
        if (stampedFeet.some(b2 => x >= b2.x0 - 1 && x < b2.x0 + b2.w + 1 &&
                                   y >= b2.y0 - 1 && y < b2.y0 + b2.h + 1)) continue;
        const shoreAdj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inCh(x + dx, y + dy) && !isW(x + dx, y + dy));
        // a river-mouth spot: a coastal fishing tile where a river reaches the
        // sea (on/next to a river polyline AND with open sea within ~2 tiles).
        // Whitebait run only here; the open coast yields the shore band.
        const riverMouth = shoreAdj && (() => {
          let onRiver = false, seaNear = false;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            if (riverAt(x + dx, y + dy)) onRiver = true;
            const tx = x + dx - bx, ty = y + dy - by;
            const e = (tx >= 0 && tx < CHUNK && ty >= 0 && ty < CHUNK) ? eG[G(tx, ty)] : elevation((x + dx) * 0.5, (y + dy) * 0.5);
            if (e < LAND_E) seaNear = true;
          }
          return onRiver && seaNear;
        })();
        // FRESHWATER vs the sea: a carved river tile, or any water sitting on BASE
        // land terrain (pure elevation ≥ LAND_E — rivers & lakes are carved INTO
        // land; erosion can sink their beds in eG, so the eroded grid can't tell),
        // holds the freshwater band — kōura and eels live here, never the sea fish
        // (and vice versa). The open sea's base terrain is strictly below LAND_E.
        const fresh = riverAt(x, y) || elevation(x * 0.5, y * 0.5) >= LAND_E;
        if (shoreAdj && want > 0) {
          addFishNode(x, y, riverMouth ? "rivermouth" : fresh ? "river" : "shore");
          want--;
        } else if (!shoreAdj && deepWant > 0) {
          // open-water spots: freshwater interiors (wide rivers, lake middles) stay
          // the river band — hoki and tuna don't school in a lake.
          // (deepWant is deliberately not decremented — the spacing check caps
          // density; open sea keeps several deep spots per chunk, as shipped)
          addFishNode(x, y, fresh ? "river" : eG[G(x - bx, y - by)] < 0.36 ? "abyss" : "deep");
        }
      }
    }

    // clear door-front sentinels so those tiles remain walkable at runtime
    for (let i = 0; i < N; i++) if (blocked[i] === 2) blocked[i] = 0;

    // --- ambient monsters: strictly from the biome's own list ---
    if (!(ccx === 0 && ccy === 0)) {
      const dist = Math.max(Math.abs(ccx), Math.abs(ccy));
      const hiCap = (5 + dist * 6) * LEVEL_SCALE;
      const landB = WATER_LIKE_B.has(centerB) ? centerB : centerB;
      const pool = [];
      for (let i = 0; i < 3; i++) {
        const lvlTarget = 1 + Math.pow(rng(), 1.8) * (hiCap - 1);
        const band = 6 * LEVEL_SCALE;
        const cands = biomeMobsInBand(landB, Math.max(1, lvlTarget - band), lvlTarget + band);
        if (cands.length) pool.push(cands[Math.floor(rng() * cands.length)].key);
      }
      const count = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < count && pool.length; i++) {
        const kind = pool[Math.floor(rng() * pool.length)];
        spawnDefs.push([kind, bx + 2 + Math.floor(rng() * (CHUNK - 4)), by + 2 + Math.floor(rng() * (CHUNK - 4))]);
      }
    } else {
      spawnDefs.push(["chicken", 14, -10], ["chicken", 15, -8], ["cow", -14, 8], ["sheep", -13, 10], ["slime", 6, 12]);
    }

    // --- pasture livestock: physical farm animals to TEND for Husbandry ---
    // (grass/farmland/meadow/savanna etc. — see GRASS_LIKE_B). Wander like any
    // animal; the player tends them instead of visiting a barn station.
    // livestock only where they belong: the herd roll draws from the animals whose
    // ANIMAL_BIOME (features.js) includes THIS chunk's biome (camels→deserts,
    // alpacas→cold highlands, waterfowl→wetland, etc.), not every field.
    if (typeof ANIMAL_BIOME !== "undefined" && typeof LIVESTOCK_SPAWN !== "undefined") {
      const here = LIVESTOCK_SPAWN.filter(k => ANIMAL_BIOME[k] && ANIMAL_BIOME[k].has(centerB));
      if (here.length) {
        const herd = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < herd; i++) {
          let kind = here[Math.floor(rng() * here.length)];
          // ~1 in 6 is the GIANT ("_v") variant — double tend/feed, 2x-value items
          if (rng() < 1 / 6 && MONSTERS[kind + "_v"]) kind += "_v";
          const x = bx + 2 + Math.floor(rng() * (CHUNK - 4)), y = by + 2 + Math.floor(rng() * (CHUNK - 4));
          if (openTile(x, y) && MONSTERS[kind]) spawnDefs.push([kind, x, y]);
        }
      }
    }
    // exotic husbandry: dangerous-but-tendable beasts (griffon/aurochs/wyrmling),
    // each kept to its own wilds by ANIMAL_BIOME — rarer than farm livestock.
    if (typeof ANIMAL_BIOME !== "undefined" && typeof EXOTIC_SPAWN !== "undefined") {
      const here = EXOTIC_SPAWN.filter(k => ANIMAL_BIOME[k] && ANIMAL_BIOME[k].has(centerB));
      if (here.length && rng() < 0.5) {
        let kind = here[Math.floor(rng() * here.length)];
        if (rng() < 1 / 6 && MONSTERS[kind + "_v"]) kind += "_v";
        const x = bx + 2 + Math.floor(rng() * (CHUNK - 4)), y = by + 2 + Math.floor(rng() * (CHUNK - 4));
        if (openTile(x, y) && MONSTERS[kind]) spawnDefs.push([kind, x, y]);
      }
    }

    ch = { cx: ccx, cy: ccy, ground, decor, blocked, nodes, spawnDefs, buildings, labels, activated: false };
    chunks.set(key, ch);
    deriveNpcs(ch);
    genLog.push({ key, ms: Math.round(performance.now() - _t0) });
    if (genLog.length > 200) genLog.splice(0, 100);
    return ch;
  }

  // persist the chunk that owns tile (x,y) — call after a runtime mutation
  // (planting/harvesting a crop, depleting a node) so a browser refresh keeps it
  // even though the chunk is still in memory and hasn't been evicted.
  function persistAt(x, y) { persistChunk(Math.floor(x / CHUNK), Math.floor(y / CHUNK)); }
  // write EVERY in-memory chunk back to IDB (called on save/autosave) so all
  // loaded crop/node state survives a reload without waiting for eviction —
  // batched into ONE transaction so a large loaded set stays cheap.
  function flushChunks() {
    const list = [...chunks.values()];
    if (!list.length) return;
    _openDB().then(db => {
      const store = db.transaction('c', 'readwrite').objectStore('c');
      for (const ch of list) store.put({
        g: ch.ground, d: ch.decor, b: ch.blocked,
        n: ch.nodes, s: ch.spawnDefs, bl: ch.buildings, la: ch.labels,
      }, _ck(ch.cx, ch.cy));
    }).catch(() => {});
  }
  return { chunks, obstacles, npcs, getChunk, preloadSeen, persistChunk, persistAt, flushChunks, pruneChunks, genLog };
}
