// ===== Taiao — birdsong & birdcalls =====
// Real NZ bird recordings (assets/birdsong/, xeno-canto via its GBIF
// catalogue — CC-licensed, full attribution in assets/birdsong/CREDITS.txt).
// The EXTINCT birds sing too, through PROXY voices from their closest living
// relatives (kōkako for the huia, tinamou/emu/cassowary for the moa, brown
// quail for the koreke…) — per-clip provenance in CREDITS.txt. Only the whio
// stays silent: alive, but xeno-canto holds no recording of it yet.
// Every species carries seamless SONG and CALL loops — and
// the time of day decides which you hear: the dawn chorus is nearly all
// song, midday leans to contact calls, dusk sings again, and the night
// belongs to the nocturnal birds' calls. Birds sing in fading BOUTS at
// random offsets in their loops, so the bush layers and shifts and never
// repeats itself.
//
// Volume: INVERSE-SQUARE — vol = (R0/r)², r = distance to the player's
// CURRENT body (split.js keeps `player` = the active clone), re-tuned every
// frame. Each voice routes through the WebAudio nature bus (audio.js
// natureChain): stereo pan by where the bird sits relative to the camera,
// a distance low-pass so far birds sound softly distant, and a glue
// compressor over the whole layer — with a plain element-volume fallback if
// WebAudio is unavailable. Master level = the "Nature sounds" slider.
"use strict";

