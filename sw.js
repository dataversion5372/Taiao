// Taiao — service worker: cache-first for static game assets.
// Turns the one-time sprite/audio download into a load-once, offline-capable
// experience. Bump CACHE_VERSION whenever shipped assets change.
"use strict";

const CACHE_VERSION = "emberfall-v3"; // v3 2026-09-12: gated character chooser (isle keeper + Newhaven Registrar); purge stale bundles

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
      // a dropped connection must surface as a normal failed response the
      // page's own onerror handling can absorb — a rejected respondWith
      // reads as "A ServiceWorker intercepted the request and encountered
      // an error" and the sheet stays missing for the whole session
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response("", { status: 504, statusText: "fetch failed" });
      }
    })());
    return;
  }

  if (matchAny(path, NETWORK_FIRST)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        // cache:"no-cache" forces revalidation with the server — without it the
        // browser's heuristic HTTP cache (python http.server sends no
        // Cache-Control) can hand back a STALE bundle.js for hours after a
        // rebuild, so "network-first" silently wasn't. Revalidation is a cheap
        // conditional GET (304 when unchanged).
        const res = await fetch(req, { cache: "no-cache" });
        // refresh the offline copy OUT-OF-BAND (waitUntil), and only when the
        // file actually changed: unconditionally re-putting the ~5MB bundle on
        // every reload was a Cache Storage write storm that dragged the next
        // navigation's start down by over a second.
        if (res.ok) {
          const resClone = res.clone();
          e.waitUntil((async () => {
            const hit = await cache.match(req);
            const same = hit &&
              hit.headers.get("last-modified") === resClone.headers.get("last-modified") &&
              hit.headers.get("content-length") === resClone.headers.get("content-length");
            if (!same) await cache.put(req, resClone);
          })().catch(() => { /* offline copy refresh is best-effort */ }));
        }
        return res;
      } catch (err) {
        const hit = await cache.match(req);
        if (hit) return hit;
        throw err;
      }
    })());
  }
});
