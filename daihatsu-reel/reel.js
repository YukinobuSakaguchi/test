'use strict';
// DAIHATSU — 15s motion reel. Pure Canvas2D, deterministic: renderFrame(n) always draws the same image.
// Timeline is locked to 128 BPM: 1 beat = 0.46875s, 1 bar = 1.875s, 8 bars = 15s.

const W = 1920, H = 1080, FPS = 60, DUR = 15;
const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4;
const C = { red: '#E60012', deep: '#B0000E', ink: '#0A0A0C', white: '#F3F1EC', grey: '#8C8C92', dark: '#1B1B20' };
const JP = 'NotoJP', LAT = 'Archivo', MONO = 'JBMono';

// Key moments (seconds)
const T_IMPACT = 5 * BEAT;          // 大 × 発 collide
const T_S2 = 2 * BAR;               // heritage
const T_S3 = 3 * BAR;               // packaging
const T_S4 = 5 * BAR;               // life cards
const T_DROP = 7 * BAR;             // finale

const cv = document.getElementById('c');
const out = cv.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const ctx = buf.getContext('2d');
const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
const tctx = tmp.getContext('2d');

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  inCubic: x => x * x * x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outQuint: x => 1 - Math.pow(1 - x, 5),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
function hash(n) {
  n = Math.imul(n ^ 0x9E3779B9, 0x85EBCA6B); n ^= n >>> 13;
  n = Math.imul(n, 0xC2B2AE35); n ^= n >>> 16; return (n >>> 0) / 4294967296;
}
const rnd = (i, j = 0) => hash(i * 7919 + j * 104729 + 13);

// ---------- drawing helpers ----------
function bg(c) { ctx.fillStyle = c; ctx.fillRect(-300, -300, W + 600, H + 600); }
function fnt(f, w, s) { return `${w} ${s}px ${f}`; }

function text(str, x, y, o = {}) {
  ctx.save();
  ctx.globalAlpha *= (o.a ?? 1);
  ctx.font = fnt(o.f || JP, o.w || 900, o.s || 100);
  ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.fillStyle = o.c || C.white;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.fillText(str, x + (o.align === 'center' ? (o.ls || 0) / 2 : 0), y);
  ctx.restore();
}

// Masked slide-up reveal (p: 0→1 in, q: 0→1 out). y is the baseline.
function reveal(str, x, y, p, o = {}) {
  const q = o.q || 0;
  if (p <= 0 || q >= 1) return;
  const s = o.s || 100, align = o.align || 'left';
  ctx.save();
  ctx.font = fnt(o.f || JP, o.w || 900, s);
  ctx.letterSpacing = (o.ls || 0) + 'px';
  const tw = ctx.measureText(str).width;
  const x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  ctx.beginPath(); ctx.rect(x0 - s * 0.3, y - s * 0.98, tw + s * 0.6, s * 1.3); ctx.clip();
  const dy = (1 - E.outExpo(clamp(p))) * s * 1.3 - E.inExpo(clamp(q)) * s * 1.3;
  text(str, x, y + dy, o);
  ctx.restore();
}

// Typewriter with a block cursor
function typeOn(str, x, y, p, o = {}) {
  if (p <= 0) return;
  const n = Math.floor(str.length * clamp(p));
  text(str.slice(0, n), x, y, o);
  if (p < 1) {
    ctx.save(); ctx.font = fnt(o.f || MONO, o.w || 500, o.s || 20); ctx.letterSpacing = (o.ls || 0) + 'px';
    const w = ctx.measureText(str.slice(0, n)).width; ctx.restore();
    ctx.fillStyle = o.cc || C.red; ctx.fillRect(x + w + 2, y - (o.s || 20) * 0.8, (o.s || 20) * 0.55, (o.s || 20) * 0.95);
  }
}

function grid(t, color, alpha, step = 60, drift = 0) {
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha *= alpha; ctx.lineWidth = 1;
  const ox = (t * drift) % step;
  ctx.beginPath();
  for (let x = -step + ox; x < W + step; x += step) { ctx.moveTo(x, -50); ctx.lineTo(x, H + 50); }
  for (let y = 0; y < H + step; y += step) { ctx.moveTo(-50, y); ctx.lineTo(W + 50, y); }
  ctx.stroke(); ctx.restore();
}

// Draw a polyline up to progress p (0..1) of its length. tf maps model → screen.
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function drawPoly(pts, p, tf, stroke = true) {
  if (p <= 0) return;
  const L = polyLen(pts) * clamp(p);
  let acc = 0;
  ctx.beginPath();
  let [x0, y0] = tf(pts[0]); ctx.moveTo(x0, y0);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= L) {
      const k = seg ? (L - acc) / seg : 0;
      const [x, y] = tf([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]); ctx.lineTo(x, y); break;
    }
    const [x, y] = tf(b); ctx.lineTo(x, y); acc += seg;
  }
  if (stroke) ctx.stroke();
}
function arcPts(cx, cy, r, a0, a1, n) {
  const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p;
}
const fmt = n => Math.round(n).toLocaleString('en-US');

// ---------- camera shake ----------
const HITS = [[T_IMPACT, 30], [T_DROP, 38]];
for (let i = 0; i < 6; i++) HITS.push([T_S4 + i * BEAT, 9]);
function shake(t) {
  let x = 0, y = 0;
  for (const [th, amp] of HITS) {
    if (t < th) continue;
    const d = t - th, a = amp * Math.exp(-d * 9);
    if (a < .05) continue;
    x += a * Math.sin(d * 93 + th * 7); y += a * Math.cos(d * 71 + th * 3);
  }
  return { x, y };
}

// =====================================================================
// SCENE 1 — ORIGIN : 大阪 + 発動機 → 大発 → ダイハツ
// =====================================================================
const S1 = { size: 230, y: 520 };
const S1_CHARS = [
  { ch: '大', x: 443, key: true, target: 848 },
  { ch: '阪', x: 677 },
  { ch: '発', x: 1095, key: true, target: 1072 },
  { ch: '動', x: 1330 },
  { ch: '機', x: 1565 },
];
const KATA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

