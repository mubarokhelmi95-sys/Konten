#!/usr/bin/env python3
"""Bikin prefab truk sampah (lebih realistis dari kotak-kotak) -> engine/prefabs/truk_sampah.json
Pakai:  python3 tools/make_truk.py
Origin = titik injak tanah di tengah truk, depan = +z, kanan truk = -x (sama dengan truk lama,
jadi 'petugas' (parent truk, pos [0,0.66,-2.0]) tetap berdiri pas di pijakan belakang).
Warna lewat "colors" di scene.json: cab, body, trim, chrome, dark, glass, tire, rim, lamp, red, amber, stripe.
"""
import json, os

P = []
def add(id, type, pos, size, color, rot=None, rough=0.6, metal=0.0, **kw):
    d = dict(id=id, type=type, pos=[round(v, 4) for v in pos], size=[round(v, 4) for v in size], color=color, rough=rough, metal=metal)
    if rot: d['rot'] = rot
    d.update(kw); P.append(d)

box = lambda *a, **k: add(a[0], 'box', *a[1:], **k)
cyl = lambda *a, **k: add(a[0], 'cyl', *a[1:], **k)
sph = lambda *a, **k: add(a[0], 'sphere', *a[1:], **k)

WX = 0.80            # jarak roda dari tengah
WZ = (1.15, -0.9)    # roda depan, belakang
for side, sx in (('L', -1), ('R', 1)):
    x = WX * sx
    for k, z in zip(('D', 'B'), WZ):      # D = depan, B = belakang
        n = f'{side}{k}'
        cyl('ban' + n, [x, 0.38, z], [0.76, 0.27, 0.76], '$tire', rot=[0, 0, 90], rough=0.95, tex='rubber')
        cyl('dinding' + n, [x + 0.002 * sx, 0.38, z], [0.62, 0.285, 0.62], '#202024', rot=[0, 0, 90], rough=0.9)
        cyl('pelek' + n, [x + 0.004 * sx, 0.38, z], [0.44, 0.29, 0.44], '$rim', rot=[0, 0, 90], rough=0.35, metal=0.85)
        cyl('naf' + n, [x + 0.01 * sx, 0.38, z], [0.17, 0.30, 0.17], '#6f737a', rot=[0, 0, 90], rough=0.4, metal=0.8)
        for j, (dy, dz) in enumerate(((0.14, 0), (-0.14, 0), (0, 0.14), (0, -0.14))):   # baut roda
            cyl(f'baut{n}{j}', [x + 0.15 * sx, 0.38 + dy, z + dz], [0.035, 0.02, 0.035], '#8a8e95', rot=[0, 0, 90], rough=0.4, metal=0.9)
# gandar + rangka + perut truk
for k, z in zip('DB', WZ):
    cyl('gandar' + k, [0, 0.38, z], [0.11, 1.5, 0.11], '$dark', rot=[0, 0, 90], rough=0.7, metal=0.4)
box('perut', [0, 0.5, -0.1], [1.45, 0.28, 3.9], '#141517', rough=1.0)
for sx, s in ((-1, 'L'), (1, 'R')):
    box('rel' + s, [0.46 * sx, 0.6, -0.25], [0.13, 0.17, 4.1], '$dark', rough=0.6, metal=0.3)
cyl('tangki', [-0.55, 0.5, 0.15], [0.32, 0.8, 0.32], '#4b4f55', rot=[90, 0, 0], rough=0.5, metal=0.6)
for sx, s in ((-1, 'L'), (1, 'R')):                      # lumpur
    box('lumpur' + s, [0.8 * sx, 0.28, -1.3], [0.36, 0.3, 0.02], '#0e0e10', rough=0.95)
    box('fender' + s, [0.8 * sx, 0.82, -0.9], [0.34, 0.05, 0.95], '$dark', rough=0.5)   # penutup ban belakang

