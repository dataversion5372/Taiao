#!/usr/bin/env node
// ===== Taiao — bake the Bifrost crossing to assets/bifrost.webm =====
// Boots the game headless, drives Bifrost.record (the cinematic's own
// painters at a fixed 1920x1080 virtual clock — no character, screenshots or
// teleport), screenshots every 1/30s frame and encodes the stack with ffmpeg
// (VP9). Re-run whenever the crossing's look or Tūhura/world-gen changes.
//
//   node tools/record_bifrost.js [--fps 30] [--crf 32] [--keep-frames]
//
// Needs: ffmpeg on PATH, Firefox.app, puppeteer-core (npm i in any scratch
// dir and run from there, or install alongside). Serves the repo itself on
// an ephemeral port — no server needs to be running.
"use strict";
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "bifrost.webm");
const ARGS = process.argv.slice(2);
const argOf = (k, d) => { const i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; };
const FPS = parseInt(argOf("--fps", "30"), 10);
const CRF = parseInt(argOf("--crf", "32"), 10);
const KEEP = ARGS.includes("--keep-frames");
const PORT = 8907;

function findPuppeteer() {
  const tries = [process.cwd(), __dirname, ROOT];
  for (const base of tries) {
    try { return require(require.resolve("puppeteer-core", { paths: [base] })); } catch (e) { /* next */ }
  }
  console.error("puppeteer-core not found — `npm i puppeteer-core` in the cwd first.");
  process.exit(1);
}

(async () => {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); }
  catch (e) { console.error("ffmpeg not on PATH"); process.exit(1); }

  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), "bifrost-frames-"));
  const server = spawn("python3", ["-m", "http.server", String(PORT), "-d", ROOT], { stdio: "ignore" });
  const puppeteer = findPuppeteer();
  let browser = null;
  const cleanup = () => {
    try { server.kill(); } catch (e) {}
    if (!KEEP) { try { fs.rmSync(frameDir, { recursive: true, force: true }); } catch (e) {} }
  };
  process.on("exit", cleanup);

  try {
    browser = await puppeteer.launch({
      browser: "firefox",
      executablePath: "/Applications/Firefox.app/Contents/MacOS/firefox",
      headless: true, protocol: "webDriverBiDi",
      // MUTE the headless game — the boot plays birdsong/SFX and the crossing
      // plays the Bifrost theme out loud on the host. media.volume_scale is
      // Firefox's master output scale; 0 = silence. The webm has no audio
      // track anyway (ffmpeg encodes PNG frames only), so this costs nothing.
      extraPrefsFirefox: { "media.volume_scale": "0.0" },
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    page.on("pageerror", e => console.error("[pageerror]", e.message));
    // belt-and-suspenders game-level mute, injected before any game code runs:
    // (1) the audio settings read these localStorage keys at boot (js/audio.js;
    // nature/SFX default ON), (2) hard-stub every audio path so NOTHING can
    // reach the host speakers even if a code path ignores the volume — SFX/
    // birdsong are <audio> elements (play()→silent no-op), music.js is WebAudio
    // (AudioContext never resumes → no output). The webm has no audio track.
    await page.evaluateOnNewDocument(() => {
      try {
        for (const k of ["taiaoGameVol", "taiaoNatureVol", "taiaoMusicVol"]) localStorage.setItem(k, "0");
        const M = window.HTMLMediaElement && HTMLMediaElement.prototype;
        if (M) M.play = function () { try { this.muted = true; this.volume = 0; this.pause(); } catch (e) {} return Promise.resolve(); };
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC && AC.prototype) { AC.prototype.resume = function () { return Promise.resolve(); }; }
      } catch (e) {}
    });

    console.log("booting game…");
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => !document.getElementById("bootload"), { timeout: 300000 });
    await new Promise(r => setTimeout(r, 4000));

    const ok = await page.evaluate(() => {
      const d = document.getElementById("tutdlg");
      if (d) d.style.display = "none";
      return Bifrost.record.start();
    });
    if (!ok) throw new Error("Bifrost.record.start() refused (cinematic active?)");

    console.log("waiting for bakes + fractal to converge…");
    const t0 = Date.now();
    for (;;) {
      if (await page.evaluate(() => Bifrost.record.ready())) break;
      if (Date.now() - t0 > 300000) throw new Error("bakes never converged (5 min)");
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`converged in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

    const tl = await page.evaluate(() => Bifrost.record.timeline());
    const frames = Math.round((tl.t1 - tl.t0) * FPS) + 1;
    console.log(`recording ${frames} frames @ ${FPS}fps (t ${tl.t0}..${tl.t1})`);
    for (let i = 0; i < frames; i++) {
      const t = tl.t0 + i / FPS;
      let painted = await page.evaluate(tt => Bifrost.record.frame(tt), t);
      if (!painted) throw new Error(`frame(${t.toFixed(2)}) failed`);
      // "partial" = the map dive borrowed coarse/flat tiles for this viewport;
      // give the macro worker a beat and re-paint the same instant until every
      // tile is resolved art (bounded, so a wedged worker can't hang the bake)
      for (let tries = 0; painted === "partial" && tries < 40; tries++) {
        await new Promise(r => setTimeout(r, 250));
        painted = await page.evaluate(tt => Bifrost.record.frame(tt), t);
        if (!painted) throw new Error(`frame(${t.toFixed(2)}) failed`);
      }
      if (painted === "partial") console.warn(`  frame(${t.toFixed(2)}) still partial after 10s — keeping best effort`);
      await page.screenshot({
        path: path.join(frameDir, `f${String(i).padStart(5, "0")}.png`),
        clip: { x: 0, y: 0, width: tl.w, height: tl.h },
      });
      if (i % 60 === 0) console.log(`  frame ${i}/${frames} (t=${t.toFixed(1)}s)`);
    }
    await page.evaluate(() => Bifrost.record.stop());
    await browser.close(); browser = null;

    console.log("encoding…");
    execFileSync("ffmpeg", [
      "-y", "-framerate", String(FPS), "-i", path.join(frameDir, "f%05d.png"),
      "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(CRF),
      "-pix_fmt", "yuv420p", "-deadline", "good", "-cpu-used", "2",
      OUT,
    ], { stdio: "inherit" });
    const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
    console.log(`wrote ${OUT} (${mb} MB, ${((frames - 1) / FPS).toFixed(1)}s)`);
    if (KEEP) console.log("frames kept at", frameDir);
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
    cleanup();
  }
})().catch(e => { console.error("RECORD FAIL:", e); process.exit(1); });
