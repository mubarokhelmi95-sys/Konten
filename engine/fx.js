// Efek asap + api yang tampak nyata (pengganti bola abu-abu yang mirip balon).
//  - Ratusan sprite lunak bertekstur turbulensi (bukan bola solid): tiap gumpal lahir kecil & pekat,
//    naik melambat, membesar, memudar, berputar, terbawa angin.
//  - Stateless: posisi tiap partikel dihitung dari waktu t saja, jadi render frame-per-frame / shard tetap konsisten.
// Pakai di scene.json (tingkat atas):
//  "fx": [{ "kind":"smoke", "pos":[x,y,z], "t0":8, "t1":14, "rate":12, "life":5, "size":[0.4,2.8], "rise":1.1,
//           "spread":0.25, "swirl":0.4, "wind":[[8,[0.1,0,0]],[12,[1,0,0]]], "colors":["#2a2b2e","#aeb1b6"],
//           "opacity":0.6, "seed":3 },
//         { "kind":"fire", "pos":[x,y,z], "t0":8, "t1":10, "rate":34, "life":0.7, "size":[0.5,0.15], "rise":1.4,
//           "colors":["#ffe9a0","#ff4d06"], "light":7 }]
import * as THREE from 'three';
import { mulberry, valueNoise } from './proctex.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const cache = {};

function makeTex(key, N, px, blur = 0) {
  if (cache[key]) return cache[key];
  let G = new Float32Array(N * N), A = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [g, a] = px((x + 0.5) / N, (y + 0.5) / N); G[y * N + x] = g; A[y * N + x] = a; }
  for (let b = 0; b < blur; b++) for (const F of [G, A]) {           // blur 3x3 supaya tepi lembut (bukan kotak-kotak)
    const o = F.slice();
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      let sum = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) sum += o[(y + j) * N + x + i];
      F[y * N + x] = sum / 9;
    }
  }
  const c = document.createElement('canvas'); c.width = c.height = N;
  const ctx = c.getContext('2d'), img = ctx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const k = i * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(clamp(G[i]) * 255); img.data[k + 3] = Math.round(clamp(A[i]) * 255);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (cache[key] = t);
}

// gumpalan asap: tepi bergerigi turbulen, bagian terang di kiri-atas (cahaya), gelap di kanan-bawah
function smokeTex(v) {
  return makeTex('s' + v, 128, (() => {
    const rnd = mulberry(4242 + v * 131), n1 = valueNoise(5, rnd), n2 = valueNoise(11, rnd), n3 = valueNoise(23, rnd);
    const fbm = (x, y) => n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15;
    return (x, y) => {
      const dx = x - 0.5, dy = y - 0.5, f = fbm(x, y);
      const r = Math.hypot(dx, dy) * 2 + (n2((x + 0.37) % 1, (y + 0.61) % 1) - 0.5) * 0.5;
      const m = 1 - sstep(0.4, 1.0, r);
      const a = sstep(0.0, 0.7, m * 0.85 + (f - 0.5) * 0.9 + 0.05) * m;
      const l = 0.5 - (dx + dy) * 0.9 + (f - 0.5) * 0.9;
      return [0.45 + 0.55 * clamp(l), a];
    };
  })(), 2);
}

// lidah api: lebar di bawah, runcing di atas, tepi bergelombang
function fireTex(v) {
  return makeTex('f' + v, 128, (() => {
    const rnd = mulberry(777 + v * 53), n1 = valueNoise(6, rnd), n2 = valueNoise(14, rnd);
    return (x, y) => {
      const wob = (n1(x, y) - 0.5) * 0.22 + (n2(x, y) - 0.5) * 0.1;
      const wx = 0.3 * (0.16 + 0.84 * sstep(0, 0.8, y)), dx = (x - 0.5 + wob * (1 - y * 0.5)) / wx, dy = (y - 0.6) / 0.5;
      const i = Math.pow(clamp(1 - (dx * dx + dy * dy)), 1.4);
      return [i, i];
    };
  })());
}

