// ===== Taiao — zone-unique NPC names =====
// Mirrors the LOCATION name registry (world/features.js): within one ZONE
// (15000²-tile block, world.zoneOf), no two NPCs share a name. A character
// (mix roster def) may recur across the zone, but a duplicate name is swapped
// for a CULTURALLY-SIMILAR unused one — the mix roster encodes culture in the
// def `key` (the half before "__"; the `name` matches it), so the alternate
// pool for a name is the other names of that same culture. Plain clerks share
// one "villager" pool (content.js VILLAGER_NAMES).
//
// Assignment is lazy (first NPC to claim a name keeps it) and PERSISTED per
// zone in IDB (store 'n', db 'ioe-npcnames-<SIG>'), keyed by a position-stable
// id, so a given player's NPC names never change once assigned. Named
// singletons (Registrar, Weaver, quest givers) pass through unchanged — their
// names are curated-unique already.
"use strict";

const NpcNames = (() => {
  const cache = new Map();   // "wx,wy" -> { names: Map(id->name), used: Set }
  let cultPools = null;

  const cultureOf = key => { const i = (key || "").indexOf("__"); return i >= 0 ? key.slice(0, i) : (key || ""); };
  function pools() {
    if (cultPools) return cultPools;
    cultPools = new Map();
    const list = (typeof MIX_NPCS !== "undefined" && MIX_NPCS.list) || [];
    for (const d of list) { const c = cultureOf(d.key); if (!cultPools.has(c)) cultPools.set(c, []); cultPools.get(c).push(d.name); }
    return cultPools;
  }
  function altPool(culture) {
    if (culture === "villager") return (typeof VILLAGER_NAMES !== "undefined" ? VILLAGER_NAMES : []);
    return pools().get(culture) || [];
  }
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const roman = n => (n <= 10 ? ROMAN[n] : "(" + n + ")");

  function zoneKey(gx, gy) {
    if (typeof world !== "undefined" && world && world.zoneOf) { const z = world.zoneOf(gx, gy); return z[0] + "," + z[1]; }
    return "0,0";
  }
  function reg(k) { let r = cache.get(k); if (!r) { r = { names: new Map(), used: new Set() }; cache.set(k, r); } return r; }

  // pick a zone-unique name. id must be POSITION-stable (e.g. "npc:x,y") so the
  // same NPC re-derives the same name. baseName = the preferred (roster) name;
  // culture selects the alternate pool ("villager" or a mix culture prefix).
  function pick(gx, gy, id, baseName, culture) {
    const r = reg(zoneKey(gx, gy));
    const had = r.names.get(id);
    if (had) return had;
    let name = baseName || "Stranger";
    if (r.used.has(name)) {
      name = null;
      for (const n of altPool(culture)) if (!r.used.has(n)) { name = n; break; }   // same-culture alternate
      if (!name) { const l = (typeof MIX_NPCS !== "undefined" && MIX_NPCS.list) || []; for (const d of l) if (!r.used.has(d.name)) { name = d.name; break; } }  // any roster name
      if (!name) { let i = 2; while (r.used.has(baseName + " " + roman(i))) i++; name = baseName + " " + roman(i); }   // last resort: epithet
    }
    r.used.add(name);
    r.names.set(id, name);
    persistLater(zoneKey(gx, gy));
    return name;
  }

  // ---- IDB persistence (parallel to the location registry) -----------------
  const _dbName = () => 'ioe-npcnames-' + (typeof WORLDGEN_SIG !== 'undefined' ? WORLDGEN_SIG : 'dev');
  function _open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(_dbName(), 1);
      r.onupgradeneeded = e => e.target.result.createObjectStore('n');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  // drop stale-signature DBs (matches the worldnames cleanup)
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB.databases)
      indexedDB.databases().then(dbs => { for (const d of dbs || []) if (d && d.name && d.name.startsWith('ioe-npcnames-') && d.name !== _dbName()) try { indexedDB.deleteDatabase(d.name); } catch (e) {} }).catch(() => {});
  } catch (e) {}

  const _dirty = new Set(); let _flushT = null;
  function persistLater(k) {
    if (typeof indexedDB === "undefined") return;
    _dirty.add(k);
    if (_flushT) return;
    _flushT = setTimeout(() => {
      _flushT = null; const keys = [..._dirty]; _dirty.clear();
      _open().then(db => { const tx = db.transaction('n', 'readwrite'); const st = tx.objectStore('n'); for (const k of keys) { const r = cache.get(k); if (r) st.put([...r.names], k); } }).catch(() => {});
    }, 1500);
  }
  async function preload() {
    try {
      const db = await _open();
      const store = db.transaction('n').objectStore('n');
      const [keys, vals] = await Promise.all([
        new Promise((res, rej) => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
        new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
      ]);
      keys.forEach((k, i) => {
        const r = reg(String(k));
        if (r.names.size) return;
        r.names = new Map(vals[i]);
        r.used = new Set(r.names.values());
      });
    } catch (e) { /* first run — names allocate + persist on demand */ }
  }

  return { pick, cultureOf, preload, _cache: cache };
})();
if (typeof window !== "undefined") window.NpcNames = NpcNames;
