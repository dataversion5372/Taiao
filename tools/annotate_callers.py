#!/usr/bin/env python3
"""
Annotate every top-level `const`/`function` declaration in a folder of JS
files with a comment listing every other file:line that references it.

Usage:
    python3 tools/annotate_callers.py [DIR] [--check] [--haystack-limit BYTES]

    DIR                Folder of .js files to annotate, scanned recursively
                        (default: js/, next to this script's parent).
    --check             Dry run: report what would change, write nothing.
    --haystack-limit    Files larger than this are still scanned for their own
                         top-level declarations, but excluded from the search
                         haystack (they're assumed to be generated data blobs,
                         e.g. base64 asset dumps, not code). Default: 200000.

Re-running is safe/idempotent: existing "// Callers (...)" blocks directly
above a declaration are stripped and regenerated, not duplicated. Only
genuinely top-level (unindented) `function name(...)`, `async function
name(...)`, and `const name = ...` declarations are touched — declarations
nested inside another function (e.g. the createXxx(ctx) factory pattern used
by some files in this project) are left alone, since they aren't global.

Caller detection is a word-boundary regex search, not a real JS parser: it
can't tell a genuine reference from an unrelated local variable/parameter
that happens to share the same name. Spot-check unusually short/common names.
"""
import re
import sys
import glob
import argparse
import os

DECL_RE = re.compile(
    r'^(?:async\s+function|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\('
    r'|^const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*='
)
# a caller-comment block we previously generated, sitting directly above a decl
CALLERS_BLOCK_RE = re.compile(r'^// Callers \(\d+\):$')
CALLERS_CONT_RE = re.compile(r'^//  ')


def strip_existing_block(lines, decl_idx):
    """Remove a pre-existing Callers(...) comment block ending right above
    lines[decl_idx], if present. Returns the new lines list and how many
    lines were removed."""
    end = decl_idx  # exclusive
    start = end
    i = end - 1
    # walk upward over continuation lines, then the header line
    while i >= 0 and CALLERS_CONT_RE.match(lines[i]) and not CALLERS_BLOCK_RE.match(lines[i]):
        i -= 1
    if i >= 0 and CALLERS_BLOCK_RE.match(lines[i]):
        start = i
        removed = lines[start:end]
        del lines[start:end]
        return lines, len(removed)
    return lines, 0


def format_comment(callers):
    if not callers:
        return ["// Callers (0):", "//  none found"]
    by_file = {}
    for f, l in callers:
        by_file.setdefault(f, []).append(l)
    parts = [f"{f}:{','.join(str(x) for x in by_file[f])}" for f in sorted(by_file)]
    total = sum(len(v) for v in by_file.values())
    out = [f"// Callers ({total}):"]
    cur = "//  "
    for p in parts:
        addition = (" " if cur != "//  " else "") + p
        if len(cur) + len(addition) > 100:
            out.append(cur)
            cur = "//  " + p
        else:
            cur += addition
    out.append(cur)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dir", nargs="?", default=None, help="folder of .js files (default: js/ next to tools/)")
    ap.add_argument("--check", action="store_true", help="dry run, write nothing")
    ap.add_argument("--haystack-limit", type=int, default=200_000,
                     help="exclude files bigger than this (bytes) from the search haystack (default: 200000)")
    args = ap.parse_args()

    js_dir = args.dir or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "js")
    if not os.path.isdir(js_dir):
        sys.exit(f"Not a directory: {js_dir}")
    os.chdir(js_dir)

    all_files = sorted(glob.glob("**/*.js", recursive=True))
    haystack_files = [f for f in all_files if os.path.getsize(f) <= args.haystack_limit]
    skipped = [f for f in all_files if f not in haystack_files]
    if skipped:
        print(f"Excluding from haystack (>{args.haystack_limit} bytes): {', '.join(skipped)}")

    file_lines = {}
    for f in all_files:
        with open(f, encoding="utf-8") as fh:
            file_lines[f] = fh.read().split("\n")

    # 1) strip any stale Callers block sitting above each top-level decl
    for f in all_files:
        lines = file_lines[f]
        i = 0
        while i < len(lines):
            if DECL_RE.match(lines[i]):
                lines, removed = strip_existing_block(lines, i)
                i -= removed  # lines above i shrank; decl is now at i - removed
            i += 1
        file_lines[f] = lines

    # 2) now that stale blocks are gone, find every top-level decl for real
    decls = []
    for f in all_files:
        lines = file_lines[f]
        for i, line in enumerate(lines):
            m = DECL_RE.match(line)
            if m:
                name = m.group(1) or m.group(2)
                decls.append({"file": f, "line": i + 1, "name": name})

    print(f"Found {len(decls)} top-level declarations across {len(all_files)} files.")

    # 3) search haystack for every unique name
    names = sorted({d["name"] for d in decls})
    patterns = {n: re.compile(r'\b' + re.escape(n) + r'\b') for n in names}
    name_occurrences = {n: [] for n in names}
    haystack_lines = {f: file_lines[f] for f in haystack_files}
    for name, pat in patterns.items():
        occ = name_occurrences[name]
        for f, lines in haystack_lines.items():
            for i, line in enumerate(lines):
                if pat.search(line):
                    occ.append((f, i + 1))

    # 4) insert comments, bottom-to-top per file
    decls_by_file = {}
    for d in decls:
        decls_by_file.setdefault(d["file"], []).append(d)

    changed_files = 0
    for f, dlist in decls_by_file.items():
        lines = file_lines[f]
        for d in sorted(dlist, key=lambda d: d["line"], reverse=True):
            occ = name_occurrences[d["name"]]
            callers = [(cf, cl) for (cf, cl) in occ if not (cf == f and cl == d["line"])]
            comment_lines = format_comment(callers)
            idx = d["line"] - 1
            lines[idx:idx] = comment_lines
        file_lines[f] = lines
        changed_files += 1

    if args.check:
        print(f"[--check] Would update {changed_files} files. No files written.")
        return

    for f in all_files:
        with open(f, "w", encoding="utf-8") as fh:
            fh.write("\n".join(file_lines[f]))
    print(f"Updated {changed_files} files.")


if __name__ == "__main__":
    main()
