// ===== Isle of Emberfall — in-world armour overlay (landmark-fitted) =====
// Equipped metal armour drawn ON the player's 8-direction character billboard,
// TAILORED to that character and TINTED to the armour's metal tier.
//
// FIT: each neutral piece from the hand-drawn sheet (armour-overlay-data.js) is
// warped by a per-piece AFFINE that aligns the piece's own control points to the
// character's detected anatomical LANDMARKS (js/sprites/char-landmarks-data.js,
// CHAR_LM — reliable points: head-box, neck, shoulders, hips, knees, ankles,
// wrist line, from the underwear silhouette). Helm→head-box, chest/chainbody→
// shoulders+pelvis, legs→hips+ankles, boots→ankles, gauntlets→wrist line. Real
// protrusions (horns/ears/tails, CHAR_LM sibling data in char-body-fit-data's
// `bare`) are cut so they poke through. Then recoloured to the metal tier.
// In-game SIZE is attuned by render3d applying the character's stat scale (h,w)
// to this overlay identically to the body billboard.
"use strict";

const ArmourOverlay = (() => {
  // PARKED: armour is equipped for stats but NOT drawn on the character. The full
  // landmark-fitted overlay pipeline below is intact — flip ENABLED to true (or set
  // window.__armourOverlay = true) to switch the visual back on.
  let ENABLED = false;
  const CELL = 96, COLS = 8;
  let baseImg = null, baseReady = false, pieces = null; // pieces[row][dir] = {cv,w,h}
  let cache = { sig: null, out: null };

  const KIND = { helm: 0, chainbody: 1, chest: 2, gloves: 3, legs: 4, boots: 5 };
  const PAL = {
    Bronze: [150, 102, 50], Zinc: [176, 182, 188], Lead: [120, 124, 132],
    Nickel: [176, 178, 170], Titanium: [158, 162, 170], Mithril: [120, 172, 228],
    Orichalcum: [120, 196, 150], Starmetal: [172, 178, 210], Frostiron: [150, 190, 210],
    Duskmetal: [112, 102, 132], Dawnmetal: [230, 200, 140], Chronite: [150, 160, 178],
    "Voidforged steel": [86, 78, 116], "Twilight alloy": [122, 112, 152],
    "Nickel silver": [200, 200, 190], Cupronickel: [190, 170, 150],
  };
  const DEF_COL = [158, 162, 170];
  const KIND_LABEL = /\s+(Helm|Chestplate|Chainbody|Gauntlets|Legs|Boots)$/;

  // destination QUAD [TL,TR,BR,BL] on the character from its landmarks `l` — the
  // piece is STRETCHED to fill this quad (tapers shoulders→hips, hips→ankles…).
  function quad(kind, l) {
    switch (kind) {
      case "helm": {
        const hw = Math.max(5, l.hhw) * 1.12, mw = Math.max(5, l.hhw) * 1.0, t = l.ht - 1, b = l.nkY + 1;
        return [[l.hcx - hw, t], [l.hcx + hw, t], [l.hcx + mw, b], [l.hcx - mw, b]];
      }
      case "chest":
      case "chainbody": {
        const t = l.shY - (l.hpY - l.shY) * 0.05, sL = l.shL - 1, sR = l.shR + 1;
        return [[sL, t], [sR, t], [l.hpR, l.hpY], [l.hpL, l.hpY]];
      }
      case "legs": return [[l.hpL, l.hpY], [l.hpR, l.hpY], [l.anR + 2, l.ftY], [l.anL - 2, l.ftY]];
      case "boots": {
        const t = l.anY - 0.30 * Math.max(4, l.anY - l.knY);
        return [[l.anL - 3, t], [l.anR + 3, t], [l.anR + 3, l.ftY + 1], [l.anL - 3, l.ftY + 1]];
      }
      case "gloves": return [[l.wrL - 2, l.wrY - 6], [l.wrR + 2, l.wrY - 6], [l.wrR + 2, l.wrY + 7], [l.wrL - 2, l.wrY + 7]];
    }
    return null;
  }
  // affine (a,b,c,d,e,f) mapping src pts -> dst pts (3 correspondences)
  function affine(s, d) {
    const M = [[s[0][0], s[0][1], 1], [s[1][0], s[1][1], 1], [s[2][0], s[2][1], 1]];
    const ax = solve3(M, [d[0][0], d[1][0], d[2][0]]), ay = solve3(M, [d[0][1], d[1][1], d[2][1]]);
    return (ax && ay) ? [ax[0], ay[0], ax[1], ay[1], ax[2], ay[2]] : null;
  }
  function solve3(A, y) {
    const m = [[...A[0], y[0]], [...A[1], y[1]], [...A[2], y[2]]];
    for (let i = 0; i < 3; i++) {
      let p = i; for (let r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[p][i])) p = r;
      if (Math.abs(m[p][i]) < 1e-6) return null;
      [m[i], m[p]] = [m[p], m[i]];
      for (let r = 0; r < 3; r++) if (r !== i) { const f = m[r][i] / m[i][i]; for (let c = i; c < 4; c++) m[r][c] -= f * m[i][c]; }
    }
    return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
  }
  // draw image triangle (src px) into dst triangle, clipped, via affine
  function warpTri(fx, img, s, d) {
    const A = affine(s, d); if (!A) return;
    fx.save();
    fx.beginPath(); fx.moveTo(d[0][0], d[0][1]); fx.lineTo(d[1][0], d[1][1]); fx.lineTo(d[2][0], d[2][1]); fx.closePath(); fx.clip();
    fx.setTransform(A[0], A[1], A[2], A[3], A[4], A[5]);
    fx.drawImage(img, 0, 0); fx.restore();
  }
  // STRETCH the piece (src = its bbox corners) to fill dst quad [TL,TR,BR,BL]
  function placePiece(fx, pieceCv, dq) {
    const w = pieceCv.width, h = pieceCv.height;
    const sTL = [0, 0], sTR = [w, 0], sBR = [w, h], sBL = [0, h];
    warpTri(fx, pieceCv, [sTL, sTR, sBR], [dq[0], dq[1], dq[2]]);
    warpTri(fx, pieceCv, [sTL, sBR, sBL], [dq[0], dq[2], dq[3]]);
  }
  // pure side profiles (east/west) collapse the L/R landmarks to a sliver, so
  // don't stretch to width — scale the (already side-drawn) piece to the quad's
  // height keeping its native width, centred on the body axis.
  function placeProfile(fx, pieceCv, dq) {
    const top = Math.min(dq[0][1], dq[1][1]), bot = Math.max(dq[2][1], dq[3][1]);
    const cx = (dq[0][0] + dq[1][0] + dq[2][0] + dq[3][0]) / 4;
    const th = Math.max(4, bot - top), sc = th / pieceCv.height, tw = pieceCv.width * sc;
    fx.drawImage(pieceCv, cx - tw / 2, top, tw, th);
  }

  function ensureBase() {
    if (baseImg || typeof ARMOUR_BASE_SHEET === "undefined") return;
    baseImg = new Image();
    baseImg.onload = () => { baseReady = true; slice(); cache.sig = null; };
    baseImg.src = ARMOUR_BASE_SHEET;
  }
  function trimCanvas(src) {
    const w = src.width, h = src.height, d = src.getContext("2d").getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const cv = document.createElement("canvas"); cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
    cv.getContext("2d").drawImage(src, x0, y0, cv.width, cv.height, 0, 0, cv.width, cv.height);
    return { cv, w: cv.width, h: cv.height };
  }
  function slice() {
    const rows = (typeof ARMOUR_BASE_ROWS !== "undefined" ? ARMOUR_BASE_ROWS : 6);
    const cw = baseImg.width / COLS, ch = baseImg.height / rows; pieces = [];
    for (let r = 0; r < 6; r++) {
      pieces[r] = [];
      for (let c = 0; c < COLS; c++) {
        const t = document.createElement("canvas"); t.width = Math.round(cw); t.height = Math.round(ch);
        t.getContext("2d").drawImage(baseImg, c * cw, r * ch, cw, ch, 0, 0, t.width, t.height);
        pieces[r][c] = trimCanvas(t);
      }
    }
  }
  const colCache = new Map();
  function colorize(piece, key, col) {
    const ck = key + "|" + col.join(","); let g = colCache.get(ck); if (g) return g;
    const w = piece.w, h = piece.h, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d"); cx.drawImage(piece.cv, 0, 0);
    const img = cx.getImageData(0, 0, w, h), d = img.data;
    const sh = col.map(v => v * 0.33), hi = col.map(v => Math.min(v * 1.85, 255));
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 20) continue;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3 / 255; let v = (lum - 0.28) / 0.5; v = v < 0 ? 0 : v > 1 ? 1 : v;
      for (let k = 0; k < 3; k++) d[i + k] = v < 0.5 ? sh[k] + (col[k] - sh[k]) * (v / 0.5) : col[k] + (hi[k] - col[k]) * ((v - 0.5) / 0.5);
    }
    cx.putImageData(img, 0, 0); colCache.set(ck, cv); return cv;
  }
  function unrle(str) {
    const m = new Uint8Array(48 * 48); if (!str) return m;
    const bin = atob(str); let p = 0;
    for (let i = 0; i + 1 < bin.length; i += 2) { const v = bin.charCodeAt(i), n = bin.charCodeAt(i + 1); for (let j = 0; j < n && p < m.length; j++) m[p++] = v; }
    return m;
  }
  function equipSet() {
    const out = []; if (typeof player === "undefined" || !player.equip) return out;
    const seen = {};
    for (const slot in player.equip) {
      const id = player.equip[slot]; if (!id || typeof ITEMS === "undefined" || !ITEMS[id]) continue;
      const mk = /^(helm|chest|legs|chainbody|gloves|boots)_/.exec(id); if (!mk) continue;
      const kind = mk[1]; if (seen[kind]) continue; seen[kind] = 1;
      const nm = (ITEMS[id].name || "").replace(KIND_LABEL, "").trim();
      out.push({ kind, col: PAL[nm] || DEF_COL });
    }
    return out;
  }

  function playerCanvas() {
    if (!ENABLED && !(typeof window !== "undefined" && window.__armourOverlay)) return null;
    ensureBase();
    if (!baseReady || typeof CHAR_LIST === "undefined" || player.character == null) return null;
    const folder = CHAR_LIST[player.character] && CHAR_LIST[player.character].folder;
    const lm = (typeof CHAR_LM !== "undefined" && folder) ? CHAR_LM[folder] : null;
    const bareFit = (typeof CHAR_BODY_FIT !== "undefined" && folder) ? CHAR_BODY_FIT[folder] : null;
    if (!lm) return null;
    const eq = equipSet(); if (!eq.length) { cache = { sig: "none", out: null }; return null; }
    const sig = folder + "|" + eq.map(e => e.kind + e.col.join("")).join(",");
    if (cache.sig === sig) return cache.out;
    const order = ["legs", "boots", "chainbody", "chest", "gloves", "helm"];
    const active = order.filter(k => eq.find(e => e.kind === k));
    const cv = document.createElement("canvas"); cv.width = COLS * CELL; cv.height = CELL;
    const ctx = cv.getContext("2d");
    for (let di = 0; di < COLS; di++) {
      const dname = CHAR_DIRS[di], l = lm[dname]; if (!l) continue;
      const frame = document.createElement("canvas"); frame.width = CELL; frame.height = CELL;
      const fx = frame.getContext("2d"); fx.imageSmoothingEnabled = true;
      const profile = dname === "east" || dname === "west";
      for (const kind of active) {
        const p = pieces[KIND[kind]] && pieces[KIND[kind]][di]; if (!p) continue;
        const dq = quad(kind, l); if (!dq) continue;
        const col = eq.find(e => e.kind === kind).col;
        const cpc = colorize(p, KIND[kind] + "_" + di, col);
        if (profile) placeProfile(fx, cpc, dq); else placePiece(fx, cpc, dq);
      }
      // cut protrusions (horns/ears/tails) using the body-fit bare mask
      const bareStr = bareFit && bareFit.dirs[dname] ? bareFit.dirs[dname].bare : "";
      const bare = unrle(bareStr);
      let any = false; for (let i = 0; i < bare.length; i++) if (bare[i]) { any = true; break; }
      if (any) {
        const fi = fx.getImageData(0, 0, CELL, CELL), fd = fi.data;
        for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++)
          if (bare[((y * 48 / CELL) | 0) * 48 + ((x * 48 / CELL) | 0)]) fd[(y * CELL + x) * 4 + 3] = 0;
        fx.putImageData(fi, 0, 0);
      }
      ctx.drawImage(frame, di * CELL, 0);
    }
    cache = { sig, out: { canvas: cv, cols: COLS, cell: CELL, w: cv.width, h: cv.height, sig } };
    return cache.out;
  }

  return { playerCanvas };
})();
