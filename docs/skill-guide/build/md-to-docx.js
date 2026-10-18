// Builds dist/skill-guide.docx from docs/skill-guide.md.
// The Markdown file is the single source: edit it, then run `npm run build:docx`.

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, LevelFormat, PageBreak, TableOfContents, Footer, PageNumber,
} = require("docx");
const theme = require("./theme");

const SRC = path.join(__dirname, "..", "..", "skill-guide.md");
const OUT = path.join(__dirname, "..", "dist", "skill-guide.docx");

const C = theme.colors;
const FONT = { ascii: theme.fonts.latin, hAnsi: theme.fonts.latin, eastAsia: theme.fonts.eastAsia, cs: theme.fonts.latin };
const CODE_FONT = { ascii: theme.fonts.code, hAnsi: theme.fonts.code, eastAsia: theme.fonts.eastAsia, cs: theme.fonts.code };

// A4 portrait with 20 mm margins (DXA: 1440 = 1 inch)
const PAGE = { width: 11906, height: 16838, margin: 1134 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

// Relative links in the guide point into the repository; in Word they must be absolute.
const repoBlob = `${theme.meta.repoUrl}/blob/${theme.meta.branch}/docs/`;
function resolveHref(href) {
  if (/^https?:\/\//.test(href)) return href;
  if (href.startsWith("#")) return null; // in-page anchor: Word uses its own TOC
  return repoBlob + href;
}

// ---- inline tokens -> runs -------------------------------------------------

function inlineRuns(tokens, style = {}) {
  const out = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case "strong":
        out.push(...inlineRuns(t.tokens, { ...style, bold: true }));
        break;
      case "em":
        out.push(...inlineRuns(t.tokens, { ...style, italics: true }));
        break;
      case "codespan":
        out.push(new TextRun({ text: decode(t.text), font: CODE_FONT, shading: { type: ShadingType.CLEAR, fill: C.codeBg, color: "auto" }, ...style }));
        break;
      case "link": {
        const href = resolveHref(t.href);
        const runs = inlineRuns(t.tokens, href ? { ...style, color: "0563C1", underline: {} } : style);
        out.push(href ? new ExternalHyperlink({ link: href, children: runs }) : runs);
        break;
      }
      case "br":
        out.push(new TextRun({ break: 1 }));
        break;
      case "text":
      case "escape":
        if (t.tokens) out.push(...inlineRuns(t.tokens, style));
        else out.push(...emphasizeCheck(decode(t.text), style));
        break;
      case "html":
        break; // e.g. <br> inside tables is not used in the guide
      default:
        if (t.text) out.push(new TextRun({ text: decode(t.text), ...style }));
    }
  }
  return out.flat();
}

// "要確認" marks unverified facts; keep it visible even when the source did not bold it.
function emphasizeCheck(text, style) {
  const parts = text.split(/(要確認)/);
  return parts.filter(Boolean).map((p) =>
    p === "要確認" ? new TextRun({ text: p, ...style, bold: true, color: C.accent }) : new TextRun({ text: p, ...style })
  );
}

function decode(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

// ---- block tokens -> paragraphs/tables -------------------------------------

let listInstance = 0;

function blocks(tokens, ctx = {}) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading":
        out.push(heading(t));
        break;
      case "paragraph":
        out.push(new Paragraph({ children: inlineRuns(t.tokens), spacing: { after: 120 }, ...ctx.para }));
        break;
      case "text": // loose text inside list items
        out.push(new Paragraph({ children: inlineRuns(t.tokens || [{ type: "text", text: t.text }]), ...ctx.para }));
        break;
      case "list":
        out.push(...list(t, 0));
        break;
      case "table":
        out.push(table(t), new Paragraph({ children: [], spacing: { after: 60 } }));
        break;
      case "code":
        out.push(...codeBlock(t.text));
        break;
      case "blockquote":
        out.push(...blocks(t.tokens, { para: quoteStyle() }));
        break;
      case "hr":
      case "space":
      case "html":
        break;
      default:
        if (t.text) out.push(new Paragraph({ text: t.text }));
    }
  }
  return out;
}

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];

function heading(t) {
  return new Paragraph({
    heading: HEADINGS[Math.min(t.depth, 4) - 1],
    // Each part (# 第1部 ...) starts on a new page
    pageBreakBefore: t.depth === 1,
    children: inlineRuns(t.tokens),
  });
}

function list(t, level) {
  const out = [];
  const instance = ++listInstance; // restarts numbering for every ordered list
  for (const item of t.items) {
    const [first, ...rest] = item.tokens;
    const prefix = item.task ? [new TextRun({ text: item.checked ? "☑ " : "☐ " })] : [];
    const runs = first && (first.type === "text" || first.type === "paragraph") ? inlineRuns(first.tokens || [{ type: "text", text: first.text }]) : [];
    const numbering = item.task ? undefined
      : t.ordered ? { reference: "numbers", level, instance }
      : { reference: "bullets", level };
    out.push(new Paragraph({
      children: [...prefix, ...runs],
      numbering,
      indent: item.task ? { left: 360 * (level + 1) } : undefined,
      spacing: { after: 60 },
    }));
    for (const sub of first && runs.length ? rest : item.tokens) {
      if (sub.type === "list") out.push(...list(sub, level + 1));
      else if (sub.type !== "space") out.push(...blocks([sub], { para: { indent: { left: 720 * (level + 1) } } }));
    }
  }
  return out;
}

