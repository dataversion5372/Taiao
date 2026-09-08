// ---------- the Spoken Weave: casting by typing or by voice ----------
// The pouch rotation (skills/combat.js) hums along on its own beat, but a
// mage who KNOWS the words can speak the sentence directly. With a wand or
// staff in hand, Enter opens the chant bar — type the words ("fire strike")
// and Enter again casts them. V toggles voice casting: say the words aloud
// and the browser's speech recognition weaves them (where the browser has
// one — typed chanting always works). Every spoken word must still be a
// rune LOADED IN THE POUCH, and it burns exactly as if the rotation had
// drawn it; the weapon's weave capacity still caps the sentence (wand 2
// words, staff 3). The craft the rotation rewards — loading a pouch that
// speaks well — becomes, for the chanter, actually knowing what to say.

// token -> ladder index. Exact name match first; then one keystroke/
// mishearing of grace (edit distance 1) for words of 4+ letters, so a typo
// or the recognizer hearing "word" for "ward" doesn't kill the sentence.
let CHANT_INDEX = null; // built lazily: RUNES exists by first keypress
function chantWordFor(tok) {
  if (!CHANT_INDEX) { CHANT_INDEX = {}; RUNES.forEach((r, i) => { CHANT_INDEX[r.name.toLowerCase()] = i; }); }
  if (tok in CHANT_INDEX) return CHANT_INDEX[tok];
  if (tok.length < 4) return -1;
  for (let i = 0; i < RUNES.length; i++) if (chantLev1(tok, RUNES[i].name.toLowerCase())) return i;
  return -1;
}
function chantLev1(a, b) { // edit distance ≤ 1?
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
// split a chant into known ladder indices (in speaking order) + the noise
function chantParse(text) {
  const idx = [], unknown = [];
  for (const raw of text.toLowerCase().split(/[^a-z]+/)) {
    if (!raw) continue;
    const i = chantWordFor(raw);
    if (i >= 0) idx.push(i); else unknown.push(raw);
  }
  return { idx, unknown };
}

// who the sentence lands on: the fight you're already in, else whatever in
// reach is hunting you, else the nearest monster in reach (a deliberate
// chant at a peaceful grazer is on the chanter's conscience)
function chantTarget(range) {
  const a = player.act;
  if (a && a.kind === "combat" && a.mon && a.mon.alive &&
      Math.max(Math.abs(a.mon.x - player.x), Math.abs(a.mon.y - player.y)) <= range) return a.mon;
  let best = null, bs = 1e9;
  for (const m of monsters) {
    if (!m.alive) continue;
    const d = Math.max(Math.abs(m.x - player.x), Math.abs(m.y - player.y));
    if (d > range) continue;
    const score = d - (m.target === player ? 100 : 0); // attackers first
    if (score < bs) { bs = score; best = m; }
  }
  return best;
}
// sentences that profit the caster alone may be chanted into empty air:
// a Ward, or the self-facing secret techniques (see WEAVE_TECHNIQUES)
const CHANT_SELF_PAIRS = [["veil", "shadow"], ["law", "ward"], ["blood", "soul"]];
function chantSelfOk(words) {
  const hasK = k => words.some(x => x.k === k);
  return hasK("ward") || CHANT_SELF_PAIRS.some(p2 => hasK(p2[0]) && hasK(p2[1]));
}

// Speak a sentence. Returns true if it cast. `spoken` softens the errors —
// the recognizer hears plenty of hallway noise a typist never sends.
function chantCast(text, spoken) {
  if (typeof combatStyle !== "function" || combatStyle() !== "magic") {
    if (!spoken) log("You need a wand or staff in hand to speak the weave.", "warn");
    return false;
  }
  const w = player.equip.weapon;
  const p = chantParse(text);
  if (!p.idx.length) {
    if (!spoken && text.trim()) log("Those are no words of the weave — nothing answers.", "warn");
    return false;
  }
  if (!spoken && p.unknown.length) {
    log(`"${p.unknown[0]}" is no word of the weave — the sentence fizzles.`, "warn");
    return false;
  }
  const cap = ITEMS[w].weave || 2;
  if (p.idx.length > cap) {
    log(`Your ${ITEMS[w].name.toLowerCase()} holds only ${cap} words at once — the sentence unravels.`, "warn");
    return false;
  }
  if (now < player.nextAtkAt) { if (!spoken) log("You're still weaving…", "warn"); return false; }
  // every word must be a loaded rune (duplicates need duplicates)
  const need = {};
  for (const i of p.idx) need[RUNES[i].id] = (need[RUNES[i].id] || 0) + 1;
  for (const id in need)
    if (runeSlotQty(id) < need[id]) {
      log(`No ${ITEMS[id].name} ${runeSlotQty(id) ? "left" : "loaded"} in your pouch — the word won't come.`, "warn");
      return false;
    }
  const words = p.idx.map(i => runeWord(RUNES[i].id));
  const mon = chantTarget(ITEMS[w].range || 7);
  if (!mon && !chantSelfOk(words)) { log("Nothing in reach to cast at.", "warn"); return false; }
  for (const i of p.idx) consumeRune(RUNES[i].id);
  let pot = 0;
  for (const word of words) pot += 1 + word.tier * 0.4; // the rotation's own potency
  const st = player.weave || (player.weave = { asp: [], pot: 0, slot: -1, hasteUntil: 0 });
  const haste = st.hasteUntil && now < st.hasteUntil ? 0.6 : 1;
  if (typeof playerSay === "function") playerSay(words.map(x => x.name).join(" ") + "!", 2600);
  castSentence(mon, w, words, pot);
  player.nextAtkAt = now + Math.round((ITEMS[w].atkTick || 1700) * haste);
  player.lungeT = now;
  if (mon) {
    player.lungeDir = [Math.sign(mon.x - player.x), Math.sign(mon.y - player.y)];
    player.facing = mon.px >= player.px ? 1 : -1;
  }
  uiDirty = true;
  return true;
}

// ---------- the chant bar (typing) ----------
let _chantBar, _chantInput;
function buildChantBar() {
  if (_chantBar) return;
  const style = document.createElement("style");
  style.textContent = `
    #chantbar { position:absolute; left:50%; bottom:52px; transform:translateX(-50%);
      display:none; z-index:41; width:min(400px,64%); }
    #chantbar.show { display:block; }
    #chantbar input { width:100%; box-sizing:border-box; padding:8px 12px; border-radius:16px;
      border:1px solid #6a5a92; background:rgba(24,18,34,0.9); color:#efe6ff;
      font:14px OpenDyslexic,Verdana; outline:none; }
    #chantbar input::placeholder { color:#a08ec0; }
    #chantbar input:focus { border-color:#b08cff; box-shadow:0 0 0 2px rgba(176,140,255,0.25); }
    #chantmic { position:absolute; left:50%; top:10px; transform:translateX(-50%);
      display:none; z-index:41; padding:4px 12px; border-radius:14px;
      border:1px solid #b08cff; background:rgba(24,18,34,0.85); color:#efe6ff;
      font:12px OpenDyslexic,Verdana; }
    #chantmic.show { display:block; }`;
  document.head.appendChild(style);
  _chantBar = document.createElement("div");
  _chantBar.id = "chantbar";
  _chantInput = document.createElement("input");
  _chantInput.type = "text";
  _chantInput.maxLength = 80;
  _chantInput.autocomplete = "off";
  _chantInput.placeholder = "Speak the weave… e.g. fire strike (Enter casts, Esc closes)";
  _chantBar.appendChild(_chantInput);
  const mic = document.createElement("div");
  mic.id = "chantmic";
  mic.textContent = "🎤 chanting aloud — V to stop";
  const host = document.getElementById("gamecol") || document.body;
  host.appendChild(_chantBar);
  host.appendChild(mic);
  _chantInput.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Enter") {
      if (chantCast(_chantInput.value, false)) closeChantBar();
    } else if (e.key === "Escape") closeChantBar();
  });
  // the half-spoken sentence hangs over the chanter's head as it's typed
  _chantInput.addEventListener("input", () => {
    const v = _chantInput.value;
    if (v && typeof playerSay === "function") playerSay(v + "…", 4000);
    else if (!v && player._say) player._say = null;
  });
  _chantInput.addEventListener("blur", () => { _chantBar.classList.remove("show"); });
}
function openChantBar() {
  buildChantBar();
  _chantBar.classList.add("show");
  _chantInput.value = "";
  _chantInput.focus();
}
function closeChantBar() {
  _chantInput.value = "";
  _chantInput.blur();
  _chantBar.classList.remove("show");
  if (player._say) player._say = null;
}

