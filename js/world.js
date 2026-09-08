// ===== world generation orchestration =====
// Terrain, features, chunk population, and map rendering live in the world-* files.
"use strict";

// Callers (1):
//  world/terrain.js:5
const WORLD_SEED = 1337;
// Callers (53):
//  gameplay/world.js:49,59,62,379,415,557,670,711 render3d.js:135,252 world.js:38,40,78
//  world/chunks.js:145,146,154,155,158,191,208,215,216,218,333,334,342,343,354,355,379,380,408,411,435,436,440,562,563,697,698,701,719,720,743,748,752,753,777,787,798,825
//  world/features.js:1069 world/map.js:376
const CHUNK = 32;
// Callers (12):
//  world/features.js:266,486,489,490,620,621,759,760,1088,1089,1200,1201
const VCELL = 144;  // settlement grid
// Callers (6):
//  world/chunks.js:435,436 world/features.js:842,843,1208,1209
const PCELL = 30;   // POI grid
// Callers (6):
//  world/chunks.js:697,698 world/features.js:916,917,1236,1237
const ICELL = 44;   // wilderness icon grid
// Callers (24):
//  gameplay/world.js:626 world.js:104 world/chunks.js:220,273,550
//  world/features.js:129,131,132,133,134,163,187,215,227,229,272,809,846 world/map.js:432,448
//  world/terrain.js:85,106,107,123
const LAND_E = 0.483, ROCK_E = 0.655;

