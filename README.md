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

## Engine three.js (realistis, GLB)

Pilih lewat `scene.json`: `"meta": { "engine": "three" }`. Contoh: `projects/contoh3`. Tanpa baris itu dipakai engine WebGL lama.

- Karakter/benda GLB: taruh di `assets/`, lalu `{"id":"hero","glb":"assets/orang.glb","fitHeight":1.75,"pos":[0,0,0],"clips":[{"t":0,"name":"Idle"},{"t":3,"name":"Walk"}]}`.
  `fitHeight` meter, kaki otomatis menapak y=0. Nama klip dicocokkan tanpa peduli huruf besar/kecil.
- Lihat isi GLB (nama animasi, ukuran): `node tools/inspect_glb.js assets/orang.glb`.
- Material: `rough`, `metal`, `glass: true` (kaca transmisi). Bentuk putar: `{"type":"lathe","profile":[[r,y],...]}`.
- Langit: default langit prosedural. HDRI: `"palette": {"hdri": "assets/langit.hdr"}`.
- Post: `"meta": {"post": {"ao": true, "bloom": true, "dof": {"aperture": 0.0002, "maxblur": 0.01}}}`. DOF mati kecuali diisi, dan nilainya perlu di-tune.
- Satuan = meter. Pasang `three` lewat `npm install` (otomatis di workflow).

## Engine three (`"meta": {"engine": "three"}`)

Engine dipecah jadi modul kecil di `engine/` supaya tiap file aman diedit/ditempel (jaga `engine3.html` di bawah ~19 KB;
file yang melewati 20.000 karakter pernah terpotong diam-diam dan bikin render macet di "masih memuat engine"):

```
engine/engine3.html   loader scene, objek, animasi, kamera, renderFrame
engine/gesture.js     napas + gerak tangan/kepala saat karakter bicara ("speaks")
engine/post.js        AO, DOF, bloom, grade (saturasi, kontras, ketajaman, vignette, grain)
engine/look.js        tekstur kain/rambut prosedural + bump prop berteksur
engine/proctex.js     tekstur grass/asphalt/concrete/rubber untuk objek primitif
```

Look cerah + bertekstur (target dari video referensi: luma rata-rata ~0,57, kontras ~0,24; jangan sampai > ~0,7 = terlalu putih). Atur di `palette`:

| kunci | default | fungsi |
|---|---|---|
| `exposure` | 0.6 | terang-gelap keseluruhan (naik = lebih cerah) |
| `sunIntensity`, `envIntensity`, `hemi` | 2.6, 1.0, 0.4 | cahaya matahari, pantulan langit, cahaya isian |
| `saturation`, `contrast` | 1.15, 1.12 | warna lebih hidup |
| `sharpen` | 0.3 | ketajaman tekstur (0 = mati) |
| `fabricBump`, `fabricFreq` | 2.0, 140 | tonjolan & kerapatan butir kain/rambut karakter (0 = mati) |
| `propBump` | 0.6 | bump prop latar yang punya tekstur |

Per karakter bisa ditimpa di objeknya: `"fabricBump": 3`.

## Peran: 3 karakter utama + figur tambahan

Tiga GLB (`GIBRIG_MAN_CURLY`, `GIBRIG_WOMAN_HIJAB`, `GIBRIG_BOY_ORANGE`) adalah **peran utama**, masing-masing dipakai untuk satu peran saja.
Peran lain (nenek, ibu muda, anak masa kecil, warga lewat) memakai prefab dari primitif: `engine/prefabs/{nenek,ibu_muda,bocah,warga}.json`,
dibuat oleh `python3 tools/make_prefabs.py` (ubah bentuk/warna di situ, lalu jalankan ulang). Pakai di scene:
`{"id":"x","prefab":"nenek","pos":[0,-0.5,-3],"colors":{"shirt":"#f1e7d2"}}`; bagian yang bisa dianimasikan: `x.arm_r`, `x.arm_l`, `x.leg_l`, `x.leg_r`, `x.mouth` (size).

## Aksi karakter GLB (sesuai narasi)

Karakter GLB hanya punya klip Idle/Wave, jadi gerakan lain dibuat prosedural dari tulangnya. Jadwalkan di objeknya:
`"actions": [{"t0": 18.12, "t1": 20.75, "name": "gendong", "hop": [3.0, 0.2]}]`

| name | efek | opsi |
|---|---|---|
| `gendong` | badan condong, tangan menahan di belakang, lutut menekuk | `hop: [frekuensi Hz, tinggi m]` lompat-lompat; `tired: 1` sempoyongan |
| `lompat` | lompat di tempat | `hop: [Hz, m]` |
| `kasih` | ulurkan tangan kanan | |
| `angkat_bahu` | bingung: bahu naik, telapak terbuka | |

Orang yang digendong dibuat sebagai prefab ber-`parent` ke si penggendong (`ibuTuaG`), sehingga ikut mantul.

## Asap & api (engine/fx.js)

Asap/api bukan lagi bola abu-abu; sekarang partikel lunak (ratusan sprite bertekstur turbulensi) yang naik, membesar, memudar, dan terbawa angin.
Tulis di `scene.json` tingkat atas, kunci `fx` (lihat contoh di `projects/Tes/scene.json`):

- `kind`: `smoke` | `fire`; `pos`; `t0`/`t1` (jendela munculnya); `rate` (partikel/detik); `life`; `size: [awal, akhir]`; `rise` (m/dtk)
- `wind`: `[x,y,z]` tetap, atau kunci waktu `[[t,[x,y,z]],...]` (angin ke arah rumah tetangga)
- `colors: [awal, akhir]` (asap: gelap -> terang), `opacity`, `spread`, `swirl`, `seed`
- api: `light` (kuat cahaya oranye yang berkedip ke sekitar)

## Segitiga di badan karakter

GLB karakter pernah membawa kubus sisa Blender yang ter-skin ke tulang `neutral_bone`, tampil sebagai segitiga putih/biru bergerigi.
Sudah dibersihkan dengan `python3 tools/clean_glb.py assets/GIBRIG_*.glb` (aman diulang). Jalankan lagi tiap kali GLB baru diekspor dari Blender.

## Truk

`python3 tools/make_truk.py` menulis `engine/prefabs/truk_sampah.json` (kabin, kaca, lampu, grill, ban + pelek, bak ber-rusuk, plat nomor, karung sampah).
Pakai: `{"id":"truk","prefab":"truk_sampah","pos":[..],"rot":[0,-90,0]}`; warna lewat `colors` (`cab`, `body`, ...).
