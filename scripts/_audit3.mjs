// 临时：全站体检（页面体积 Top / 图片资产画像）（用完即删）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('dist');
const pages = [];
(function w(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) w(f);
    else if (e.name === 'index.html') pages.push([f, fs.statSync(f).size]);
  }
})(ROOT);
pages.sort((a, b) => b[1] - a[1]);
console.log('== 页面 HTML 体积 Top 8 ==');
for (const [f, s] of pages.slice(0, 8)) console.log(`${(s / 1024).toFixed(0)}KB  ${path.relative(ROOT, f).split(path.sep).join('/')}`);
console.log(`全站 ${pages.length} 页，HTML 合计 ${(pages.reduce((a, [, s]) => a + s, 0) / 1048576).toFixed(1)}MB`);

console.log('\n== 各相册缩略图总重（访客滚完全册的下载量） ==');
const thumbsBase = path.resolve('public/photos');
for (const a of fs.readdirSync(thumbsBase, { withFileTypes: true })) {
  if (!a.isDirectory()) continue;
  const td = path.join(thumbsBase, a.name, 'thumbs');
  if (!fs.existsSync(td)) continue;
  let sum = 0, n = 0, max = 0;
  let s1280 = 0, n1280 = 0;
  for (const f of fs.readdirSync(td)) {
    const s = fs.statSync(path.join(td, f)).size;
    if (f.endsWith('.webp') && !f.includes('.')) { sum += s; n++; max = Math.max(max, s); }
    else if (f.includes('.1280.')) { s1280 += s; n1280++; }
  }
  console.log(`${a.name}: ${n} 张 640w 合计 ${(sum / 1048576).toFixed(1)}MB（均 ${(sum / n / 1024).toFixed(0)}KB，最重 ${(max / 1024).toFixed(0)}KB）| 1280 档 ${n1280} 张 ${(s1280 / 1048576).toFixed(1)}MB`);
}

const idx = fs.statSync(path.join(ROOT, 'index.html'));
console.log(`\n首页 HTML: ${(idx.size / 1024).toFixed(0)}KB`);
