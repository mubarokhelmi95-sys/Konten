// "Look" cerah + bertekstur seperti video referensi.
//  - Karakter GLB tidak punya UV, jadi tekstur kain/rambut dibuat prosedural di shader
//    (noise 3D di ruang objek: menempel di badan, tidak "berenang" saat animasi).
//  - Prop latar yang sudah punya tekstur (map) diberi bump dari map-nya sendiri.
// Semua nilai bisa diatur dari scene.json -> palette (lihat README).
import * as THREE from 'three';

const GLSL_FUNCS = `
float bh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bn(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float bheight(vec3 p){ return bn(p) * 0.55 + bn(p * 2.7) * 0.30 + bn(p * 7.3) * 0.15; }
vec3 bperturb(vec3 sp, vec3 sn, vec2 dh, float fd){
  vec3 sx = normalize(dFdx(sp)), sy = normalize(dFdy(sp));
  vec3 r1 = cross(sy, sn), r2 = cross(sn, sx);
  float det = dot(sx, r1) * fd;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * sn - grad);
}`;

const f = n => Number(n).toFixed(4);

// bump = kekuatan tonjolan, freq = kerapatan butir (makin besar makin halus), tint = variasi warna (0..0.3)
export function texturize(mat, { bump = 2, freq = 140, tint = 0.08 } = {}) {
  if (!mat || !mat.isMeshStandardMaterial || bump <= 0) return;
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBP;\n' + GLSL_FUNCS)
      .replace('#include <color_fragment>',
        `#include <color_fragment>\ndiffuseColor.rgb *= 1.0 + (bheight(vBP * ${f(freq)}) - 0.5) * ${f(tint)};`)
      .replace('#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  float bh0 = bheight(vBP * ${f(freq)});
  vec2 dh = vec2(dFdx(bh0), dFdy(bh0)) * ${f(bump)};
  normal = bperturb(-vViewPosition, normal, dh, faceDirection);
}`);
  };
  mat.customProgramCacheKey = () => `tz${bump}_${freq}_${tint}`;
  mat.needsUpdate = true;
}

const SKIP = /eye|mouth|skin/i;          // mata, mulut, kulit tetap mulus
const HAIR = /hair|brow/i;

// Dipanggil untuk tiap model GLB setelah dimuat.
export function applyLook(model, o, pal) {
  const fabric = o.fabricBump ?? pal.fabricBump, freq = o.fabricFreq ?? pal.fabricFreq, prop = o.propBump ?? pal.propBump;
  model.traverse(c => {
    if (!c.isMesh) return;
    for (const mt of [].concat(c.material)) {
      if (!mt || !mt.isMeshStandardMaterial) continue;
      if (mt.map) {                                     // prop berteksur: bump dari map-nya
        if (prop > 0 && !mt.bumpMap) { mt.bumpMap = mt.map; mt.bumpScale = prop; mt.needsUpdate = true; }
        continue;
      }
      if (!c.geometry.attributes.uv && !SKIP.test(mt.name || '')) {   // karakter tanpa UV: shader prosedural
        if (HAIR.test(mt.name || '')) texturize(mt, { bump: fabric * 1.6, freq: freq * 1.4, tint: 0.14 });
        else texturize(mt, { bump: fabric, freq, tint: 0.08 });
      }
    }
  });
}
