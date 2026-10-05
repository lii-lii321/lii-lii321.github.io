/**
 * 一次性生成 OG 默认分享图 → public/og-default.png（1200×630）。
 * 纸白底 + 靛蓝色块 + ASCII 文字（避免中文字体缺字）；仅运行一次。
 * 替换正式 OG 图时：直接覆盖 public/og-default.png，不必重跑本脚本。
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const W = 1200;
const H = 630;

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#FBFAF7"/>
  <rect x="72" y="96" width="8" height="150" fill="#2F4BFF"/>
  <text x="108" y="180" font-family="Georgia, serif" font-size="88" font-weight="700" fill="#15151A">LI YUNQIANG</text>
  <text x="110" y="238" font-family="Georgia, serif" font-size="30" fill="#8C8C96">Projects · Blog · Data Science · Travel Atlas</text>
  <text x="108" y="540" font-family="monospace" font-size="20" letter-spacing="4" fill="#4B4B55">GITHUB.COM/LII-LII321 · ZERO-JS PERSONAL SITE</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL('../public/og-default.png', import.meta.url), png);
console.log('[make-og] og-default.png 已生成（1200x630，占位）');
