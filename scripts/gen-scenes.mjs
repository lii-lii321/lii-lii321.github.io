/**
 * 子景点清单生成器：按 ingest-photos.mjs 完全相同的确定性抽样算法，
 * 重建「NN.jpg → 原始子文件夹」映射，写入 photos/<id>/scenes.json。
 *
 * 只做文件系统遍历与等距取样（零 sharp 压缩，秒级）；已入库的照片不必重新生成。
 * build-photos.mjs 读取 scenes.json，把 scene 字段写进 travels.json，相册页据此分组展示。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIPS } from './trips.config.mjs';

const SRC_ROOT = 'D:\\个人下载\\Desktop\\旅行照片';
const PHOTOS_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'photos');
const IMG = /\.(jpe?g|png|webp)$/i;
const CAP = 32;

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

function sampleEvenly(files, cap) {
  if (files.length <= cap) return files;
  const step = files.length / cap;
  return Array.from({ length: cap }, (_, i) => files[Math.floor(i * step)]);
}

let written = 0;
for (const trip of TRIPS) {
  const srcDir = path.join(SRC_ROOT, trip.src);
  if (!fs.existsSync(srcDir)) {
    console.warn(`[跳过] ${trip.id}：源目录不存在 ${trip.src}`);
    continue;
  }
  const albumDir = path.join(PHOTOS_ROOT, trip.id);
  if (!fs.existsSync(path.join(albumDir, 'album.json'))) {
    console.warn(`[跳过] ${trip.id}：photos/ 下未入库`);
    continue;
  }

  const all = collectImages(srcDir).sort();
  const picked = sampleEvenly(all, CAP);
  /** NN.jpg → 子景点名（相对行程根目录的第一段路径；根目录直属文件为 null） */
  const scenes = {};
  const distinct = new Set();
  for (let i = 0; i < picked.length; i++) {
    const rel = path.relative(srcDir, picked[i]);
    const scene = rel.includes(path.sep) ? rel.split(path.sep)[0] : null;
    scenes[`${String(i + 1).padStart(2, '0')}.jpg`] = scene;
    if (scene) distinct.add(scene);
  }

  if (distinct.size < 2) {
    console.log(`[跳过] ${trip.id}：没有可分组的子景点结构`);
    continue;
  }
  fs.writeFileSync(path.join(albumDir, 'scenes.json'), JSON.stringify(scenes, null, 2) + '\n', 'utf8');
  written++;
  console.log(`[ok] ${trip.id}: ${distinct.size} 个子景点 —— ${[...distinct].join(' / ')}`);
}
console.log(`\n完成 ${written} 个相册的子景点清单。`);
