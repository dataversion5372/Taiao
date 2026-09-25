// ===== QuestScript — engine: registry, dispatch, choice UI, public API =====
// Ties the VM to the game. Parses the build-inlined SCRIPTS_SRC map into trigger
// sections, indexes them by subject, and exposes window.QuestScript:
//
//   QuestScript.load()               (re)parse + register every .qs script
//   QuestScript.hasNpc(npc)          is there an opnpc section for this NPC?
//   QuestScript.runNpc(npc)          run it (async, fire-and-forget)
//   QuestScript.hasLoc(key)          is there an oploc section for this object?
//   QuestScript.runLoc(key, x, y)    run it
//   QuestScript.choose(options)      promise-returning choice modal (-> response)
//
// NPC match: npc._script === subject, else npc.name === subject.
// Loc match : the object/decor/item key === subject (a '#hash' suffix is stripped).
"use strict";

(function () {
  const QS = (window.__QS = window.__QS || {});

  const npcTriggers = Object.create(null);     // subject -> section
  const locTriggers = Object.create(null);     // subject -> section
  const roleTriggers = Object.create(null);    // role -> { subject -> section }
  const routineTriggers = Object.create(null); // subject (role or name) -> section
  let loaded = false;

  // role name for a role trigger header: optrader -> "trader", opbanker -> "banker", ...
  const roleOf = trigger => trigger.replace(/^op/, "");

  function clearBucket(o) { for (const k in o) delete o[k]; }
  function load() {
    clearBucket(npcTriggers); clearBucket(locTriggers);
    clearBucket(roleTriggers); clearBucket(routineTriggers);
    const src = (typeof SCRIPTS_SRC !== "undefined") ? SCRIPTS_SRC : {};
    let nSections = 0;
    for (const scriptName in src) {
      let sections;
      try {
        sections = QS.parse(src[scriptName], scriptName);
      } catch (e) {
        console.error("QuestScript: failed to parse", scriptName, e);
        continue;
      }
      for (const sec of sections) {
        if (sec.kind === "npc") npcTriggers[sec.subject] = sec;
        else if (sec.kind === "loc") locTriggers[sec.subject] = sec;
        else if (sec.kind === "routine") routineTriggers[sec.subject] = sec;
        else if (sec.kind === "role") {
          const role = roleOf(sec.trigger);
          (roleTriggers[role] || (roleTriggers[role] = Object.create(null)))[sec.subject] = sec;
        }
        nSections++;
      }
    }
    loaded = true;
    return nSections;
  }
  const ensureLoaded = () => { if (!loaded) load(); };

  function npcSectionFor(npc) {
    if (!npc) return null;
    ensureLoaded();
    return (npc._script && npcTriggers[npc._script]) || npcTriggers[npc.name] || null;
  }
  const baseKey = key => (key ? String(key).split("#")[0] : key);
  function locSectionFor(key) { ensureLoaded(); return locTriggers[baseKey(key)] || null; }

  const hasNpc = npc => !!npcSectionFor(npc);
  const hasLoc = key => !!locSectionFor(key);

  // role dispatch — a role trigger matches a specific NPC name first, else "*".
  // roleKey() maps an NPC's flags to its role string for routine resolution.
  function roleKey(npc) {
    if (!npc) return null;
    if (npc.trader) return "trader";
    if (npc.banker) return "banker";
    if (npc.tutor) return "tutor";
    if (npc.wizard) return "wizard";
    if (npc.dreamNpc) return "dream";
    return npc._bjob || npc.mix || null;
  }
  function roleSectionFor(role, npc) {
    ensureLoaded();
    const bucket = roleTriggers[role]; if (!bucket) return null;
    return (npc && bucket[npc.name]) || bucket["*"] || null;
  }
  const hasRole = (role, npc) => !!roleSectionFor(role, npc);

  // routine resolution: explicit npc._routine, then name, then role, then a
  // "villager" default — but only if such a routine script is actually registered.
  function routineFor(npc) {
    ensureLoaded();
    if (!npc) return null;
    // an explicit routine, then a by-name match, then a by-role match always win.
    const explicit = routineTriggers[npc._routine] || routineTriggers[npc.name] || routineTriggers[roleKey(npc)];
    if (explicit) return explicit;
    // the "villager" default only covers ambient townsfolk (mix NPCs) — never the
    // bespoke, self-driven ones (tutors, the Weaver, Dream folk, the Registrar,
    // quest-givers), which keep their own JS behaviour.
    if (npc.mix && !npc.tutor && !npc.wizard && !npc.dreamNpc && !npc.charselect && !npc._questGiver)
      return routineTriggers["villager"] || null;
    return null;
  }
  const hasRoutine = npc => !!routineFor(npc);

  // Run a section, then persist. Errors are logged, never thrown into the game
  // loop (a broken script must not wedge the click handler).
  function runSection(section, ctxInit) {
    const ctx = QS.makeCtx(ctxInit);
    return QS.run(section, ctx)
      .catch(e => {
        if (e === QS.STOP || (e && e.__qsStop)) return;   // stop() — a clean early end
        console.error("QuestScript runtime error in", section.subject, e);
        if (typeof log === "function") log("(A quest script hit a snag.)", "warn");
      })
      .finally(() => { if (typeof saveGame === "function") try { saveGame(); } catch (e) {} });
  }

  function runNpc(npc) {
    const sec = npcSectionFor(npc);
    if (!sec) return null;
    return runSection(sec, { npc, script: sec.subject });
  }
  function runRole(role, npc) {
    const sec = roleSectionFor(role, npc);
    if (!sec) return null;
    return runSection(sec, { npc, script: sec.subject });
  }
  function runLoc(key, x, y) {
    const sec = locSectionFor(key);
    if (!sec) return null;
    return runSection(sec, { loc: QS.makeStruct("Loc", { x: x | 0, y: y | 0, key: baseKey(key) }), script: sec.subject });
  }

  // ---- dialogue / choice modal ---------------------------------------------
  // A lightweight overlay with an optional title + body paragraphs and a row of
  // option buttons. Resolves with the chosen option's `response` value. Esc /
  // clicking away picks the LAST option (conventionally the decline), so a
  // script can never soft-lock waiting. `choose` and `dialog` wrap this.
  function showModal(opts) {
    const options = opts.options || [];
    return new Promise(resolve => {
      if (!options.length) { resolve(0); return; }
      const done = r => { cleanup(); resolve(r); };
      const overlay = document.createElement("div");
      overlay.id = "qschoice";
      Object.assign(overlay.style, {
        position: "fixed", inset: "0", zIndex: "9000", display: "flex",
        alignItems: opts.title || opts.body ? "center" : "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.3)", pointerEvents: "auto",
      });
      const panel = document.createElement("div");
      Object.assign(panel.style, {
        margin: opts.title || opts.body ? "0" : "0 0 14vh", minWidth: "280px", maxWidth: "min(540px,92vw)",
        display: "flex", flexDirection: "column", gap: "8px", padding: "18px 20px",
        background: "rgba(20,24,32,0.96)", border: "1px solid rgba(90,120,180,0.5)",
        borderRadius: "12px", boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        font: "16px OpenDyslexic, Verdana, sans-serif", color: "#dfe6f2", lineHeight: "1.5",
      });
      if (opts.title) {
        const h = document.createElement("div");
        Object.assign(h.style, { color: "#ffd75e", fontWeight: "bold", fontSize: "17px", marginBottom: "4px" });
        h.textContent = opts.title;
        panel.appendChild(h);
      }
      if (opts.body) for (const para of String(opts.body).split("\n")) {
        if (!para.trim()) continue;
        const d = document.createElement("div");
        Object.assign(d.style, { margin: "5px 0", color: "#c7d2e8" });
        d.textContent = para;
        panel.appendChild(d);
      }
      const row = document.createElement("div");
      Object.assign(row.style, { display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" });
      options.forEach((opt, idx) => {
        const b = document.createElement("button");
        b.textContent = `${idx + 1}. ${opt.label}`;
        Object.assign(b.style, {
          textAlign: "left", padding: "10px 14px", cursor: "pointer",
          background: "rgba(255,255,255,0.06)", color: "#fff",
          border: "1px solid rgba(255,255,255,0.18)", borderRadius: "8px", font: "inherit",
        });
        b.onmouseenter = () => (b.style.background = "rgba(127,208,255,0.22)");
        b.onmouseleave = () => (b.style.background = "rgba(255,255,255,0.06)");
        b.onclick = e => { e.stopPropagation(); done(opt.response); };
        row.appendChild(b);
      });
      panel.appendChild(row);
      overlay.appendChild(panel);
      overlay.onclick = () => done(options[options.length - 1].response);
      const onKey = e => {
        if (e.key === "Escape") { e.preventDefault(); done(options[options.length - 1].response); return; }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) { e.preventDefault(); done(options[n - 1].response); }
      };
      function cleanup() { document.removeEventListener("keydown", onKey, true); overlay.remove(); }
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(overlay);
    });
  }
  const choose = options => showModal({ options });
  const dialog = (title, body, options) => showModal({ title, body, options });

  // routineFor is needed by the routine runner (qs-routines.js, loaded next).
  QS.routineFor = routineFor;

  window.QuestScript = {
    load, choose, dialog,
    hasNpc, runNpc, hasLoc, runLoc,
    hasRole, runRole,
    routineFor, hasRoutine,
    // the routine runner (qs-routines.js) registers itself on QS.routines; these
    // delegate so the frame loop can call QuestScript.tickRoutines() safely.
    tickRoutines: () => (QS.routines && QS.routines.tickRoutines && QS.routines.tickRoutines()),
    startRoutine: npc => (QS.routines && QS.routines.startRoutine && QS.routines.startRoutine(npc)),
    _reg: { npc: npcTriggers, loc: locTriggers, role: roleTriggers, routine: routineTriggers },
  };

  // parse at startup (pure — no game state needed). Safe if SCRIPTS_SRC is absent.
  try { load(); } catch (e) { console.error("QuestScript: load() failed", e); }
})();
