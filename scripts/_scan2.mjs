// 临时：三星堆/上海两文件夹精确盘点（用完即删）
import fs from 'node:fs';
import path from 'node:path';

const IMG = /\.(jpe?g|png|webp)$/i;
const VID = /\.(mp4|mov|avi)$/i;
for (const [label, dir] of [
  ['三星堆26.4.15', 'D:\\个人下载\\Desktop\\旅行照片\\三星堆26.4.15'],
  ['上海 25.12.14', 'D:\\个人下载\\Desktop\\旅行照片\\上海 25.12.14'],
]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const imgs = entries.filter((e) => e.isFile() && IMG.test(e.name)).map((e) => e.name).sort();
  const vids = entries.filter((e) => e.isFile() && VID.test(e.name));
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const totalMB = imgs.reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0) / 1048576;
  console.log(`[${label}] 图片 ${imgs.length} 张（${totalMB.toFixed(0)}MB）| 视频 ${vids.length} | 子文件夹 ${dirs.length ? dirs.join(',') : '无'}`);
  console.log(`  首张: ${imgs[0] ?? '无'} | 末张: ${imgs[imgs.length - 1] ?? '无'}`);
}
// 旧册元数据
for (const id of ['sanxindui', 'shanghai']) {
  const a = JSON.parse(fs.readFileSync(`photos/${id}/album.json`, 'utf8'));
  const count = fs.readdirSync(`photos/${id}`).filter((f) => f.endsWith('.jpg')).length;
  console.log(`[旧册 ${id}] ${a.title} | date=${a.date} | ${count} 张 | cover=${a.cover} | tags=${a.tags.join('/')}`);
}
