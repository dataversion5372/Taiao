// ===== Isle of Emberfall — assets, canvas, and sprite drawing =====
"use strict";

// ---------- dev cheat mode ----------
// Toggled at runtime with option+C (gameplay/input.js)
// Callers (5):
//  gameplay/movement.js:65 gameplay/world.js:64,521,550 main/state.js:116
let CHEAT_MODE = true;

// ---------- assets ----------
// Callers (2):
//  main/assets.js:16,18
const SHEET_KEYS = ["t", "c", "x", "m", "b", "i", "n", "ta", "tb", "a", "md"];
// per-sheet tile size (grid pitch is size+1); sheets in SHEET_NOPAD have no inter-tile padding
// Callers (2):
//  main/assets.js:52 render3d.js:28
const SHEET_TILE = { t: 16, c: 16, x: 16, m: 16, b: 32, i: 32, n: 32, ta: 43, tb: 46, a: 64, md: 64 };
// Callers (7):
//  main/assets.js:9,53,54,62 render3d.js:36,37,40
const SHEET_NOPAD = new Set(["n"]);   // sheets with no inter-tile gap
// Callers (1):
//  render3d.js:41
const SHEET_COLORKEY = new Set(["n"]);     // sheets where solid-black means transparent
// Callers (2):
//  main/assets.js:16,25
const SHEET_OPTIONAL = new Set(["a"]);     // atlas taint-probe sheet; render3d falls back to bg_* tiles if absent
// Callers (12):
//  main/assets.js:29,67,76 render3d.js:26,47,56,59,69,72,98 world/map.js:146,443
const IMGS = {};
// Callers (1):
//  main.js:49
function loadAssets(cb) {
  const missing = SHEET_KEYS.filter(k => !SHEET_OPTIONAL.has(k) && (typeof ASSET_DATA === "undefined" || !ASSET_DATA[k]));
  if (missing.length) throw new Error("Missing embedded sprite sheet(s): " + missing.join(", "));
  const present = SHEET_KEYS.filter(k => typeof ASSET_DATA !== "undefined" && ASSET_DATA[k]);
  let left = present.length;
  if (left === 0) { cb(); return; }
  for (const k of present) {
    const im = new Image();
    im.onload = () => { if (--left === 0) cb(); };
    im.onerror = () => {
      if (SHEET_OPTIONAL.has(k)) { if (--left === 0) cb(); return; }
      throw new Error("Failed to load embedded sprite sheet: " + k);
    };
    im.src = ASSET_DATA[k];
    IMGS[k] = im;
  }
}

// ---------- canvas ----------
// Callers (37):
//  biome-tiles.js:487 gameplay/input.js:66,73,76,110 gameplay/world.js:361,671
//  main/assets.js:1,33,47,63 main/ui.js:22,84,87,237
//  render3d.js:4,10,43,65,70,85,86,87,88,103,107,115,140,324,326,329,342
//  world/map.js:377,378,379,662,663
const canvas = document.getElementById("game");
// Callers (3):
//  gameplay/input.js:147 gameplay/world.js:600 render3d.js:369
const gamecol = document.getElementById("gamecol");
let REN = null; // set to R3D in init()
// Callers (1):
//  main/assets.js:40
function resizeCanvas() {
  if (REN) REN.resize();
}
window.addEventListener("resize", resizeCanvas);

// item icon cache
// Callers (2):
//  main/assets.js:45,79
const ICONS = {};
// Callers (91):
//  content.js:36,37,60,86,90,103,131,132,152,165,182,208,229,247,248,562,563,564
//  data.js:294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346
//  main/assets.js:42 main/ui.js:24,54,89,147,171,197,218,239,258,276,296 render3d.js:450,471,496
//  world.js:9 world/features.js:915,932,934,935
function icon(key) {
  if (ICONS[key]) return ICONS[key];
  const def = SPR[key];
  const cv = document.createElement("canvas");
  cv.width = 32; cv.height = 32;
  const c2 = cv.getContext("2d");
  c2.imageSmoothingEnabled = false;
  const [sheet, c, r, extra] = def;
  const st = SHEET_TILE[sheet] || 16;
  const sx = extra && extra.sx != null ? extra.sx : c * (SHEET_NOPAD.has(sheet) ? st : st + 1);
  const sy = extra && extra.sy != null ? extra.sy : r * (SHEET_NOPAD.has(sheet) ? st : st + 1);
  const sw = extra && extra.sw ? extra.sw : st;
  const sh = extra && extra.sh ? extra.sh : st;
  c2.save();
  if (extra && extra.filter) c2.filter = extra.filter;
  if (extra && extra.rot) {
    c2.translate(16, 16); c2.rotate(extra.rot * Math.PI / 180); c2.translate(-16, -16);
  }
  if (SHEET_NOPAD.has(sheet)) {
    const tmp = document.createElement("canvas");
    tmp.width = 32; tmp.height = 32;
    const tc = tmp.getContext("2d");
    tc.imageSmoothingEnabled = false;
    tc.drawImage(IMGS[sheet], sx, sy, sw, sh, 0, 0, 32, 32);
    const id = tc.getImageData(0, 0, 32, 32);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 12 && d[i + 1] < 12 && d[i + 2] < 12) d[i + 3] = 0;
    }
    tc.putImageData(id, 0, 0);
    c2.drawImage(tmp, 0, 0, 32, 32);
  } else {
    c2.drawImage(IMGS[sheet], sx, sy, sw, sh, 0, 0, 32, 32);
  }
  c2.restore();
  ICONS[key] = cv;
  return cv;
}
