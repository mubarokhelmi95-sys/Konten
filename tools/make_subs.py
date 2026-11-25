#!/usr/bin/env python3
"""Bikin subtitle kata-demi-kata dari audio TTS + naskah (tanpa transkrip / tanpa AI).

Pakai:  python3 tools/make_subs.py projects/contoh
Butuh:  projects/<nama>/naskah.txt  (satu ide per baris, boleh ada tanda jeda .. atau ...)
        projects/<nama>/narasi.wav   (atau .mp3 / .m4a / .ogg)
Hasil:  projects/<nama>/subs.json   {"audio_duration":..., "cards":[{"t0","t1","text"}]}

Cara kerja: ffmpeg silencedetect mencari rentang bicara. Kalau jumlah rentang = jumlah baris naskah,
tiap baris dipasangkan 1:1. Kalau beda, waktu bicara dibagi rata menurut jumlah huruf per baris.
Tiap baris lalu dipecah jadi kartu 1-3 kata, durasi sebanding jumlah huruf. Akurasi sekitar +-0,3 dtk.
"""
import json, re, subprocess, sys, os

proj = sys.argv[1] if len(sys.argv) > 1 else "projects/contoh"
NOISE = os.environ.get("SILENCE_DB", "-35dB")
MIN_SIL = os.environ.get("SILENCE_MIN", "0.12")

audio = next((os.path.join(proj, f"narasi{e}") for e in (".wav", ".mp3", ".m4a", ".ogg")
              if os.path.exists(os.path.join(proj, f"narasi{e}"))), None)
if not audio:
    sys.exit(f"audio narasi.* tidak ketemu di {proj}")

dur = float(subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio]).decode().strip())

err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", audio, "-af",
                      f"silencedetect=noise={NOISE}:d={MIN_SIL}", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]

# rentang bicara = celah antar rentang hening
speech, cur = [], 0.0
for i, s in enumerate(starts):
    if s - cur > 0.10:
        speech.append([cur, s])
    cur = ends[i] if i < len(ends) else dur
if dur - cur > 0.10:
    speech.append([cur, dur])

lines = []
for raw in open(os.path.join(proj, "naskah.txt"), encoding="utf-8").read().splitlines():
    clean = re.sub(r"\.{2,}|!{1,}\s*$", " ", raw).strip()
    clean = re.sub(r"[\"“”]", "", clean).lower()
    if re.search(r"\w", clean):
        lines.append(clean)
if not lines:
    sys.exit("naskah.txt kosong")

letters = lambda s: max(1, len(re.sub(r"\W", "", s)))

if len(speech) == len(lines):
    spans = speech
    mode = "1:1 (rentang bicara = jumlah baris)"
else:
    total_speech = sum(b - a for a, b in speech)
    tot_letters = sum(letters(l) for l in lines)

    def to_real(x):  # waktu-bicara (tanpa hening) -> waktu asli
        for a, b in speech:
            if x <= b - a + 1e-9:
                return a + x
            x -= b - a
        return speech[-1][1]

    spans, acc = [], 0.0
    for l in lines:
        w = total_speech * letters(l) / tot_letters
        spans.append([to_real(acc), to_real(acc + w)])
        acc += w
    mode = f"proporsional (rentang bicara {len(speech)} != baris {len(lines)})"

cards = []
for line, (a, b) in zip(lines, spans):
    words = line.split()
    groups, i = [], 0
    while i < len(words):
        n = 1
        while n < 3 and i + n < len(words) and sum(len(w) for w in words[i:i + n + 1]) <= 13:
            n += 1
        groups.append(" ".join(words[i:i + n])); i += n
    tot = sum(letters(g) for g in groups)
    t = a
    for g in groups:
        d = (b - a) * letters(g) / tot
        cards.append({"t0": round(t, 3), "t1": round(t + d, 3), "text": g}); t += d

json.dump({"audio_duration": round(dur, 3), "cards": cards}, open(os.path.join(proj, "subs.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print(f"subs.json: {len(cards)} kartu, audio {dur:.2f} dtk, mode {mode}")
