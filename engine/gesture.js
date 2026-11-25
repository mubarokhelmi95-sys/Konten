// Animasi prosedural untuk rig GLB (Idle asli hampir diam): napas, geser berat badan,
// kepala menengok pelan, dan gerak tangan + angguk saat karakter "bicara" (scene.json: "speaks").
// Semua tulang opsional: kalau satu tulang tidak ada, bagian itu dilewati.
import * as THREE from 'three';

const clamp01 = x => Math.min(1, Math.max(0, x));
const _q = new THREE.Quaternion(), _r = new THREE.Quaternion(), _a = new THREE.Vector3();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

// putar di sumbu MODEL (X = kiri karakter, Y = atas, Z = depan), ditumpuk di atas pose animasi
function rotW(rig, bone, axis, ang) {
  if (!bone || !ang) return;
  bone.parent.getWorldQuaternion(_q); rig.m.getWorldQuaternion(_r);
  _a.copy(axis).applyQuaternion(_r).applyQuaternion(_q.invert());
  bone.quaternion.premultiply(_r.setFromAxisAngle(_a, ang));
}

export function makeGesture(getSubs) {
  // 0..1: seberapa "sedang bicara" karakter ini pada waktu t (halus masuk/keluar 0,25 dtk)
  function speakEnv(o, t) {
    let ranges = o.speaks;
    if (ranges === true) ranges = (getSubs().cards || []).map(k => [k.t0, k.t1]);
    if (!Array.isArray(ranges)) return 0;
    let e = 0;
    for (const [a, b] of ranges) e = Math.max(e, clamp01((t - a) / 0.25) * clamp01((b - t) / 0.25));
    return e * e * (3 - 2 * e);
  }

  function gesture(rig, t) {
    const { B, o, ph } = rig, T = Math.PI * 2;
    const g = o.gesture === undefined || o.gesture === true ? 1 : +o.gesture;
    const s = speakEnv(o, t);
    const sw = Math.sin(t * T * 0.21 + ph), br = Math.sin(t * T * 0.28 + ph);

    // hidup terus: napas, geser berat badan, kepala menengok pelan
    rotW(rig, B.spine, AZ, sw * 0.018 * g); rotW(rig, B.spine, AX, br * 0.012 * g);
    rotW(rig, B.chest, AX, br * 0.016 * g);
    rotW(rig, B.neck, AY, Math.sin(t * T * 0.13 + ph * 1.3) * 0.07 * g);
    rotW(rig, B.head, AZ, Math.sin(t * T * 0.17 + ph * 0.6) * 0.025 * g);

    if (!s) return;
    // saat bicara: angguk-angguk kecil, badan sedikit condong, tangan dominan (kanan) menjelaskan,
    // tangan kiri ikut pelan dengan fase berlawanan
    const k = s * g;
    rotW(rig, B.head, AX, (0.03 + Math.sin(t * T * 1.35 + ph) * 0.05) * k);
    rotW(rig, B.head, AY, Math.sin(t * T * 0.45 + ph) * 0.06 * k);
    rotW(rig, B.chest, AX, -0.03 * k);

    const wave = (p, f) => Math.sin(t * T * f + p);
    // kanan: lengan atas maju + siku menekuk, naik-turun mengikuti ritme bicara
    rotW(rig, B.upperarmr, AX, -(0.30 + 0.12 * wave(ph, 0.55)) * k);
    rotW(rig, B.upperarmr, AZ, -0.10 * k);
    rotW(rig, B.forearmr, AX, -(0.85 + 0.30 * wave(ph + 1, 0.85)) * k);
    rotW(rig, B.handr, AX, 0.25 * wave(ph + 2, 1.7) * k);
    // kiri: lebih kecil
    rotW(rig, B.upperarml, AX, -(0.12 + 0.08 * wave(ph + 2.2, 0.5)) * k);
    rotW(rig, B.upperarml, AZ, 0.08 * k);
    rotW(rig, B.forearml, AX, -(0.45 + 0.20 * wave(ph + 3.1, 0.7)) * k);
  }

  return { gesture, speakEnv };
}
