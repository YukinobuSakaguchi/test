// Shared slide layouts and drawing helpers for slides-detail.js and slides-proposal.js.
// Slide content lives in those two files as data; this file only decides how it looks.

const pptxgen = require("pptxgenjs");
const theme = require("./theme");

const C = theme.colors;
const W = 13.333; // LAYOUT_WIDE, inches
const H = 7.5;
const M = 0.6; // side margin
const BODY = { x: M, y: 1.45, w: W - 2 * M, h: H - 1.45 - 0.7 };
const CODE_FONT = theme.fonts.code;

function newDeck(title, footer = theme.meta.title) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = title;
  pres.author = "Claude Code";
  pres.theme = { headFontFace: theme.fonts.slide, bodyFontFace: theme.fonts.slide };

  pres.defineSlideMaster({
    title: "TITLE",
    background: { color: C.primary },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: M, y: 2.2, w: W - 2 * M, h: 1.4, fontSize: 44, bold: true, color: C.white, valign: "bottom", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: M, y: 3.8, w: W - 2 * M, h: 1.8, fontSize: 20, color: "D7E6EA", valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "SECTION",
    background: { color: C.primary },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: M, y: 1.6, w: W - 2 * M, h: 1.2, fontSize: 40, bold: true, color: C.white, valign: "bottom", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: M, y: 3.1, w: W - 2 * M, h: 3.4, fontSize: 22, color: "D7E6EA", valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: W - M - 0.8, y: H - 0.5, w: 0.8, h: 0.3, fontSize: 10, color: "D7E6EA", align: "right" },
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: C.white },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: M, y: 0.35, w: W - 2 * M, h: 0.9, fontSize: 30, bold: true, color: C.primary, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { text: { text: footer, options: { x: M, y: H - 0.5, w: 6, h: 0.3, fontSize: 10, color: C.muted, margin: 0 } } },
    ],
    slideNumber: { x: W - M - 0.8, y: H - 0.5, w: 0.8, h: 0.3, fontSize: 10, color: C.muted, align: "right" },
  });
  return pres;
}

// "**bold**" in strings becomes bold runs, so slide data stays readable.
function runs(text, base = {}) {
  const { strongColor, ...plain } = base;
  return String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((part) => {
    if (part.startsWith("**")) return { text: part.slice(2, -2), options: { ...plain, bold: true, color: strongColor || plain.color } };
    if (part.startsWith("`")) return { text: part.slice(1, -1), options: { ...plain, fontFace: CODE_FONT } };
    return { text: part, options: { ...plain } };
  });
}

// Joins lines into one text body. Paragraph options (bullets, spacing) go on the first run of
// each line; save() removes the stray paragraph properties pptxgenjs writes for later runs.
function lines(items, base, paraOpts) {
  const out = [];
  items.forEach((ln, i) => {
    const rs = runs(ln.text ?? ln, base);
    rs.forEach((r, j) => {
      if (j === 0) Object.assign(r.options, paraOpts(ln, i));
      else r.options.fontSize = paraOpts(ln, i).fontSize;
      if (j === rs.length - 1 && i < items.length - 1) r.options.breakLine = true;
      out.push(r);
    });
  });
  return out;
}

function titleSlide(pres, { title, subtitle, note }) {
  const s = pres.addSlide({ masterName: "TITLE" });
  s.addText(title, { placeholder: "title" });
  s.addText(subtitle, { placeholder: "body" });
  if (note) s.addNotes(note);
  return s;
}

function sectionSlide(pres, { section, title, items = [], note }) {
  pres.addSection({ title: section });
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  s.addText(items.map((t, i) => ({ text: t, options: { breakLine: i < items.length - 1, paraSpaceAfter: 6 } })), { placeholder: "body" });
  if (note) s.addNotes(note);
  return s;
}

function contentSlide(pres, { section, title, note }) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  if (note) s.addNotes(note);
  return s;
}

// ---- components -------------------------------------------------------------

function lead(s, text, box = {}) {
  s.addText(runs(text, { color: C.text, strongColor: C.accent }), { x: BODY.x, y: BODY.y, w: BODY.w, h: 0.6, fontSize: 20, margin: 0, valign: "top", isTextBox: true, ...box });
}

function bullets(s, items, box = {}) {
  const fontSize = box.fontSize || 18;
  const paras = lines(items, { color: C.text, strongColor: C.primary }, (it) => {
    const sub = typeof it === "object" && it.sub;
    return { bullet: sub ? { indent: 18 } : { code: "25CF", indent: 20 }, indentLevel: sub ? 1 : 0, paraSpaceAfter: 10, fontSize: sub ? fontSize - 2 : fontSize };
  });
  const { fontSize: _f, ...rest } = box;
  s.addText(paras, { x: BODY.x, y: BODY.y, w: BODY.w, h: BODY.h, valign: "top", margin: 0, isTextBox: true, ...rest });
}

