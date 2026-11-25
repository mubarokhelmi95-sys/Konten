// Lihat isi file GLB tanpa dependensi: node tools/inspect_glb.js assets/orang.glb
const fs = require('fs');
const f = process.argv[2];
if (!f) { console.error('pakai: node tools/inspect_glb.js file.glb'); process.exit(1); }
const b = fs.readFileSync(f);
if (b.readUInt32LE(0) !== 0x46546c67) { console.error('bukan file GLB'); process.exit(1); }
const jsonLen = b.readUInt32LE(12);
const g = JSON.parse(b.slice(20, 20 + jsonLen).toString('utf8'));
console.log(`${f}: ${(b.length / 1e6).toFixed(1)} MB`);
console.log('scene node:', (g.nodes || []).length, '| mesh:', (g.meshes || []).length, '| material:', (g.materials || []).length,
  '| skin:', (g.skins || []).length, '| texture:', (g.textures || []).length);
console.log('animasi:', (g.animations || []).map((a, i) => `${i}:${a.name || '(tanpa nama)'}`).join(', ') || '(tidak ada)');
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (const m of g.meshes || []) for (const p of m.primitives) {
  const a = g.accessors[p.attributes.POSITION]; if (!a || !a.min) continue;
  for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); }
}
console.log('ukuran kasar (belum termasuk skala node):', mx.map((v, i) => (v - mn[i]).toFixed(2)).join(' x '), '(x y z)');
console.log('nama node (20 pertama):', (g.nodes || []).slice(0, 20).map(n => n.name).filter(Boolean).join(', '));