const BIRDSONG = (() => {
  const BASE = "assets/birdsong/";
  // species -> loop pools by voice class (what tools/fetch_birdsong.py
  // landed: up to two songs + two calls per species, distinct recordings;
  // kākāpō has one known usable recording, kārearea two flight/beg calls
  // that both live in its song pool). The hour picks the class; the bout
  // draws a random loop from the pool.
  const CLIPS = {
    kaka: { song: ["kaka_song", "kaka_song2"], call: ["kaka_call", "kaka_call2"] },
    kakapo: { song: ["kakapo_song"], call: ["kakapo_call"] },
    karearea: { song: ["karearea_song", "karearea_song2"], call: [] },
    kea: { song: ["kea_song", "kea_song2"], call: ["kea_call", "kea_call2"] },
    kereru: { song: ["kereru_song", "kereru_song2"], call: ["kereru_call", "kereru_call2"] },
    kiwi: { song: ["kiwi_song", "kiwi_song2"], call: ["kiwi_call", "kiwi_call2"] },
    kotata: { song: ["kotata_song", "kotata_song2"], call: ["kotata_call", "kotata_call2"] },
    piwakawaka: { song: ["piwakawaka_song", "piwakawaka_song2"], call: ["piwakawaka_call", "piwakawaka_call2"] },
    pukeko: { song: ["pukeko_song", "pukeko_song2"], call: ["pukeko_call", "pukeko_call2"] },
    putangitangi: { song: ["putangitangi_song", "putangitangi_song2"], call: ["putangitangi_call", "putangitangi_call2"] },
    ruru: { song: ["ruru_song", "ruru_song2"], call: ["ruru_call", "ruru_call2"] },
    takapu: { song: ["takapu_song", "takapu_song2"], call: ["takapu_call", "takapu_call2"] },
    tieke: { song: ["tieke_song", "tieke_song2"], call: ["tieke_call", "tieke_call2"] },
    titipounamu: { song: ["titipounamu_song", "titipounamu_song2"], call: ["titipounamu_call", "titipounamu_call2"] },
    tui: { song: ["tui_song", "tui_song2"], call: ["tui_call", "tui_call2"] },
    weka: { song: ["weka_song", "weka_song2"], call: ["weka_call", "weka_call2"] },
    // the extinct birds speak through PROXY voices — each clip comes from
    // its closest (or most plausible) living relative; see CREDITS.txt
    koreke: { song: ["koreke_song", "koreke_song2"], call: ["koreke_call", "koreke_call2"] },       // brown quail
    huia: { song: ["huia_song", "huia_song2"], call: ["huia_call", "huia_call2"] },                 // kōkako
    hakawai: { song: ["hakawai_song", "hakawai_song2"], call: ["hakawai_call", "hakawai_call2"] },  // snipe winnowing
    pouakai: { song: ["pouakai_song", "pouakai_song2"], call: ["pouakai_call"] },                   // little eagle
    kuihinui: { song: ["kuihinui_song", "kuihinui_song2"], call: ["kuihinui_call", "kuihinui_call2"] }, // Cape Barren goose
    moaiti: { song: ["moaiti_song", "moaiti_song2"], call: ["moaiti_call", "moaiti_call2"] },       // great tinamou
    moauta: { song: ["moauta_song", "moauta_song2"], call: ["moauta_call", "moauta_call2"] },       // emu drumming
    moanui: { song: ["moanui_song", "moanui_song2"], call: ["moanui_call", "moanui_call2"] },       // cassowary boom
  };
  const R0 = 3;            // full volume within 3 tiles of the singer
  const RANGE = 30;        // hard cull — (3/30)² is inaudible anyway
  const MAX_PLAYING = 4;   // layered chorus, never a wall of sound
  const FADE_IN = 1600, FADE_OUT = 2400; // long soft bout envelope (ms)
  const SOFT = 0.8;        // overall trim: the birds sit back, relaxed

  // time-of-day feel: what fraction of bouts are SONG (vs call), and how the
  // rests between bouts stretch or shrink (dawn chorus is busy, night sparse)
  function phaseMix() {
    const ph = (typeof sunPhase === "function" && typeof player !== "undefined")
      ? sunPhase(player.x) : 0.5;
    if (ph >= 0.20 && ph < 0.36) return { song: 0.85, rest: 0.55 }; // dawn chorus
    if (ph >= 0.36 && ph < 0.64) return { song: 0.40, rest: 1.0 };  // workaday calls
    if (ph >= 0.64 && ph < 0.80) return { song: 0.70, rest: 0.7 };  // evening chorus
    return { song: 0.35, rest: 1.5 };                               // night: sparse calls
  }

  const els = {};       // "key_variant" -> HTMLAudioElement
  const playing = [];   // [{el, ch, m, start, until}] live bouts

  function volFor(m) {
    const r = Math.max(R0, Math.hypot(m.x - player.x, m.y - player.y));
    return (R0 * R0) / (r * r); // inverse-square, clamped to 1 inside R0
  }
  // stereo position: the bird's bearing rotated into camera space (camYaw
  // snaps with the orbiting camera), squeezed so nothing sits hard in one ear
  function panFor(m) {
    const dx = m.x - player.x, dy = m.y - player.y;
    const c = Math.cos(camYaw || 0), s = Math.sin(camYaw || 0);
    return Math.max(-0.8, Math.min(0.8, (dx * c - dy * s) / 14));
  }
  // air absorption: near birds sparkle to 15 kHz, far ones round off to ~2.5
  function lpFor(m) {
    const r = Math.hypot(m.x - player.x, m.y - player.y);
    return 2500 + 12500 * Math.pow(Math.max(0, 1 - (r - R0) / (RANGE - R0)), 1.3);
  }

  let nextScanAt = 0;
  function tick() {
    if (typeof player === "undefined" || !player) return;
    const mv = (typeof sfxNatureVol === "function" ? sfxNatureVol() : 1) * SOFT;
    // per-frame: envelope × inverse-square × master; pan + low-pass ride along
    for (let i = playing.length - 1; i >= 0; i--) {
      const p = playing[i];
      const overFor = now - p.until;
      if (!p.m.alive || p.m.dormant || overFor > FADE_OUT + 300 || p.el.error) {
        if (p.ch) SFX.natureSet(p.ch, 0);
        p.el.pause();
        playing.splice(i, 1);
        continue;
      }
      const fadeOut = now < p.until ? 1 : Math.max(0, 1 - overFor / FADE_OUT);
      const env = Math.min(1, (now - p.start) / FADE_IN) * fadeOut;
      const v = Math.min(1, volFor(p.m) * env * mv);
      if (p.ch) SFX.natureSet(p.ch, v, panFor(p.m), lpFor(p.m));
      else p.el.volume = v;
      if (v <= 0.002 && now - p.start > FADE_IN) {
        if (p.ch) SFX.natureSet(p.ch, 0);
        p.el.pause();
        playing.splice(i, 1);
      }
    }
    if (now < nextScanAt) return;
    nextScanAt = now + 600;
    if (mv <= 0) return;
    const night = typeof bfNight === "function" && bfNight();
    const mix = phaseMix();
    for (const m of monsters) {
      if (playing.length >= MAX_PLAYING) break;
      if (!m.alive || m.dormant) continue;
      const key = m.kind.replace(/_v$/, "");
      const pools = CLIPS[key];
      if (!pools) continue;
      if (Math.max(Math.abs(m.x - player.x), Math.abs(m.y - player.y)) > RANGE) continue;
      // day birds fall silent after dusk; nocturnals only exist awake at night
      const noct = typeof NOCTURNAL_BIRDS !== "undefined" && NOCTURNAL_BIRDS.has(key);
      if (night && !noct) continue;
      // staggered clock per bird — a fresh clearing doesn't erupt at once
      if (m.songAt === undefined) { m.songAt = now + 2000 + Math.random() * 25000; continue; }
      if (now < m.songAt) continue;
      if (playing.some(p => p.m === m)) continue; // one voice per bird
      // the hour picks the CLASS (song for the choruses, calls for midday
      // and night); the bout draws a random loop from that class's pool
      const wantClass = Math.random() < mix.song ? "song" : "call";
      const pool = (pools[wantClass] && pools[wantClass].length) ? pools[wantClass]
        : (pools.song.length ? pools.song : pools.call);
      if (!pool.length) continue;
      const ek = pool[Math.floor(Math.random() * pool.length)];
      const el = els[ek] || (els[ek] = new Audio(BASE + ek + ".ogg"));
      if (playing.some(p => p.el === el)) continue; // that loop is already going
      if (volFor(m) * mv <= 0.002) continue;
      const bout = 18000 + Math.random() * 30000;
      m.songAt = now + bout + (12000 + Math.random() * 40000) * mix.rest;
      el.loop = true;
      // start somewhere new in the loop each bout, with a whisker of rate
      // variation — the same clip never plays the same way twice
      if (el.duration > 2) el.currentTime = Math.random() * el.duration;
      el.playbackRate = 0.97 + Math.random() * 0.06;
      const ch = (typeof SFX !== "undefined" && SFX.natureChain) ? SFX.natureChain(el) : null;
      if (ch) SFX.natureSet(ch, 0, panFor(m), lpFor(m));
      else el.volume = 0;
      const pr = el.play();
      if (pr && pr.catch) pr.catch(() => {}); // pre-gesture autoplay block: stay quiet
      playing.push({ el, ch, m, start: now, until: now + bout });
    }
  }
  // what's audible right now — the odd-sound flag (below) snapshots this
  function playingNow() {
    return playing.filter(p => !p.el.paused).map(p => ({
      file: p.el.src.split("/").pop().replace(".ogg", ""),
      t: +p.el.currentTime.toFixed(2),
      rate: +p.el.playbackRate.toFixed(3),
    }));
  }
  return { tick, playingNow };
})();

