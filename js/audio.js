// ===== Isle of Emberfall — sound effects =====
// All sounds are CC0 (public domain): Kenney.nl audio packs (RPG Audio,
// Impact Sounds, Interface Sounds, Digital Audio, Music Jingles) plus two
// OpenGameArt CC0 packs (water splash/slime by rubberduck, eating crunches
// by tito). See assets/sfx/CREDITS.txt.
//
// Uses HTMLAudioElement pools rather than WebAudio: the game is played from
// file:// where fetch()ing local files is CORS-blocked, but <audio> playback
// is not. Each named sound has several variant files (name0.ogg..nameN.ogg)
// and each play picks a random variant with a little playbackRate jitter so
// repeated actions (footsteps, mining) don't machine-gun the same sample.
"use strict";

const SFX = (() => {
  const BASE = "assets/sfx/";
  // name -> variant count; a count of 0 means a single un-numbered file
  const SOUNDS = {
    step_grass: 5, step_stone: 5, step_snow: 5, step_sand: 5, step_wood: 5,
    wade: 3, splash_big: 0,
    swing: 2, hit: 3, hurt: 2, kill: 2,
    bow: 2, arrowhit: 2, arrowmiss: 2,
    spellword: 3, spellcast: 3, die: 0,
    chop: 3, mine: 4, fish: 3, forage: 3,
    coins: 2, pickup: 2, equip: 3, eat: 3, drink: 2,
    dooropen: 2, doorclose: 2, gate: 2, latch: 0, climb: 2,
    book: 3, click: 3, error: 2, craft: 2, anvil: 2,
    levelup: 2, quest: 0, portal: 2, attune: 0,
  };
  const VOLS = [1, 0.55, 0.28, 0];             // master volume steps (🔊🔉🔈🔇)
  const ICONS = ["🔊", "🔉", "🔈", "🔇"];
  let volIdx = parseInt(localStorage.getItem("emberfallSfxVol") || "1", 10);
  if (!(volIdx >= 0 && volIdx < VOLS.length)) volIdx = 1;

  const pools = {};   // file -> [HTMLAudioElement] (reused when not playing)
  const lastAt = {};  // name -> last play time (throttle rapid repeats)

  function grab(file) {
    const pool = pools[file] || (pools[file] = []);
    for (const a of pool) if (a.paused || a.ended) return a;
    if (pool.length >= 4) return null; // cap: never stack 5 copies of one file
    const a = new Audio(BASE + file);
    a.preservesPitch = false;
    if ("mozPreservesPitch" in a) a.mozPreservesPitch = false;
    pool.push(a);
    return a;
  }

  function play(name, vol = 1, rate = 1) {
    const master = VOLS[volIdx];
    if (master <= 0) return;
    const n = SOUNDS[name];
    if (n === undefined) return;
    const t = Date.now();
    if (t - (lastAt[name] || 0) < 70) return; // same-frame bursts play once
    lastAt[name] = t;
    const file = name + (n ? Math.floor(Math.random() * n) : "") + ".ogg";
    const a = grab(file);
    if (!a) return;
    a.volume = Math.min(1, vol * master);
    a.playbackRate = rate * (0.92 + Math.random() * 0.16);
    a.currentTime = 0;
    // rejected before the first user gesture (autoplay policy) — just stay quiet
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }

  // footstep flavoured by what's underfoot: water -> wade (quiet slosh while
  // sailing), else by biome id (data.js B) — snow/ice, bare rock, sand/desert,
  // everything else grass. Wood floors aren't cheaply detectable, so interiors
  // fall back to the biome sound.
  const SNOWY = new Set([8, 9, 33]), STONY = new Set([7, 15, 16, 17, 22, 25]),
        SANDY = new Set([2, 6, 23, 27]);
  function step(x, y, water, sailing) {
    if (water) { play("wade", sailing ? 0.16 : 0.4); return; }
    const b = world.biomeAt(x, y);
    const name = SNOWY.has(b) ? "step_snow" : STONY.has(b) ? "step_stone"
               : SANDY.has(b) ? "step_sand" : "step_grass";
    play(name, 0.35);
  }

  // per-strike gathering sound keyed on the node's skill
  function gather(skill) {
    if (/mining$|^Mining$/.test(skill)) play("mine", 0.6);
    else if (skill === "Woodcutting") play("chop", 0.6);
    else if (skill === "Fishing") play("fish", 0.5);
    else play("forage", 0.5);
  }

  // craft completion, flavoured for the metal trades (anvil clank)
  function craft(skill) {
    if (/smithing|Smelting|Alloys|Toolmaking/i.test(skill)) play("anvil", 0.45);
    else play("craft", 0.35);
  }

  // ---------- volume button + UI clicks ----------
  function initUi() {
    const anchor = document.getElementById("soapbtn");
    if (anchor && anchor.parentNode) {
      const b = document.createElement("button");
      b.id = "sfxbtn";
      b.title = "Sound effects volume";
      b.textContent = ICONS[volIdx];
      b.addEventListener("click", () => {
        volIdx = (volIdx + 1) % VOLS.length;
        localStorage.setItem("emberfallSfxVol", String(volIdx));
        b.textContent = ICONS[volIdx];
        play("click", 0.6);
      });
      anchor.parentNode.insertBefore(b, anchor.nextSibling);
    }
    // soft tick on any UI button; page-flip for the journal/bestiary tomes
    document.addEventListener("click", (e) => {
      const btn = e.target.closest && e.target.closest("button");
      if (!btn || btn.id === "sfxbtn") return;
      if (btn.id === "questbtn" || btn.id === "bestiarybtn") play("book", 0.6);
      else play("click", 0.35);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUi);
  else initUi();

  return { play, step, gather, craft };
})();

// terse global helpers, matching the codebase's bare-function call style
function sfx(name, vol, rate) { SFX.play(name, vol, rate); }
function sfxStep(x, y, water, sailing) { SFX.step(x, y, water, sailing); }
function sfxGather(skill) { SFX.gather(skill); }
function sfxCraft(skill) { SFX.craft(skill); }