// ---------- voice casting ----------
// Web Speech API where the browser offers it (Chrome/Edge/Safari; Firefox
// has none yet — typing with Enter always works). Recognition naps after a
// stretch of silence, so onend re-arms it while the toggle is on.
const Chant = { rec: null, on: false };
function chantVoiceToggle() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    log("(This browser has no speech recognition — chant by typing with Enter instead.)", "warn");
    return;
  }
  buildChantBar(); // for the mic pill's styles
  const mic = document.getElementById("chantmic");
  if (Chant.on) {
    Chant.on = false;
    try { Chant.rec.stop(); } catch (e) {}
    mic.classList.remove("show");
    log("You fall silent.", "sys");
    return;
  }
  if (!Chant.rec) {
    const r = Chant.rec = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = e => {
      let fin = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += " " + res[0].transcript;
        else interim += " " + res[0].transcript;
      }
      interim = interim.trim();
      if (interim && typeof playerSay === "function") playerSay(interim + "…", 1600);
      fin = fin.trim();
      if (fin) chantCast(fin, true);
    };
    r.onerror = ev => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        Chant.on = false;
        mic.classList.remove("show");
        log("The browser blocked the microphone — allow it to cast by voice.", "warn");
      } // "no-speech"/"aborted" are routine; onend re-arms
    };
    r.onend = () => { if (Chant.on) { try { r.start(); } catch (e) {} } };
  }
  Chant.on = true;
  try { Chant.rec.start(); } catch (e) {}
  mic.classList.add("show");
  log("You begin to chant aloud — speak rune words to cast (V to stop).", "sys");
}

// Enter opens the chant bar for a mage (the NPC chat bar owns Enter when
// it's showing); V toggles voice. Registered here, not input.js, so the
// whole feature lives in one file.
window.addEventListener("keydown", e => {
  const ae = document.activeElement;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
  if (e.key === "v" || e.key === "V") { chantVoiceToggle(); e.preventDefault(); return; }
  if (e.key === "Enter") {
    const nc = document.getElementById("npcchat");
    if (nc && nc.classList.contains("show")) return;
    if (typeof combatStyle === "function" && combatStyle() === "magic") { openChantBar(); e.preventDefault(); }
  }
});
