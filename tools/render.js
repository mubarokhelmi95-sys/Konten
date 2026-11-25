// Render frame-per-frame dari engine/engine.html lewat Playwright.
// Contoh:
//   node tools/render.js --project projects/contoh --out frames --shard 0 --shards 4
//   node tools/render.js --project projects/contoh --out frames --preview     (setengah resolusi, tiap frame ke-3)
// Opsi: --w 720 --h 1280 --scale 1 --step 1 --max 0 (batas jumlah frame, 0 = semua)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const project = arg('project', 'projects/contoh');
const outDir = arg('out', 'frames');
const shard = +arg('shard', 0), shards = +arg('shards', 1);
const preview = !!arg('preview', false);
const scale = +arg('scale', preview ? 0.5 : 1);
const step = +arg('step', preview ? 3 : 1);
const maxFrames = +arg('max', 0);
const W = Math.round((+arg('w', 720)) * scale / 2) * 2;
const H = Math.round((+arg('h', 1280)) * scale / 2) * 2;

const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  await page.goto(`http://127.0.0.1:${port}/engine/engine.html?project=${project}&w=${W}&h=${H}`);
  await page.waitForFunction('window.__ready === true || window.__error', null, { timeout: 120000 });
  const err = await page.evaluate('window.__error');
  if (err) { console.error(err); process.exit(1); }
  const info = await page.evaluate('window.__info');
  const fps = info.fps;
  let total = Math.ceil(info.duration * fps / step);
  if (maxFrames) total = Math.min(total, maxFrames);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`render ${W}x${H} fps=${fps} step=${step} frames=${total} shard=${shard}/${shards}`);
  let n = 0;
  for (let k = shard; k < total; k += shards) {
    const t = k * step / fps;
    await page.evaluate(t => window.renderFrame(t), t);
    await page.screenshot({ path: path.join(outDir, String(k).padStart(6, '0') + '.jpg'), type: 'jpeg', quality: 93 });
    if (++n % 50 === 0) console.log(`  ${n} frame selesai (k=${k})`);
  }
  console.log('selesai, frame:', n);
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
