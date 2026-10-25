/**
 * 从 public/favicon.svg 光栅化全套站点图标（幂等，可反复运行）：
 * - favicon-16x16 / 32x32 / 96x96.png：不支持 SVG favicon 的旧浏览器降级链
 * - apple-touch-icon.png（180×180）：iOS 添加到主屏 / 收藏
 * - icon-192 / icon-512.png + site.webmanifest：Android Chrome 主屏图标
 * 改 favicon.svg 后重跑：node scripts/make-icons.mjs（产物入库）。
 */
import sharp from 'sharp';
import { writeFileSync, readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url));
const png = (size) => sharp(svg, { density: 300 }).resize(size, size).png();

const out = async (name, size) => {
  const buf = await png(size).toBuffer();
  writeFileSync(new URL(`../public/${name}`, import.meta.url), buf);
  console.log(`[make-icons] ${name}（${size}×${size}，${(buf.length / 1024).toFixed(1)}KB）`);
};

await out('favicon-16x16.png', 16);
await out('favicon-32x32.png', 32);
await out('favicon-96x96.png', 96);
await out('apple-touch-icon.png', 180);
await out('icon-192.png', 192);
await out('icon-512.png', 512);

writeFileSync(
  new URL('../public/site.webmanifest', import.meta.url),
  JSON.stringify(
    {
      name: '李云强 · 个人站',
      short_name: '李云强',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#FBFAF7',
      background_color: '#FBFAF7',
      display: 'standalone',
    },
    null,
    2,
  ) + '\n',
);
console.log('[make-icons] site.webmanifest 已生成');
