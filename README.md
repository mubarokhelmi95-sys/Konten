# Template explainer 3D (WebGL2 + Playwright + ffmpeg)

Engine dibuat sekali. Tiap video baru cukup bikin satu folder di `projects/` berisi 3 file.
Render jalan di GitHub Actions, jadi nggak makan token.

## Struktur

```
engine/engine.html        engine 3D (jangan diubah per video)
engine/prefabs/*.json     benda siap pakai: manekin, pohon, rumah (tambah sendiri)
tools/make_subs.py        audio + naskah -> subs.json (subtitle kata demi kata)
tools/render.js           render frame per frame (Playwright)
tools/assemble.py         frame + audio -> MP4
.github/workflows/render.yml
projects/<nama>/
    naskah.txt            naskah TTS, satu ide per baris
    narasi.wav            audio TTS (.mp3 juga bisa)
    scene.json            ISI ADEGAN: objek, gerakan, kamera, label  <- ini yang berubah tiap video
    bgm.mp3               opsional, dicampur pelan di bawah suara
```

## Cara pakai

1. Upload folder ini ke repo GitHub (publik = menit Actions gratis).
2. Buat `projects/<nama>/` dengan `naskah.txt` dan `narasi.wav`.
3. Minta Claude menulis `scene.json` untuk naskah itu. Hanya file itu yang perlu ditulis ulang.
4. GitHub > Actions > **render-video** > Run workflow > isi nama project. Awali dengan `preview` aktif.
5. Kalau preview oke, jalankan lagi dengan `preview` dimatikan (720x1280, 30 fps). Unduh MP4 dari bagian Artifacts.

Tes lokal (butuh Node, Python, ffmpeg, Chrome):

```
npm install
python3 tools/make_subs.py projects/contoh
node tools/render.js --project projects/contoh --out frames --preview
python3 tools/assemble.py projects/contoh frames out/video.mp4 3
```

## Isi scene.json

- `meta`: `fps`, `duration` (opsional, default = durasi audio + 0,8 dtk), `shadowCenter`, `shadowSize`.
- `palette`: `skyTop`, `skyHorizon`, `ambientSky`, `ambientGround`, `sun`, `sunColor`, `fogDensity`.
- `objects`: `type` = `box` | `sphere` | `cyl` | `group`; `pos`, `rot` (derajat), `size`, `color`, `parent`, `show: [[t0,t1]]`.
  Papan/logo di dunia 3D: tambahkan `text` dan `textColor`.
  Prefab: `{"id":"hero","prefab":"manekin","pos":[0,0,0],"colors":{"shirt":"#fff"}}`. Bagian dalamnya bisa dianimasikan lewat id `hero.arm_r`, `hero.leg_l`, dst.
- `tracks`: `{"id":"hero","keys":[{"t":0,"pos":[..]},{"t":3,"pos":[..],"rot":[..]}]}`.
- `shots`: kamera, `{t, dur, a:{pos,target,fov}, b:{pos,target,fov}}`. Satu shot = satu frasa narasi.
- `labels`: `{t, dur, text, kind:"red"|"blue"|"plain", x, y}` (x, y pecahan 0..1).

Watermark MEN'S GIBRIG / SELERA MUSIK ditaruh sebagai papan (`text`) di dunia 3D, bukan logo di layar.

## Supaya hemat token

- Jangan ubah `engine/`. Minta Claude cuma menulis `scene.json` dan prefab baru kalau perlu.
- Prefab baru (misal botol, helm, colokan) dibuat sekali, dipakai di video-video berikutnya.
- Selalu preview dulu. Minta Claude cek satu contact sheet saja, bukan frame satu-satu.
- Kumpulkan semua revisi dalam satu pesan.

## Batasan

- Kualitas gaya WebGL sederhana: bayangan, fog, ACES, primitif box/bola/silinder. Belum ada DOF, SSAO, bloom, atau tekstur detail.
- Subtitle sinkron lewat deteksi hening, akurasi sekitar +-0,3 dtk.
- Font Poppins diambil dari Google Fonts (runner Actions punya internet). Tanpa internet jatuh ke font sans-serif biasa.
