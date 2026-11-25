#!/usr/bin/env python3
"""Bikin prefab figur tambahan (peran selain 3 karakter GLB utama) -> engine/prefabs/*.json
Pakai: python3 tools/make_prefabs.py
Kaki di y=0, depan = +z. Warna lewat "colors" di scene.json: skin, hair, shirt, pants, shoe, skirt.
Bagian yang bisa dianimasikan: arm_l, arm_r (pivot bahu), leg_l, leg_r (pivot pinggul), mouth (size).
"""
import json, os

def build(kind, s=1.0, hk=1.0, skirt=False, hair='cap', cane=False, curly=False):
    P = []
    add = lambda **k: P.append(k)
    f = lambda *v: [round(x * s, 4) for x in v]
    hy = 1.68 + (hk - 1) * 0.15            # tinggi pusat kepala
    hs = [0.27 * hk, 0.31 * hk, 0.27 * hk]
    add(id='torso', type='cyl', pos=f(0, 1.2, 0), size=f(0.42, 0.62, 0.27), color='$shirt')
    add(id='neck', type='cyl', pos=f(0, 1.52, 0), size=f(0.09, 0.1, 0.09), color='$skin')
    add(id='head', type='sphere', pos=f(0, hy, 0), size=[round(x * s, 4) for x in hs], color='$skin')
    hz = 0.125 * hk
    for side, x in (('l', -0.06), ('r', 0.06)):
        add(id='eye_' + side, type='sphere', pos=f(x * hk, hy + 0.01, hz), size=f(0.035 * hk, 0.05 * hk, 0.03), color='#1b1512')
    add(id='mouth', type='box', pos=f(0, hy - 0.085 * hk, hz - 0.005), size=f(0.075, 0.016, 0.02), color='#7a2b25')
    # rambut
    if hair == 'cap':
        add(id='hair', type='sphere', pos=f(0, hy + 0.06 * hk, -0.012), size=f(0.29 * hk, 0.22 * hk, 0.29 * hk), color='$hair')
    elif hair == 'bun':
        add(id='hair', type='sphere', pos=f(0, hy + 0.06 * hk, -0.012), size=f(0.29 * hk, 0.22 * hk, 0.29 * hk), color='$hair')
        add(id='bun', type='sphere', pos=f(0, hy + 0.17 * hk, -0.1 * hk), size=f(0.13, 0.13, 0.13), color='$hair')
    elif hair == 'pony':
        add(id='hair', type='sphere', pos=f(0, hy + 0.06 * hk, -0.012), size=f(0.29 * hk, 0.22 * hk, 0.29 * hk), color='$hair')
        add(id='pony', type='sphere', pos=f(0, hy - 0.02, -0.17 * hk), size=f(0.1, 0.24, 0.1), color='$hair')
    if curly:
        for i, (x, y, z) in enumerate([(-0.1, .13, 0.0), (0.1, .13, 0.0), (0, .17, -0.04), (0, .15, 0.07), (-0.09, .08, -0.08), (0.09, .08, -0.08)]):
            add(id='curl%d' % i, type='sphere', pos=f(x * hk, hy + y * hk, z * hk), size=f(0.1 * hk, 0.1 * hk, 0.1 * hk), color='$hair')
    # tangan & kaki
    for side, sg in (('l', -1), ('r', 1)):
        add(id='arm_' + side, type='group', pos=f(sg * 0.27, 1.46, 0))
        add(id='arm_%s_m' % side, type='cyl', parent='arm_' + side, pos=f(0, -0.28, 0), size=f(0.1, 0.56, 0.1), color='$shirt')
        add(id='hand_' + side, type='sphere', parent='arm_' + side, pos=f(0, -0.6, 0), size=f(0.1, 0.1, 0.1), color='$skin')
        add(id='leg_' + side, type='group', pos=f(sg * 0.1, 0.9, 0))
        add(id='leg_%s_m' % side, type='cyl', parent='leg_' + side, pos=f(0, -0.4, 0), size=f(0.15, 0.8, 0.15), color='$pants')
        add(id='leg_%s_s' % side, type='box', parent='leg_' + side, pos=f(0, -0.85, 0.05), size=f(0.14, 0.09, 0.25), color='$shoe')
    if skirt:   # rok (lathe: [radius, y]) menutup pinggul sampai betis
        add(id='rok', type='lathe', pos=f(0, 0.2, 0), color='$skirt',
            profile=[[0.001, 0.0], [round(0.30 * s, 4), 0.0], [round(0.28 * s, 4), 0.1], [round(0.22 * s, 4), round(0.7 * s, 4)], [0.001, round(0.7 * s, 4)]])
    if cane:    # tongkat di sisi kiri, tangan kiri bertumpu di ujungnya
        add(id='tongkat', type='cyl', pos=f(-0.29, 0.43, 0.05), size=f(0.04, 0.86, 0.04), color='#6b4a2b', rough=0.7)
    return P

DEF = dict(skin='#d8a47c', hair='#2a1d17', shirt='#e8e4d8', pants='#4a5a7a', shoe='#3b2f2a', skirt='#7a4a2e')
K = {
    'warga':    (dict(), dict(shirt='#5aa469', pants='#3f4d6b')),
    'nenek':    (dict(hair='bun', skirt=True, cane=True), dict(hair='#ececec', shirt='#f1e7d2', skirt='#7a4a2e', pants='#7a4a2e', skin='#d9a982')),
    'ibu_muda': (dict(hair='pony', skirt=True), dict(shirt='#e0708a', skirt='#5b4a7a', pants='#5b4a7a', hair='#2a1a14')),
    'bocah':    (dict(s=0.62, hk=1.35, curly=True), dict(shirt='#5bbf7a', pants='#2f4f86', hair='#1f1511')),
}
out = os.path.join(os.path.dirname(__file__), '..', 'engine', 'prefabs')
for name, (kw, col) in K.items():
    parts = build(name, **kw)
    json.dump({'defaults': {**DEF, **col}, 'parts': parts}, open(os.path.join(out, name + '.json'), 'w'), indent=1)
    print(name, len(parts), 'bagian')
