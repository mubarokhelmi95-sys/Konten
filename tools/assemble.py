#!/usr/bin/env python3
"""Gabung frame JPEG + audio jadi MP4.

Pakai: python3 tools/assemble.py projects/contoh frames out/video.mp4 [step]
step = 1 untuk render penuh, 3 untuk preview (frame tiap ke-3, jadi 10 fps).
Kalau ada projects/<nama>/bgm.mp3 / bgm.wav, dicampur pelan di bawah suara narasi.
"""
import json, os, subprocess, sys

proj, frames, out = sys.argv[1], sys.argv[2], sys.argv[3]
step = int(sys.argv[4]) if len(sys.argv) > 4 else 1
scene = json.load(open(os.path.join(proj, "scene.json"), encoding="utf-8"))
fps = (scene.get("meta") or {}).get("fps", 30)
audio = next(os.path.join(proj, f"narasi{e}") for e in (".wav", ".mp3", ".m4a", ".ogg")
             if os.path.exists(os.path.join(proj, f"narasi{e}")))
bgm = next((os.path.join(proj, f"bgm{e}") for e in (".mp3", ".wav", ".m4a")
            if os.path.exists(os.path.join(proj, f"bgm{e}"))), None)
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)

cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", str(fps / step),
       "-start_number", "0", "-i", os.path.join(frames, "%06d.jpg"), "-i", audio]
if bgm:
    cmd += ["-stream_loop", "-1", "-i", bgm, "-filter_complex",
            "[2:a]volume=0.12[b];[1:a][b]amix=inputs=2:duration=first:normalize=0[a]", "-map", "0:v", "-map", "[a]"]
else:
    cmd += ["-map", "0:v", "-map", "1:a"]
cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p",
        "-r", str(fps / step) if step > 1 else str(fps), "-c:a", "aac", "-b:a", "160k", "-shortest", out]
subprocess.check_call(cmd)
print("ok:", out, f"{os.path.getsize(out) / 1e6:.1f} MB")
