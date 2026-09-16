// ===== Taiao — DEV_MODE Dev panel =====
// A sidebar tab (only in DEV_MODE builds — main/assets.js compile-time
// constant) that drives the debug override hooks the simulation already
// honours:
//   window.__timeOffsetMs    daynight.js dayPhase — shifts clocks/sun/shadows
//   window.__weatherOverride weather.js weatherAt — full weather object
//   window.__snowOverride    weather.js snowCoverAt — ground snow cover 0..1
//   window.__floodOverride   weather.js riverFloodAt — river flood level 0..1
// Overrides persist across refreshes (localStorage) but only ever apply while
// DEV_MODE is on — the normal-mode save never sees them.
"use strict";

const CHEATS_LS_KEY = "taiao_cheat_overrides"; // migrated from emberfall_cheat_overrides, see js/lskeys-migrate.js

// preset weather objects: every field weatherCore/wxDerive emits, plus wind
// (weatherAt normally attaches wind after the core; the override is returned
// verbatim, so it carries its own).
const CHEAT_WEATHERS = {
  clear:    { anom:  0.7, front: 0,   storm: 0,    cloud: 0.04, precip: 0,    kind: null,   wind: { x: 0.5, y: 0 } },
  cloudy:   { anom:  0.2, front: 0,   storm: 0.25, cloud: 0.55, precip: 0,    kind: null,   wind: { x: 0.7, y: 0.1 } },
  overcast: { anom: -0.1, front: 0.1, storm: 0.5,  cloud: 0.85, precip: 0,    kind: null,   wind: { x: 0.9, y: 0.15 } },
  drizzle:  { anom: -0.3, front: 0.2, storm: 0.55, cloud: 0.9,  precip: 0.18, kind: "rain", wind: { x: 1.0, y: 0.2 } },
  rain:     { anom: -0.5, front: 0.4, storm: 0.7,  cloud: 0.95, precip: 0.45, kind: "rain", wind: { x: 1.3, y: 0.3 } },
  storm:    { anom: -0.9, front: 0.9, storm: 1,    cloud: 1,    precip: 0.95, kind: "rain", wind: { x: 2.2, y: 0.5 } },
  snow:     { anom: -0.5, front: 0.3, storm: 0.7,  cloud: 0.95, precip: 0.45, kind: "snow", wind: { x: 0.9, y: 0.2 } },
  blizzard: { anom: -0.9, front: 0.8, storm: 1,    cloud: 1,    precip: 0.92, kind: "snow", wind: { x: 2.4, y: 0.6 } },
};

function cheatsLoadState() {
  try { return JSON.parse(localStorage.getItem(CHEATS_LS_KEY)) || {}; } catch (e) { return {}; }
}
function cheatsSaveState(st) {
  try { localStorage.setItem(CHEATS_LS_KEY, JSON.stringify(st)); } catch (e) { /* private mode */ }
}

// apply a stored override set onto the window hooks (cheat mode only)
function cheatsApply(st) {
  if (!DEV_MODE || typeof window === "undefined") return;
  window.__timeOffsetMs = st.timeOffsetMs || 0;
  window.__weatherOverride = st.weather ? (CHEAT_WEATHERS[st.weather] || null) : null;
  window.__snowOverride = (st.snow == null) ? null : st.snow;
  window.__floodOverride = (st.flood == null) ? null : st.flood;
}

// set the LOCAL clock at the player's longitude to `mins` minutes (0..1439):
// solve for the dayPhase offset, then let time keep ticking from there.
function cheatsSetLocalTime(st, mins) {
  const target = (mins / 1440) % 1;
  const cur = localPhase();                              // includes the current offset
  const dPhase = target - cur;
  let off = (st.timeOffsetMs || 0) + dPhase * DAY_MS;
  off = ((off % DAY_MS) + DAY_MS) % DAY_MS;
  st.timeOffsetMs = off;
}

