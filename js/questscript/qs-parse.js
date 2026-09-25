// ===== QuestScript — parser =====
// Turns a token list into a list of TRIGGER SECTIONS. A .qs file is a sequence
// of sections; each begins with a trigger header call — opnpc1("bob") /
// oploc1("rusty_axe") — and the statements that follow (up to the next header)
// are that section's body.
//
// AST nodes are themselves a discriminated union of fixed-shape structs, tagged
// by `k`:
//   num{v} str{v} bool{v} null{} const{name} var{name}
//   index{name,key}  call{name,args:[{name?,value}]}
//   unary{op,e}  bin{op,a,b}  assign{target,value}  if{cond,then,else?}  block{body}
//
// Grammar highlights (surface-only R):
//   - assignment with '=' or '<-'
//   - if (cond) stmt [else stmt]
//   - table[key] where a bare symbol key is taken literally as a string
//   - named call args  name = value  (used by p_choice's label/response pairs)
"use strict";

(function () {
  const QS = (window.__QS = window.__QS || {});

  // trigger header names -> the loader routes each to a registry bucket.
  //   npc   : talk to a specifically-named NPC          opnpc1("bob")
  //   loc   : use a world object by key                 oploc1("rusty_axe")
  //   role  : talk to any NPC of a role (subject "*" or a name); the role is the
  //           header minus "op"  (optrader -> trader, opbanker -> banker, ...)
  //   routine: a persistent per-NPC daily coroutine      routine("baker")
  const TRIGGERS = {
    opnpc1: "npc", oploc1: "loc",
    optrader: "role", opbanker: "role", optutor: "role", opwizard: "role", opdream: "role",
    routine: "routine",
  };
  QS.TRIGGERS = TRIGGERS;

  // operator precedence (higher binds tighter)
  const PREC = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };

  function parse(src, scriptName) {
    const toks = QS.lex(src, scriptName);
    let p = 0;
    const name = scriptName || "?";
    const peek = (o = 0) => toks[p + o];
    const at = (k, v) => peek().k === k && (v === undefined || peek().v === v);
    const err = msg => { throw new Error(`QuestScript parse error [${name}:${peek().line}]: ${msg}`); };
    const next = () => toks[p++];
    const expect = (k, v) => { if (!at(k, v)) err(`expected ${v || k}, got ${peek().v || peek().k}`); return next(); };

    // newlines/';' are statement separators — swallow runs of them
    const skipTerm = () => { while (at("nl") || at(";")) p++; };
    const skipNl = () => { while (at("nl")) p++; };   // inside expressions/blocks

    // ---- expressions -------------------------------------------------------
    function parsePrimary() {
      skipNl();
      const t = peek();
      if (t.k === "num") { next(); return { k: "num", v: t.v }; }
      if (t.k === "str") { next(); return { k: "str", v: t.v }; }
      if (t.k === "caret") { next(); return { k: "const", name: t.v }; }
      if (t.k === "kw") {
        if (t.v === "TRUE") { next(); return { k: "bool", v: true }; }
        if (t.v === "FALSE") { next(); return { k: "bool", v: false }; }
        if (t.v === "NULL") { next(); return { k: "null" }; }
        err(`unexpected keyword '${t.v}'`);
      }
      if (t.k === "op" && (t.v === "!" || t.v === "-")) { next(); return { k: "unary", op: t.v, e: parseUnaryTarget() }; }
      if (t.k === "(") { next(); const e = parseExpr(); skipNl(); expect(")"); return e; }
      if (t.k === "ident") {
        next();
        // call?
        if (at("(")) return parseCallTail(t.v);
        // index?  table[key]
        if (at("[")) {
          next();
          const key = parseIndexKey();
          skipNl(); expect("]");
          return { k: "index", name: t.v, key };
        }
        return { k: "var", name: t.v };
      }
      err(`unexpected token '${t.v || t.k}'`);
    }

    // a bare symbol used as an index key is a literal string ( quests[bobs_axe_quest] )
    function parseIndexKey() {
      skipNl();
      const t = peek();
      if (t.k === "ident") { next(); return { k: "str", v: t.v }; }
      return parseExpr();
    }

    function parseUnaryTarget() { return parsePrimary(); }

    function parseCallTail(fname) {
      expect("(");
      const args = [];
      skipNl();
      if (!at(")")) {
        do {
          skipNl();
          // named arg?  IDENT '=' (a single '=', not '==')
          if (at("ident") && peek(1).k === "op" && peek(1).v === "=") {
            const argName = next().v; next(); // consume '='
            args.push({ name: argName, value: parseExpr() });
          } else {
            args.push({ name: null, value: parseExpr() });
          }
          skipNl();
        } while (at(",") && next());
        skipNl();
      }
      expect(")");
      return { k: "call", name: fname, args };
    }

    function parseBinary(minPrec) {
      let left = parsePrimary();
      for (;;) {
        const t = peek();
        if (t.k !== "op" || !(t.v in PREC) || PREC[t.v] < minPrec) break;
        const op = next().v;
        const right = parseBinary(PREC[op] + 1);
        left = { k: "bin", op, a: left, b: right };
      }
      return left;
    }

    const parseExpr = () => parseBinary(1);

    // ---- statements --------------------------------------------------------
    function parseBlock() {
      expect("{");
      const body = [];
      skipTerm();
      while (!at("}")) {
        if (at("eof")) err("unterminated block");
        body.push(parseStatement());
        skipTerm();
      }
      expect("}");
      return { k: "block", body };
    }

    function parseIf() {
      next(); // 'if'
      skipNl(); expect("("); const cond = parseExpr(); skipNl(); expect(")");
      skipNl();
      const then = parseStatement();
      // optional else — allow it to sit on the next line
      let els = null;
      const save = p; skipTerm();
      if (at("kw", "else")) { next(); skipNl(); els = parseStatement(); }
      else p = save;
      return { k: "if", cond, then, else: els };
    }

    function parseStatement() {
      skipTerm();
      if (at("{")) return parseBlock();
      if (at("kw", "if")) return parseIf();

      // an assignable lhs?  ident  or  ident[key]
      if (at("ident")) {
        const nameTok = peek();
        if (peek(1).k === "[") {
          // could be index-assign or index-expr; parse the index then look for '='
          const save = p;
          next(); next(); // ident '['
          const key = parseIndexKey(); skipNl(); expect("]");
          if (at("op", "=") || at("op", "<-")) {
            next();
            return { k: "assign", target: { k: "index", name: nameTok.v, key }, value: parseExpr() };
          }
          // not an assignment — rewind and treat as an expression statement
          p = save;
        } else if (peek(1).k === "op" && (peek(1).v === "=" || peek(1).v === "<-")) {
          next(); next(); // ident '='
          return { k: "assign", target: { k: "var", name: nameTok.v }, value: parseExpr() };
        }
      }
      // otherwise an expression statement (typically a command call)
      return parseExpr();
    }

    // ---- program: split into trigger sections ------------------------------
    const sections = [];
    let cur = null;
    skipTerm();
    while (!at("eof")) {
      const stmt = parseStatement();
      if (stmt.k === "call" && stmt.name in TRIGGERS) {
        const subjArg = stmt.args.find(a => a.value && a.value.k === "str");
        if (!subjArg) err(`trigger ${stmt.name}() needs a string subject`);
        cur = { trigger: stmt.name, kind: TRIGGERS[stmt.name], subject: subjArg.value.v, body: [] };
        sections.push(cur);
      } else {
        if (!cur) err("statement before any trigger header");
        cur.body.push(stmt);
      }
      skipTerm();
    }
    return sections;
  }

  QS.parse = parse;
})();