export function buildFx(scn, list) {
  const ems = [];
  (list || []).forEach((e, ei) => {
    const fire = e.kind === 'fire', rate = e.rate || (fire ? 30 : 12), life0 = e.life || (fire ? 0.7 : 4);
    const n = Math.max(1, Math.floor((e.t1 - e.t0) * rate)), rnd = mulberry((e.seed || 1) * 9973 + ei * 31);
    const col = (e.colors || (fire ? ['#ffe9a0', '#ff4d06'] : ['#2a2b2e', '#aeb1b6'])).map(c => new THREE.Color(c));
    const parts = [];
    for (let i = 0; i < n; i++) {
      const ang = rnd() * 6.2832, rad = Math.sqrt(rnd()) * (e.spread ?? 0.2);
      const mat = new THREE.SpriteMaterial({
        map: (fire ? fireTex : smokeTex)(Math.floor(rnd() * 4)), transparent: true, depthWrite: false,
        blending: fire ? THREE.AdditiveBlending : THREE.NormalBlending, color: col[0].clone() });
      const sp = new THREE.Sprite(mat); sp.visible = false; scn.add(sp);
      parts.push({ sp, mat, birth: e.t0 + i / rate + rnd() / rate * 0.8, life: life0 * (0.85 + rnd() * 0.3),
        ox: Math.cos(ang) * rad, oz: Math.sin(ang) * rad, sj: 0.8 + rnd() * 0.45, rot0: rnd() * 6.2832,
        spin: (rnd() - 0.5) * 0.7, ph: rnd() * 6.2832, br: 0.9 + rnd() * 0.2 });
    }
    let light = null;
    if (fire && e.light) { light = new THREE.PointLight(new THREE.Color(e.lightColor || '#ff8a2a'), 0, e.lightDist || 6, 2); light.position.set(e.pos[0], e.pos[1] + 0.5, e.pos[2] + 0.4); scn.add(light); }
    ems.push({ e, fire, parts, col, light });
  });

  function windAt(w, t) {
    if (!w) return [0, 0, 0];
    if (typeof w[0] === 'number') return w;
    if (t <= w[0][0]) return w[0][1];
    for (let i = 0; i < w.length - 1; i++) if (t < w[i + 1][0]) {
      const u = (t - w[i][0]) / (w[i + 1][0] - w[i][0]);
      return w[i][1].map((v, k) => v + (w[i + 1][1][k] - v) * u);
    }
    return w[w.length - 1][1];
  }

  function update(t) {
    for (const { e, fire, parts, col, light } of ems) {
      const [s0, s1] = e.size || (fire ? [0.5, 0.15] : [0.4, 2.6]), rise = e.rise ?? (fire ? 1.4 : 1.1);
      const swirl = e.swirl ?? (fire ? 0.06 : 0.35), op = e.opacity ?? (fire ? 1 : 0.55), str = e.stretch ?? (fire ? 1.6 : 1);
      for (const p of parts) {
        const age = t - p.birth;
        if (age < 0 || age > p.life) { p.sp.visible = false; continue; }
        const a = age / p.life, grow = sstep(0, e.ramp ?? 0.6, p.birth - e.t0), endk = sstep(0, 0.6, e.t1 - p.birth), kk = grow * endk;
        let wx = 0, wy = 0, wz = 0; const K = 8;
        for (let k = 0; k < K; k++) {
          const tau = p.birth + (k + 0.5) / K * age, w = windAt(e.wind, tau), f = (0.25 + 0.75 * ((tau - p.birth) / p.life)) * age / K;
          wx += w[0] * f; wy += w[1] * f; wz += w[2] * f;
        }
        p.sp.position.set(
          e.pos[0] + p.ox * (1 + 0.5 * a) + wx + Math.sin(age * 1.3 + p.ph) * swirl * a,
          e.pos[1] + rise * age * (1 - 0.3 * a) + wy,
          e.pos[2] + p.oz * (1 + 0.5 * a) + wz + Math.cos(age * 1.1 + p.ph * 1.7) * swirl * a);
        let s = (s0 + (s1 - s0) * (1 - (1 - a) * (1 - a))) * p.sj;
        let o;
        if (fire) {
          const fl = 0.85 + 0.3 * Math.sin(age * 18 + p.ph * 3);
          s *= (0.3 + 0.7 * kk) * fl; o = op * (1 - sstep(0.35, 1, a)) * (0.3 + 0.7 * kk);
          p.sp.position.x += Math.sin(age * 14 + p.ph) * 0.05 * s;
        } else {
          o = op * sstep(0, 0.1, a) * (1 - sstep(0.5, 1, a)) * (0.25 + 0.75 * grow);
        }
        p.sp.scale.set(s, s * str, 1);
        p.mat.rotation = fire ? Math.sin(age * 9 + p.ph) * 0.12 : p.rot0 + p.spin * age;
        p.mat.opacity = clamp(o);
        p.mat.color.copy(col[0]).lerp(col[1], fire ? clamp(a * 1.3) : sstep(0, 0.85, a));
        if (!fire) p.mat.color.multiplyScalar(p.br);
        p.sp.visible = o > 0.003;
      }
      if (light) {
        const on = sstep(e.t0, e.t0 + 0.4, t) * (1 - sstep(e.t1 - 0.4, e.t1 + 0.2, t));
        light.intensity = e.light * on * (0.78 + 0.22 * Math.sin(t * 23) + 0.1 * Math.sin(t * 37 + 1));
      }
    }
  }
  return { update };
}
