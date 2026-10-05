/**
 * 真实旅行照片入库工具：从原始照片库抽样、压缩、写入 photos/<id>/ 并生成 album.json。
 *
 * 用法：node scripts/ingest-photos.mjs [--force] [--only=<tripId>]
 * - 默认跳过已存在的相册（幂等）；--force 重建；--only 只处理某一个相册。
 * - 抽样策略：按文件名排序后均匀取样，单相册上限 cap（约每 3~4 张取 1 张），
 *   保证子文件夹（景点）之间也有分布。
 * - 压缩：最长边 1600px、JPEG q80，withMetadata 保留 EXIF（供 build-photos 读拍摄时间）。
 * - 地点坐标：原始照片 EXIF 无 GPS（微信传输剥离），由 trips.config.mjs 人工标注。
 * - 子景点分组：跑 node scripts/gen-scenes.mjs 生成 scenes.json（与本项目录同一抽样算法）。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { TRIPS } from './trips.config.mjs';

const SRC_ROOT = 'D:\\个人下载\\Desktop\\旅行照片';
const DEST_ROOT = new URL('../photos/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const IMG = /\.(jpe?g|png|webp)$/i;
const MAX_EDGE = 1600;
const QUALITY = 80;
const DEFAULT_CAP = 60;

const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

/** 递归收集图片（仅 jpg/png/webp；HEIC 因解码依赖不稳定暂不处理） */
function collectImages(dir) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectImages(p));
    else if (IMG.test(e.name)) out.push(p);
  }
  return out;
}

/** 均匀抽样：保持顺序，从 n 个里等距取 cap 个 */
function sampleEvenly(files, cap) {
  if (files.length <= cap) return files;
  const step = files.length / cap;
  const picked = [];
  for (let i = 0; i < cap; i++) picked.push(files[Math.floor(i * step)]);
  return picked;
}

let done = 0;
for (const trip of TRIPS) {
  if (only && trip.id !== only) continue;
  const destDir = path.join(DEST_ROOT, trip.id);
  if (fs.existsSync(destDir) && !force) {
    console.log(`[skip] ${trip.id} 已存在（--force 重建）`);
    continue;
  }
  if (force) fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  const all = collectImages(path.join(SRC_ROOT, trip.src)).sort();
  const picked = sampleEvenly(all, DEFAULT_CAP);
  let ok = 0;
  let firstLandscape = null; // 封面优先用横版（基于转正后的真实方向）
  for (let i = 0; i < picked.length; i++) {
    const out = path.join(destDir, `${String(i + 1).padStart(2, '0')}.jpg`);
    try {
      const meta = await sharp(picked[i]).metadata();
      // orientation 5–8 表示存储时旋转了 90°，真实方向要交换宽高
      const swapped = (meta.orientation ?? 1) >= 5;
      const w = swapped ? (meta.height ?? 0) : (meta.width ?? 0);
      const h = swapped ? (meta.width ?? 0) : (meta.height ?? 0);
      if (!firstLandscape && w > h * 1.05) {
        firstLandscape = `${String(i + 1).padStart(2, '0')}.jpg`;
      }
      await sharp(picked[i])
        .rotate() // 关键：按 EXIF Orientation 把像素物理转正（相机竖拍的照片缩略图才是正的）
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALITY })
        .withMetadata() // 保留其余 EXIF（拍摄时间等）；sharp 转正后会把 Orientation 置 1
        .toFile(out);
      ok++;
    } catch (err) {
      console.warn(`  [跳过损坏/不支持的图片] ${path.basename(picked[i])}: ${err.message}`);
    }
  }
  if (ok === 0) {
    console.warn(`[空] ${trip.id} 没有成功导入任何图片，跳过 album.json`);
    continue;
  }
  const album = {
    title: trip.title,
    date: trip.date,
    place: trip.place,
    cover: firstLandscape ?? `${String(1).padStart(2, '0')}.jpg`,
    tags: trip.tags,
    description: trip.description,
  };
  fs.writeFileSync(path.join(destDir, 'album.json'), JSON.stringify(album, null, 2) + '\n', 'utf8');
  done++;
  console.log(`[ok] ${trip.id}: ${ok} 张（原始 ${all.length} 张，来源「${trip.src}」）`);
}
console.log(`\n完成 ${done} 个相册。下一步：node scripts/gen-scenes.mjs && node scripts/build-photos.mjs`);
