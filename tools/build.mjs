// Bundle + minify the Emberfall code layer.
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
import { build } from "esbuild";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// Ordered source list. index.html now loads only dist/bundle.js, so the
// load order lives in tools/bundle.list (one path per line, # comments ok).
const srcs = readFileSync(path.join(ROOT, "tools/bundle.list"), "utf8")
  .split("\n").map(s => s.trim()).filter(s => s && !s.startsWith("#"));

// Vendored libs stay as separate <script> tags (three.min.js is already
// minified and loads before the bundle in index.html).
const VENDOR = new Set(["libs/three.min.js"]);

const bundleFiles = srcs.filter(s => !VENDOR.has(s));

let combined = "";
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
