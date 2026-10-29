// 手動めくりの動作検査（自動で進まない／キー・クリック・Home/End・再読み込み）。
// 使い方（security-deck フォルダで）:  node tools/nav.js 2026-10-28_個人のセキュリティ対策.html
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = path.resolve(process.argv[2] || '2026-10-28_個人のセキュリティ対策.html');
  const url = require('url').pathToFileURL(file).href;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__manualReady === true);
  const state = () => p.evaluate(() => ({
    cur: window.__cur() + 1,
    shown: [...document.querySelectorAll('.slide')].map((s, i) => getComputedStyle(s).display !== 'none' ? i + 1 : 0).filter(Boolean).join('+'),
  }));
  let fails = 0;
  const check = async (label, expectCur) => {
    const s = await state();
    const ok = s.cur === expectCur;
    if (!ok) fails++;
    console.log((ok ? 'OK  ' : 'FAIL').padEnd(5), label.padEnd(34), JSON.stringify(s));
  };
  await p.waitForTimeout(12000); await check('12秒放置（自動で進まない）', 1);
  await p.keyboard.press('Space'); await p.waitForTimeout(2500); await check('Space で2枚目', 2);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(2500); await check('→ で3枚目', 3);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300); await check('← で2枚目', 2);
  await p.mouse.click(1000, 400); await p.waitForTimeout(2500); await check('右側クリックで3枚目', 3);
  await p.mouse.click(100, 400); await p.waitForTimeout(300); await check('左側クリックで2枚目', 2);
  const n = await p.evaluate(() => window.__count());
  await p.keyboard.press('End'); await p.waitForTimeout(300); await check('End で最後', n);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); await check('最後で → （止まる）', n);
  await p.keyboard.press('Home'); await p.waitForTimeout(300); await check('Home で最初', 1);
  await p.keyboard.press('PageDown'); await p.waitForTimeout(2500); await check('PageDown で2枚目', 2);
  await p.reload(); await p.waitForFunction(() => window.__manualReady === true); await p.waitForTimeout(300);
  await check('再読み込み（#2 から再開）', 2);
  console.log('errors:', errs);
  console.log(fails === 0 && errs.length === 0 ? 'RESULT: PASS' : `RESULT: FAIL（失敗 ${fails} 件 / エラー ${errs.length} 件）`);
  await b.close();
  process.exit(fails === 0 && errs.length === 0 ? 0 : 1);
})();
