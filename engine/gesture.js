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


// ---- aksi dari scene.json: "actions": [{"t0":18,"t1":21,"name":"gendong","hop":[3,0.2],"tired":0}] ----
const actEnv = (a, t) => { const e = clamp01((t - a.t0) / 0.25) * clamp01((a.t1 - t) / 0.25); return e * e * (3 - 2 * e); };
// pantulan lompat: dy = tinggi di udara, land = 1 saat mendarat (kaki menekuk)
export function hopState(o, t) {
  for (const a of o.actions || []) if (a.hop && t >= a.t0 && t < a.t1) {
    const ph = Math.abs(Math.sin(Math.PI * a.hop[0] * (t - a.t0))), e = actEnv(a, t);
    return { dy: a.hop[1] * ph * e, land: (1 - ph) * e };
  }
  return { dy: 0, land: 0 };
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


    // aksi terjadwal (gendong, lompat, kasih, angkat_bahu)
    const hs = hopState(o, t);
    if (rig.baseY === undefined) rig.baseY = rig.m.position.y;
    let drop = 0;
    for (const a of o.actions || []) {
      if (t < a.t0 || t >= a.t1) continue;
      const e = actEnv(a, t), kk = e * g;
      if (a.name === 'gendong') {                      // badan condong, tangan ke belakang menahan, lutut menekuk
        const tired = a.tired || 0, pulse = 0.5 + 0.5 * Math.sin(t * T * 0.9 + ph);
        const knee = 0.35 + 0.3 * tired * pulse + 0.8 * hs.land;
        rotW(rig, B.spine, AX, (0.22 + 0.08 * tired) * kk); rotW(rig, B.chest, AX, 0.12 * kk);
        rotW(rig, B.spine, AZ, Math.sin(t * T * 0.7 + ph) * 0.09 * tired * kk);
        rotW(rig, B.head, AX, -0.2 * kk); rotW(rig, B.head, AZ, Math.sin(t * T * 0.55) * 0.12 * tired * kk);
        for (const side of ['l', 'r']) {
          rotW(rig, B['upperarm' + side], AX, (0.9 + 0.1 * tired * pulse) * kk); rotW(rig, B['forearm' + side], AX, -0.3 * kk);
          rotW(rig, B['thigh' + side], AX, -knee * kk); rotW(rig, B['shin' + side], AX, (knee * 2) * kk);
        }
        drop += 0.9 * (1 - Math.cos(knee)) * kk;
      } else if (a.name === 'lompat') {                // lompat di tempat (kaki menekuk saat mendarat)
        const k = (0.15 + 0.6 * hs.land) * kk;
        for (const side of ['l', 'r']) { rotW(rig, B['thigh' + side], AX, -k); rotW(rig, B['shin' + side], AX, k * 2); }
        for (const side of ['l', 'r']) rotW(rig, B['upperarm' + side], AZ, (side === 'l' ? 1 : -1) * 0.5 * (1 - hs.land) * kk);
        drop += 0.9 * (1 - Math.cos(k)) ;
      } else if (a.name === 'kasih') {                 // mengulurkan tangan kanan memberi sesuatu
        rotW(rig, B.upperarmr, AX, -1.0 * kk); rotW(rig, B.forearmr, AX, -0.25 * kk);
        rotW(rig, B.spine, AX, 0.08 * kk);
      } else if (a.name === 'angkat_bahu') {           // bingung: bahu naik, telapak terbuka, kepala miring
        rotW(rig, B.claviclel, AZ, 0.22 * kk); rotW(rig, B.clavicler, AZ, -0.22 * kk);
        rotW(rig, B.forearml, AX, -0.9 * kk); rotW(rig, B.forearmr, AX, -0.9 * kk);
        rotW(rig, B.upperarml, AZ, 0.25 * kk); rotW(rig, B.upperarmr, AZ, -0.25 * kk);
        rotW(rig, B.head, AZ, Math.sin(t * T * 0.4) * 0.14 * kk);
      }
    }
    rig.m.position.y = rig.baseY - drop;
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
