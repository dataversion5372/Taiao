// ===== Isle of Emberfall — character selector (C) =====
// Two pages: (1) a grid of characters (each front-facing, with its name); click
// one to advance to (2) the OUTFIT page for that character — a grid of the
// outfit states that family has (Idle/Default + smallclothes + any variants,
// from OUTFIT_STATES / assets/families_source). Click an outfit to become that
// character wearing it (player.character + player.outfit).
"use strict";

const CharSelect = (() => {
  let built = false, open = false;
  let sheet = null, sheetReady = false;
  let page = "chars";        // "chars" | "outfits"
  let selChar = 0;           // character index being outfitted
  const panels = []; // { canvas, ctx, index }
  const outfitPanels = []; // page 2: { ctx, folder, state, charIndex }

  const el = () => document.getElementById("charselect");
  const gridEl = () => document.getElementById("charselect-grid");
  const headEl = () => document.querySelector("#charselect-head span");
  const backEl = () => document.getElementById("cs-back");

  // pretty names for the raw state-folder slugs
  const OUTFIT_LABELS = {
    Idle: "Default", smallclothes: "Smallclothes", in_underwear: "Underwear",
    armorless_robeless: "Unarmoured", armorless_robeless_2: "Unarmoured II",
    female_variant: "Female", female_variant_2: "Female II",
    more_feminine_lookin: "Feminine", more_feminine: "Feminine",
    holding_weapon: "Armed", no_weapon: "Unarmed",
    cloak_made_of_muka: "Flax cloak", cloak_made_of_woven: "Woven cloak",
    less_ugly: "Fairer", make_handsome: "Handsome", no_belt: "No belt",
    hulk_berserker_state: "Berserker",
    new_hairstyle: "New Hairstyle", new_outfit: "New Outfit", armed: "Armed", action_pose: "Action Pose",
  };
  const outfitLabel = s => OUTFIT_LABELS[s] || s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const statesFor = i => {
    const f = CHAR_LIST[i] && CHAR_LIST[i].folder;
    return (typeof OUTFIT_STATES !== "undefined" && f && OUTFIT_STATES[f]) ? OUTFIT_STATES[f] : ["Idle"];
  };
  // [sheetIdx] -> {img, ready}; embedded outfit sheets (OUTFIT_SHEETS), loaded lazily
  const outfitSheets = [];
  const outfitFrame = (folder, state) =>
    (typeof OUTFIT_FRAME !== "undefined") ? OUTFIT_FRAME[folder + "|" + state] : undefined;
  function outfitSheetImg(si) {
    if (typeof OUTFIT_SHEETS === "undefined" || si == null || si < 0 || si >= OUTFIT_SHEETS.length) return null;
    let e = outfitSheets[si];
    if (e) return e;
    e = { img: new Image(), ready: false };
    outfitSheets[si] = e;
    e.img.onload = () => { e.ready = true; if (open) redraw(); };
    e.img.src = OUTFIT_SHEETS[si];
    return e;
  }
  function loadSheet() {
    if (sheet || typeof CHAR_SHEET === "undefined") return;
    sheet = new Image();
    sheet.onload = () => { sheetReady = true; if (open) redraw(); };
    sheet.src = CHAR_SHEET;
  }
  function redraw() { if (page === "chars") drawAll(); else if (page === "outfits") redrawOutfits(); }

  function makePanel(labelText, onClick) {
    const panel = document.createElement("div");
    panel.className = "cspanel";
    const cv = document.createElement("canvas");
    cv.width = CHAR_CELL; cv.height = CHAR_CELL;
    const name = document.createElement("div");
    name.className = "csname";
    name.textContent = labelText;
    panel.appendChild(cv);
    panel.appendChild(name);
    panel.onclick = onClick;
    gridEl().appendChild(panel);
    return { panel, cv, ctx: cv.getContext("2d") };
  }

  // ---------- page 1: characters ----------
  function build() {
    if (built || typeof CHAR_LIST === "undefined") return;
    loadSheet();
    const b = document.getElementById("csclose");
    if (b) b.onclick = close;
    const bk = backEl();
    if (bk) bk.onclick = showChars;
    built = true;
  }

  function drawCharPanel(p) {
    // the currently-played character shows its CURRENT outfit in the grid; every
    // other character shows its default (Idle) portrait from the packed sheet.
    if (p.index === player.character && player.outfit && player.outfit !== "Idle") {
      drawOutfitPanel(p.ctx, CHAR_LIST[p.index].folder, player.outfit, p.index);
      return;
    }
    if (!sheetReady) return;
    const dir = Math.max(0, CHAR_DIRS.indexOf("south"));
    const frame = p.index * CHAR_DIRS.length + dir;
    const sx = (frame % CHAR_COLS) * CHAR_CELL, sy = Math.floor(frame / CHAR_COLS) * CHAR_CELL;
    const ctx = p.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CHAR_CELL, CHAR_CELL);
    ctx.drawImage(sheet, sx, sy, CHAR_CELL, CHAR_CELL, 0, 0, CHAR_CELL, CHAR_CELL);
  }
  function drawAll() { for (const p of panels) drawCharPanel(p); }

  function showChars() {
    page = "chars";
    headEl().textContent = "Choose your character";
    if (backEl()) backEl().style.display = "none";
    gridEl().innerHTML = ""; panels.length = 0;
    CHAR_LIST.forEach((c, i) => {
      const p = makePanel(c.name, () => pickChar(i));
      panels.push({ canvas: p.cv, ctx: p.ctx, index: i });
    });
    drawAll();
    markSelected();
  }

  // clicking a character just makes you that character in the DEFAULT outfit and
  // closes the menu (the outfit page is no longer part of the flow).
  function pickChar(i) {
    player.character = i;
    player.outfit = "Idle";
    player.dir8 = "south";
    if (typeof saveGame === "function") saveGame();
    if (typeof log === "function") log(`You are now ${CHAR_LIST[i].name}.`, "gold");
    close();
  }

  // ---------- page 2: outfits for a character ----------
  const southIdx = () => Math.max(0, CHAR_DIRS.indexOf("south"));
  // draw the south portrait of (folder,state) into a CHAR_CELL panel: Idle from the
  // packed CHAR_SHEET; any other state from its embedded outfit sheet (pre-trimmed,
  // foot-anchored). All data-URI → works over file://. Blank until the sheet loads.
  function drawOutfitPanel(ctx, folder, state, charIndex) {
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, CHAR_CELL, CHAR_CELL);
    if (state === "Idle") {
      if (!sheetReady) return;
      const frame = charIndex * CHAR_DIRS.length + southIdx();
      const sx = (frame % CHAR_COLS) * CHAR_CELL, sy = Math.floor(frame / CHAR_COLS) * CHAR_CELL;
      ctx.drawImage(sheet, sx, sy, CHAR_CELL, CHAR_CELL, 0, 0, CHAR_CELL, CHAR_CELL);
      return;
    }
    const fr = outfitFrame(folder, state);
    if (!fr) return;
    const s = outfitSheetImg(fr[0]);
    if (!s || !s.ready) return;
    const frame = fr[1] + southIdx();
    const cell = OUTFIT_SHEET_CELL, cols = OUTFIT_SHEET_COLS;
    const sx = (frame % cols) * cell, sy = Math.floor(frame / cols) * cell;
    ctx.drawImage(s.img, sx, sy, cell, cell, 0, 0, CHAR_CELL, CHAR_CELL);
  }
  function redrawOutfits() { for (const o of outfitPanels) drawOutfitPanel(o.ctx, o.folder, o.state, o.charIndex); }

  function showOutfits(i) {
    selChar = i;
    page = "outfits";
    const c = CHAR_LIST[i];
    headEl().textContent = "Outfit — " + c.name;
    if (backEl()) backEl().style.display = "";
    gridEl().innerHTML = "";
    panels.length = 0; outfitPanels.length = 0;
    statesFor(i).forEach(state => {
      const p = makePanel(outfitLabel(state), () => chooseOutfit(i, state));
      p.panel.dataset.outfit = state;
      outfitPanels.push({ ctx: p.ctx, folder: c.folder, state, charIndex: i });
      drawOutfitPanel(p.ctx, c.folder, state, i);
    });
    markSelected();
  }

  // apply an outfit and close so you immediately SEE the character wearing it in
  // the world (the opaque menu otherwise hides the live change). The grid still
  // shows the current character in its current outfit whenever it's on screen.
  function chooseOutfit(i, state) {
    player.character = i;
    player.outfit = state || "Idle";
    player.dir8 = "south";
    if (typeof saveGame === "function") saveGame();
    if (typeof log === "function")
      log(`You are now ${CHAR_LIST[i].name}${state && state !== "Idle" ? " — " + outfitLabel(state) : ""}.`, "gold");
    close();
  }

  function markSelected() {
    const kids = [...gridEl().querySelectorAll(".cspanel")];
    if (page === "chars") {
      kids.forEach((k, idx) => k.classList.toggle("selected", player.character === idx));
    } else {
      kids.forEach(k => k.classList.toggle("selected",
        selChar === player.character && (k.dataset.outfit || "Idle") === (player.outfit || "Idle")));
    }
  }

  function openUI() {
    if (typeof CHAR_LIST === "undefined" || !CHAR_LIST.length) return;
    build();
    open = true;
    el().classList.add("open");
    showChars();
  }
  function close() {
    open = false;
    el().classList.remove("open");
    page = "chars";
  }
  function toggle() { open ? close() : openUI(); }

  return { toggle, open: openUI, close, get isOpen() { return open; } };
})();