// Callers (2):
//  world/chunks.js:144,170
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Callers (1):
//  main.js:6
function genWorld() {
  const terrain = createWorldTerrain();
  const features = createWorldFeatures(terrain);
  const chunksApi = createWorldChunks({ ...terrain, ...features });
  const mapApi = createWorldMap({ ...terrain, ...features, ...chunksApi });

  const {
    S, elevation, latitudeAt, humidity, temperature, biomeAtTile,
  } = terrain;
  const {
    personalityAt, villagesNearForMap, poisNearForMap, iconsNearForMap, villagesNear,
    riverSourceAt, riverDoors, riverFlowAt, roadNearPt,
  } = features;
  const {
    chunks, obstacles, npcs, getChunk, preloadSeen, persistChunk, persistAt, flushChunks, pruneChunks,
  } = chunksApi;
  const { renderMapChunk, renderMapChunkCached, preloadMapImages, prewarmMapChunk, biomeNameAt, BIOME_NAMES,
    getMacro, overviewStep, OVERVIEW_Z, MACRO_PX, mapChunkCache, macroCache, mapRegionQuery,
    mipTile, mipPeek, mipMacroFill, mipBudget, MIP_MAX, requestMacro, prewarmMacros, macroFlat, _macDebug,
    MAP_PATH, MAP_WATER, MAP_BRIDGE } = mapApi;

  const cdiv = v => Math.floor(v / CHUNK);
  const chunkAt = (x, y) => getChunk(cdiv(x), cdiv(y));
  const lidx = (ch, x, y) => (y - ch.cy * CHUNK) * CHUNK + (x - ch.cx * CHUNK);

  // ---------- multi-storey buildings, doors & gates (retired prototype port) ----------
  // All metadata is DERIVED deterministically from the persisted building /
  // village records, so chunks cached before this feature keep working.
  const { hash2i } = terrain;
  const doorStates = new Map(); // "x,y" -> true while open (runtime only; doors reset closed on reload)
  const doorKey = (x, y) => x + "," + y;

  // storeys / door / ladder / kind metadata for a chunk building record
  const metaCache = new WeakMap();
  function buildingMeta(b) {
    let m = metaCache.get(b);
    if (m) return m;
    const stone = b.stone != null ? !!b.stone
      : b.roof === "roof_tower" || b.roof === "roof_gray"; // old cached chunks lack .stone
    // kind drives the structural silhouette: "tower" (battlements), "spire"
    // (steep pyramid roof), "lighthouse" (tapered, glowing light room),
    // "observatory" (broad 2-storey hall, telescope through the roof),
    // "keep" (battlemented 2-storey), "mansion" (3-storey hall + attached wings)
    const kind = b.kind || (b.tall ? "tower" : null);
    let storeys = 1;
    if (kind === "lighthouse" || kind === "tower" || kind === "spire") storeys = 4;
    else if (kind === "mansion") storeys = 3;
    else if (kind === "mainbank") storeys = 3; // a bank network's grand main branch hall
    else if (b.tall) storeys = 3;
    else if (kind === "keep" || kind === "observatory") storeys = 2;
    else if (stone && Math.min(b.w, b.h) >= 7 && Math.max(b.w, b.h) >= 9) storeys = 2;
    else if (Math.min(b.w, b.h) >= 7 && hash2i(b.x0, b.y0, S ^ 0xb0b) % 100 < 45) storeys = 2;
    // every shop/station/bank building gains an UPSTAIRS: the owner's bedroom is
    // built above the workshop (the ground floor stays the shop/station). A plain
    // one-room house stays single-storey — that room IS the owner's bedroom.
    if (b.job && storeys < 2) storeys = 2;
    // LocAngle: WEST=0 NORTH=1 EAST=2 SOUTH=3 puts the leaf on the OUTSIDE of
    // its wall edge. Door material is independent of wall material — most
    // shops/houses get a plain wooden door even with stone walls; only
    // b.stoneDoor (fortress-like towers, the city keep) gets the castle door.
    // River-spanning buildings get one door per BANK via riverDoors (west and
    // east walls when the channel runs north-south) — shared with the chunk
    // stamper so wall gaps always match.
    let door, door2 = null;
    if (b.river) {
      const rd = riverDoors(b.x0, b.y0, b.w, b.h);
      door = { ...rd[0], kind: "door", stone: !!b.stoneDoor };
      door2 = { ...rd[1], kind: "door", stone: !!b.stoneDoor };
    } else {
      door = { x: b.x0 + (b.w >> 1), y: b.y0 + b.h - 1, angle: 3, kind: "door", stone: !!b.stoneDoor };
    }
    const doorX = door.x;
    let ladder = null;
    if (storeys > 1) {
      let lx = b.x0 + 1;
      if (lx === doorX) lx = b.x0 + b.w - 2;
      ladder = { x: lx, y: b.y0 + b.h - 2 };
    }
    // mansion: three attached 2-storey wings sharing a wall with the 3-storey
    // hall; wingDoors are the 1-tile archways cut through the shared wall on
    // the ground AND first floor (all derived, must match chunks.js stamping)
    let wings = null, wingDoors = null;
    if (kind === "mansion" && b.w >= 13) {
      const x1 = b.x0 + b.w, zc = b.y0 + 4, xc = b.x0 + 6;
      wings = [
        { x0: b.x0 - 4, y0: b.y0 + 1, w: 5, h: 7, storeys: 2, shared: "e" }, // west wing
        { x0: x1 - 1, y0: b.y0 + 1, w: 5, h: 7, storeys: 2, shared: "w" },   // east wing
        { x0: b.x0 + 3, y0: b.y0 - 4, w: 7, h: 5, storeys: 2, shared: "s" }, // north wing
      ];
      wingDoors = [
        { x: b.x0, y: zc },      // through the hall's west wall
        { x: x1 - 1, y: zc },    // through the hall's east wall
        { x: xc, y: b.y0 },      // through the hall's north wall
      ];
    }
    m = { storeys, door, door2, ladder, stone, kind, wings, wingDoors };
    metaCache.set(b, m);
    return m;
  }

  // the two swinging leaves (plus wall "plug" tiles narrowing the road gap)
  // for each of a walled city's four gates
  const gateCache = new Map();
  function gatesForVillage(v) {
    const k = v.x + "," + v.y;
    let g = gateCache.get(k);
    if (g) return g;
    g = [];
    const R = v.R;
    const mk = (x, y, angle, leaf, plugs) =>
      g.push({ x, y, angle, leaf, plugs, kind: "gate", stone: true });
    for (const sy of [-1, 1]) { // north/south walls: horizontal runs (LocAngle NORTH=1/SOUTH=3)
      const gy = v.y + sy * R, angle = sy < 0 ? 1 : 3;
      mk(v.x - 1, gy, angle, "l", [[v.x - 2, gy], [v.x + 1, gy], [v.x + 2, gy]]);
      mk(v.x, gy, angle, "r", []);
    }
    for (const sx of [-1, 1]) { // west/east walls: vertical runs (LocAngle WEST=0/EAST=2)
      const gx = v.x + sx * R, angle = sx < 0 ? 0 : 2;
      mk(gx, v.y - 1, angle, "l", [[gx, v.y - 2], [gx, v.y + 1], [gx, v.y + 2]]);
      mk(gx, v.y, angle, "r", []);
    }
    // Wherever a bridge deck crosses the ring line (a road bridging a river
    // through the wall), the wall gets a gate ON the deck instead of an open
    // breach: swinging leaves over the middle tile(s), fixed plugs on the
    // rest of the crossing. The boat lane below the deck stays open — plugs
    // only block deck-level movement (passable()).
    const deckTile = (x, y) =>
      String(chunkAt(x, y).decor[lidx(chunkAt(x, y), x, y)] || "").startsWith("stone_bridge");
    const scanSide = (horiz, fixed, angle) => {
      let a = null;
      for (let d = -R + 1; d <= R - 1; d++) {
        const x = horiz ? v.x + d : fixed, y = horiz ? fixed : v.y + d;
        const deck = Math.abs(d) > 2 && deckTile(x, y);
        if (deck && a === null) a = d;
        if ((!deck || d === R - 1) && a !== null) {
          const b2 = deck && d === R - 1 ? d : d - 1;
          const len = b2 - a + 1;
          if (len <= 6) { // sane crossing; skip decks running along the wall
            const lo = a + ((len - 1) >> 1); // middle 2 tiles swing (1 if len==1)
            const plugs = [];
            for (let d2 = a; d2 <= b2; d2++)
              if (d2 !== lo && (len === 1 || d2 !== lo + 1))
                plugs.push(horiz ? [v.x + d2, fixed] : [fixed, v.y + d2]);
            if (horiz) {
              mk(v.x + lo, fixed, angle, "l", plugs);
              if (len > 1) mk(v.x + lo + 1, fixed, angle, "r", []);
            } else {
              mk(fixed, v.y + lo, angle, "l", plugs);
              if (len > 1) mk(fixed, v.y + lo + 1, angle, "r", []);
            }
          }
          a = null;
        }
      }
    };
    scanSide(true, v.y - R, 1);
    scanSide(true, v.y + R, 3);
    scanSide(false, v.x - R, 0);
    scanSide(false, v.x + R, 2);
    gateCache.set(k, g);
    return g;
  }
  function walledVillagesNear(x, y, pad) {
    return villagesNear(x / 2, y / 2, x / 2, y / 2, pad).filter(v => v.wall);
  }
  // Town/road peace: monsters hold their temper (and their nameplate reads
  // calm) within a village or city's perimeter, or near a road — travellers
  // shouldn't get jumped on Main Street or the King's Road.
  const PEACE_SETTLEMENT_BUFFER = 6, PEACE_ROAD_BUFFER = 6;
  function inPeacefulZone(x, y) {
    for (const v of villagesNear(x / 2, y / 2, x / 2, y / 2, 40)) {
      const dx = x - v.x, dy = y - v.y, r = v.R + PEACE_SETTLEMENT_BUFFER;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return roadNearPt(x / 2, y / 2, PEACE_ROAD_BUFFER / 2);
  }

  // the building whose footprint contains (x,y), or null (records are owned
  // by the chunk holding the building's centre, so scan the 3x3 neighborhood).
  // Mansion wings lie outside the hall record's footprint but still belong to it.
  function bldAt(x, y) {
    for (let cy = cdiv(y) - 1; cy <= cdiv(y) + 1; cy++)
      for (let cx = cdiv(x) - 1; cx <= cdiv(x) + 1; cx++) {
        const b = getChunk(cx, cy).buildings.find(b2 => {
          if (x >= b2.x0 && x < b2.x0 + b2.w && y >= b2.y0 && y < b2.y0 + b2.h) return true;
          if (b2.kind !== "mansion") return false;
          const wings = buildingMeta(b2).wings;
          return !!wings && wings.some(w =>
            x >= w.x0 && x < w.x0 + w.w && y >= w.y0 && y < w.y0 + w.h);
        });
        if (b) return b;
      }
    return null;
  }

  // memoized structural occupancy of a tile: { door } for a door/gate leaf,
  // { plug: true } for the fixed wall segments narrowing a city gate gap,
  // null otherwise. Positions are static, so entries never invalidate (door
  // OPEN state is looked up live via isDoorOpen). Used by passable() from the
  // pathfinder's inner loop — this must stay cheap on the warm path.
  const structCache = new Map();
  function structAt(x, y) {
    const key = doorKey(x, y);
    let s = structCache.get(key);
    if (s !== undefined) return s;
    s = null;
    const b = bldAt(x, y);
    if (b) {
      const m = buildingMeta(b);
      if (m.door.x === x && m.door.y === y) s = { door: { ...m.door, building: b } };
      else if (m.door2 && m.door2.x === x && m.door2.y === y) s = { door: { ...m.door2, building: b } };
    }
    if (!s) {
      outer: for (const v of walledVillagesNear(x, y, 40))
        for (const g of gatesForVillage(v)) {
          if (g.x === x && g.y === y) { s = { door: g }; break outer; }
          if (g.plugs && g.plugs.some(([px, py]) => px === x && py === y)) { s = { plug: true }; break outer; }
        }
    }
    if (structCache.size > 60000) structCache.clear();
    structCache.set(key, s);
    return s;
  }

  return {
    obstacles,
    npcs,
    // find an NPC standing on a tile. Pass `level` (a storey) to only match NPCs
    // on that floor — an upstairs resident no longer blocks ground-floor pathing
    // or steals a ground-floor click. Omit `level` for the old any-storey match.
    npcAt(x, y, level) { return npcs.find(n => n.x === x && n.y === y && (level == null || (n.level | 0) === (level | 0))); },
    playerStart: { x: 1, y: 2 },
    inMap: () => true,
    biomeAt: (x, y) => biomeAtTile(x / 2, y / 2),
    getGround(x, y) { const ch = chunkAt(x, y); return ch.ground[lidx(ch, x, y)]; },
    getDecor(x, y) { const ch = chunkAt(x, y); return ch.decor[lidx(ch, x, y)]; },
    isBlocked(x, y) { const ch = chunkAt(x, y); return ch.blocked[lidx(ch, x, y)] === 1; },
    setBlocked(x, y, v) { const ch = chunkAt(x, y); ch.blocked[lidx(ch, x, y)] = v ? 1 : 0; },
    isWater(x, y) { const ch = chunkAt(x, y); return isWaterKey(ch.ground[lidx(ch, x, y)]); },
    // wide stations (e.g. the 3x3 furnace model) are clickable/targetable from
    // any tile their model visually covers, not just the anchor tile the node
    // record is keyed by — otherwise most clicks on the model do nothing since
    // the engine's ground-plane pick rarely lands on that one exact tile
    nodeAt(x, y) {
      const ns = chunkAt(x, y).nodes;
      return ns.find(n => n.x === x && n.y === y)
        || ns.find(n => n.wide && Math.abs(x - n.x) <= n.wide && Math.abs(y - n.y) <= n.wide);
    },
    nodesNear(x, y, r) {
      const out = [];
      for (let cy = cdiv(y - r); cy <= cdiv(y + r); cy++)
        for (let cx = cdiv(x - r); cx <= cdiv(x + r); cx++)
          out.push(...getChunk(cx, cy).nodes);
      return out;
    },
    buildingsNear(x, y, r) {
      const out = [];
      for (let cy = cdiv(y - r); cy <= cdiv(y + r); cy++)
        for (let cx = cdiv(x - r); cx <= cdiv(x + r); cx++)
          out.push(...getChunk(cx, cy).buildings);
      return out;
    },
    insideBuilding(x, y) { return bldAt(x, y); },
    buildingMeta,
    walledVillagesNear,
    // point query in GAME-tile coords → settlements whose footprint you're in/near
    // (returns v.x/y/R in game tiles). Used by the day/night candle lighting.
    villagesNearPt(x, y, pad) { return villagesNear(x / 2, y / 2, x / 2, y / 2, pad == null ? 40 : pad); },
    // TERRAIN-flood component id (landmass pocket) — see features.js bankNetId
    bankNetId: features.bankNetId,
    // bank network for a chest at GAME-tile (x,y): the ROAD-web component of
    // the nearest settlement, or the terrain id for unsettled hermit pockets
    bankNetAt: features.bankNetAt,
    // road-web component id for a VILLAGE CELL — used by the save migration
    // that re-keys old regional vault ids after network rule changes
    roadNetId: features.roadNetId,
    // { title, branch, members } for a settled network, null for hermit vaults
    bankNetInfo: features.bankNetInfo,
    // the network's main-branch city ({x,y,name} in game tiles) or null when
    // the network has no city (village co-ops, hermits) — features.js
    mainBranchFor: features.mainBranchFor,
    _roadNetTrace: features._roadNetTrace, // debug: BFS trace with custom budget
    _edgeSeaSpans: features._edgeSeaSpans, // debug: per-edge water spans
    // WORLD partition: [wx,wy] of the 15000²-tile block holding GAME tile (x,y);
    // named locations carry a matching `world: "wx,wy"` tie — features.js
    worldOf: features.worldOf,
    _worldNameDump: features._worldNameDump, // debug: a world's name allocation
    // restore persisted world-name registries (awaited by main.js init)
    preloadWorldNames: features.preloadWorldNames,
    inPeacefulZone,
    gatesForVillage,
    // the door or gate leaf occupying tile (x,y), or null
    doorAt(x, y) {
      const s = structAt(x, y);
      return s && s.door ? s.door : null;
    },
    structAt,
    isDoorOpen(x, y) { return doorStates.get(doorKey(x, y)) === true; },
    setDoorOpen(x, y, open) { doorStates.set(doorKey(x, y), !!open); },
    getChunk, CHUNK, chunks,
    _genLog: chunksApi.genLog,
    // road warm worker wiring (render3d drives it; see world/roadworker.js)
    _roadCellInject: features._roadCellInject,
    _workerInit: { seed: WORLD_SEED, landE: LAND_E, rockE: ROCK_E,
      chunk: CHUNK, vcell: VCELL, pcell: PCELL, icell: ICELL },
    collectSpawns(x, y, r) {
      const out = [];
      for (let cy = cdiv(y - r); cy <= cdiv(y + r); cy++)
        for (let cx = cdiv(x - r); cx <= cdiv(x + r); cx++) {
          const ch = getChunk(cx, cy);
          if (!ch.activated) {
            ch.activated = true;
            out.push(...ch.spawnDefs);
          }
        }
      return out;
    },
    renderMapChunk,
    renderMapChunkCached,
    preloadMapImages,
    prewarmMapChunk,
    getMacro,
    overviewStep,
    OVERVIEW_Z,
    MACRO_PX,
    mapChunkCache,
    macroCache,
    mapRegionQuery,
    mipTile,
    mipPeek,
    mipMacroFill,
    mipBudget,
    MIP_MAX,
    requestMacro,
    prewarmMacros,
    macroFlat,
    _macDebug,
    MAP_PATH,
    MAP_WATER,
    MAP_BRIDGE,
    personalityAt,
    preloadSeen,
    persistChunk,
    persistAt,
    flushChunks,
    pruneChunks,
    biomeNameAt,
    villagesNearForMap,
    poisNearForMap,
    iconsNearForMap,
    BIOME_NAMES,
    riverSourceAt,
    riverFlowAt,
    heightAt: (x, y) => elevation(x / 2, y / 2),
    latitudeAt: (x, y) => latitudeAt(y / 2),
    humidityAt: (x, y) => humidity(x / 2, y / 2),
    temperatureAt: (x, y) => temperature(x / 2, y / 2),
    LAND_ELEVATION: LAND_E,
    ROCK_ELEVATION: ROCK_E,
  };
}