function quoteStyle() {
  return {
    indent: { left: 240 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.accent, space: 8 } },
    shading: { type: ShadingType.CLEAR, fill: "FFF4EC", color: "auto" },
    spacing: { after: 80 },
  };
}

function codeBlock(text) {
  return text.split("\n").map((line, i, all) => new Paragraph({
    children: [new TextRun({ text: line || " ", font: CODE_FONT, size: 18 })],
    shading: { type: ShadingType.CLEAR, fill: C.codeBg, color: "auto" },
    indent: { left: 120, right: 120 },
    spacing: { before: i === 0 ? 80 : 0, after: i === all.length - 1 ? 160 : 0, line: 260 },
    keepLines: true,
  }));
}

// Column widths follow the longest text in each column, so short label columns stay narrow.
function columnWidths(t) {
  const len = (cell) => [...cell.text].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
  const raw = t.header.map((h, i) => Math.max(len(h), ...t.rows.map((r) => len(r[i] || { text: "" }))));
  const weights = raw.map((n) => Math.min(Math.max(n, 12), 60));
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((CONTENT_WIDTH * w) / sum));
  widths[widths.length - 1] += CONTENT_WIDTH - widths.reduce((a, b) => a + b, 0);
  return widths;
}

function table(t) {
  const widths = columnWidths(t);
  const border = { style: BorderStyle.SINGLE, size: 4, color: C.border };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (c, i, isHeader) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    borders,
    shading: isHeader ? { type: ShadingType.CLEAR, fill: C.primaryLight, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: inlineRuns(c.tokens, isHeader ? { bold: true } : {}) })],
  });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: t.header.map((c, i) => cell(c, i, true)) }),
      ...t.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) })),
    ],
  });
}

// ---- document assembly ------------------------------------------------------

function cover() {
  const m = theme.meta;
  const line = (text, opts = {}) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 200 }, children: [new TextRun({ text, ...opts })] });
  return [
    new Paragraph({ spacing: { before: 3000 }, children: [] }),
    line(m.title, { bold: true, size: 64, color: C.primary }),
    line(m.subtitle, { size: 36, color: C.text }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.accent, space: 4 } }, spacing: { after: 400 }, children: [] }),
    line(`対象: ${m.targets}`, { size: 22, color: C.muted }),
    line(`情報の確認日: ${m.checkedOn}`, { size: 22, color: C.muted }),
    line("この文書は docs/skill-guide.md（正本）から自動生成しています。", { size: 20, color: C.muted }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ children: [new TextRun({ text: "目次", bold: true, size: 32, color: C.primary })], spacing: { after: 200 } }),
    new TableOfContents("目次", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({ children: [new TextRun({ text: "※ 目次が空のときは、目次を右クリックして「フィールド更新」を選んでください。", size: 18, color: C.muted })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// The Markdown has a title block and a hand-written link TOC; Word replaces both with the cover and a TOC field.
function bodyTokens(tokens) {
  const out = [];
  let skipDepth = 0;
  let seenFirstRule = false;
  for (const t of tokens) {
    if (!seenFirstRule) { if (t.type === "hr") seenFirstRule = true; continue; }
    if (t.type === "heading") {
      if (skipDepth && t.depth <= skipDepth) skipDepth = 0;
      if (t.text === "目次") { skipDepth = t.depth; continue; }
    }
    if (!skipDepth) out.push(t);
  }
  return out;
}

function build() {
  const md = fs.readFileSync(SRC, "utf8");
  const tokens = bodyTokens(marked.lexer(md));
  const headingSizes = [36, 30, 26, 23];

  const doc = new Document({
    creator: "Claude Code",
    title: theme.meta.title,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: C.text }, paragraph: { spacing: { line: 300 } } } },
      paragraphStyles: headingSizes.map((size, i) => ({
        id: `Heading${i + 1}`, name: `Heading ${i + 1}`, basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size, bold: true, color: C.primary },
        paragraph: {
          spacing: { before: i === 0 ? 0 : 360, after: 160 },
          outlineLevel: i,
          keepNext: true,
          // Part titles get a heavy accent rule; shading behind large CJK text clips in some renderers
          ...(i === 0 ? { border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: C.accent, space: 6 } } } : {}),
          ...(i === 1 ? { border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.border, space: 4 } } } : {}),
        },
      })),
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [0, 1, 2].map((level) => ({ level, format: LevelFormat.BULLET, text: ["●", "○", "■"][level], alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420 * (level + 1), hanging: 280 } }, run: { size: 16 } } })) },
        { reference: "numbers", levels: [0, 1, 2].map((level) => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420 * (level + 1), hanging: 360 } } } })) },
      ],
    },
    sections: [{
      properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin } }, titlePage: true },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["- ", PageNumber.CURRENT, " -"], size: 18, color: C.muted })] })] }),
        first: new Footer({ children: [] }),
      },
      children: [...cover(), ...blocks(tokens)],
    }],
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  return Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(OUT, buf);
    console.log(`wrote ${path.relative(process.cwd(), OUT)} (${buf.length} bytes)`);
  });
}

build().catch((e) => { console.error(e); process.exit(1); });
