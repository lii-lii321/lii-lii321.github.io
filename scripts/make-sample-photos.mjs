/**
 * 示例照片生成器：为每个相册生成 8 张 800x533 的 JPG（质量 80）。
 * 每张 = 相册主题色渐变底 + ASCII 文字标注（如 "2025-YUNNAN 01"，
 * 不用中文文字，避免 SVG 栅格化时字体缺字）。
 *
 * 用法：node scripts/make-sample-photos.mjs [--force]
 *   默认目标文件已存在时跳过；--force 才覆盖（避免误跑覆盖真实照片）。
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const PHOTOS_SRC_DIR = path.join(projectRoot, 'photos');

// 每个相册的主题色渐变（起始色 → 结束色）
const ALBUMS = [
  { id: '2025-yunnan', colors: ['#0ea5e9', '#2dd4bf'] },
  { id: '2024-sichuan', colors: ['#f59e0b', '#ef4444'] },
  { id: '2024-japan', colors: ['#f472b6', '#8b5cf6'] },
];

const WIDTH = 800;
const HEIGHT = 533;
const COUNT_PER_ALBUM = 8;
const JPEG_QUALITY = 80;

/** 构造单张示例图的 SVG（渐变底 + 装饰圆 + ASCII 标注） */
function buildSvg(label, index, total, [from, to]) {
  const title = `${label} ${String(index).padStart(2, '0')}`;
  const counter = `${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="${WIDTH * 0.82}" cy="${HEIGHT * 0.2}" r="150" fill="#ffffff" fill-opacity="0.10"/>
  <circle cx="${WIDTH * 0.15}" cy="${HEIGHT * 0.85}" r="120" fill="#000000" fill-opacity="0.12"/>
  <text x="${WIDTH / 2}" y="${HEIGHT * 0.44}" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="58" font-weight="bold" text-anchor="middle" fill="#ffffff" fill-opacity="0.95">${title}</text>
  <text x="${WIDTH / 2}" y="${HEIGHT * 0.58}" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="30" text-anchor="middle" fill="#ffffff" fill-opacity="0.75">${counter}</text>
</svg>`;
}

async function main() {
  const force = process.argv.includes('--force');
  console.log(`[示例照片] 开始生成示例照片 ...${force ? '（--force：覆盖已存在文件）' : ''}`);
  for (const album of ALBUMS) {
    const albumDir = path.join(PHOTOS_SRC_DIR, album.id);
    await fs.mkdir(albumDir, { recursive: true });
    const label = album.id.toUpperCase(); // 如 2025-YUNNAN
    for (let i = 1; i <= COUNT_PER_ALBUM; i++) {
      const fileName = `${String(i).padStart(2, '0')}.jpg`;
      const svg = buildSvg(label, i, COUNT_PER_ALBUM, album.colors);
      const outPath = path.join(albumDir, fileName);
      if (!force) {
        try {
          await fs.access(outPath);
          console.log(`[示例照片] ${album.id}/${fileName} 已存在，跳过（加 --force 覆盖）`);
          continue;
        } catch {
          /* 文件不存在，正常生成 */
        }
      }
      await sharp(Buffer.from(svg)).jpeg({ quality: JPEG_QUALITY }).toFile(outPath);
      console.log(`[示例照片] ${album.id}/${fileName} 已生成（${WIDTH}x${HEIGHT} JPG，质量 ${JPEG_QUALITY}）`);
    }
  }
  console.log(`[示例照片] 完成：共 ${ALBUMS.length} 个相册 × ${COUNT_PER_ALBUM} 张`);
}

main().catch((err) => {
  console.error(`[示例照片] 失败：${err.message}`);
  process.exit(1);
});
