/**
 * 生成 OG 默认分享图 → public/og-default.png（1200×630）。
 * 纸白底 + 靛蓝色块 + ASCII 文字（sharp 的 librsvg 不保证中文字体，保持 ASCII）；
 * 数字带从真实数据源派生（博客文章数 / 项目数 / 照片数 / 相册数），
 * 内容变化后重跑：node scripts/make-og.mjs。
 */
import sharp from 'sharp';
import { writeFileSync, readdirSync, readFileSync } from 'node:fs';

const W = 1200;
const H = 630;

// ── 真实数字（与站点同源核对，不手填） ─────────────────────────
const articles = readdirSync(new URL('../src/content/blog', import.meta.url)).filter((f) =>
  f.endsWith('.md'),
).length;
const projects = JSON.parse(
  readFileSync(new URL('../src/data/projects.json', import.meta.url), 'utf8'),
).length;
const travel = JSON.parse(readFileSync(new URL('../src/data/travels.json', import.meta.url), 'utf8'));
const photos = travel.stats.photoCount;
const albums = travel.trips.length;

const band = [
  { num: String(articles).padStart(2, '0'), label: 'ARTICLES' },
  { num: String(projects).padStart(2, '0'), label: 'PROJECTS' },
  { num: String(photos), label: 'PHOTOS' },
  { num: String(albums).padStart(2, '0'), label: 'ALBUMS' },
];

// 数字带：四组大数字 + 小标签，横向均分（等宽数字纵向对齐）
const bandX = 72;
const bandY = 400;
const cellW = (W - bandX * 2) / band.length;
const bandSvg = band
  .map((b, i) => {
    const x = bandX + i * cellW;
    return `
  <text x="${x}" y="${bandY}" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#15151A">${b.num}</text>
  <text x="${x + 2}" y="${bandY + 34}" font-family="monospace" font-size="16" letter-spacing="3" fill="#6F6F7A">${b.label}</text>`;
  })
  .join('');

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#FBFAF7"/>
  <rect x="72" y="96" width="8" height="150" fill="#2F4BFF"/>
  <text x="108" y="180" font-family="Georgia, serif" font-size="88" font-weight="700" fill="#15151A">LI YUNQIANG</text>
  <text x="110" y="238" font-family="Georgia, serif" font-size="30" fill="#8C8C96">Projects · Blog · Data Science · Travel Atlas</text>
  ${bandSvg}
  <line x1="72" y1="490" x2="1128" y2="490" stroke="#E2DFD6" stroke-width="1"/>
  <text x="108" y="540" font-family="monospace" font-size="20" letter-spacing="4" fill="#4B4B55">GITHUB.COM/LII-LII321 · ZERO-JS PERSONAL SITE · LIGHTHOUSE 100</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL('../public/og-default.png', import.meta.url), png);
console.log(`[make-og] og-default.png 已生成（1200x630，数字带：${articles} 文章 / ${projects} 项目 / ${photos} 张 / ${albums} 册）`);
