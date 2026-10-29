// 全スライドの「完成状態」を1920x1080で撮影し、はみ出し・重なり・最小文字サイズを検査する。
// 使い方（security-deck フォルダで）:
//   cd tools && npm install && cd ..
//   node tools/qa2.js 2026-10-28_個人のセキュリティ対策.html shots
// 第1引数: HTMLのパス / 第2引数: 画像の保存先フォルダ（無ければ作る）
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const file = path.resolve(process.argv[2] || '2026-10-28_個人のセキュリティ対策.html');
  const outDir = path.resolve(process.argv[3] || 'shots');
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto(require('url').pathToFileURL(file).href);
  await p.waitForFunction(() => window.__manualReady === true);
  const n = await p.evaluate(() => window.__count());
  let problems = 0;
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => window.__go(i, true), i);
    await p.waitForTimeout(80);
    const res = await p.evaluate((i) => {
      const s = document.querySelectorAll('.slide')[i];
      const sr = s.getBoundingClientRect();
      const issues = []; let maxBottom = 0, minTop = 1e9, minFont = 999;
      const skip = el => el.closest('.src,.foot-l,.foot-r,.ghost,.eyebrow');
      s.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none') return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const x0 = r.left - sr.left, x1 = r.right - sr.left, y0 = r.top - sr.top, y1 = r.bottom - sr.top;
        if (!skip(el)) {
          if (el.children.length === 0 || el.tagName === 'IMG') { maxBottom = Math.max(maxBottom, y1); minTop = Math.min(minTop, y0); }
          if (x0 < 60 || x1 > 1860) issues.push(`x-out ${el.className || el.tagName} ${Math.round(x0)}-${Math.round(x1)}`);
          if (el.children.length === 0 && el.tagName !== 'IMG' && (el.textContent || '').trim()) {
            const fs = parseFloat(cs.fontSize); if (fs < minFont) minFont = fs;
          }
        }
        if (el.children.length === 0 && el.tagName !== 'IMG' && el.scrollWidth > el.clientWidth + 2 && !el.closest('.src')) issues.push(`textOverflow ${el.className}`);
      });
      const src = s.querySelector('.src');
      if (src) {
        const r = src.getBoundingClientRect();
        if (r.right - sr.left > 1840) issues.push('src too wide ' + Math.round(r.right - sr.left));
        if (r.height > 40) issues.push('src wraps h=' + Math.round(r.height));
        if (maxBottom > r.top - sr.top - 6) issues.push(`content(${Math.round(maxBottom)}) hits src(${Math.round(r.top - sr.top)})`);
      } else if (maxBottom > 985 - 40) issues.push(`content bottom ${Math.round(maxBottom)}`);
      if (minTop < 40) issues.push(`content top ${Math.round(minTop)}`);
      return { top: Math.round(minTop), bottom: Math.round(maxBottom), minFont, issues };
    }, i);
    problems += res.issues.length;
    console.log(`slide ${String(i + 1).padStart(2)}:`, JSON.stringify(res));
    await p.screenshot({ path: path.join(outDir, `s${String(i + 1).padStart(2, '0')}.png`) });
  }
  console.log('errors:', errs);
  console.log(problems === 0 && errs.length === 0 ? 'RESULT: PASS（問題0件）' : `RESULT: FAIL（問題 ${problems} 件 / エラー ${errs.length} 件）`);
  await b.close();
  process.exit(problems === 0 && errs.length === 0 ? 0 : 1);
})();
