// 临时：山东行程盘点（用完即删）
import fs from 'node:fs';
import path from 'node:path';
const IMG = /\.(jpe?g|png)$/i;
const BASE = 'D:\\个人下载\\Desktop\\旅行照片\\山东 25.12.15-20';

const root = fs.readdirSync(BASE, { withFileTypes: true });
console.log('顶层:', root.map((e) => (e.isDirectory() ? `[目录] ${e.name}` : e.name)).join('\n'));
console.log('---');
for (const d of root.filter((e) => e.isDirectory())) {
  const sub = path.join(BASE, d.name);
  const show = path.join(sub, '网页展示');
  if (fs.existsSync(show)) {
    const imgs = fs.readdirSync(show).filter((f) => IMG.test(f)).sort();
    const totalMB = imgs.reduce((a, f) => a + fs.statSync(path.join(show, f)).size, 0) / 1048576;
    console.log(`[${d.name}] 网页展示: ${imgs.length} 张（${totalMB.toFixed(0)}MB）| 首张 ${imgs[0]} | 末张 ${imgs[imgs.length - 1]}`);
  } else {
    const top = fs.readdirSync(sub).filter((f) => IMG.test(f)).length;
    console.log(`[${d.name}] 无网页展示（顶层图片 ${top} 张）`);
  }
}
