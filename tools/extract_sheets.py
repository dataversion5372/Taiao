#!/usr/bin/env python3
"""Externalize embedded base64 PNG sheets from js/sprites/*.js into
assets/sheets/<hash>.webp, rewriting each JS literal to the external URL.

Pixel art -> LOSSLESS WebP (exact pixels, smaller than PNG). Every base64
string in these files is consumed via Image().src, so swapping the string
value for a URL is transparent. Structure of each file is preserved.

Idempotent: URLs already pointing at assets/sheets/ are skipped.
"""
import base64, hashlib, io, re, sys, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPRITES = ROOT / "js" / "sprites"
OUT = ROOT / "assets" / "sheets"
OUT.mkdir(parents=True, exist_ok=True)

DATA_URI = re.compile(r"data:image/png;base64,([A-Za-z0-9+/=]+)")

total_before = total_after = 0
sheets = {}          # hash -> webp bytes size
files_changed = 0
manifest = {}        # webp filename -> (px_w, px_h)

for js in sorted(SPRITES.glob("*.js")):
    text = js.read_text()
    if "data:image/png;base64," not in text:
        continue
    orig_len = len(text)

    def repl(m):
        b64 = m.group(1)
        raw = base64.b64decode(b64)
        h = hashlib.sha1(raw).hexdigest()[:16]
        fn = f"{h}.webp"
        path = OUT / fn
        if not path.exists():
            im = Image.open(io.BytesIO(raw))
            if im.mode not in ("RGBA", "RGB", "P", "LA", "L"):
                im = im.convert("RGBA")
            # preserve exact pixels for pixel art
            im.save(path, "WEBP", lossless=True, quality=100, method=6)
            manifest[fn] = im.size
        sheets[h] = path.stat().st_size
        return f"assets/sheets/{fn}"

    new_text = DATA_URI.sub(repl, text)
    if new_text != text:
        js.write_text(new_text)
        files_changed += 1
        total_before += orig_len
        total_after += len(new_text)
        print(f"  {js.name}: {orig_len//1024}K -> {len(new_text)//1024}K")

webp_bytes = sum(sheets.values())
print(f"\nFiles rewritten: {files_changed}")
print(f"JS shrank:  {total_before//1024//1024} MB -> {total_after//1024} KB")
print(f"WebP sheets: {len(sheets)} files, {webp_bytes//1024//1024} MB total in assets/sheets/")