function birdsongTick() { BIRDSONG.tick(); }

// ---------- odd-sound flagging ----------
// Field-recording QA: real xeno-canto clips sometimes carry a stray voice, a
// far siren, a car. Press N the moment you hear one — every bird loop playing
// right now is logged with its exact clip offset (localStorage, survives
// reloads). Export the log from the "?" tab and run
//   python3 tools/clean_birdsong.py soundflags.json
// to excise the flagged moments from the loops (or retire recordings that
// are beyond saving — their XC ids land in assets/birdsong/SKIP.txt so a
// refetch never picks them again).
const SOUNDFLAGS_KEY = "emberfallSoundFlags";
function soundFlags() {
  try { return JSON.parse(localStorage.getItem(SOUNDFLAGS_KEY) || "[]"); } catch (e) { return []; }
}
// Pressing N snapshots the playing clips IMMEDIATELY (the loops keep rolling
// while you type, so the moment must be pinned first), then a small bar asks
// what you heard — Enter saves the note, Esc saves the flag without one.
let _pendingFlag = null;
function flagOddSound() {
  const nowPlaying = BIRDSONG.playingNow();
  if (!nowPlaying.length) { log("No bird recording is playing right now — nothing to flag.", "warn"); return; }
  _pendingFlag = { clips: nowPlaying, at: new Date().toISOString() };
  const bar = _flagBar();
  bar.style.display = "flex";
  const inp = bar.querySelector("input");
  inp.value = "";
  inp.placeholder = `What did you hear in ${nowPlaying.map(p => p.file).join(" / ")}? (Enter saves, Esc skips the note)`;
  inp.focus();
}
function _commitFlag(desc) {
  const bar = document.getElementById("soundflagbar");
  if (bar) bar.style.display = "none";
  if (!_pendingFlag) return;
  const flags = soundFlags();
  for (const p of _pendingFlag.clips) flags.push({ ...p, at: _pendingFlag.at, desc: desc || "" });
  try { localStorage.setItem(SOUNDFLAGS_KEY, JSON.stringify(flags)); } catch (e) {}
  log(`Odd sound noted${desc ? ` ("${desc}")` : ""}: ${_pendingFlag.clips.map(p => `${p.file} @ ${p.t}s`).join(", ")} (${flags.length} flag${flags.length > 1 ? "s" : ""} logged)`, "gold");
  if (typeof sfx === "function") sfx("click", 0.4);
  _pendingFlag = null;
  _syncFlagUi();
}
function _flagBar() {
  let bar = document.getElementById("soundflagbar");
  if (bar) return bar;
  bar = document.createElement("div");
  bar.id = "soundflagbar";
  bar.style.cssText = "display:none;position:fixed;left:50%;bottom:64px;transform:translateX(-50%);" +
    "z-index:60;background:#101b17;border:1px solid #2c5a48;border-radius:8px;padding:8px 10px;" +
    "gap:8px;align-items:center;box-shadow:0 4px 18px rgba(0,0,0,.5)";
  const lbl = document.createElement("span");
  lbl.textContent = "🎧 Odd sound —";
  lbl.style.cssText = "color:#7fe3c7;font-size:13px;white-space:nowrap";
  const inp = document.createElement("input");
  inp.type = "text";
  inp.maxLength = 120;
  inp.style.cssText = "width:340px;background:#0a120f;color:#dfe;border:1px solid #2c5a48;" +
    "border-radius:5px;padding:5px 8px;font-size:13px";
  inp.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Enter") _commitFlag(inp.value.trim());
    else if (e.key === "Escape") _commitFlag("");
  });
  bar.appendChild(lbl);
  bar.appendChild(inp);
  document.body.appendChild(bar);
  return bar;
}
function _syncFlagUi() {
  const n = soundFlags().length;
  const el = document.getElementById("soundflagcount");
  if (el) el.textContent = n ? `${n} flag${n > 1 ? "s" : ""} logged` : "no flags yet";
}
function _initFlagUi() {
  const flagBtn = document.getElementById("soundflagbtn");
  const expBtn = document.getElementById("soundflagexport");
  const clrBtn = document.getElementById("soundflagclear");
  if (flagBtn) flagBtn.addEventListener("click", e => { e.stopPropagation(); flagOddSound(); });
  if (expBtn) expBtn.addEventListener("click", e => {
    e.stopPropagation();
    const blob = new Blob([JSON.stringify(soundFlags(), null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "soundflags.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  if (clrBtn) clrBtn.addEventListener("click", e => {
    e.stopPropagation();
    try { localStorage.removeItem(SOUNDFLAGS_KEY); } catch (err) {}
    log("Sound flags cleared.", "sys");
    _syncFlagUi();
  });
  _syncFlagUi();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _initFlagUi);
else _initFlagUi();
