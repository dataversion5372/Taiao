// ===== QuestScript — standard library (game bridges) =====
// The command vocabulary scripts can call. Each builtin is
//   async (args, ctx) -> RVal
// where `args` is the ordered [{ name, value }] list the interpreter produced
// (named args keep their name). These bind the language to the REAL engine
// functions found in the codebase — nothing here reimplements game logic:
//   chatnpc -> npcSay (npc-chat.js)      mes -> log (main/state.js)
//   invAdd/invDel -> addItem/removeItem  find_uid -> countItem (main/state.js)
//   quests[...] -> player.scriptVars     loc_del -> pickedDecor (decor-pickup.js)
//
// Also here: the `^constant` table and the table[...] get/set store. Scripted
// quests keep their integer stages in player.scriptVars (a NEW, parallel store
// to the procedural quest engine in gameplay/quests.js — that engine is left
// entirely untouched). Quest points live on player.questPoints.
"use strict";

(function () {
  const QS = (window.__QS = window.__QS || {});
  const { rNull, rBool, rInt, rStr, asStr, asInt } = QS;

  const val = (args, i) => (args[i] ? args[i].value : rNull());

  // stop() throws this sentinel; qs-engine's runner swallows it as a normal end.
  const STOP = { __qsStop: true };

  // longitude a query/verb applies to: the bound NPC's tile, else the player's.
  const ctxLon = ctx => (ctx.npc ? ctx.npc.x : (typeof player !== "undefined" && player ? player.x : 0));
  const ctxLat = ctx => (ctx.npc ? ctx.npc.y : (typeof player !== "undefined" && player ? player.y : 0));
  const localHour = x => (typeof localPhase === "function" ? Math.floor(localPhase(x) * 24) : 0);
  // resolve the bank network for the bound NPC's tile (bankNetFor lives in ui.js)
  const ctxBankNet = ctx => (ctx.npc && typeof bankNetFor === "function" ? bankNetFor(ctx.npc.x, ctx.npc.y) : "main");

  // ---- persistent scripted-quest state -------------------------------------
  function scriptVars() {
    if (typeof player === "undefined" || !player) return {};
    if (!player.scriptVars || typeof player.scriptVars !== "object") player.scriptVars = {};
    return player.scriptVars;
  }

  // table[key] read/write. `quests` is the persisted scripted-quest store;
  // every other table name is a session-local scratch map on the ctx.
  function tableGet(tableName, key, ctx) {
    if (tableName === "quests") return rInt(scriptVars()[key] | 0);
    const m = ctx.tables[tableName] || (ctx.tables[tableName] = {});
    return m[key] || rInt(0);
  }
  function tableSet(tableName, key, value, ctx) {
    if (tableName === "quests") { scriptVars()[key] = asInt(value); return; }
    const m = ctx.tables[tableName] || (ctx.tables[tableName] = {});
    m[key] = value;
  }

  // ---- ^constants ----------------------------------------------------------
  const CONSTS = {
    loc_respawn_none: rStr("none"),
    loc_respawn_default: rStr("default"),
    TRUE: rBool(true),
    FALSE: rBool(false),
  };
  const constVal = name => CONSTS[name] || rStr(name);

  // ---- make sure a script-referenced item exists ---------------------------
  // Scripts may hand out items (rusty_axe) that no other system registered.
  // Register a stackable placeholder so addItem/countItem behave. Real art can
  // replace the icon later (same placeholder pattern as gameplay/quests.js).
  function ensureItem(id) {
    if (typeof ITEMS === "undefined" || ITEMS[id]) return id;
    let icon = "i_planks";
    if (typeof SPR !== "undefined") {
      if (SPR["i_" + id]) icon = "i_" + id;
      else if (SPR[id]) icon = id;
    }
    const nm = id.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
    ITEMS[id] = { name: nm, icon, stack: true, value: 0, questItem: true };
    if (typeof EXAMINE !== "undefined" && !EXAMINE[id]) EXAMINE[id] = `A ${nm.toLowerCase()}.`;
    if (typeof registerPlaceholder === "function") registerPlaceholder(id, nm, "QuestScript item — placeholder icon");
    return id;
  }
  QS.ensureItem = ensureItem;

  // ---- the command table ---------------------------------------------------
  const builtins = {
    // NPC speech bubble (mirrors to the chat log). Falls back to the log when
    // the script isn't bound to an NPC (e.g. an oploc section).
    chatnpc: async (args, ctx) => {
      const text = asStr(val(args, 0));
      if (ctx.npc && typeof npcSay === "function") npcSay(ctx.npc, text);
      else if (typeof log === "function") log(text, "sys");
      return rNull();
    },

    // generic message to the player's log
    mes: async (args) => {
      if (typeof log === "function") log(asStr(val(args, 0)), "sys");
      return rNull();
    },

    // player choice menu. Reads label/response pairs:
    //   p_choice("Yes", response = 0, "No", response = 1)
    // Awaits the click, then sets the `response` script variable.
    p_choice: async (args, ctx) => {
      const options = [];
      for (const a of args) {
        if (a.name === "response") { if (options.length) options[options.length - 1].response = asInt(a.value); }
        else if (a.name == null && a.value.t === QS.T.STR) options.push({ label: a.value.u, response: options.length });
      }
      let chosen = 0;
      if (typeof window !== "undefined" && window.QuestScript && window.QuestScript.choose) {
        chosen = await window.QuestScript.choose(options);
      }
      ctx.vars.response = rInt(chosen);
      return rInt(chosen);
    },

    // inventory
    invAdd: async (args) => {
      const id = ensureItem(asStr(val(args, 0)));
      const qty = args.length > 1 ? asInt(val(args, 1)) : 1;
      const ok = (typeof addItem === "function") ? addItem(id, qty) : false;
      if (!ok && typeof log === "function") log("Your inventory is full.", "warn");
      return rBool(!!ok);
    },
    invDel: async (args) => {
      const id = asStr(val(args, 0));
      const qty = args.length > 1 ? asInt(val(args, 1)) : 1;
      if (typeof removeItem === "function") removeItem(id, qty);
      return rNull();
    },
    // "do I hold this item?" — RuneScape's find_uid, simplified to a presence test
    find_uid: async (args) => rBool(typeof countItem === "function" && countItem(asStr(val(args, 0))) > 0),
    invTotal: async (args) => rInt(typeof countItem === "function" ? countItem(asStr(val(args, 0))) : 0),

    // scripted quest points
    questpoint_add: async (args) => {
      if (typeof player !== "undefined" && player) {
        player.questPoints = (player.questPoints | 0) + asInt(val(args, 0));
        if (typeof log === "function") log(`Quest points: ${player.questPoints}.`, "gold");
      }
      return rNull();
    },

    // remove the world object this oploc section fired on. The ^constant picks
    // the respawn policy: ^loc_respawn_none = gone for good, else the default 300s.
    loc_del: async (args, ctx) => {
      const policy = args.length ? asStr(val(args, 0)) : "default";
      if (ctx.loc && typeof pickedDecor !== "undefined") {
        const key = ctx.loc.x + "," + ctx.loc.y;
        const respawnAt = policy === "none"
          ? (typeof now !== "undefined" ? now : Date.now()) + 3.15e12   // ~100y ~= permanent
          : (typeof now !== "undefined" ? now : Date.now()) + (typeof DECOR_RESPAWN_MS !== "undefined" ? DECOR_RESPAWN_MS : 300000);
        pickedDecor.set(key, respawnAt);
        if (typeof RegionSync !== "undefined") RegionSync.noteDecor(ctx.loc.x, ctx.loc.y, respawnAt);
        if (typeof uiDirty !== "undefined") uiDirty = true;
      }
      return rNull();
    },

    // ---- control ----------------------------------------------------------
    // abort the current run cleanly (RuneScape-style early return). Lets gate
    // scripts read top-to-bottom without else-pyramids.
    stop: async () => { throw STOP; },

    // ---- time-of-day queries (default to the bound NPC / player longitude) --
    // an optional first arg overrides the longitude (tile x).
    time_hour: async (args, ctx) => rInt(localHour(args.length ? asInt(val(args, 0)) : ctxLon(ctx))),
    is_night: async (args, ctx) => rBool(typeof isBedtime === "function" && isBedtime(args.length ? asInt(val(args, 0)) : ctxLon(ctx))),
    is_bedtime: async (args, ctx) => rBool(typeof isBedtime === "function" && isBedtime(args.length ? asInt(val(args, 0)) : ctxLon(ctx))),
    sky: async (args, ctx) => rStr(typeof skyLabel === "function" ? skyLabel(ctxLat(ctx), args.length ? asInt(val(args, 0)) : ctxLon(ctx)) : ""),

    // ---- stink queries ----------------------------------------------------
    stink_total: async () => rInt(typeof stinkTotal === "function" ? stinkTotal() : 0),
    stink_blocks_shops: async () => rBool(typeof stinkBlocksShops === "function" && stinkBlocksShops()),
    stink_blocks_gates: async () => rBool(typeof stinkBlocksGates === "function" && stinkBlocksGates()),

    // ---- shop / bank interaction (bound NPC = the shopkeeper/banker) --------
    shop_closed: async (_a, ctx) => rBool(ctx.npc && !ctx.npc.alwaysOpen && typeof shopClosed === "function" && shopClosed(ctx.npc)),
    open_shop: async (_a, ctx) => {
      if (!ctx.npc) return rNull();
      if (typeof openMarket === "function") openMarket(ctx.npc);
      else if (typeof openShop === "function") openShop(ctx.npc);
      return rNull();
    },
    has_account: async (_a, ctx) => rBool(typeof hasBankAccount === "function" && hasBankAccount(ctxBankNet(ctx))),
    open_bank: async (_a, ctx) => { if (ctx.npc && typeof openBank === "function") openBank(ctx.npc); return rNull(); },
    bank_open_account: async (_a, ctx) => {
      if (ctx.npc && typeof openBankAccountFor === "function") openBankAccountFor(ctxBankNet(ctx), ctx.npc);
      return rNull();
    },

    // ---- NPC-context readers (for routine scripts; the bound NPC) -----------
    here_x: async (_a, ctx) => rInt(ctx.npc ? ctx.npc.x : 0),
    here_y: async (_a, ctx) => rInt(ctx.npc ? ctx.npc.y : 0),
    here_level: async (_a, ctx) => rInt(ctx.npc ? (ctx.npc.level | 0) : 0),
    home_x: async (_a, ctx) => rInt(ctx.npc && ctx.npc._home ? ctx.npc._home[0] : (ctx.npc ? ctx.npc.x : 0)),
    home_y: async (_a, ctx) => rInt(ctx.npc && ctx.npc._home ? ctx.npc._home[1] : (ctx.npc ? ctx.npc.y : 0)),
    home_radius: async (_a, ctx) => rInt(ctx.npc && ctx.npc._r ? ctx.npc._r : 3),
    bed_x: async (_a, ctx) => rInt(ctx.npc && ctx.npc._bed ? ctx.npc._bed[0] : (ctx.npc && ctx.npc._home ? ctx.npc._home[0] : 0)),
    bed_y: async (_a, ctx) => rInt(ctx.npc && ctx.npc._bed ? ctx.npc._bed[1] : (ctx.npc && ctx.npc._home ? ctx.npc._home[1] : 0)),
    bed_level: async (_a, ctx) => rInt(ctx.npc && ctx.npc._bed ? (ctx.npc._bedLevel | 0) : 0),

    // engine RNG (Math.random is available in the browser game runtime)
    rand: async (args) => rInt(Math.floor(Math.random() * Math.max(1, asInt(val(args, 0))))),

    // ---- rich paged dialogue (title + body + option buttons) ---------------
    // dialog("Title", "Body para 1\nBody para 2", "Opt A", response = 0, "Opt B", response = 1)
    // Sets `response` like p_choice. For a multi-page talk, call dialog() again.
    dialog: async (args, ctx) => {
      const title = asStr(val(args, 0)), body = asStr(val(args, 1));
      const options = [];
      for (let i = 2; i < args.length; i++) {
        const a = args[i];
        if (a.name === "response") { if (options.length) options[options.length - 1].response = asInt(a.value); }
        else if (a.name == null && a.value.t === QS.T.STR) options.push({ label: a.value.u, response: options.length });
      }
      let chosen = 0;
      if (typeof window !== "undefined" && window.QuestScript && window.QuestScript.dialog)
        chosen = await window.QuestScript.dialog(title, body, options);
      ctx.vars.response = rInt(chosen);
      return rInt(chosen);
    },

    // ---- travel / fx (for scripted NPCs like the Weaver) -------------------
    teleport: async (args) => {
      const x = asInt(val(args, 0)), y = asInt(val(args, 1));
      if (typeof portalTravel === "function") portalTravel(x, y);
      else if (typeof player !== "undefined" && player) { player.x = x; player.y = y; if (typeof PX === "function") { player.px = PX(x); player.py = PX(y); } }
      return rNull();
    },
    sfx: async (args) => { if (typeof sfx === "function") sfx(asStr(val(args, 0)), 0.5); return rNull(); },

    // ---- Weaver / world-position queries -----------------------------------
    weaver_tower_x: async () => rInt(typeof Wizard !== "undefined" && Wizard.towerPos() ? Wizard.towerPos().x : 0),
    weaver_tower_y: async () => rInt(typeof Wizard !== "undefined" && Wizard.towerPos() ? Wizard.towerPos().y : 0),
    at_tower: async () => {
      const t = typeof Wizard !== "undefined" && Wizard.towerPos();
      return rBool(!!(t && typeof player !== "undefined" && player && Math.abs(player.x - t.x) < 24 && Math.abs(player.y - t.y) < 24));
    },
    spawn_x: async () => rInt(typeof world !== "undefined" && world && world.playerStart ? world.playerStart.x : 0),
    spawn_y: async () => rInt(typeof world !== "undefined" && world && world.playerStart ? world.playerStart.y : 0),
  };

  Object.assign(QS, { builtins, tableGet, tableSet, constVal, scriptVars, STOP });
})();
