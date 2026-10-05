// 全站审计：扫描 dist 里所有 HTML 的内部链接与图片资源，验证目标存在
import fs from 'node:fs';
import path from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const htmlFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

const check = new Set();
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const raw = m[1];
    if (/^(https?:|mailto:|data:|javascript:)/.test(raw)) continue;
    check.add(raw.split('?')[0]);
  }
}

function exists(rel) {
  const p = path.join(DIST, decodeURIComponent(rel));
  if (!fs.existsSync(p)) return false;
  if (fs.statSync(p).isDirectory()) return fs.existsSync(path.join(p, 'index.html'));
  return true;
}

const broken = [];
for (const link of [...check].sort()) {
  const rel = link.replace(/^\//, '').replace(/\/$/, '');
  if (rel === '') {
    if (!exists('index.html')) broken.push(link);
    continue;
  }
  const candidates = [rel, `${rel}/index.html`, `${rel}.html`];
  if (!candidates.some((c) => exists(c))) broken.push(link);
}

console.log(`页面 ${htmlFiles.length} 个 · 唯一内部链接/资源 ${check.size} 个`);
if (broken.length === 0) {
  console.log('审计通过：无死链、无缺失资源');
} else {
  console.log('发现死链 / 缺失资源：');
  for (const b of broken) console.log('  ✗', b);
  process.exitCode = 1;
}
