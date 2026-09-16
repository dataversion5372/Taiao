#!/usr/bin/env python3
"""Excise flagged stray sounds (voices, sirens, traffic) from the bird loops.

Input: the soundflags.json exported from the game's "?" tab (each entry:
{file, t, rate, at, desc} — `t` is the clip offset in seconds at the moment
the player pressed N). For every flagged clip this tool:

  1. merges cut windows [t-2.5, t+1.5] around each flag (people press N a
     beat AFTER hearing the sound, so the window reaches further back),
  2. splices the surviving segments together with short cross-fades,
  3. rebuilds the seamless tail->head loop and re-normalizes to -21 LUFS,
  4. writes the cleaned loop back over assets/birdsong/<file>.ogg.

If less than 10 s of clip survives, the recording is beyond saving: its XC
id (looked up in CREDITS.txt) is appended to assets/birdsong/SKIP.txt —
which tools/fetch_birdsong.py honours — and you re-run the fetch for that
species to draw a different recording.

  python3 tools/clean_birdsong.py ~/Downloads/soundflags.json
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "assets" / "birdsong"
PRE, POST = 2.5, 1.5   # cut window around each flag (reaction latency skews early)
XFADE = 0.4            # splice cross-fade between kept segments
MIN_KEEP = 10.0        # below this the clip is retired instead


def probe_dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def measure_i(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path),
                        "-af", "loudnorm=I=-21:TP=-3:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    return float(json.loads(m.group(0))["input_i"]) if m else -21.0


def keep_segments(dur, cuts):
    """Sorted, merged cut windows -> the list of [a,b] keep spans."""
    cuts = sorted((max(0, a), min(dur, b)) for a, b in cuts if b > 0 and a < dur)
    merged = []
    for a, b in cuts:
        if merged and a <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], b)
        else: merged.append([a, b])
    keeps, pos = [], 0.0
    for a, b in merged:
        if a - pos > 0.8: keeps.append([pos, a])
        pos = b
    if dur - pos > 0.8: keeps.append([pos, dur])
    return keeps


def splice(src, keeps, dest):
    """atrim each keep span, chain acrossfades, rebuild the loop, renorm."""
    parts, chain = [], []
    for i, (a, b) in enumerate(keeps):
        parts.append(f"[0]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[s{i}]")
    cur = "s0"
    for i in range(1, len(keeps)):
        nxt = f"x{i}"
        chain.append(f"[{cur}][s{i}]acrossfade=d={XFADE}[{nxt}]")
        cur = nxt
    fc = ";".join(parts + chain) or f"[0]anull[{cur}]"
    tmp = dest.with_suffix(".spliced.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                    "-filter_complex", fc, "-map", f"[{cur}]",
                    "-ar", "48000", "-c:a", "pcm_f32le", str(tmp)], check=True)
    try:
        d = probe_dur(tmp)
        xf = 1.5 if d >= 14 else max(0.6, min(1.0, d / 5))
        gain = max(-20.0, min(20.0, -21.0 - measure_i(tmp)))
        fc2 = (f"[0]volume={gain:.2f}dB,alimiter=limit=0.891:level=false,asplit=3[a][b][c];"
               f"[a]atrim={xf}:{d - xf},asetpts=PTS-STARTPTS[main];"
               f"[b]atrim={d - xf}:{d},asetpts=PTS-STARTPTS[tl];"
               f"[c]atrim=0:{xf},asetpts=PTS-STARTPTS[hd];"
               f"[tl][hd]acrossfade=d={xf}[x];[main][x]concat=n=2:v=0:a=1[out]")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp),
                        "-filter_complex", fc2, "-map", "[out]",
                        "-c:a", "libopus", "-b:a", "64k", str(dest)], check=True)
    finally:
        tmp.unlink(missing_ok=True)


def retire(clip):
    """Look up the clip's XC id in CREDITS.txt and add it to SKIP.txt."""
    creds = (DIR / "CREDITS.txt")
    m = None
    if creds.exists():
        m = re.search(rf"^{re.escape(clip)}: .*?XC(\d+)", creds.read_text(), re.M)
    if not m:
        print(f"  {clip}: (no XC id found in CREDITS.txt — retire manually)")
        return
    skip = DIR / "SKIP.txt"
    ids = set(skip.read_text().split()) if skip.exists() else set()
    ids.add(m.group(1))
    skip.write_text("\n".join(sorted(ids)) + "\n")
    key = clip.split("_")[0]
    print(f"  {clip}: RETIRED (XC{m.group(1)} -> SKIP.txt). Re-run: python3 tools/fetch_birdsong.py {key}")


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    flags = json.loads(Path(sys.argv[1]).read_text())
    by_clip = {}
    for f in flags:
        by_clip.setdefault(f["file"], []).append(f)
    for clip, fl in sorted(by_clip.items()):
        src = DIR / f"{clip}.ogg"
        if not src.exists():
            print(f"{clip}: file missing, skipped"); continue
        dur = probe_dur(src)
        descs = ", ".join(sorted({f.get("desc") or "?" for f in fl}))
        cuts = [(f["t"] - PRE, f["t"] + POST) for f in fl]
        keeps = keep_segments(dur, cuts)
        kept = sum(b - a for a, b in keeps)
        print(f"{clip}: {len(fl)} flag(s) [{descs}] — {dur:.1f}s -> {kept:.1f}s kept")
        if kept < MIN_KEEP:
            retire(clip)
            continue
        splice(src, keeps, src)
        print(f"  {clip}: cleaned, new loop {probe_dur(src):.1f}s")


if __name__ == "__main__":
    main()
