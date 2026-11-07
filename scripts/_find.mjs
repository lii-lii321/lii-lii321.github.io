// 临时：追溯 031/054 的原始文件身份（用完即删）
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'D:\\个人下载\\Desktop\\旅行照片\\贵州 26.8.25-29';
const groups = [
  { scene: '黔灵山 · 白宫夜市', dir: '黔灵山白宫夜市8.25' },
  { scene: '天河潭', dir: '天河潭8.26' },
  { scene: '黄果树瀑布', dir: '黄果树瀑布8.27' },
  { scene: '荔波小七孔', dir: '荔波小七孔8.28' },
];
const IMG = /\.(jpe?g|png)$/i;
let seq = 0;
for (const g of groups) {
  const files = fs.readdirSync(path.join(BASE, g.dir, '网页展示')).filter((f) => IMG.test(f)).sort();
  for (const f of files) {
    seq++;
    if (seq === 31 || seq === 54) console.log(`编号 ${seq} = [${g.scene}] ${f}`);
  }
}
// 顺带确认磁盘上有这两张
for (const n of ['031.jpg', '054.jpg']) {
  console.log(n, '磁盘:', fs.existsSync(`photos/guizhou/${n}`) ? '存在' : '不存在');
}
// 用户当前 order.json 的分组上下文：找相邻项的 scene
const order = JSON.parse(readFileSync('photos/guizhou/order.json', 'utf8'));
const scenes = JSON.parse(readFileSync('photos/guizhou/scenes.json', 'utf8'));
const idx31 = order.order.indexOf('031.jpg');
console.log('\norder 上下文（031 若在其中）:', idx31 >= 0 ? order.order.slice(Math.max(0, idx31 - 2), idx31 + 3).map((n) => `${n}[${scenes[n] ?? '-'}]`).join(' ') : '不在 order 中');
