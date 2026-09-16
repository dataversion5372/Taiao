#!/usr/bin/env python3
"""Fetch one CC-licensed xeno-canto recording per living NZ bird species and
prepare a short in-game clip for each.

Source: the official xeno-canto GBIF dataset (open API — the xeno-canto v3
API itself needs an account key). Each pick records full attribution
(recordist, XC number, license) in assets/birdsong/CREDITS.txt. ND-licensed
recordings are skipped because clips are trimmed; NC licenses are fine for
this personal, non-commercial project.

Selection: prefers 'song' (falls back to 'call'/anything), prefers 6-25 s
recordings (the whole clip is the bird, no trimming guesswork), else trims
the start of a longer one. Output: assets/birdsong/<key>.mp3 —
leading silence stripped, ~12 s max, mono, loudness-normalized, faded out.

  python3 tools/fetch_birdsong.py            # fetch all missing
  python3 tools/fetch_birdsong.py tui ruru   # (re)fetch specific keys
"""
import json, re, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "birdsong"
XC_DATASET = "b1047888-ae52-4179-9dd5-5448ea342a24"  # Xeno-canto bird sounds on GBIF
UA = {"User-Agent": "Mozilla/5.0 TaiaoDev/1.0 (personal game; birdsong via GBIF/xeno-canto CC)"}

# game key -> scientific name (living species only; the extinct/mythical birds
# — koreke, huia, pouākai, Tarepo, the moa — have no recordings and stay silent)
SPECIES = {
    "kiwi":         "Apteryx mantelli",
    "titipounamu":  "Acanthisitta chloris",
    "piwakawaka":   "Rhipidura fuliginosa",
    "tieke":        "Philesturnus rufusater",
    "kotata":       "Poodytes punctatus",
    "tui":          "Prosthemadera novaeseelandiae",
    "kaka":         "Nestor meridionalis",
    "kea":          "Nestor notabilis",
    "ruru":         "Ninox novaeseelandiae",
    "weka":         "Gallirallus australis",
    "pukeko":       "Porphyrio melanotus",
    "putangitangi": "Tadorna variegata",
    "whio":         "Hymenolaimus malacorhynchos",
    "kereru":       "Hemiphaga novaeseelandiae",
    "kakapo":       "Strigops habroptila",
    "takapu":       "Morus serrator",
    "karearea":     "Falco novaeseelandiae",
    "hakawai":      "Coenocorypha aucklandica",  # the snipe whose night display IS the hakawai
    # ---- PROXY VOICES for the extinct birds (user req 2026-09-15): each
    # speaks through its closest (or most plausible) living relative ----
    "koreke":       "Synoicus ypsilophorus",     # brown quail — nearest kin, wild in NZ today
    "huia":         "Callaeas wilsonii",         # kōkako — same wattlebird family, flute-like
    "pouakai":      "Hieraaetus morphnoides",    # little eagle — Haast's eagle's closest relative (DNA)
    "kuihinui":     "Cereopsis novaehollandiae", # Cape Barren goose — sister to the SI goose
    "moaiti":       "Tinamus major",             # great tinamou — the moa's sister group
    "moauta":       "Dromaius novaehollandiae",  # emu — ratite drumming for the mid moa
    "moanui":       "Casuarius casuarius",       # southern cassowary — the giant's deep boom
}
FALLBACK = {"tieke": "Philesturnus carunculatus", "kotata": "Megalurus punctatus",
            "hakawai": "Gallinago gallinago",    # common snipe winnowing — NZ snipe have no recordings
            "pouakai": "Aquila audax"}           # wedge-tailed eagle, if little eagle runs dry
# keys whose audio is a stand-in from a living relative — noted in CREDITS.txt
PROXY_NOTE = {
    "koreke":   "proxy voice for the extinct koreke (NZ quail): brown quail, its closest living relative",
    "huia":     "proxy voice for the extinct huia: kōkako, its closest living relative (flute-like, matching historical accounts)",
    "hakawai":  "proxy voice for the hakawai: snipe aerial display — the sound the legend describes",
    "pouakai":  "proxy voice for the extinct Haast's eagle: its closest living relative by DNA",
    "kuihinui": "proxy voice for the extinct South Island goose: Cape Barren goose, its sister lineage",
    "moaiti":   "proxy voice for the moa: great tinamou, the moa's closest living relatives",
    "moauta":   "proxy voice for the moa: emu (ratite drumming)",
    "moanui":   "proxy voice for the giant moa: southern cassowary (deep boom)",
}


