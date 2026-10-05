/**
 * 封面方向修复：把竖版封面换成该相册第一张横版照片（写回 album.json）。
 * 横版封面在相册 hero、首页暗岛、OG 分享图里的裁切是可接受的；
 * 全部竖版的相册保留原封面（页面端有 object-cover 兜底）。
 */
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('src/data/travels.json', 'utf8'));
for (const t of data.trips) {
  const cover = t.photos.find((p) => p.src === t.cover) ?? t.photos[0];
  if (cover.height <= cover.width * 1.05) {
    console.log(`[ok] ${t.id}: 封面已是横版`);
    continue;
  }
  const land = t.photos.find((p) => p.width > p.height * 1.05);
  if (!land) {
    console.log(`[skip] ${t.id}: 全部竖版，保留原封面`);
    continue;
  }
  const file = `photos/${t.id}/album.json`;
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  cfg.cover = land.src.split('/').pop();
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  console.log(`[fixed] ${t.id}: 封面 → ${cfg.cover} (${land.width}x${land.height})`);
}
