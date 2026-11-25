// Tekstur prosedural untuk prefab/objek primitif (grass, asphalt, concrete, rubber, noise).
// Pakai di scene.json: {"type":"box", "tex":"asphalt", "tile":2}
import * as THREE from 'three';

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function valueNoise(cells, rnd) {
  const g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (u, v) => {
    const fx = u * cells, fy = v * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), X0 = x0 % cells, X1 = (x0 + 1) % cells, Y0 = y0 % cells, Y1 = (y0 + 1) % cells;
    const a = g[Y0 * cells + X0], b = g[Y0 * cells + X1], c = g[Y1 * cells + X0], d = g[Y1 * cells + X1];
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
}
const TEXP = {
  grass:    { cells: [6, 16, 48, 128], amp: [.35, .3, .2, .25], lo: .60, speck: 0,    bump: 1.6 },
  asphalt:  { cells: [8, 32, 96, 256], amp: [.15, .2, .3, .5],  lo: .55, speck: .045, bump: 1.0 },
  concrete: { cells: [4, 16, 64],      amp: [.3, .2, .15],      lo: .80, speck: .01,  bump: .6 },
  rubber:   { cells: [32, 96, 256],    amp: [.2, .3, .5],       lo: .72, speck: 0,    bump: .8 },
  noise:    { cells: [8, 32, 128],     amp: [.4, .3, .3],       lo: .75, speck: 0,    bump: .5 },
};
const texCache = {};
function detailTex(kind) {
  if (texCache[kind]) return texCache[kind];
  const P = TEXP[kind] || TEXP.noise, N = 256, rnd = mulberry(kind.length * 7919 + kind.charCodeAt(0));
  const ns = P.cells.map(c => valueNoise(c, rnd)), asum = P.amp.reduce((a, b) => a + b, 0);
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = N;
  const ctx = cvs.getContext('2d'), img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0; for (let i = 0; i < ns.length; i++) v += ns[i](x / N, y / N) * P.amp[i];
    v = P.lo + (1 - P.lo) * (v / asum);
    if (P.speck && rnd() < P.speck) v = Math.min(1, v + .25);
    const k = (y * N + x) * 4, g = Math.round(v * 255); img.data[k] = img.data[k + 1] = img.data[k + 2] = g; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cvs); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[kind] = t);
}
export function applyTex(m, o) {
  const t = detailTex(o.tex).clone(); t.needsUpdate = true;
  const tile = o.tile || 2, sz = o.size || [1, 1, 1];
  const rep = o.repeat || (o.type === 'box' ? [Math.max(1, sz[0] / tile), Math.max(1, sz[2] / tile)] : [4, 2]);
  t.repeat.set(rep[0], rep[1]);
  m.map = t; m.bumpMap = t; m.bumpScale = (TEXP[o.tex] || TEXP.noise).bump;
}
