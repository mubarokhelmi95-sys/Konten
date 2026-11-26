#!/usr/bin/env python3
"""Buang geometri nyasar (kubus 1 m sisa Blender) dari GLB karakter.

Gejala: di badan/kaki karakter muncul segitiga putih/biru besar bergerigi.
Penyebab: ke dalam mesh Body ikut tergabung kubus default (y -0.5..0.5) yang seluruh
vertex-nya di-skin ke tulang dummy "neutral_bone". Kubus itu tidak pernah dimaksudkan tampil.

Skrip ini membuang semua segitiga yang punya vertex berbobot ke neutral_bone, lalu menulis
ulang GLB di tempat. Aman dijalankan berulang (kalau sudah bersih, tidak ada yang berubah).

Pakai:  python3 tools/clean_glb.py assets/*.glb projects/*/GIBRIG_*.glb
"""
import json, struct, sys
import numpy as np

CT = {5121: 'u1', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def clean(path):
    raw = open(path, 'rb').read()
    jl = struct.unpack('<I', raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    bin_off = 20 + jl + 8
    bl = struct.unpack('<I', raw[20 + jl:24 + jl])[0]
    binb = bytearray(raw[bin_off:bin_off + bl])

    def read(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
        n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
        return np.frombuffer(binb, dtype=dt, count=a['count'] * n,
                             offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(a['count'], n)

    removed = 0
    for node in j['nodes']:
        if 'mesh' not in node or 'skin' not in node:
            continue
        joints = j['skins'][node['skin']]['joints']
        neutral = [k for k, nd in enumerate(joints) if 'neutral' in (j['nodes'][nd].get('name') or '').lower()]
        if not neutral:
            continue
        for prim in j['meshes'][node['mesh']]['primitives']:
            at = prim['attributes']
            if 'JOINTS_0' not in at or 'indices' not in prim:
                continue
            J, W = read(at['JOINTS_0']), read(at['WEIGHTS_0'])
            if W.dtype.kind in 'ui':
                W = W / np.iinfo(W.dtype).max
            bad = (W * np.isin(J, neutral)).sum(1) > 0.01
            if not bad.any():
                continue
            ia = j['accessors'][prim['indices']]
            idx = read(prim['indices']).reshape(-1, 3)
            keep = idx[~bad[idx].any(1)]
            if len(keep) == len(idx):
                continue
            removed += len(idx) - len(keep)
            bv = j['bufferViews'][ia['bufferView']]
            start = bv.get('byteOffset', 0) + ia.get('byteOffset', 0)
            data = keep.astype(np.dtype(CT[ia['componentType']])).tobytes()
            binb[start:start + len(data)] = data          # indeks baru lebih pendek, sisanya tak terpakai
            ia['count'] = int(keep.size)
            ia.pop('min', None); ia.pop('max', None)
            ia['min'] = [int(keep.min())]; ia['max'] = [int(keep.max())]
            bv['byteLength'] = len(data)
            bv.pop('byteStride', None)
    if not removed:
        print(f'{path}: bersih (tidak ada yang dibuang)')
        return
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(binb)
    out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js \
        + struct.pack('<II', len(binb), 0x004E4942) + bytes(binb)
    open(path, 'wb').write(out)
    print(f'{path}: buang {removed} segitiga nyasar')


if __name__ == '__main__':
    for p in sys.argv[1:]:
        clean(p)