function s1(t) {
  bg(C.ink);
  grid(t, C.white, 0.045 * E.outCubic(P(t, 0, 0.6)), 60, 20);

  const s = S1.size, cy = S1.y;
  // opening dot → line → becomes underline
  const lineIn = E.outExpo(P(t, 0.12, 0.62));
  const lineOut = E.inOutExpo(P(t, 1.3, 1.75));
  const lineY = lerp(540, 690, E.inOutExpo(P(t, 0.3, 0.7)));
  const dotR = 10 * E.outBack(P(t, 0, 0.25)) * (1 - lineIn);
  if (dotR > 0.1) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(960, 540, dotR, 0, 7); ctx.fill(); }
  const lw = 1500 * lineIn * (1 - lineOut);
  if (lw > 1) { ctx.fillStyle = C.red; ctx.fillRect(960 - lw / 2, lineY - 3, lw, 6); }

  // small captions
  const capOut = P(t, 1.3, 1.5);
  reveal('ORIGIN OF THE NAME', 960, 300, P(t, 0.55, 0.95), { f: MONO, w: 500, s: 22, ls: 8, align: 'center', c: C.grey, q: capOut });
  reveal('OSAKA', 560, 750, P(t, 0.75, 1.1), { f: MONO, w: 500, s: 24, ls: 10, align: 'center', c: C.white, q: capOut });
  reveal('HATSUDOKI — ENGINE', 1330, 750, P(t, 0.8, 1.15), { f: MONO, w: 500, s: 24, ls: 10, align: 'center', c: C.white, q: capOut });

  // characters
  const pre = E.outCubic(P(t, 1.55, 1.875));      // anticipation apart
  const rush = E.inExpo(P(t, 1.875, T_IMPACT));    // accelerate into each other
  const after = t >= T_IMPACT;
  const exitP = P(t, 2.78, 3.0);
  S1_CHARS.forEach((c, k) => {
    const p = P(t, 0.32 + k * 0.07, 0.32 + k * 0.07 + 0.55);
    if (p <= 0) return;
    let x = c.x, y = cy, alpha = 1, col = C.white, sc = 1;
    if (!c.key) {
      const d = P(t, 1.35, 1.7);
      alpha = 1 - E.inCubic(d); y += E.inCubic(d) * 90; sc = 1 - 0.15 * d;
      if (alpha <= 0) return;
    } else {
      const f = P(t, 1.35, 1.6);
      if (f > 0 && (f > 0.6 || Math.floor(f * 10) % 2 === 0)) col = C.red;
      const dir = c.ch === '大' ? -1 : 1;
      x = c.x + dir * 36 * pre;
      x = lerp(x, c.target, rush);
      if (after) {
        x = c.target; col = C.red;
        const k2 = E.outBack(P(t, T_IMPACT, T_IMPACT + 0.35));
        sc = lerp(1.25, 1.05, k2);
      } else sc = 1 + 0.2 * rush;
    }
    const inY = (1 - E.outExpo(p)) * s * 1.25;
    const outY = E.inExpo(exitP) * s * 1.4;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - s * 0.8, cy - s * 0.66, s * 1.6, s * 1.32); ctx.clip();
    ctx.translate(x, y + inY - outY); ctx.scale(sc, sc);
    ctx.globalAlpha = alpha; ctx.fillStyle = col;
    ctx.font = fnt(JP, 900, s); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  });

  // impact FX
  if (after) {
    const p = P(t, T_IMPACT, T_IMPACT + 0.75);
    for (let r = 0; r < 2; r++) {
      const pr = P(t, T_IMPACT + r * 0.08, T_IMPACT + 0.75 + r * 0.08);
      if (pr <= 0 || pr >= 1) continue;
      ctx.strokeStyle = r ? C.white : C.red; ctx.lineWidth = 36 * (1 - pr);
      ctx.beginPath(); ctx.arc(960, cy, 60 + E.outExpo(pr) * 1000, 0, 7); ctx.stroke();
    }
    if (p < 1) {
      for (let i = 0; i < 70; i++) {
        const a = rnd(i) * Math.PI * 2, d = 250 + rnd(i, 1) * 800, sz = 4 + rnd(i, 2) * 14;
        const k = E.outExpo(p);
        ctx.save(); ctx.globalAlpha = 1 - p * p;
        ctx.translate(960 + Math.cos(a) * d * k, cy + Math.sin(a) * d * k * 0.7);
        ctx.rotate(a + p * 6 * (rnd(i, 3) - .5));
        ctx.fillStyle = i % 3 ? C.red : C.white; ctx.fillRect(-sz / 2, -sz / 6, sz, sz / 3);
        ctx.restore();
      }
    }
    const lp = P(t, T_IMPACT + 0.1, T_IMPACT + 0.45);
    reveal('大阪の「大」＋ 発動機の「発」', 960, 740, lp, { f: JP, w: 400, s: 36, align: 'center', c: C.white, q: P(t, 2.75, 2.95) });
  }

  // katakana scramble → ダイハツ, then wordmark
  if (t > 2.88) {
    const word = 'ダイハツ', ks = 200;
    for (let k = 0; k < 4; k++) {
      const st = 2.9 + k * 0.04, settle = 3.02 + k * 0.07;
      if (t < st) continue;
      const x = 960 + (k - 1.5) * 212;
      const settled = t >= settle;
      const ch = settled ? word[k] : KATA[Math.floor(rnd(k, Math.floor(t * 40)) * KATA.length)];
      const pop = E.outBack(P(t, settle, settle + 0.18));
      ctx.save(); ctx.translate(x, 480);
      const sc = settled ? lerp(1.18, 1, pop) : 1; ctx.scale(sc, sc);
      ctx.font = fnt(JP, 900, ks); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = settled ? (k < 2 ? C.red : C.white) : C.grey;
      if (!settled) ctx.globalAlpha = 0.8;
      ctx.fillText(ch, 0, 0); ctx.restore();
    }
    reveal('DAIHATSU', 960, 700, P(t, 3.12, 3.5), { f: LAT, w: 900, s: 96, ls: 34, align: 'center', c: C.white });
    const bw = 700 * E.inOutExpo(P(t, 3.22, 3.62));
    ctx.fillStyle = C.red; ctx.fillRect(960 - bw / 2, 740, bw, 8);
    reveal('SINCE 1907 — OSAKA, JAPAN', 960, 800, P(t, 3.3, 3.62), { f: MONO, w: 500, s: 22, ls: 8, align: 'center', c: C.grey });
  }
}

