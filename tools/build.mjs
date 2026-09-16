// Bundle + minify the Taiao code layer.
//
// The game is ~160 classic <script> tags sharing one global scope, listed in
// tools/bundle.list in load order. We concatenate them IN THAT ORDER
// (preserving the shared global scope they rely on) and minify. The disabled
// LC3D voxel subsystem was removed from the tree (../RPG-archive/) and the list.
//
//   node tools/build.mjs
//
// Output: dist/bundle.js  (+ dist/bundle.js is what index.html loads)
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// ---- auto-versioned world caches -----------------------------------------
// The persisted world caches (chunk data, map/minimap bakes, world-name
// registry) are keyed by a HASH of the sources that generate them, injected
// into the bundle as WORLDGEN_SIG / MAPBAKE_SIG. Any byte change to a listed
// file re-keys the IDB store on the next build+load, and stale generations
// are swept by enumeration (chunks.js / map.js / features.js) — the old
// hand-bumped ioe-*-vNN scheme is retired: never bump manually again.
//
// GEN_FILES = everything whose edits change GENERATED WORLD CONTENT
// (terrain fields, erosion, chunk painting/stamps, features/roads/villages,
// Tūhura Isle geometry+content, ground-tile keys, isle tree species tables).
// If a NEW file grows world-gen responsibilities, add it here.
const GEN_FILES = [
  "js/world.js", "js/world/terrain.js", "js/world/erosion.js",
  "js/world/chunks.js", "js/world/features.js", "js/gameplay/tutorial.js",
  "js/gameplay/dream.js", // Dream Forest interior + glade stamps feed chunk gen
  "js/gameplay/wizard.js", // Wizard.towerPos() decides where chunks stamp the Weaver's tower
  "js/biome-tiles.js", "js/nz-extra-trees.js",
];
// MAP bakes additionally depend on the map painter itself.
const MAP_FILES = [...GEN_FILES, "js/world/map.js"];
const sigOf = files => createHash("sha1")
  .update(files.map(f => readFileSync(path.join(ROOT, f))).join("\n"))
  .digest("hex").slice(0, 10);
const WORLDGEN_SIG = "g" + sigOf(GEN_FILES);
const MAPBAKE_SIG = "m" + sigOf(MAP_FILES);

// Ordered source list. index.html now loads only dist/bundle.js, so the
// load order lives in tools/bundle.list (one path per line, # comments ok).
const srcs = readFileSync(path.join(ROOT, "tools/bundle.list"), "utf8")
  .split("\n").map(s => s.trim()).filter(s => s && !s.startsWith("#"));

// Vendored libs stay as separate <script> tags (three.min.js is already
// minified and loads before the bundle in index.html).
const VENDOR = new Set(["libs/three.min.js"]);

const bundleFiles = srcs.filter(s => !VENDOR.has(s));

// ---- Phase-1 server (server/) ---------------------------------------------
// SERVER_URL wires the client to the Taiao worker (accounts / save vault /
// workshop tallies / koha transparency). Empty (the default) = every net
// feature no-ops and the game is the same fully-offline build as before.
// TURNSTILE_SITEKEY pairs with the worker's TURNSTILE_SECRET (bot checks on
// register/login); leave both unset in dev.
const SERVER_URL = (process.env.TAIAO_SERVER_URL || "").replace(/\/+$/, "");
const TURNSTILE_SITEKEY = process.env.TAIAO_TURNSTILE_SITEKEY || "";

// the signature prelude must precede every bundled file (chunks.js, map.js
// and features.js read the globals when they evaluate)
let combined = `/* world-cache signatures + server config (tools/build.mjs) */\n` +
  `var WORLDGEN_SIG = "${WORLDGEN_SIG}", MAPBAKE_SIG = "${MAPBAKE_SIG}";\n` +
  `var SERVER_URL = ${JSON.stringify(SERVER_URL)}, TURNSTILE_SITEKEY = ${JSON.stringify(TURNSTILE_SITEKEY)};\n;\n`;
let rawBytes = 0;
for (const rel of bundleFiles) {
  const p = path.join(ROOT, rel);
  const code = readFileSync(p, "utf8");
  rawBytes += Buffer.byteLength(code);
  // `\n;\n` guards against ASI hazards where one file ends without a semicolon
  // and the next begins with `(` or `[`.
  combined += `\n/* ${rel} */\n` + code + "\n;\n";
}

mkdirSync(path.join(ROOT, "dist"), { recursive: true });

// esbuild in write mode with stdin. format:"iife" is wrong here (would create a
// private scope); we need everything at the shared global top level, so we emit
// a plain script by minifying the raw concatenation.
const result = await build({
  stdin: { contents: combined, loader: "js", resolveDir: ROOT },
  bundle: false,          // no module resolution — these aren't modules
  minify: true,
  legalComments: "none",
  charset: "utf8",
  logLevel: "info",
  write: false,
});
const out = result.outputFiles[0].text;
writeFileSync(path.join(ROOT, "dist", "bundle.js"), out);

const K = n => (n / 1024).toFixed(0) + "K";
console.log(`\nBundled ${bundleFiles.length} files from tools/bundle.list`);
console.log(`Raw code:   ${K(rawBytes)}`);
console.log(`Minified:   ${K(Buffer.byteLength(out))}  ->  dist/bundle.js`);
console.log(`World-gen signature: ${WORLDGEN_SIG}   map-bake signature: ${MAPBAKE_SIG}`);
console.log(SERVER_URL ? `Server: ${SERVER_URL}` : `Server: disabled (set TAIAO_SERVER_URL to enable accounts/sync)`);
console.log(`(persisted chunk/map/name caches re-key automatically when these change)`);