function cheatsInit() {
  const panel = document.getElementById("panel-cheats");
  const tab = document.getElementById("cheattab");
  if (!panel || !tab) return;
  if (!DEV_MODE) {
    // normal mode: hooks must stay untouched (tab is already display:none)
    return;
  }
  tab.style.display = "";

  const st = cheatsLoadState();
  cheatsApply(st);

  panel.innerHTML = `
    <h3>Dev tools</h3>
    <p class="hint">Overrides for testing — they follow this DEV_MODE save (never the normal one) and survive refresh. "Live" hands control back to the simulation.</p>

    <div class="cheatgroup">
      <div class="cheatlabel">Time of day <span id="ch-time-read"></span></div>
      <input type="range" id="ch-time" min="0" max="1439" step="10">
      <div class="cheatbtns">
        <button data-mins="360">Dawn</button>
        <button data-mins="720">Noon</button>
        <button data-mins="1080">Dusk</button>
        <button data-mins="0">Midnight</button>
        <button id="ch-time-live">Live</button>
      </div>
      <p class="hint">Shifts the sun, clocks, shadows, shop hours and NPC bedtime together. The clock keeps ticking from the time you set. Crops, fires and other wall-clock timers are unaffected.</p>
    </div>

    <div class="cheatgroup">
      <div class="cheatlabel">Weather</div>
      <select id="ch-wx">
        <option value="">Live</option>
        <option value="clear">☀️ Clear</option>
        <option value="cloudy">⛅ Cloudy</option>
        <option value="overcast">☁️ Overcast</option>
        <option value="drizzle">🌦️ Drizzle</option>
        <option value="rain">🌧️ Rain</option>
        <option value="storm">⛈️ Storm</option>
        <option value="snow">🌨️ Snow</option>
        <option value="blizzard">❄️ Blizzard</option>
      </select>
      <p class="hint">Forces the weather everywhere. Snow cover on the ground and river floods integrate PAST weather, so they have their own sliders below.</p>
    </div>

    <div class="cheatgroup">
      <div class="cheatlabel">Snow cover <span id="ch-snow-read"></span></div>
      <input type="range" id="ch-snow" min="0" max="100" step="5">
      <div class="cheatbtns"><button id="ch-snow-live">Live</button></div>
    </div>

    <div class="cheatgroup">
      <div class="cheatlabel">River flood <span id="ch-flood-read"></span></div>
      <input type="range" id="ch-flood" min="0" max="100" step="5">
      <div class="cheatbtns"><button id="ch-flood-live">Live</button></div>
    </div>

    <div class="cheatgroup">
      <div class="cheatlabel">Player</div>
      <div class="cheatbtns">
        <button id="ch-heal">Heal full</button>
        <button id="ch-wash">Clear stink</button>
      </div>
      <p class="hint">Teleport: open the world map (M) and double-click anywhere.</p>
    </div>`;

  const $ = id => document.getElementById(id);
  const save = () => { cheatsSaveState(st); cheatsApply(st); };

  // ---- time ----
  const timeRead = () => {
    $("ch-time-read").textContent = st.timeOffsetMs
      ? "· set (" + clockTime() + " local)" : "· live";
  };
  $("ch-time").oninput = e => {
    cheatsSetLocalTime(st, +e.target.value); save(); timeRead();
  };
  for (const b of panel.querySelectorAll("[data-mins]"))
    b.onclick = () => {
      cheatsSetLocalTime(st, +b.dataset.mins); save();
      $("ch-time").value = b.dataset.mins; timeRead();
    };
  $("ch-time-live").onclick = () => { st.timeOffsetMs = 0; save(); timeRead(); };

  // ---- weather ----
  $("ch-wx").value = st.weather || "";
  $("ch-wx").onchange = e => { st.weather = e.target.value || null; save(); };

  // ---- snow / flood sliders share a pattern ----
  const wireSlider = (key, sliderId, readId, liveId) => {
    const read = () => {
      $(readId).textContent = (st[key] == null) ? "· live" : "· " + Math.round(st[key] * 100) + "%";
    };
    if (st[key] != null) $(sliderId).value = st[key] * 100;
    $(sliderId).oninput = e => { st[key] = +e.target.value / 100; save(); read(); };
    $(liveId).onclick = () => { st[key] = null; save(); read(); };
    read();
  };
  wireSlider("snow", "ch-snow", "ch-snow-read", "ch-snow-live");
  wireSlider("flood", "ch-flood", "ch-flood-read", "ch-flood-live");

  // ---- player ----
  $("ch-heal").onclick = () => { player.hp = maxHp(); uiDirty = true; };
  $("ch-wash").onclick = () => { player.stink = { fl: {} }; uiDirty = true; };

  // sync the time readout when the tab is opened (the clock ticks on its own)
  tab.addEventListener("click", () => {
    timeRead();
    if (st.timeOffsetMs) {
      const [hh, mm] = clockTime().split(":");
      $("ch-time").value = (+hh) * 60 + (+mm);
    }
  });
  timeRead();
}

cheatsInit();
