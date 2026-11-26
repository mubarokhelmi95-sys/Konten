# STYLE.md — pedoman look "MEN'S GIBRIG" (kasih ke Claude tiap minta scene.json baru)

Tujuan: realistis-stylized seperti video referensi (tutup got). Bukan pastel/putih/kosong.

## 1. Palette dasar (copy ke scene.json -> palette)
sun [-0.55,0.42,0.55], sunColor #ffe7c2, sunIntensity 3.4, envIntensity 0.55, exposure 0.85,
hemi 0.22, fogDensity 0.0035, saturation 1.08, contrast 1.22, vignette 0.35, sharpen 0.2.
Aturan: matahari RENDAH (bayangan panjang), kontras tinggi, haze tipis. Jangan exposure > 1.0.

## 2. Post (meta.post)
{"ao":true,"bloom":true,"bloomStrength":0.14,"dof":{"aperture":0.00015,"maxblur":0.008}}
Kalau render GitHub Actions lambat/crash: matikan dof, lalu ao.

## 3. Warna
Hindari putih murni & warna pastel neon. Aspal #4b4e53 (tex asphalt), rumput #5c9a3c,
dinding krem hangat/ochre, atap terakota. Karakter harus lebih terang dari latar supaya kebaca.

## 4. Set dressing (WAJIB, min. 8-12 objek non-karakter per scene)
Pakai prefab di engine/prefabs: jalan_aspal, rumah_kampung (boleh beda warna & size),
pagar_tembok, tiang_listrik, lampu_jalan, bangku_teras, pot_tanaman + pohon (decor.trees).
Latar belakang tidak boleh tembok polos: selalu ada rumah tetangga/pohon/tiang di balik karakter.
Contoh pakai: {"id":"rumahKiri","prefab":"rumah_kampung","pos":[-15,-0.5,-8.5],"colors":{"dinding":"#c7d6b8"}}
Origin prefab = titik injak tanah, taruh di y=-0.5 (di atas teras: y=-0.34).

## 5. Kamera
- Jangan semua shot lurus dari depan. Orbit tiap shot 16-28 derajat kiri/kanan bergantian.
- Variasikan: wide (fov 40-44, jarak 4-6), medium (jarak 2.5-3.5), close-up (jarak >= 1.4, fov >= 30),
  low angle (y 0.35-0.5), top-down (y 3-4) untuk objek simbolik (uang, timbangan).
- Ganti shot tiap 2-3 detik, sesuai kalimat naskah. Shot terakhir dolly pelan.
- Close-up jangan terlalu dekat: muka tidak boleh kepotong frame.

## 6. Karakter & aksi
speaks[] untuk setiap kalimat tokoh bicara; actions[] (kasih, angkat_bahu, gendong, lompat) di momen penting.
Satu adegan = satu ide visual (objek simbolik muncul pas kata kuncinya: gaji, cicilan, timbangan).

## 7. Label
Maks 3-4 kata, huruf besar. merah = masalah/tekanan, biru = nilai/solusi, plain = nama objek.
