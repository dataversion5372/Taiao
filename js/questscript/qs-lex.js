// ===== QuestScript — lexer =====
// Tokenises the R-flavored surface syntax into a flat token list. Newlines are
// emitted as soft statement terminators (like R, where a newline usually ends a
// statement); the parser also accepts ';'. Comments are '#' (R) or '//' (as in
// the reference scripts). '^name' constants become a single CARET token.
//
// Token: { k, v, line }  where k is one of:
//   num str ident kw op caret  ( ) [ ] { } , ;  nl  eof
"use strict";

(function () {
  const QS = (window.__QS = window.__QS || {});

  const KEYWORDS = new Set(["TRUE", "FALSE", "NULL", "if", "else"]);
  // multi-char operators tried longest-first
  const OPS2 = ["==", "!=", "<=", ">=", "&&", "||", "<-"];
  const OPS1 = new Set(["=", "<", ">", "+", "-", "*", "/", "%", "!"]);

  const isIdentStart = c => /[A-Za-z_]/.test(c);
  const isIdentPart = c => /[A-Za-z0-9_.]/.test(c);
  const isDigit = c => c >= "0" && c <= "9";

  function lex(src, scriptName) {
    const toks = [];
    let i = 0, line = 1;
    const n = src.length;
    const err = msg => { throw new Error(`QuestScript lex error [${scriptName || "?"}:${line}]: ${msg}`); };
    const push = (k, v) => toks.push({ k, v, line });

    while (i < n) {
      const c = src[i];

      // newline — soft terminator (collapse runs; the parser skips extras)
      if (c === "\n") { push("nl"); line++; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === " " || c === "\t") { i++; continue; }

      // comments: # ... and // ...  (to end of line)
      if (c === "#" || (c === "/" && src[i + 1] === "/")) {
        while (i < n && src[i] !== "\n") i++;
        continue;
      }
      // block comment /* ... */
      if (c === "/" && src[i + 1] === "*") {
        i += 2;
        while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; }
        i += 2;
        continue;
      }

      // string literal
      if (c === '"' || c === "'") {
        const q = c; i++;
        let s = "";
        while (i < n && src[i] !== q) {
          if (src[i] === "\\") {
            const e = src[i + 1];
            s += e === "n" ? "\n" : e === "t" ? "\t" : e === "r" ? "\r" : e;
            i += 2; continue;
          }
          if (src[i] === "\n") line++;
          s += src[i++];
        }
        if (i >= n) err("unterminated string");
        i++; // closing quote
        push("str", s);
        continue;
      }

      // number
      if (isDigit(c) || (c === "." && isDigit(src[i + 1]))) {
        let j = i;
        while (j < n && isDigit(src[j])) j++;
        if (src[j] === ".") { j++; while (j < n && isDigit(src[j])) j++; }
        if (src[j] === "e" || src[j] === "E") { j++; if (src[j] === "+" || src[j] === "-") j++; while (j < n && isDigit(src[j])) j++; }
        push("num", parseFloat(src.slice(i, j)));
        i = j; continue;
      }

      // ^constant
      if (c === "^") {
        i++;
        let j = i;
        while (j < n && isIdentPart(src[j])) j++;
        if (j === i) err("expected a name after '^'");
        push("caret", src.slice(i, j));
        i = j; continue;
      }

      // identifier / keyword
      if (isIdentStart(c)) {
        let j = i;
        while (j < n && isIdentPart(src[j])) j++;
        const word = src.slice(i, j);
        push(KEYWORDS.has(word) ? "kw" : "ident", word);
        i = j; continue;
      }

      // brackets & punctuation
      if (c === "(") { push("("); i++; continue; }
      if (c === ")") { push(")"); i++; continue; }
      if (c === "[") { push("["); i++; continue; }
      if (c === "]") { push("]"); i++; continue; }
      if (c === "{") { push("{"); i++; continue; }
      if (c === "}") { push("}"); i++; continue; }
      if (c === ",") { push(","); i++; continue; }
      if (c === ";") { push(";"); i++; continue; }

      // operators (multi-char first)
      const two = src.substr(i, 2);
      if (OPS2.includes(two)) { push("op", two); i += 2; continue; }
      if (OPS1.has(c)) { push("op", c); i++; continue; }

      err(`unexpected character '${c}'`);
    }
    push("eof");
    return toks;
  }

  QS.lex = lex;
})();
