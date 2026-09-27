// Renders reel.js frame-by-frame in headless Chromium and pipes PNGs to ffmpeg.
//   node render.cjs video  <ffmpeg> <audio.wav> <out.mp4>   full 15s @60fps
//   node render.cjs stills <outdir> 0.5 2.4 7.2 ...          single frames for review
//   node render.cjs cues   <cues.json>                       sound-design cue list for audio.py
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = __dirname;
const FPS = 60, DUR = 15, FRAMES = FPS * DUR;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function frameBuffer(page, f) {
  const b64 = await page.evaluate(n => { window.renderFrame(n); return document.getElementById('c').toDataURL('image/png').slice(22); }, f);
  return Buffer.from(b64, 'base64');
}

(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
  await page.evaluate(() => window.READY);

  if (mode === 'cues') {
    fs.writeFileSync(args[0], JSON.stringify(await page.evaluate(() => window.audioCues()), null, 1));
  } else if (mode === 'stills') {
    const dir = args[0]; fs.mkdirSync(dir, { recursive: true });
    for (const s of args.slice(1)) {
      const f = Math.round(parseFloat(s) * FPS);
      fs.writeFileSync(path.join(dir, `t${s.padStart(6, '0')}.png`), await frameBuffer(page, f));
    }
  } else if (mode === 'video') {
    const [ffmpeg, wav, mp4] = args;
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error',
      '-framerate', String(FPS), '-f', 'image2pipe', '-c:v', 'png', '-i', '-',
      '-i', wav,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-tune', 'animation',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < FRAMES; f++) {
      const buf = await frameBuffer(page, f);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${FRAMES}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('done', mp4);
  }
  await browser.close(); srv.close();
})();
