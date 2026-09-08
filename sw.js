// Isle of Emberfall — service worker: cache-first for static game assets.
// Turns the one-time sprite/audio download into a load-once, offline-capable
// experience. Bump CACHE_VERSION whenever shipped assets change.
"use strict";

const CACHE_VERSION = "emberfall-v1";

// Cache-first for large immutable assets (content-hashed sheets never change).
const CACHE_FIRST = [
  "/assets/sheets/",   // externalized sprite sheets (hashed .webp — immutable)
  "/assets/sfx/",      // sound effects
  "/fonts/",           // web fonts
  "/libs/",            // three.min.js, legacy-engine.js
];

// Network-first for code/markup so edits show up without a version bump,
// but still work offline from the last cached copy.
const NETWORK_FIRST = ["/js/", "/css/", "/index.html", "/"];

function matchAny(path, list) {
  return list.some(p => p.endsWith("/") ? path.startsWith(p) : path === p);
}

self.addEventListener("install", e => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // same-origin only
  const path = url.pathname;

  if (matchAny(path, CACHE_FIRST)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (matchAny(path, NETWORK_FIRST)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req);
        if (hit) return hit;
        throw err;
      }
    })());
  }
});