// =====================================================================
// SCENE 2 — HERITAGE : odometer 1907 → 2026
// =====================================================================
const YEAR_KEYS = [[3.62, 1907], [4.02, 1907], [4.38, 1951], [4.6, 1951], [4.76, 1957], [5.0, 1957], [5.42, 2026]];
function yearAt(t) {
  if (t <= YEAR_KEYS[0][0]) return YEAR_KEYS[0][1];
  for (let i = 1; i < YEAR_KEYS.length; i++) {
    const [t1, y1] = YEAR_KEYS[i];
    if (t <= t1) { const [t0, y0] = YEAR_KEYS[i - 1]; return lerp(y0, y1, E.inOutCubic(P(t, t0, t1))); }
  }
  return YEAR_KEYS[YEAR_KEYS.length - 1][1];
}
const MILESTONES = [
  { y: 1907, a: 3.72, b: 4.04, jp: '発動機製造株式会社 創立', en: 'HATSUDOKI SEIZO CO., LTD. FOUNDED — OSAKA' },
  { y: 1951, a: 4.36, b: 4.62, jp: 'ダイハツ工業株式会社へ社名変更', en: 'RENAMED DAIHATSU MOTOR CO., LTD.' },
  { y: 1957, a: 4.74, b: 5.02, jp: '軽三輪トラック「ミゼット」発売', en: 'MIDGET — THE LITTLE THREE-WHEELER' },
  { y: 2026, a: 5.38, b: 9.0, jp: '小さなクルマの、その先へ。', en: 'SMALL CARS. BIG FUTURE.' },
];

function odometer(Y, cx, cy, size, color) {
  ctx.save();
  ctx.font = fnt(LAT, 900, size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cw = ctx.measureText('0').width * 1.02, ch = size * 0.86;
  for (let k = 3; k >= 0; k--) {
    const p10 = Math.pow(10, k);
    const d = Math.floor(Y / p10) % 10;
    const frac = k === 0 ? Y - Math.floor(Y) : clamp((Y % p10) - (p10 - 1));
    const x = cx + (1.5 - k) * cw;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - cw / 2, cy - ch / 2, cw, ch); ctx.clip();
    ctx.fillStyle = color;
    ctx.fillText(String(d), x, cy - frac * ch + size * 0.04);
    ctx.fillText(String((d + 1) % 10), x, cy + (1 - frac) * ch + size * 0.04);
    ctx.restore();
  }
  ctx.restore();
}

function s2(t) {
  bg(C.white);
  grid(t, C.ink, 0.05, 60, -30);
  const Y = yearAt(t);
  // ruler
  const ry = 790, ppy = 64;
  ctx.save();
  ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-50, ry); ctx.lineTo(W + 50, ry); ctx.stroke();
  const y0 = Math.floor(Y - 17), y1 = Math.ceil(Y + 17);
  ctx.font = fnt(MONO, 500, 20); ctx.textAlign = 'center';
  for (let yr = y0; yr <= y1; yr++) {
    const x = 960 + (yr - Y) * ppy;
    const h = yr % 10 === 0 ? 46 : yr % 5 === 0 ? 28 : 14;
    ctx.globalAlpha = 1 - Math.pow(Math.abs(x - 960) / 1000, 2);
    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry - h); ctx.stroke();
    if (yr % 10 === 0) ctx.fillText(String(yr), x, ry + 38);
    if (MILESTONES.some(m => m.y === yr)) {
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x, ry, 9, 0, 7); ctx.fill(); ctx.fillStyle = C.ink;
    }
  }
  ctx.restore();
  // center indicator
  ctx.fillStyle = C.red;
  ctx.fillRect(958, ry - 90, 4, 110);
  ctx.beginPath(); ctx.moveTo(946, ry - 104); ctx.lineTo(974, ry - 104); ctx.lineTo(960, ry - 86); ctx.fill();

  // odometer
  odometer(Y, 960, 520, 330, C.ink);

  // speed streak when moving fast
  const v = Math.abs(yearAt(t + 0.01) - yearAt(t - 0.01)) / 0.02;
  if (v > 10) {
    ctx.save(); ctx.globalAlpha = clamp((v - 10) / 200) * 0.9; ctx.fillStyle = C.red;
    for (let i = 0; i < 9; i++) {
      const yy = 380 + rnd(i, 5) * 300, len = 200 + rnd(i, 6) * 700, xx = ((t * 3000 + rnd(i, 7) * W * 2) % (W + len)) - len;
      ctx.fillRect(W - xx, yy, len, 3);
    }
    ctx.restore();
  }

  for (const m of MILESTONES) {
    const p = P(t, m.a, m.a + 0.2), q = P(t, m.b, m.b + 0.1);
    reveal(m.jp, 960, 270, p, { f: JP, w: 900, s: 50, align: 'center', c: C.ink, q });
    reveal(m.en, 960, 320, P(t, m.a + 0.04, m.a + 0.26), { f: MONO, w: 500, s: 20, ls: 6, align: 'center', c: C.red, q });
  }
}