def gbif_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def gbif_sounds(sci):
    # resolve the name to a backbone taxonKey first — matches subspecies and
    # synonym spellings that a raw scientificName search can miss
    mq = urllib.parse.urlencode({"name": sci})
    match = gbif_json(f"https://api.gbif.org/v1/species/match?{mq}")
    tk = match.get("usageKey")
    q = urllib.parse.urlencode(
        {"datasetKey": XC_DATASET, "limit": 100} |
        ({"taxonKey": tk} if tk else {"scientificName": sci}))
    data = gbif_json(f"https://api.gbif.org/v1/occurrence/search?{q}")
    cands = []
    for occ in data.get("results", []):
        for m in occ.get("media", []):
            if m.get("type") != "Sound" or not m.get("identifier"):
                continue
            lic = (m.get("license") or occ.get("license") or "")
            dur = None
            dm = re.match(r"^\s*(\d+)\s*s", m.get("description") or "")
            if dm:
                dur = int(dm.group(1))
            # old-format uploads have no XC id in the FILE url — fall back to
            # the occurrence id (…/observation/XC46594), which always has it
            xc = re.search(r"XC(\d+)", m["identifier"]) or re.search(r"XC(\d+)", occ.get("occurrenceID") or "")
            cands.append({
                "url": m["identifier"], "dur": dur, "lic": lic, "nd": "-nd" in lic,
                "by": m.get("creator") or occ.get("recordedBy") or "unknown",
                "xc": xc.group(1) if xc else "?",
                "beh": (occ.get("behavior") or "").lower(),
            })
    return cands


def score(c, want="song"):
    """Rank a candidate for the wanted variant: 'song' or 'call'."""
    s = 0.0
    beh = c["beh"]
    has_song = "song" in beh
    has_call = ("call" in beh) or ("alarm" in beh) or ("beg" in beh)
    if want == "song":
        if has_song: s += 3
        elif has_call: s += 0.5
    else:
        if has_call and not has_song: s += 3   # a pure call recording
        elif has_call: s += 1.5
        elif has_song: s += 0.3
    if c["dur"] is not None:
        if 14 <= c["dur"] <= 60: s += 3      # room for a long seamless loop
        elif 8 <= c["dur"] <= 120: s += 1.5
        elif c["dur"] > 240: s -= 2          # soundscape-length: avoid
    if c["nd"]: s -= 1                       # prefer trim-friendly licenses
    return s


