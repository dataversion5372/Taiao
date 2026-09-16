#!/usr/bin/env python3
"""Synthesize the nature-ambience beds: rain, wind, ocean.

Fully original audio — shaped noise from ffmpeg's anoisesrc (no recordings,
no licensing) — built as SEAMLESS LOOPS the same way the birdsong clips are
(tail cross-faded into head; opus so browsers loop without a gap). The
in-game mixer (gameplay/ambience.js) drives their volumes from the live
weather field / nearby sea, so the beds themselves are steady textures with
gentle internal movement (slow tremolo swells = gusts / wave sets).

  python3 tools/make_ambience.py
"""
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "ambience"
DUR = 36  # seconds of source texture; loop build trims ~1.5 s

BEDS = {
    # rain: bright white-noise patter, band-limited, tiny flutter
    "rain": ("anoisesrc=color=white:seed=42:duration={d}",
             "highpass=f=300,lowpass=f=8500,tremolo=f=0.9:d=0.12,loudnorm=I=-23:TP=-3"),
    # wind: pink noise, low-passed; a ~14 s sine LFO (volume expr — tremolo
    # can't go below 0.1 Hz) + a faster tremolo beating against it = gusts
    "wind": ("anoisesrc=color=pink:seed=7:duration={d}",
             "highpass=f=60,lowpass=f=700,"
             "volume='0.55+0.45*sin(2*PI*0.07*t)':eval=frame,"
             "tremolo=f=0.19:d=0.3,loudnorm=I=-22:TP=-3"),
    # ocean: brown noise, deep and soft; ~11.5 s swell sets + faster wash
    "ocean": ("anoisesrc=color=brown:seed=3:duration={d}",
              "highpass=f=45,lowpass=f=1000,"
              "volume='0.45+0.55*sin(2*PI*0.087*t)':eval=frame,"
              "tremolo=f=0.31:d=0.2,loudnorm=I=-21:TP=-3"),
}


def probe_dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (src, af) in BEDS.items():
        wav = OUT / f"_{name}.wav"
        dest = OUT / f"{name}.ogg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                        "-f", "lavfi", "-i", src.format(d=DUR),
                        "-af", af, "-ac", "1", "-ar", "48000", str(wav)], check=True)
        D = probe_dur(wav)
        xf = 1.5
        fc = (f"[0]atrim={xf}:{D - xf},asetpts=PTS-STARTPTS[main];"
              f"[0]atrim={D - xf}:{D},asetpts=PTS-STARTPTS[tl];"
              f"[0]atrim=0:{xf},asetpts=PTS-STARTPTS[hd];"
              f"[tl][hd]acrossfade=d={xf}[x];"
              f"[main][x]concat=n=2:v=0:a=1[out]")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                        "-filter_complex", fc, "-map", "[out]",
                        "-c:a", "libopus", "-b:a", "56k", str(dest)], check=True)
        wav.unlink(missing_ok=True)
        print(f"{name}.ogg  ({probe_dur(dest):.1f}s loop)")


if __name__ == "__main__":
    main()
