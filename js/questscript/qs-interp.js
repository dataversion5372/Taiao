// ===== QuestScript — interpreter =====
// An ASYNC recursive tree-walker. Async is load-bearing: dialogue commands like
// p_choice suspend the script until the player clicks a choice, so evaluation
// must be able to `await` in the middle of a statement and resume where it left
// off. The whole call chain (run -> execStmt -> evalExpr -> callBuiltin) is
// therefore async.
//
// A run carries a `ctx` (the execution context struct):
//   { npc, loc, vars, tables, script }
//   - npc    : the NPC the player is talking to (opnpc sections), else null
//   - loc    : the { x, y, key } Loc the player acted on (oploc sections), else null
//   - vars   : script-local variable scope (holds `response`, etc.), name -> RVal
//   - tables : session-local fallback for table[...] stores other than `quests`
//   - script : the script name (for error messages)
"use strict";

(function () {
  const QS = (window.__QS = window.__QS || {});

  function makeCtx(o) {
    return { npc: o.npc || null, loc: o.loc || null, vars: o.vars || {}, tables: o.tables || {}, script: o.script || "?" };
  }

  async function run(section, ctx) {
    for (const stmt of section.body) await execStmt(stmt, ctx);
  }

  async function execStmt(node, ctx) {
    switch (node.k) {
      case "block":
        for (const s of node.body) await execStmt(s, ctx);
        return;
      case "if":
        if (QS.truthy(await evalExpr(node.cond, ctx))) await execStmt(node.then, ctx);
        else if (node.else) await execStmt(node.else, ctx);
        return;
      case "assign":
        await doAssign(node, ctx);
        return;
      default:
        // expression statement (usually a command call)
        await evalExpr(node, ctx);
        return;
    }
  }

  async function doAssign(node, ctx) {
    const val = await evalExpr(node.value, ctx);
    const tgt = node.target;
    if (tgt.k === "var") { ctx.vars[tgt.name] = val; return; }
    // index assignment: table[key] = value
    const key = QS.asStr(await evalExpr(tgt.key, ctx));
    QS.tableSet(tgt.name, key, val, ctx);
  }

  async function evalExpr(node, ctx) {
    switch (node.k) {
      case "num": return QS.rNumLit(node.v);
      case "str": return QS.rStr(node.v);
      case "bool": return QS.rBool(node.v);
      case "null": return QS.rNull();
      case "const": return QS.constVal(node.name);
      case "var": {
        // R-style non-standard evaluation: an identifier that names no defined
        // variable evaluates to a string of its own name — this is what lets
        // invAdd(coins, 500) / invDel(rusty_axe, 1) use unquoted item ids.
        if (Object.prototype.hasOwnProperty.call(ctx.vars, node.name)) return ctx.vars[node.name];
        return QS.rStr(node.name);
      }
      case "index": {
        const key = QS.asStr(await evalExpr(node.key, ctx));
        return QS.tableGet(node.name, key, ctx);
      }
      case "unary": {
        const v = await evalExpr(node.e, ctx);
        return node.op === "!" ? QS.rBool(!QS.truthy(v)) : QS.rNumLit(-QS.asNum(v));
      }
      case "bin": return await evalBin(node, ctx);
      case "call": return await evalCall(node, ctx);
    }
    throw new Error(`QuestScript: cannot evaluate node '${node.k}'`);
  }

  async function evalBin(node, ctx) {
    const op = node.op;
    // short-circuit logicals
    if (op === "&&") { return QS.truthy(await evalExpr(node.a, ctx)) ? QS.rBool(QS.truthy(await evalExpr(node.b, ctx))) : QS.rBool(false); }
    if (op === "||") { return QS.truthy(await evalExpr(node.a, ctx)) ? QS.rBool(true) : QS.rBool(QS.truthy(await evalExpr(node.b, ctx))); }
    const a = await evalExpr(node.a, ctx), b = await evalExpr(node.b, ctx);
    switch (op) {
      case "==": return QS.rBool(QS.eq(a, b));
      case "!=": return QS.rBool(!QS.eq(a, b));
      case "<": return QS.rBool(QS.cmp(a, b) < 0);
      case "<=": return QS.rBool(QS.cmp(a, b) <= 0);
      case ">": return QS.rBool(QS.cmp(a, b) > 0);
      case ">=": return QS.rBool(QS.cmp(a, b) >= 0);
      default: return QS.arith(op, a, b);   // + - * / %
    }
  }

  async function evalCall(node, ctx) {
    const fn = QS.builtins[node.name];
    if (!fn) throw new Error(`QuestScript [${ctx.script}]: unknown command '${node.name}'`);
    // evaluate args into an ordered list of { name, value } (named args keep
    // their name so builtins like p_choice can read label/response pairs)
    const args = [];
    for (const a of node.args) args.push({ name: a.name, value: await evalExpr(a.value, ctx) });
    const r = await fn(args, ctx);
    return r || QS.rNull();
  }

  Object.assign(QS, { makeCtx, run, execStmt, evalExpr });
})();