// =====================================================================
// SCENE 3 — PACKAGING : kei-car blueprint
// =====================================================================
// Generic tall-wagon kei car (original design, model units = mm, y up). Front faces left.
const CAR = (() => {
  const body = [[0, 300], [0, 620], [40, 720], [160, 860], [560, 960], [1180, 1690], [1300, 1740], [3200, 1745], [3330, 1700], [3395, 1550], [3395, 380], [3360, 300], [3345, 300],
    ...arcPts(3000, 285, 345, 0, Math.PI, 28), [2655, 300], [885, 300], ...arcPts(540, 285, 345, 0, Math.PI, 28), [195, 300], [0, 300]];
  const windows = [
    [[730, 1090], [1206, 1650], [1300, 1690], [1880, 1690], [1880, 1090], [730, 1090]],
    [[1960, 1090], [1960, 1690], [2720, 1690], [2720, 1090], [1960, 1090]],
    [[2800, 1090], [2800, 1690], [3180, 1690], [3290, 1620], [3300, 1090], [2800, 1090]],
  ];
  const details = [
    [[900, 400], [880, 1090]], [[1920, 380], [1920, 1090]], [[2760, 380], [2760, 1090]],
    [[885, 380], [2655, 380]], [[640, 1050], [3350, 1050]],
    [[30, 760], [150, 860], [430, 930], [470, 860], [120, 740], [30, 760]],
    [[3352, 1150], [3395, 1150], [3395, 1480], [3352, 1480], [3352, 1150]],
    [[1080, 1100], [1180, 1100], [1200, 1200], [1090, 1190], [1080, 1100]],
    [[1700, 960], [1800, 960]], [[2560, 960], [2660, 960]],
  ];
  const wheels = [[540, 285], [3000, 285]];
  const front = {
    body: [[-737, 300], [-737, 1000], [-690, 1080], [-600, 1680], [-520, 1745], [520, 1745], [600, 1680], [690, 1080], [737, 1000], [737, 300], [-737, 300]],
    glass: [[-610, 1130], [-540, 1640], [540, 1640], [610, 1130], [-610, 1130]],
    parts: [
      [[-690, 760], [-420, 760], [-400, 880], [-680, 900], [-690, 760]],
      [[690, 760], [420, 760], [400, 880], [680, 900], [690, 760]],
      [[-300, 560], [300, 560]], [[-360, 480], [360, 480]],
      [[-690, 300], [-690, 20], [-510, 20], [-510, 300]], [[690, 300], [690, 20], [510, 20], [510, 300]],
      [[-737, 1150], [-850, 1180], [-850, 1260], [-737, 1250]], [[737, 1150], [850, 1180], [850, 1260], [737, 1250]],
    ],
  };
  return { body, windows, details, wheels, front };
})();
const S3 = { ox: 240, oy: 880, s: 0.3, fx: 1590 };

function dimLine(x0, y0, x1, y1, p, label, lp, vertical) {
  if (p <= 0) return;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, k = E.outExpo(p);
  ctx.save(); ctx.strokeStyle = C.white; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lerp(cx, x0, k), lerp(cy, y0, k)); ctx.lineTo(lerp(cx, x1, k), lerp(cy, y1, k));
  const tk = 14 * clamp((p - 0.6) / 0.4);
  if (vertical) { ctx.moveTo(x0 - tk, y0); ctx.lineTo(x0 + tk, y0); ctx.moveTo(x1 - tk, y1); ctx.lineTo(x1 + tk, y1); }
  else { ctx.moveTo(x0, y0 - tk); ctx.lineTo(x0, y0 + tk); ctx.moveTo(x1, y1 - tk); ctx.lineTo(x1, y1 + tk); }
  ctx.stroke();
  ctx.restore();
  if (lp > 0) {
    ctx.save();
    if (vertical) { ctx.translate(cx + 38, cy); ctx.rotate(-Math.PI / 2); } else ctx.translate(cx, cy + 44);
    const [val, unit] = label;
    text(fmt(val * E.outExpo(lp)) + ' ' + unit, 0, 0, { f: MONO, w: 500, s: 26, align: 'center', c: C.white, ls: 2, a: clamp(lp * 4) });
    ctx.restore();
  }
}

