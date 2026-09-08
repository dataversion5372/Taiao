#!/usr/bin/env node
// Regenerates js/sprites/lc-cache-data.js from a local retired prototype checkout:
// the config/models/textures jag archives + bz2.wasm (base64) and the
// name->id lookup tables (loc/npc/seq/flo) used by js/legacy3d.js.
//
//   node tools/build-lc-cache.js "~/retired prototype"
"use strict";
const fs = require("fs");
const path = require("path");

const root = process.argv[2] || "~/retired prototype";
const client = path.join(root, "Client2-main");
const server = path.join(root, "Server-main");
const cache = path.join(server, "data", "pack", "client");
const packs = path.join(server, "data", "src", "pack");

const b64 = f => fs.readFileSync(f).toString("base64");
const packToMap = f => {
  const out = {};
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^(\d+)=(.+)$/);
    if (m) out[m[2]] = parseInt(m[1], 10);
  }
  return out;
};

const data = {
  config: b64(path.join(cache, "config")),
  models: b64(path.join(cache, "models")),
  textures: b64(path.join(cache, "textures")),
  wasm: b64(path.join(client, "src", "js", "vendor", "bz2.wasm")),
};
const names = {
  loc: packToMap(path.join(packs, "loc.pack")),
  npc: packToMap(path.join(packs, "npc.pack")),
  seq: packToMap(path.join(packs, "seq.pack")),
  flo: packToMap(path.join(packs, "flo.pack")),
};

let js = "// ===== retired prototype cache archives (base64) + id lookup tables =====\n";
js += "// Generated from retired prototype Server-main/data by tools/build-lc-cache.js — do not edit.\n";
js += '"use strict";\n';
js += "const LC_CACHE = " + JSON.stringify(data) + ";\n";
js += "const LC_NAMES = " + JSON.stringify(names) + ";\n";
fs.writeFileSync(path.join(__dirname, "..", "js", "sprites", "lc-cache-data.js"), js);
console.log("written", (js.length / 1024 / 1024).toFixed(2), "MB");
