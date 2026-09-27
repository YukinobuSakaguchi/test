// Renders reel.html frame-by-frame with headless Chromium and encodes MP4 via ffmpeg.
// Usage:
//   node render.cjs video [out.mp4]        full 15 s @ 60 fps (+ soundtrack.wav if present)
//   node render.cjs stills 0.8,3,7.5 [dir] PNG stills at the given times (sec)
const path = require('path'), fs = require('fs'), http = require('http'), { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const ROOT = __dirname, FPS = 60, DUR = 15;
const MIME = { '.html': 'text/html', '.ttf': 'font/ttf', '.wav': 'audio/wav' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const [mode = 'video', arg, arg2] = process.argv.slice(2);
  const srv = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto(`http://localhost:${srv.address().port}/reel.html?render=1`);
  await page.waitForFunction('window.READY === true', null, { timeout: 60000 });
  const shot = () => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });

  if (mode === 'stills') {
    const dir = arg2 || path.join(ROOT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const t of arg.split(',').map(Number)) {
      await page.evaluate(t => window.renderFrame(t), t);
      fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`), await shot());
    }
  } else {
    const outFile = arg || path.join(ROOT, 'showreel.mp4');
    const wav = path.join(ROOT, 'soundtrack.wav');
    const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
    if (fs.existsSync(wav)) args.push('-i', wav);
    args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-tune', 'animation');
    if (fs.existsSync(wav)) args.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
    args.push('-movflags', '+faststart', outFile);
    const ff = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'inherit'] });
    const N = FPS * DUR, t0 = Date.now();
    for (let f = 0; f < N; f++) {
      await page.evaluate(t => window.renderFrame(t), f / FPS);
      const buf = await shot();
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) process.stdout.write(`frame ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('wrote', outFile);
  }
  await browser.close(); srv.close();
})();