function drawCarSide(t, tf, ink, fillP, spin) {
  const s = S3.s;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (fillP > 0) {
    ctx.save(); ctx.globalAlpha = fillP; ctx.fillStyle = C.white;
    drawPoly(CAR.body, 1, tf, false); ctx.fill();
    ctx.fillStyle = C.red;
    for (const w of CAR.windows) { drawPoly(w, 1, tf, false); ctx.fill(); }
    ctx.restore();
  }
  ctx.strokeStyle = C.white; ctx.lineWidth = 3;
  drawPoly(CAR.body, ink.body, tf);
  ctx.lineWidth = 2.5;
  CAR.windows.forEach((w, i) => { ctx.strokeStyle = fillP > 0.5 ? C.white : C.white; drawPoly(w, P(ink.win, i * 0.15, i * 0.15 + 0.7), tf); });
  ctx.lineWidth = 2; ctx.strokeStyle = fillP > 0 ? `rgba(230,0,18,${fillP})` : C.white;
  if (fillP < 1) { ctx.strokeStyle = C.white; ctx.globalAlpha = 1 - fillP * 0.7; }
  CAR.details.forEach((d, i) => drawPoly(d, P(ink.det, i * 0.05, i * 0.05 + 0.6), tf));
  ctx.globalAlpha = 1;
  for (const [wx, wy] of CAR.wheels) {
    const [sx, sy] = tf([wx, wy]);
    const a = ink.wheel * Math.PI * 2;
    if (fillP > 0) { ctx.fillStyle = C.ink; ctx.globalAlpha = fillP; ctx.beginPath(); ctx.arc(sx, sy, 270 * s, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = C.white; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, 270 * s, -Math.PI / 2, -Math.PI / 2 + a); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 175 * s, Math.PI / 2, Math.PI / 2 + a); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, 45 * s * clamp(ink.wheel * 2), 0, 7); ctx.stroke();
    if (ink.wheel > 0.6) {
      ctx.save(); ctx.globalAlpha = clamp((ink.wheel - 0.6) / 0.4);
      for (let k = 0; k < 5; k++) {
        const aa = spin + k * Math.PI * 2 / 5;
        ctx.beginPath(); ctx.moveTo(sx + Math.cos(aa) * 45 * s, sy + Math.sin(aa) * 45 * s);
        ctx.lineTo(sx + Math.cos(aa) * 170 * s, sy + Math.sin(aa) * 170 * s); ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function s3(t) {
  bg(C.red);
  const { ox, oy, s, fx } = S3;
  // blueprint grid draws in from the left
  const gp = E.outExpo(P(t, 5.6, 6.3));
  ctx.save(); ctx.beginPath(); ctx.rect(-300, -300, (W + 600) * gp, H + 600); ctx.clip();
  grid(t, C.white, 0.12, 40); grid(t, C.white, 0.14, 200);
  ctx.restore();

  const fade = 1 - E.inCubic(P(t, 8.55, 8.85));   // UI fades before the car drives off
  const push = 1 + 0.035 * P(t, 5.7, 9.3);
  ctx.save();
  ctx.translate(960, 560); ctx.scale(push, push); ctx.translate(-960, -560);

  ctx.save(); ctx.globalAlpha = fade;
  reveal('PACKAGING STUDY — KEI CAR', 140, 135, P(t, 5.85, 6.2), { f: MONO, w: 500, s: 22, ls: 6, c: C.white });
  reveal('SMALL IS SMART.', 136, 215, P(t, 5.95, 6.35), { f: LAT, w: 900, s: 72, ls: 2, c: C.white });
  reveal('規格ギリギリまで、空間を使い切る。', 140, 262, P(t, 7.55, 7.95), { f: JP, w: 900, s: 28, c: C.white });
  reveal('DISPLACEMENT', 1810, 118, P(t, 7.35, 7.7), { f: MONO, w: 500, s: 18, ls: 6, c: C.white, align: 'right' });
  const cc = 660 * E.outExpo(P(t, 7.4, 8.1));
  if (t > 7.4) text(`${Math.round(cc)}cc`, 1810, 222, { f: LAT, w: 900, s: 104, c: C.white, align: 'right', a: clamp(P(t, 7.4, 7.5)) });

  // kei envelope 3400 × 2000
  const tf = ([x, y]) => [ox + x * s, oy - y * s];
  ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.globalAlpha = fade * 0.75;
  drawPoly([[0, 0], [0, 2000], [3400, 2000], [3400, 0], [0, 0]], E.inOutCubic(P(t, 5.95, 6.6)), tf);
  const ftf = ([x, y]) => [fx + x * s, oy - y * s];
  drawPoly([[-740, 0], [-740, 2000], [740, 2000], [740, 0], [-740, 0]], E.inOutCubic(P(t, 6.3, 6.9)), ftf);
  ctx.setLineDash([]); ctx.globalAlpha = fade;
  // ground line
  const gl = E.outExpo(P(t, 6.0, 6.6));
  ctx.fillStyle = C.white; ctx.fillRect(ox - 80, oy - 1, (fx + 340 - ox + 80) * gl, 3);
  ctx.restore();

  // car (side) — draws, fills, then launches
  const antic = E.outCubic(P(t, 8.6, 8.85)) * 26;
  const launch = E.inExpo(P(t, 8.85, 9.35)) * 2300;
  const dx = antic - launch;
  const stf = ([x, y]) => [ox + dx + x * s, oy - y * s];
  const ink = {
    body: E.inOutCubic(P(t, 6.15, 7.05)),
    win: P(t, 6.6, 7.3),
    det: P(t, 6.9, 7.6),
    wheel: E.outCubic(P(t, 6.45, 7.15)),
  };
  const fillP = E.outCubic(P(t, 8.25, 8.6));
  const spin = -dx / (270 * s);
  // speed lines behind the car
  if (launch > 5) {
    ctx.save(); ctx.fillStyle = C.white;
    for (let i = 0; i < 18; i++) {
      const yy = oy - (150 + rnd(i, 11) * 1500) * s;
      const len = clamp(launch / 900) * (300 + rnd(i, 12) * 900);
      ctx.globalAlpha = 0.35 + 0.5 * rnd(i, 13);
      ctx.fillRect(ox + dx + 3400 * s + 30 + rnd(i, 14) * 120, yy, len, 2 + (i % 3));
    }
    ctx.restore();
  }
  drawCarSide(t, stf, ink, fillP, spin);

  // front view
  ctx.save(); ctx.globalAlpha = fade;
  ctx.strokeStyle = C.white; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  drawPoly(CAR.front.body, E.inOutCubic(P(t, 6.55, 7.3)), ftf);
  ctx.lineWidth = 2;
  drawPoly(CAR.front.glass, P(t, 6.9, 7.4), ftf);
  CAR.front.parts.forEach((pp, i) => drawPoly(pp, P(t, 7.0 + i * 0.04, 7.4 + i * 0.04), ftf));

  // dimensions
  dimLine(ox, oy + 50, ox + 3400 * s, oy + 50, P(t, 7.0, 7.5), [3400, 'mm'], P(t, 7.1, 7.8), false);
  dimLine(ox + 3400 * s + 48, oy, ox + 3400 * s + 48, oy - 2000 * s, P(t, 7.15, 7.65), [2000, 'mm'], P(t, 7.25, 7.95), true);
  dimLine(fx - 740 * s, oy + 50, fx + 740 * s, oy + 50, P(t, 7.3, 7.8), [1480, 'mm'], P(t, 7.4, 8.1), false);
  ctx.restore();

  ctx.restore();
}

// =====================================================================
// SCENE 4 — LIFE : beat-cut cards
// =====================================================================
function gCity(u) {
  const n = 18;
  ctx.save(); ctx.translate(-u * 120, 0);
  let x = -40;
  for (let k = 0; k < n; k++) {
    const w = 90 + rnd(k, 21) * 110, h = 180 + rnd(k, 22) * 480;
    const g = E.outExpo(P(u, k * 0.012, k * 0.012 + 0.28));
    const top = H - h * g;
    ctx.fillStyle = k === 8 ? C.red : C.dark; ctx.fillRect(x, top, w - 8, h);
    ctx.fillStyle = k === 8 ? C.white : 'rgba(243,241,236,0.22)';
    for (let wy = top + 24; wy < H - 30; wy += 34) for (let wx = x + 14; wx < x + w - 26; wx += 26) {
      if (rnd(Math.floor(wx), Math.floor(wy)) > 0.55) ctx.fillRect(wx, wy, 10, 14);
    }
    x += w;
  }
  ctx.restore();
}
function gLife(u) {
  ctx.save();
  ctx.strokeStyle = C.red; ctx.lineWidth = 4;
  for (let k = 0; k < 7; k++) {
    const r = 380 + ((u * 900 + k * 150) % 1050);
    ctx.globalAlpha = clamp(1 - (r - 380) / 1050);
    ctx.beginPath(); ctx.arc(960, 540, r, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = C.red;
  ctx.beginPath(); ctx.arc(960, 540, 380 * E.outBack(P(u, 0, 0.22)), 0, 7); ctx.fill();
  ctx.restore();
}
function gWork(u) {
  const b = 118;
  const stacks = [[160, 3], [1400, 3]];
  let idx = 0;
  ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = C.white;
  for (const [sx, cols] of stacks) for (let r = 0; r < 4; r++) for (let c = 0; c < cols - (r === 3 ? 1 : 0); c++) {
    const d = P(u, idx * 0.008, idx * 0.008 + 0.15); idx++;
    const y = H - 70 - (r + 1) * b;
    const yy = lerp(-200, y, E.outBack(d));
    const xx = sx + c * b + (r === 3 ? b / 2 : 0);
    ctx.fillStyle = C.deep; ctx.fillRect(xx, yy, b - 8, b - 8); ctx.strokeRect(xx, yy, b - 8, b - 8);
    ctx.beginPath(); ctx.moveTo(xx + (b - 8) / 2, yy); ctx.lineTo(xx + (b - 8) / 2, yy + b - 8); ctx.stroke();
  }
  ctx.fillStyle = C.white; ctx.fillRect(0, H - 70, W, 5);
  ctx.restore();
}
function gRoad(u) {
  const vx = 960, vy = 430;
  ctx.save();
  ctx.strokeStyle = 'rgba(243,241,236,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, vy); ctx.lineTo(W, vy); ctx.stroke();
  ctx.fillStyle = '#141418';
  ctx.beginPath(); ctx.moveTo(vx - 20, vy); ctx.lineTo(vx + 20, vy); ctx.lineTo(W + 500, H); ctx.lineTo(-500, H); ctx.fill();
  ctx.strokeStyle = C.white; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(vx - 20, vy); ctx.lineTo(-500, H); ctx.moveTo(vx + 20, vy); ctx.lineTo(W + 500, H); ctx.stroke();
  ctx.fillStyle = C.red;
  for (let k = 0; k < 12; k++) {
    const z0 = ((k / 12) + u * 2.2) % 1, z1 = z0 + 0.035;
    const y0 = vy + (H - vy) * z0 * z0, y1 = vy + (H - vy) * z1 * z1;
    const w0 = 3 + 40 * z0 * z0, w1 = 3 + 40 * z1 * z1;
    ctx.beginPath(); ctx.moveTo(vx - w0 / 2, y0); ctx.lineTo(vx + w0 / 2, y0); ctx.lineTo(vx + w1 / 2, y1); ctx.lineTo(vx - w1 / 2, y1); ctx.fill();
  }
  ctx.restore();
}
function gSafe(u) {
  ctx.save();
  grid(u, C.ink, 0.06, 60);
  ctx.strokeStyle = C.red; ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const r = 120 + ((u * 1100 + k * 190) % 1140);
    ctx.globalAlpha = clamp(1 - r / 1260); ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(960, 1180, r, Math.PI + 0.35, Math.PI * 2 - 0.35); ctx.stroke();
  }
  ctx.restore();
}
function gFuture(u) {
  ctx.save();
  for (let gy = 0; gy < 23; gy++) for (let gx = 0; gx < 41; gx++) {
    const x = gx * 48, y = gy * 48 + 12;
    const wv = Math.sin(x * 0.008 + u * 9) * Math.cos(y * 0.011 - u * 6);
    const r = 2.2 + Math.max(0, wv) * 4;
    ctx.fillStyle = wv > 0.62 ? C.red : 'rgba(243,241,236,0.35)';
    ctx.beginPath(); ctx.arc(x, y + wv * 16, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const CARDS = [
  { jp: '街', en: 'CITY', bgc: C.ink, fg: C.white, s: 300, g: gCity },
  { jp: '暮らし', en: 'LIFE', bgc: C.white, fg: C.white, s: 210, g: gLife, enc: C.ink },
  { jp: '仕事', en: 'WORK', bgc: C.red, fg: C.white, s: 280, g: gWork },
  { jp: '旅', en: 'JOURNEY', bgc: C.ink, fg: C.white, s: 300, g: gRoad },
  { jp: '安心', en: 'SAFETY', bgc: C.white, fg: C.ink, s: 280, g: gSafe },
  { jp: '未来', en: 'FUTURE', bgc: C.ink, fg: C.white, s: 280, g: gFuture },
];
const BUILD_WORDS = ['街', '暮らし', '仕事', '旅', '安心', '未来', '小さく', '大きく'];
const BUILD_BG = [C.red, C.white, C.ink];

function s4(t) {
  const u0 = t - T_S4, i = Math.floor(u0 / BEAT);
  if (i < 6) {
    const c = CARDS[i], u = u0 - i * BEAT, p = u / BEAT;
    bg(c.bgc);
    c.g(u);
    const sc = lerp(1.35, 1, E.outExpo(P(u, 0, 0.2))) * (1 + 0.05 * p);
    ctx.save(); ctx.translate(960, 540); ctx.scale(sc, sc);
    text(c.jp, 0, 0, { f: JP, w: 900, s: c.s, c: c.fg, align: 'center', base: 'middle' });
    ctx.restore();
    const ec = c.enc || (c.bgc === C.white ? C.ink : C.white);
    reveal(c.en, 960, 800, P(u, 0.03, 0.2), { f: MONO, w: 500, s: 30, ls: 16, align: 'center', c: i === 1 ? C.white : ec });
    reveal(`0${i + 1} / 06`, 960, 268, P(u, 0.0, 0.16), { f: MONO, w: 500, s: 20, ls: 6, align: 'center', c: c.bgc === C.red ? C.white : C.red });
  } else {
    const u = u0 - 6 * BEAT, k = clamp(Math.floor(u / (BEAT / 4)), 0, 7);
    const b = BUILD_BG[k % 3], fg = b === C.white ? C.ink : b === C.red ? C.white : C.red;
    bg(b);
    // radial streaks converging to center
    ctx.save(); ctx.strokeStyle = fg; ctx.lineCap = 'round';
    const n = 24 + k * 10;
    for (let j = 0; j < n; j++) {
      const a = rnd(j, 31) * Math.PI * 2, ph = (u * 2.6 + rnd(j, 32)) % 1;
      const r0 = 1300 * (1 - ph), r1 = r0 + 60 + 260 * ph;
      ctx.globalAlpha = 0.25 + 0.5 * ph; ctx.lineWidth = 2 + 3 * ph;
      ctx.beginPath(); ctx.moveTo(960 + Math.cos(a) * r0, 540 + Math.sin(a) * r0); ctx.lineTo(960 + Math.cos(a) * r1, 540 + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
    const zoom = 1 + E.inExpo(P(u, 0.62, 2 * BEAT)) * 5;
    const pulse = 1 + 0.12 * (1 - E.outCubic(P(u % (BEAT / 4), 0, 0.08)));
    ctx.save(); ctx.translate(960, 540); ctx.scale(zoom * pulse, zoom * pulse);
    text(BUILD_WORDS[k], 0, 0, { f: JP, w: 900, s: 250, c: fg, align: 'center', base: 'middle' });
    ctx.restore();
    const wo = E.inCubic(P(u, 0.7, 2 * BEAT));
    if (wo > 0) { ctx.fillStyle = `rgba(243,241,236,${wo})`; ctx.fillRect(-300, -300, W + 600, H + 600); }
  }
}

// =====================================================================
// SCENE 5 — FINALE : wordmark
// =====================================================================
function s5(t) {
  bg(C.ink);
  const u = t - T_DROP;
  const g = ctx.createRadialGradient(960, 520, 0, 960, 520, 1000);
  const ga = 0.34 + 0.05 * Math.sin(u * 5);
  g.addColorStop(0, `rgba(230,0,18,${ga})`); g.addColorStop(1, 'rgba(230,0,18,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  grid(t, C.white, 0.04, 60, 10);

  // collapse at the very end
  const cp = P(t, 14.5, 14.8);
  ctx.save();
  ctx.translate(960, 540); ctx.scale(1 + 0.2 * E.inExpo(cp), 1 - 0.996 * E.inExpo(cp)); ctx.translate(-960, -540);

  // dust
  for (let i = 0; i < 60; i++) {
    const x = rnd(i, 41) * W, y = (rnd(i, 42) * H - u * (20 + rnd(i, 43) * 60) + H) % H;
    ctx.fillStyle = i % 4 ? 'rgba(243,241,236,0.35)' : C.red;
    ctx.fillRect(x, y, 2 + rnd(i, 44) * 3, 2 + rnd(i, 44) * 3);
  }

  const tk = E.outExpo(P(u, 0, 1.1));
  const ls = lerp(150, 22, tk), sc = lerp(1.25, 1, tk);
  ctx.save(); ctx.translate(960, 500); ctx.scale(sc, sc);
  text('DAIHATSU', 0, 0, { f: LAT, w: 900, s: 178, ls, c: C.white, align: 'center', base: 'middle' });
  ctx.restore();

  const bw = 1060 * E.inOutExpo(P(u, 0.25, 0.8));
  ctx.fillStyle = C.red; ctx.fillRect(960 - bw / 2, 612, bw, 12);
  reveal('小さなクルマで、大きな毎日を。', 960, 720, P(u, 0.45, 0.85), { f: JP, w: 900, s: 52, align: 'center', c: C.white });
  reveal('MOTION REEL 2026  /  TYPE · SHAPE · RHYTHM', 960, 790, P(u, 0.7, 1.05), { f: MONO, w: 500, s: 20, ls: 6, align: 'center', c: C.grey });
  ctx.restore();

  // bookend: line collapses to the opening dot
  if (cp > 0.6) {
    const lp = E.inOutExpo(P(t, 14.72, 14.93));
    const lw = lerp(1300, 0, lp);
    ctx.fillStyle = C.red; ctx.fillRect(960 - lw / 2, 537, lw, 6);
    const dotA = 1 - P(t, 14.93, 15);
    if (lp > 0.5) { ctx.globalAlpha = dotA; ctx.beginPath(); ctx.arc(960, 540, 10, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  }
  const disc = clamp(P(u, 0.8, 1.1)) * (1 - P(t, 14.4, 14.6));
  text('Unofficial fan-made concept reel. Not affiliated with or endorsed by Daihatsu Motor Co., Ltd.', 960, 1000, { f: MONO, w: 500, s: 15, c: C.grey, align: 'center', a: disc * 0.8 });
}

// =====================================================================
// COMPOSITOR
// =====================================================================
function composeScenes(t) {
  if (t < 3.55) s1(t);
  else if (t < 3.97) {
    // slab wipe right→left : s1 | red slab | s2
    const lead = W * (1 - E.inOutExpo(P(t, 3.55, 3.85)));
    const trail = W * (1 - E.inOutExpo(P(t, 3.67, 3.97)));
    s2(t);
    ctx.save(); ctx.beginPath(); ctx.rect(-300, -300, lead + 300, H + 600); ctx.clip(); s1(t); ctx.restore();
    ctx.fillStyle = C.red; ctx.fillRect(lead, -300, Math.max(0, trail - lead), H + 600);
    ctx.fillStyle = C.ink; ctx.fillRect(trail - 14, -300, trail > lead + 14 ? 14 : 0, H + 600);
  }
  else if (t < 5.45) s2(t);
  else if (t < 5.82) {
    // iris open from the year
    s2(t);
    const r = 1300 * E.inOutExpo(P(t, 5.45, 5.82));
    ctx.save(); ctx.beginPath(); ctx.arc(960, 520, r, 0, 7); ctx.clip(); s3(t); ctx.restore();
    if (r > 30) { ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(960, 520, r, 0, 7); ctx.stroke(); }
  }
  else if (t < T_S4) s3(t);
  else if (t < T_DROP) s4(t);
  else s5(t);
}

const SECTIONS = [[0, '01 — ORIGIN'], [T_S2, '02 — HERITAGE'], [T_S3, '03 — PACKAGING'], [T_S4, '04 — LIFE'], [T_DROP, '05 — DAIHATSU']];
function hudColor(t) {
  if (t < 3.75) return C.white;
  if (t < 5.63) return C.ink;
  if (t < T_S4) return C.white;
  if (t < T_DROP) {
    const i = Math.floor((t - T_S4) / BEAT);
    if (i < 6) return CARDS[i].bgc === C.white ? C.ink : C.white;
    const k = clamp(Math.floor((t - T_S4 - 6 * BEAT) / (BEAT / 4)), 0, 7);
    return BUILD_BG[k % 3] === C.white ? C.ink : C.white;
  }
  return C.white;
}

function hud(t, frame) {
  const a = E.outCubic(P(t, 0.15, 0.6)) * (1 - P(t, 14.35, 14.6));
  if (a <= 0) return;
  const col = hudColor(t);
  ctx.save(); ctx.globalAlpha = a * 0.85; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
  const m = 40, L = 26;
  ctx.beginPath();
  ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
  ctx.moveTo(W - m - L, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + L);
  ctx.moveTo(m, H - m - L); ctx.lineTo(m, H - m); ctx.lineTo(m + L, H - m);
  ctx.moveTo(W - m - L, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - L);
  ctx.stroke();
  const o = { f: MONO, w: 500, s: 16, ls: 3, c: col };
  text('DAIHATSU  /  MOTION REEL 2026', 72, 78, o);
  const ss = Math.floor(frame / FPS), ff = frame % FPS;
  text(`TC 00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}  ·  ${BPM} BPM`, W - 72, 78, { ...o, align: 'right' });
  let sec = SECTIONS[0][1]; for (const [st, n] of SECTIONS) if (t >= st) sec = n;
  text(sec, 72, H - 64, o);
  for (let b = 0; b < 8; b++) {
    const x = W - 72 - (8 - b) * 42 + 6, f = clamp((t - b * BAR) / BAR);
    ctx.globalAlpha = a * 0.3; ctx.fillRect(x, H - 72, 36, 3);
    ctx.globalAlpha = a * 0.95; ctx.fillRect(x, H - 72, 36 * f, 3);
  }
  ctx.restore();
}

function flashes(t) {
  for (const [th, dur] of [[T_IMPACT, 0.22], [T_DROP, 0.3]]) {
    if (t >= th && t < th + dur) {
      ctx.fillStyle = `rgba(255,255,255,${Math.pow(1 - (t - th) / dur, 2)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function drawAt(t, frame) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.letterSpacing = '0px';
  const sh = shake(t);
  ctx.save(); ctx.translate(sh.x, sh.y);
  composeScenes(t);
  ctx.restore();
  hud(t, frame);
  flashes(t);
}

// ---------- post: grain, vignette, cut glitch ----------
const GRAIN = [];
for (let g = 0; g < 8; g++) {
  const c = document.createElement('canvas'); c.width = 480; c.height = 270;
  const x = c.getContext('2d'), id = x.createImageData(480, 270);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.floor(rnd(i, g + 100) * 255); id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  x.putImageData(id, 0, 0); GRAIN.push(c);
}
const CUTS = [T_S4, ...[1, 2, 3, 4, 5].map(i => T_S4 + i * BEAT), T_DROP, T_IMPACT];

function post(t, frame) {
  // glitch slices right after hard cuts
  for (const c of CUTS) {
    const d = t - c;
    if (d >= 0 && d < 0.07) {
      tctx.drawImage(cv, 0, 0);
      const amt = 1 - d / 0.07;
      for (let i = 0; i < 14; i++) {
        const y = Math.floor(rnd(i, Math.floor(c * 100) + frame) * H), h = 8 + rnd(i, 51 + frame) * 70;
        const off = (rnd(i, 52 + frame) - 0.5) * 160 * amt;
        out.drawImage(tmp, 0, y, W, h, off, y, W, h);
      }
      out.save(); out.globalAlpha = 0.35 * amt; out.globalCompositeOperation = 'screen';
      out.drawImage(tmp, 10 * amt, 0); out.restore();
    }
  }
  out.save();
  out.globalCompositeOperation = 'overlay'; out.globalAlpha = 0.09;
  out.imageSmoothingEnabled = true;
  out.drawImage(GRAIN[frame % GRAIN.length], 0, 0, W, H);
  out.restore();
  const v = out.createRadialGradient(960, 540, 500, 960, 540, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.42)');
  out.fillStyle = v; out.fillRect(0, 0, W, H);
}

// ---------- public API ----------
const SAMPLES = 6, SHUTTER = 0.5 / FPS;   // 180° shutter, 6-tap motion blur
window.renderFrame = function (frame, samples = SAMPLES) {
  const t0 = frame / FPS;
  out.globalCompositeOperation = 'source-over';
  for (let i = 0; i < samples; i++) {
    const ts = samples > 1 ? t0 + ((i + 0.5) / samples - 0.5) * SHUTTER : t0;
    drawAt(clamp(ts, 0, DUR - 1e-4), frame);
    out.globalAlpha = 1 / (i + 1);
    out.drawImage(buf, 0, 0);
  }
  out.globalAlpha = 1;
  post(t0, frame);
};

// Sound design cues derived from the same timeline (consumed by audio.py)
window.audioCues = function () {
  const ev = [];
  S1_CHARS.forEach((c, k) => ev.push({ t: 0.32 + k * 0.07, type: 'tick', v: 0.8 }));
  for (let k = 0; k < 4; k++) ev.push({ t: 3.02 + k * 0.07, type: 'blip', f: [880, 1175, 1318, 1760][k] });
  let prev = Math.floor(yearAt(3.6)), last = -1;
  for (let t = 3.6; t < 5.6; t += 0.0005) {
    const y = Math.floor(yearAt(t));
    if (y !== prev && t - last > 0.012) { ev.push({ t, type: 'click', v: MILESTONES.some(m => m.y === y) ? 1 : 0.5 }); last = t; }
    prev = y;
  }
  MILESTONES.forEach(m => ev.push({ t: m.a, type: 'blip', f: 1568 }));
  [7.1, 7.25, 7.4, 7.45].forEach((t, i) => ev.push({ t, type: 'blip', f: [659, 784, 988, 1318][i] }));
  return { bpm: BPM, dur: DUR, impact: T_IMPACT, drop: T_DROP, s4: T_S4, events: ev };
};

window.READY = Promise.all([
  document.fonts.load(fnt(JP, 900, 100), '大阪発動機ダイハツ'),
  document.fonts.load(fnt(JP, 400, 100), '大阪'),
  document.fonts.load(fnt(LAT, 900, 100), 'DAIHATSU0123456789'),
  document.fonts.load(fnt(LAT, 400, 100), 'A'),
  document.fonts.load(fnt(MONO, 500, 100), 'A0'),
]).then(() => document.fonts.ready);

// Live preview: open index.html?play (or ?t=7.2 to inspect a single moment)
window.READY.then(() => {
  const q = new URLSearchParams(location.search);
  if (q.has('t')) { window.renderFrame(Math.round(parseFloat(q.get('t')) * FPS)); return; }
  if (!q.has('play')) { window.renderFrame(0); return; }
  let t0 = null;
  const loop = now => {
    if (t0 === null) t0 = now;
    const f = Math.floor(((now - t0) / 1000 % DUR) * FPS);
    window.renderFrame(f, 1);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
