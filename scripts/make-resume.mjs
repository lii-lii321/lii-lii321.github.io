/**
 * 生成简历 PDF → public/resume.pdf（零依赖，手写最小合法 PDF，A4 单页）。
 * 内容为真实项目与经历的英文快照（base-14 字体不支持中文嵌入；
 * 中文正式简历请用 Word / 飞书等排版导出后直接覆盖 public/resume.pdf）。
 * 数字与 src/data/projects.json 同源核对（287 测试 / 6 LLM / 71 单 / 592 张）。
 */
import { writeFileSync } from 'node:fs';

const A4 = [595, 842]; // pt
const LEFT = 80;
const RIGHT = 515;
const INK = '0.08 0.08 0.10';
const MUTED = '0.31 0.31 0.36';
const ACCENT = '0.18 0.29 1';

/** PDF 文本行（y 为基线；括号需转义） */
function line(x, y, font, size, text, rgb = INK) {
  const esc = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  return `BT ${rgb} rg /${font} ${size} Tf ${x} ${y} Td (${esc}) Tj ET\n`;
}

function hrule(y, w = 0.6, rgb = '0.82 0.80 0.76') {
  return `${w} w ${rgb} RG ${LEFT} ${y} m ${RIGHT} ${y} l S\n`;
}

// ── 光标式排版 ────────────────────────────────────────────────
let y = 0;
let ops = '';

// 页眉：顶部墨色粗线 + 靛蓝竖条 + 姓名/定位/联系方式
ops += `1.2 w ${INK} RG ${LEFT} 782 m ${RIGHT} 782 l S\n`;
ops += `3 w ${ACCENT} RG ${LEFT} 726 m ${LEFT} 782 l S\n`;
ops += line(LEFT + 18, 754, 'F1', 24, 'LI YUNQIANG');
ops += line(LEFT + 18, 733, 'F2', 10.5, 'Data Science Major (B.Eng.) - Full-stack / AI Application Developer', MUTED);
ops += line(LEFT + 18, 715, 'F3', 8.5, 'Chengdu, China  |  github.com/lii-lii321  |  3028410005@qq.com  |  lii-lii321.github.io', ACCENT);
y = 695;
ops += hrule(y, 0.6);

function section(title) {
  y -= 34;
  ops += line(LEFT, y, 'F1', 10.5, title.toUpperCase());
  y -= 7;
  ops += hrule(y, 0.5, '0.88 0.86 0.80');
  y -= 18;
}

function text(t, { font = 'F2', size = 9.5, x = LEFT, color = INK, lead = 15.5 } = {}) {
  ops += line(x, y, font, size, t, color);
  y -= lead;
}

function bullet(t, { lead = 15 } = {}) {
  ops += line(LEFT + 10, y, 'F2', 9.5, `- ${t}`);
  y -= lead;
}

// ── EDUCATION ────────────────────────────────────────────────
section('Education');
text('Southwest Petroleum University - B.Eng. Data Science & Big Data Technology (in progress)', { font: 'F1', size: 9.8 });
text('Coursework applied directly into shipping products: every skill below is exercised by an open-source repo.', { color: MUTED });

// ── PROJECTS ─────────────────────────────────────────────────
section('Open-source Projects (all live and runnable)');

text('Math_Tutor_RAG - Visual-LLM + RAG mistake-notebook  (2025 - present)', { font: 'F1', size: 9.8 });
text('Photo-to-question capture -> structured parsing -> vector archive -> SM-2 spaced review.');
bullet('287 automated tests (pytest, CI green); 6 pluggable LLM providers; 10+ feature modules.');

y -= 7;
text('smart_tutor - Multi-tenant tutoring order matching platform  (2025 - 2026)', { font: 'F1', size: 9.8 });
text('End-to-end digitization: WeChat chat logs in, structured orders out, deposits and balances settled online.');
bullet('71 orders parsed from one batch of WeChat text (AI pipeline with human review); 3 roles covered.');
bullet('100% of the core flow online: posting -> matching -> trial class -> deposit / balance.');

y -= 7;
text('research-lab - One CSV in, one reproducible research report out  (2026 - present)', { font: 'F1', size: 9.8 });
bullet('5-stage automated pipeline: profile -> questions -> plan -> statistical tests -> report.');
bullet('100% reproducible: raw p-values archived with reproduction scripts; Streamlit / CLI / Python API.');

y -= 7;
text('Traveling (this website) - Zero-JS personal site  (2026)', { font: 'F1', size: 9.8 });
bullet('592 photos / 11 albums auto-ingested from a 6,700+ photo library; 0 KB client-side JS on the homepage.');

// ── SKILLS ───────────────────────────────────────────────────
section('Skills');
text('Languages   Python / TypeScript / SQL', { font: 'F3', size: 9, color: MUTED, lead: 17 });
text('Frontend      Vue 3 / React / Astro / Streamlit / Tailwind CSS', { font: 'F3', size: 9, color: MUTED, lead: 17 });
text('Backend      FastAPI / SQLAlchemy / MySQL / PostgreSQL / Redis GEO', { font: 'F3', size: 9, color: MUTED, lead: 17 });
text('AI / Data      RAG / ChromaDB / Vision LLMs / Agent-MCP / SM-2 / SciPy', { font: 'F3', size: 9, color: MUTED, lead: 17 });
text('Engineering  Docker / GitHub Actions / pytest / Playwright / Alembic', { font: 'F3', size: 9, color: MUTED, lead: 17 });

// ── SELECTED WRITING ────────────────────────────────────────
section('Selected Writing (on lii-lii321.github.io)');
text('- Search on a zero-JS site: build-time index + a 3 KB runtime', { size: 9.5 });
text('- Ingesting 6,700+ travel photos: sampling, compression, and a HEIC pitfall', { size: 9.5 });
text('- From WeChat group text to structured orders: an AI parsing pipeline', { size: 9.5 });
text('- Making RAG retrieval quality measurable: from vibes to reproducible metrics', { size: 9.5 });

// ── STATUS 页脚 ──────────────────────────────────────────────
y -= 8;
ops += hrule(y, 0.6);
y -= 16;
ops += line(LEFT, y, 'F1', 9.5, 'STATUS: Open to internship and remote collaboration.', ACCENT);
ops += line(LEFT + 210, y, 'F2', 8.5, 'Updated 2026-10-05 - full details at lii-lii321.github.io', MUTED);

// ── 组装 PDF ─────────────────────────────────────────────────
const objs = [];
objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
objs[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4[0]} ${A4[1]}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>`;
objs[4] = `<< /Length ${ops.length} >>\nstream\n${ops}endstream`;
objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>';
objs[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>';
objs[7] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

let pdf = '%PDF-1.4\n';
const offsets = [0];
for (let i = 1; i < objs.length; i++) {
  offsets[i] = pdf.length;
  pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
}
const xrefPos = pdf.length;
pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
for (let i = 1; i < objs.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

writeFileSync(new URL('../public/resume.pdf', import.meta.url), pdf, 'latin1');
console.log('[resume] public/resume.pdf 真实内容版已生成（', pdf.length, 'bytes ）');