// rows[0] is the header row. colW in inches (optional). Cells may use **bold** and `code` is shown as typed.
function table(s, rows, box = {}) {
  const fontSize = box.fontSize || 16;
  // Rows get a comfortable minimum height; a given box height spreads rows to fill it.
  const rowH = box.h ? Math.min(box.h / rows.length, 0.8) : (box.rowH || 0.5);
  // Font size goes on every cell and run: table-level fontSize does not reach runs inside cells.
  const head = rows[0].map((h) => ({ text: h, options: { bold: true, fontSize, color: C.primary, fill: { color: C.primaryLight } } }));
  const body = rows.slice(1).map((r, ri) => r.map((c) => ({
    text: runs(c, { color: C.text, strongColor: C.text, fontSize }),
    options: { fontSize, fill: { color: ri % 2 ? "F8FAFB" : C.white } },
  })));
  s.addTable([head, ...body], {
    x: box.x ?? BODY.x, y: box.y ?? BODY.y, w: box.w ?? BODY.w, colW: box.colW, rowH,
    fontSize, valign: "middle", border: { type: "solid", pt: 0.75, color: C.border }, margin: [4, 6, 4, 6], autoPage: false,
  });
}

// Cards in a grid; each card: { title, body, badge? }.
function cards(s, items, box = {}) {
  const b = { ...BODY, ...box };
  const cols = box.cols || items.length;
  const rows = Math.ceil(items.length / cols);
  const gap = 0.3;
  const cw = (b.w - gap * (cols - 1)) / cols;
  const ch = (b.h - gap * (rows - 1)) / rows;
  items.forEach((it, i) => {
    const x = b.x + (i % cols) * (cw + gap);
    const y = b.y + Math.floor(i / cols) * (ch + gap);
    s.addShape("roundRect", { x, y, w: cw, h: ch, rectRadius: 0.12, fill: { color: it.highlight ? "FFF1E7" : C.primaryLight }, line: { color: it.highlight ? C.accent : C.primaryLight, width: 1 }, objectName: `card-${i + 1}` });
    let ty = y + 0.2;
    if (it.badge) {
      s.addShape("ellipse", { x: x + 0.2, y: ty, w: 0.5, h: 0.5, fill: { color: C.accent }, line: { color: C.accent } });
      s.addText(String(it.badge), { x: x + 0.2, y: ty, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
    }
    s.addText(runs(it.title, { color: C.primary }), { x: x + (it.badge ? 0.85 : 0.25), y: ty, w: cw - (it.badge ? 1.05 : 0.5), h: 0.5, fontSize: box.titleSize || 20, bold: true, valign: "middle", margin: 0, isTextBox: true });
    ty += 0.65;
    if (it.body) {
      const body = Array.isArray(it.body) ? it.body : [it.body];
      const paras = lines(body, { color: C.text, strongColor: C.primary }, () => (body.length > 1 ? { bullet: { code: "25CF", indent: 16 }, paraSpaceAfter: 6 } : { paraSpaceAfter: 6 }));
      s.addText(paras, { x: x + 0.25, y: ty, w: cw - 0.5, h: y + ch - ty - 0.15, fontSize: box.bodySize || 16, valign: "top", margin: 0, isTextBox: true });
    }
  });
}

// Left-to-right process with arrows; each step: { title, body }.
function flow(s, steps, box = {}) {
  const b = { ...BODY, ...box };
  const gap = 0.45;
  const sw = (b.w - gap * (steps.length - 1)) / steps.length;
  steps.forEach((st, i) => {
    const x = b.x + i * (sw + gap);
    s.addShape("roundRect", { x, y: b.y, w: sw, h: b.h, rectRadius: 0.12, fill: { color: st.highlight ? "FFF1E7" : C.primaryLight }, line: { color: st.highlight ? C.accent : C.primaryLight, width: 1 }, objectName: `step-${i + 1}` });
    s.addShape("ellipse", { x: x + 0.2, y: b.y + 0.2, w: 0.5, h: 0.5, fill: { color: C.primary }, line: { color: C.primary } });
    s.addText(String(i + 1), { x: x + 0.2, y: b.y + 0.2, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(runs(st.title, { color: C.primary }), { x: x + 0.2, y: b.y + 0.85, w: sw - 0.4, h: 0.75, fontSize: box.titleSize || 18, bold: true, valign: "top", margin: 0, isTextBox: true });
    if (st.body) s.addText(runs(st.body, { color: C.text, strongColor: C.primary }), { x: x + 0.2, y: b.y + 1.65, w: sw - 0.4, h: b.h - 1.8, fontSize: box.bodySize || (steps.length <= 4 ? 18 : 16), valign: "top", margin: 0, isTextBox: true });
    if (i < steps.length - 1) {
      s.addShape("rightArrow", { x: x + sw + 0.07, y: b.y + b.h / 2 - 0.16, w: gap - 0.14, h: 0.32, fill: { color: C.accent }, line: { color: C.accent } });
    }
  });
}

// Top-to-bottom stages (used for progressive disclosure); each: { title, body, tag }.
function stack(s, stages, box = {}) {
  const b = { ...BODY, ...box };
  const gap = 0.35;
  const sh = (b.h - gap * (stages.length - 1)) / stages.length;
  stages.forEach((st, i) => {
    const y = b.y + i * (sh + gap);
    const inset = i * 0.5; // narrowing bars: less is loaded up front, more only when needed
    s.addShape("roundRect", { x: b.x + inset, y, w: b.w - inset, h: sh, rectRadius: 0.1, fill: { color: i === 0 ? C.primary : C.primaryLight }, line: { color: C.primary, width: 1 } });
    s.addText(runs(st.title, { color: i === 0 ? C.white : C.primary }), { x: b.x + inset + 0.25, y, w: 3.2, h: sh, fontSize: 20, bold: true, valign: "middle", margin: 0, isTextBox: true });
    s.addText(runs(st.body, { color: i === 0 ? C.white : C.text, strongColor: i === 0 ? C.white : C.primary }), { x: b.x + inset + 3.5, y, w: b.w - inset - 3.75 - (st.tag ? 2.2 : 0), h: sh, fontSize: 17, valign: "middle", margin: 0, isTextBox: true });
    if (st.tag) s.addText(st.tag, { x: b.x + b.w - 2.3, y, w: 2.1, h: sh, fontSize: 14, color: i === 0 ? "D7E6EA" : C.muted, align: "right", valign: "middle", margin: 0, isTextBox: true });
    if (i < stages.length - 1) s.addShape("downArrow", { x: b.x + inset + 0.5, y: y + sh + 0.03, w: 0.35, h: gap - 0.06, fill: { color: C.accent }, line: { color: C.accent } });
  });
}

function codeBox(s, text, box = {}) {
  const b = { ...BODY, ...box };
  s.addShape("roundRect", { x: b.x, y: b.y, w: b.w, h: b.h, rectRadius: 0.08, fill: { color: C.codeBg }, line: { color: C.border, width: 0.75 } });
  s.addText(text, { x: b.x + 0.2, y: b.y + 0.15, w: b.w - 0.4, h: b.h - 0.3, fontFace: CODE_FONT, fontSize: box.fontSize || 14, color: C.text, valign: "top", margin: 0, isTextBox: true });
}

// Short emphasized message, e.g. the takeaway of a slide.
function callout(s, text, box = {}) {
  const b = { x: BODY.x, y: H - 1.55, w: BODY.w, h: 0.7, ...box };
  s.addShape("roundRect", { x: b.x, y: b.y, w: b.w, h: b.h, rectRadius: 0.1, fill: { color: "FFF1E7" }, line: { color: C.accent, width: 1 } });
  s.addText(runs(text, { color: C.text, strongColor: C.accent }), { x: b.x + 0.25, y: b.y, w: b.w - 0.5, h: b.h, fontSize: box.fontSize || 18, valign: "middle", margin: 0, isTextBox: true });
}

function label(s, text, box) {
  s.addText(runs(text, { color: C.primary }), { fontSize: 18, bold: true, margin: 0, valign: "top", isTextBox: true, ...box });
}

// pptxgenjs writes an <a:pPr> before every run, so a paragraph with mixed formatting gets
// several <a:pPr> and renderers take the last one (losing the bullet). Keep only the first.
async function save(pres, fileName) {
  const JSZip = require("jszip");
  const buf = await pres.write({ outputType: "nodebuffer" });
  const zip = await JSZip.loadAsync(buf);
  // pptxgenjs leaves the theme's East Asian font empty, so Japanese text falls back to Yu Gothic.
  // Set it (and the Japanese script slot) to the slide font so all Japanese text uses it.
  const jp = theme.fonts.slideJa;
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async("string");
    zip.file(name, xml
      .replace(/<a:ea typeface="[^"]*"\/>/g, `<a:ea typeface="${jp}"/>`)
      .replace(/<a:font script="Jpan" typeface="[^"]*"\/>/g, `<a:font script="Jpan" typeface="${jp}"/>`));
  }
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async("string");
    const fixed = xml
      // Code runs: Latin stays monospaced, Japanese inside code uses the slide font
      .replace(/<a:ea typeface="[^"]*"([^>]*)\/>/g, `<a:ea typeface="${jp}"$1/>`).replace(/<a:p>(.*?)<\/a:p>/gs, (para, inner) => {
      let seenRun = false;
      return "<a:p>" + inner.replace(/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>.*?<\/a:pPr>|<a:r>|<a:br\/>/gs, (m) => {
        if (m === "<a:r>" || m === "<a:br/>") { seenRun = true; return m; }
        return seenRun ? "" : m;
      }) + "</a:p>";
    });
    zip.file(name, fixed);
  }
  require("fs").writeFileSync(fileName, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return fileName;
}

module.exports = {
  save, newDeck, titleSlide, sectionSlide, contentSlide, lead, bullets, table, cards, flow, stack, codeBox, callout, label, runs, W, H, M, BODY, C };