# ---- kabin ----
CZ = 1.1
box('kabinBawah', [0, 1.05, CZ + 0.1], [1.74, 0.62, 1.1], '$cab', rough=0.32, metal=0.12)
box('kabinAtas', [0, 1.6, CZ], [1.66, 0.62, 0.95], '$cab', rough=0.32, metal=0.12)
box('atap', [0, 1.94, CZ], [1.7, 0.07, 1.0], '$cab', rough=0.32, metal=0.12)
box('kacaDepan', [0, 1.62, CZ + 0.49], [1.5, 0.5, 0.03], '$glass', rot=[-12, 0, 0], rough=0.04, metal=0.85)
box('kacaBelakang', [0, 1.62, CZ - 0.49], [1.1, 0.36, 0.03], '$glass', rough=0.05, metal=0.8)
for sx, s in ((-1, 'L'), (1, 'R')):
    box('kacaSamping' + s, [0.835 * sx, 1.63, CZ + 0.05], [0.02, 0.46, 0.66], '$glass', rough=0.04, metal=0.85)
    box('pintuGaris' + s, [0.872 * sx, 1.2, CZ + 0.0], [0.012, 0.95, 0.012], '#2b1a08', rough=0.9)
    box('pintuGaris2' + s, [0.872 * sx, 1.2, CZ + 0.62], [0.012, 0.95, 0.012], '#2b1a08', rough=0.9)
    box('gagang' + s, [0.88 * sx, 1.28, CZ + 0.4], [0.02, 0.035, 0.14], '$chrome', rough=0.3, metal=0.9)
    box('injak' + s, [0.83 * sx, 0.7, CZ + 0.12], [0.1, 0.04, 0.5], '$dark', rough=0.6)
    # spion
    cyl('spionTangkai' + s, [0.98 * sx, 1.58, CZ + 0.56], [0.025, 0.2, 0.025], '$dark', rot=[0, 0, 90], rough=0.5)
    box('spion' + s, [1.1 * sx, 1.56, CZ + 0.56], [0.07, 0.3, 0.2], '$dark', rough=0.4)
    box('spionKaca' + s, [1.1 * sx, 1.56, CZ + 0.665], [0.06, 0.26, 0.012], '#9fb3c4', rough=0.05, metal=0.95)
    # lampu depan + sein
    box('rumahLampu' + s, [0.64 * sx, 1.03, CZ + 0.66], [0.34, 0.22, 0.05], '$dark', rough=0.5)
    sph('lensaLampu' + s, [0.64 * sx, 1.03, CZ + 0.69], [0.24, 0.16, 0.05], '$lamp', rough=0.05, metal=0.2)
    box('sein' + s, [0.80 * sx, 0.84, CZ + 0.66], [0.14, 0.07, 0.04], '$amber', rough=0.2)
    # lampu belakang
    box('lampuBelakang' + s, [0.7 * sx, 1.0, -1.84], [0.16, 0.12, 0.03], '$red', rough=0.25)
box('grill', [0, 0.98, CZ + 0.66], [0.95, 0.38, 0.05], '$dark', rough=0.5)
for i in range(4):
    box(f'grillBilah{i}', [0, 0.85 + i * 0.09, CZ + 0.69], [0.9, 0.02, 0.02], '$chrome', rough=0.25, metal=0.9)
box('logoGrill', [0, 1.2, CZ + 0.66], [0.2, 0.08, 0.02], '$chrome', rough=0.3, metal=0.9)
box('bumper', [0, 0.62, CZ + 0.72], [1.86, 0.2, 0.2], '$chrome', rough=0.35, metal=0.65)
box('plat', [0, 0.63, CZ + 0.83], [0.46, 0.2, 0.012], '#f2f2f2', rough=0.5, text='B 9087 KJ', textColor='#111111')
cyl('beacon', [0, 2.02, CZ - 0.1], [0.16, 0.1, 0.16], '$amber', rough=0.2)
cyl('beaconDasar', [0, 1.975, CZ - 0.1], [0.2, 0.03, 0.2], '$dark', rough=0.5)
cyl('knalpot', [0.9, 1.5, 0.55], [0.09, 1.0, 0.09], '$chrome', rough=0.35, metal=0.85)
box('celahKabin', [0, 1.25, 0.49], [1.5, 1.0, 0.3], '#1a1b1e', rough=0.9)

