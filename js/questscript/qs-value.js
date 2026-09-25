// ===== QuestScript — runtime value model (C-style tagged unions + structs) =====
// The whole VM is underpinned by a single value type, RVal: a tagged union in
// the C sense — a `t` discriminant enum plus ONE payload slot `u`. Only the
// field selected by `t` is meaningful (a C `union` overlaps its members; here
// the single `u` slot IS that overlap). Aggregates that cross the engine
// boundary (a dialogue Choice, a world Loc) are declared as fixed-field structs
// via defStruct — again C-style: a named record with typed slots.
//
// This file defines no game behaviour; it is pure data + helpers, shared with
// the rest of the QuestScript layer through the window.__QS namespace object.
"use strict";

(function () {
  const QS = (window.__QS = window.__QS || {});

  // ---- the union discriminant ----------------------------------------------
  const T = { INT: 0, NUM: 1, STR: 2, BOOL: 3, NULL: 4, NPC: 5, LOC: 6 };
  const TYPE_NAME = ["int", "num", "str", "bool", "null", "npc", "loc"];

  // ---- RVal constructors ---------------------------------------------------
  // Every value is { t: <tag>, u: <the one live union member> }.
  const rInt = i => ({ t: T.INT, u: i | 0 });
  const rNum = n => ({ t: T.NUM, u: +n });
  const rStr = s => ({ t: T.STR, u: String(s) });
  const rBool = b => ({ t: T.BOOL, u: !!b });
  const rNull = () => ({ t: T.NULL, u: null });
  const rNpc = npc => ({ t: T.NPC, u: npc });     // opaque game NPC object
  const rLoc = loc => ({ t: T.LOC, u: loc });     // a Loc struct { x, y, key }
  // A number literal becomes INT when whole, NUM when fractional.
  const rNumLit = n => (Number.isInteger(n) ? rInt(n) : rNum(n));

  // ---- coercions -----------------------------------------------------------
  function truthy(v) {
    switch (v.t) {
      case T.BOOL: return v.u;
      case T.INT:
      case T.NUM: return v.u !== 0;
      case T.STR: return v.u.length > 0;
      case T.NULL: return false;
      default: return v.u != null;
    }
  }
  function asStr(v) {
    switch (v.t) {
      case T.STR: return v.u;
      case T.INT:
      case T.NUM: return String(v.u);
      case T.BOOL: return v.u ? "TRUE" : "FALSE";
      case T.NULL: return "";
      default: return String(v.u);
    }
  }
  function asNum(v) {
    if (v.t === T.INT || v.t === T.NUM) return v.u;
    if (v.t === T.BOOL) return v.u ? 1 : 0;
    if (v.t === T.STR) { const n = parseFloat(v.u); return isNaN(n) ? 0 : n; }
    return 0;
  }
  const asInt = v => asNum(v) | 0;
  const isNumeric = v => v.t === T.INT || v.t === T.NUM || v.t === T.BOOL;

  // ---- operators over RVals ------------------------------------------------
  function eq(a, b) {
    if (a.t === T.NULL || b.t === T.NULL) return a.t === b.t;
    if (isNumeric(a) && isNumeric(b)) return asNum(a) === asNum(b);
    return asStr(a) === asStr(b);
  }
  function cmp(a, b) {           // -1 / 0 / 1, numeric where possible
    if (isNumeric(a) && isNumeric(b)) { const x = asNum(a), y = asNum(b); return x < y ? -1 : x > y ? 1 : 0; }
    const x = asStr(a), y = asStr(b); return x < y ? -1 : x > y ? 1 : 0;
  }
  function arith(op, a, b) {
    if (op === "+" && (a.t === T.STR || b.t === T.STR)) return rStr(asStr(a) + asStr(b));
    const x = asNum(a), y = asNum(b);
    let r = 0;
    switch (op) {
      case "+": r = x + y; break;
      case "-": r = x - y; break;
      case "*": r = x * y; break;
      case "/": r = y === 0 ? 0 : x / y; break;
      case "%": r = y === 0 ? 0 : x % y; break;
    }
    // stay INT when both operands were integral and the result is whole
    return (Number.isInteger(r) && a.t !== T.NUM && b.t !== T.NUM) ? rInt(r) : rNum(r);
  }

  // ---- struct registry (C-style records) -----------------------------------
  const structs = {};
  const defaultFor = ty => (ty === "str" ? "" : ty === "bool" ? false : ty === "num" ? 0 : 0);
  function defStruct(name, fields) { structs[name] = { name, fields }; return structs[name]; }
  function makeStruct(name, init) {
    const def = structs[name];
    if (!def) throw new Error("QuestScript: unknown struct " + name);
    const rec = { __struct: name };
    for (const f of def.fields) rec[f.name] = (init && f.name in init) ? init[f.name] : defaultFor(f.type);
    return rec;
  }

  // engine-boundary structs used by the standard library / dialogue UI
  defStruct("Choice", [{ name: "label", type: "str" }, { name: "response", type: "int" }]);
  defStruct("Loc", [{ name: "x", type: "int" }, { name: "y", type: "int" }, { name: "key", type: "str" }]);

  Object.assign(QS, {
    T, TYPE_NAME,
    rInt, rNum, rStr, rBool, rNull, rNpc, rLoc, rNumLit,
    truthy, asStr, asNum, asInt, isNumeric,
    eq, cmp, arith,
    defStruct, makeStruct,
  });
})();