def fetch(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        while True:
            b = r.read(1 << 16)
            if not b: break
            f.write(b)


def probe_dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def measure_loudness(src, pre):
    """Pass 1 of two-pass loudnorm: measure the recording (after the same
    silence strip pass 2 will use) so the gain can be applied LINEARLY —
    single-pass 'dynamic' loudnorm is what left the old clips at audibly
    different baseline volumes."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-t", "34",
                        "-af", f"{pre},loudnorm=I=-21:TP=-3:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    return json.loads(m.group(0)) if m else None


def make_clip(src, dest, key=""):
    """Equalize the recording to a common baseline, soften it, and build a
    SEAMLESS LOOP from it.

    Order (user req): every loop is first brought to the SAME baseline
    loudness — measured two-pass loudnorm, applied as pure linear gain to
    -21 LUFS — and only THEN the softening filters run: high-pass for
    handling rumble (lower shelf for the low-voiced kererū/kākāpō), a 10 kHz
    shelf-off, FFT denoise, and a -1 dBTP safety limiter. Loop: up to ~32 s
    of body with the tail cross-faded into the head so `loop = true` plays
    without a seam — the in-game mixer does all fading, so the clip itself
    must NOT fade at its loop point. Opus (in .ogg) because mp3's codec
    padding makes an audible gap on loop; browsers play opus natively."""
    hp = 100 if key in ("kereru", "kakapo") else 180
    clean = dest.with_suffix(".clean.wav")
    # the baseline must be measured on what the LISTENER gets: filter first
    # (a wind-drenched recording loses most of its energy to the high-pass —
    # gain computed pre-filter left such clips ~8 LU quiet), then bring the
    # FILTERED result to exactly -21 LUFS with pure linear volume, then the
    # -1 dBTP safety limiter. Float pipeline: hot peaks never clip inside.
    filt = (f"silenceremove=start_periods=1:start_threshold=-33dB,"
            f"highpass=f={hp},lowpass=f=10000,afftdn=nr=12:nf=-32")
    mj = measure_loudness(src, filt)
    gain = 0.0
    if mj:
        try: gain = -21.0 - float(mj["input_i"])
        except (KeyError, ValueError): gain = 0.0
    gain = max(-30.0, min(40.0, gain))
    af = f"{filt},volume={gain:.2f}dB,alimiter=limit=0.891:level=false"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                    "-t", "34", "-af", af, "-ac", "1", "-ar", "48000",
                    "-c:a", "pcm_f32le", str(clean)], check=True)
    try:
        D = probe_dur(clean)
        if D < 4:
            raise RuntimeError(f"cleaned clip too short ({D:.1f}s)")
        xf = 1.5 if D >= 14 else max(0.6, min(1.0, D / 5))
        fc = (f"[0]atrim={xf}:{D - xf},asetpts=PTS-STARTPTS[main];"
              f"[0]atrim={D - xf}:{D},asetpts=PTS-STARTPTS[tl];"
              f"[0]atrim=0:{xf},asetpts=PTS-STARTPTS[hd];"
              f"[tl][hd]acrossfade=d={xf}[x];"
              f"[main][x]concat=n=2:v=0:a=1[out]")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(clean),
                        "-filter_complex", fc, "-map", "[out]",
                        "-c:a", "libopus", "-b:a", "64k", str(dest)], check=True)
    finally:
        clean.unlink(missing_ok=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    # recordings retired by the in-game odd-sound flags (a voice, a siren…) —
    # tools/clean_birdsong.py appends their XC ids here; never pick them again
    skip_path = OUT / "SKIP.txt"
    skip_ids = set(skip_path.read_text().split()) if skip_path.exists() else set()
    credits = {}
    cred_path = OUT / "CREDITS.txt"
    if cred_path.exists():
        for line in cred_path.read_text().splitlines():
            m = re.match(r"^(\w+):", line)
            if m: credits[m.group(1)] = line
    for key, sci in SPECIES.items():
        if only and key not in only: continue
        if not only and (OUT / f"{key}_song.ogg").exists() and (OUT / f"{key}_call.ogg").exists():
            print(f"{key}: exists, skip"); continue
        cands = gbif_sounds(sci)
        if not cands and key in FALLBACK:
            cands = gbif_sounds(FALLBACK[key])
        cands = [c for c in cands if c["xc"] not in skip_ids]
        if not cands:
            print(f"{key}: NO recordings found ({sci})"); continue
        # up to FOUR variants per species — two songs and two calls, each
        # from a distinct recording where the catalogue allows (the game
        # mixes song-vs-call by time of day and shuffles within the class,
        # so no bird ever settles into a single repeated loop). Distinctness
        # counts EXISTING variants too (CREDITS.txt), so a partial refetch
        # never re-draws a sibling clip's source recording.
        used = set()
        cred_file = OUT / "CREDITS.txt"
        if cred_file.exists():
            for line in cred_file.read_text().splitlines():
                m = re.match(rf"^{re.escape(key)}_\w+: .*?XC(\d+)", line)
                if m and (OUT / (line.split(":")[0] + ".ogg")).exists():
                    used.add(m.group(1))
        for want, slot in (("song", ""), ("song", "2"), ("call", ""), ("call", "2")):
            dest = OUT / f"{key}_{want}{slot}.ogg"
            # existing variants are NEVER overwritten (an excised clip must
            # survive a species refetch) — delete a file to redraw it
            if dest.exists():
                print(f"{key}_{want}{slot}: exists, keep"); continue
            ranked = sorted(cands, key=lambda c: score(c, want), reverse=True)
            got = False
            for c in ranked[:6]:
                # second slots must be genuinely different recordings; the
                # first song/call may share only when the species is scarce
                if c["xc"] in used and (slot or len(cands) > 1): continue
                tmp = OUT / f"_{key}_raw"
                try:
                    fetch(c["url"], tmp)
                    make_clip(tmp, dest, key)
                    got = True
                except Exception as e:
                    print(f"{key}_{want}: candidate XC{c['xc']} failed ({e}); trying next")
                    continue
                finally:
                    tmp.unlink(missing_ok=True)
                used.add(c["xc"])
                note = f"; {PROXY_NOTE[key]}" if key in PROXY_NOTE else ""
                credits[f"{key}_{want}{slot}"] = (
                    f"{key}_{want}{slot}: {sci} — XC{c['xc']}, recordist {c['by']}, "
                    f"{c['lic'] or 'license unknown'}, "
                    f"https://xeno-canto.org/{c['xc']} (clip trimmed/normalized{note})")
                print(f"{key}_{want}{slot}: XC{c['xc']} by {c['by']} dur={c['dur']}s beh='{c['beh'][:40]}'")
                break
            if not got and not slot: print(f"{key}_{want}: no usable candidate")
            time.sleep(0.8)  # be polite to the APIs
    header = ("Taiao birdsong clips — one per living NZ native bird.\n"
              "All recordings from xeno-canto.org (fetched via the official\n"
              "xeno-canto GBIF dataset), Creative Commons licensed; clips are\n"
              "trimmed to ~12 s, mono, loudness-normalized. Full attribution:\n\n")
    cred_path.write_text(header + "\n".join(credits[k] for k in sorted(credits)) + "\n")
    print(f"\ncredits -> {cred_path}")


if __name__ == "__main__":
    main()