# ---- bak ----
BZ = -0.72
box('bak', [0, 1.45, BZ], [1.64, 1.3, 2.15], '$body', rough=0.45, metal=0.15)
box('bakBibir', [0, 2.1, BZ], [1.72, 0.07, 2.23], '$trim', rough=0.5, metal=0.2)
box('bakAlas', [0, 0.85, BZ], [1.72, 0.1, 2.23], '$trim', rough=0.6, metal=0.2)
box('bakBelakang', [0, 1.45, -1.82], [1.6, 1.2, 0.05], '$trim', rough=0.6, metal=0.2)
for i, z in enumerate((-1.68, -1.5, 0.0, 0.18)):
    for sx, s in ((-1, 'L'), (1, 'R')):
        box(f'rusuk{s}{i}', [0.835 * sx, 1.45, BZ + (z - BZ)], [0.04, 1.18, 0.06], '$trim', rough=0.55, metal=0.2)
for sx, s in ((-1, 'L'), (1, 'R')):
    box('stripe' + s, [0.827 * sx, 0.98, BZ], [0.012, 0.09, 2.1], '$stripe', rough=0.35, metal=0.1)
    box('stripePutih' + s, [0.827 * sx, 0.88, BZ], [0.012, 0.04, 2.1], '#eceff1', rough=0.35)
    box('wm' + ('Kiri' if sx < 0 else 'Kanan'), [0.852 * sx, 1.5, -0.75], [0.03, 0.55, 1.1], '#8b5a3c', rough=0.6, text="MEN'S GIBRIG", textColor='#f3dfc0')
box('pijakan', [0, 0.62, -2.0], [1.2, 0.08, 0.45], '#3a3d42', rough=0.5, metal=0.4)
box('bemperBelakang', [0, 0.52, -2.26], [1.7, 0.14, 0.12], '$dark', rough=0.6, metal=0.3)
for sx, s in ((-1, 'L'), (1, 'R')):
    cyl('pegangan' + s, [0.55 * sx, 1.28, -1.92], [0.04, 1.0, 0.04], '$chrome', rough=0.3, metal=0.9)

# ---- muatan: karung sampah plastik menumpuk di atas bak ----
bags = [([0.0, 2.34, -0.25], [0.62, 0.46, 0.55], '#1d1f22'), ([0.42, 2.3, -0.95], [0.55, 0.42, 0.5], '#3a7d44'),
        ([-0.4, 2.3, -1.0], [0.6, 0.44, 0.52], '#cfd4d8'), ([-0.35, 2.32, -0.3], [0.52, 0.4, 0.48], '#3c5f87'),
        ([0.35, 2.3, -0.2], [0.5, 0.38, 0.46], '#1d1f22'), ([0.0, 2.3, -1.55], [0.55, 0.4, 0.45], '#2f6f3e'),
        ([0.05, 2.62, -0.7], [0.5, 0.38, 0.46], '#d97706'), ([-0.3, 2.6, -1.3], [0.42, 0.34, 0.4], '#1d1f22')]
for i, (p, s, c) in enumerate(bags):
    sph(f'karung{i}', p, s, c, rough=0.3)
    sph(f'ikatan{i}', [p[0] + 0.03, p[1] + s[1] * 0.5, p[2]], [0.1, 0.1, 0.1], c, rough=0.3)

defaults = dict(cab='#e8700a', body='#2f8f46', trim='#236b34', chrome='#c4c8cf', dark='#232529', glass='#18232c',
                tire='#15151a', rim='#aeb2b9', lamp='#fff8e1', red='#c1121f', amber='#ffa400', stripe='#f2c200')
out = os.path.join(os.path.dirname(__file__), '..', 'engine', 'prefabs', 'truk_sampah.json')
json.dump(dict(defaults=defaults, parts=P), open(out, 'w'), indent=1)
print('ok:', len(P), 'bagian ->', os.path.normpath(out))
