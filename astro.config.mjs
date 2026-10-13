// @ts-check
// Astro 配置：React 集成（地图 / 灯箱 island）+ Tailwind v4（Vite 插件）+ sitemap。
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages 用户站域名（仓库名用 lii-lii321.github.io 时根路径部署，无需 base）；
  // 若部署为项目站（xxx/Traveling/），需要额外做 base 适配，见 README「部署」一节。
  site: 'https://lii-lii321.github.io',
  integrations: [react(), sitemap()],
  // 站内链接 hover 预取：Chromium 走 Speculation Rules，其余浏览器注入约 1KB 预取脚本。
  // 46 页全是 10–40KB 的静态 HTML，换页近乎即时；只预取文档，不触碰 island 与灯箱逻辑
  prefetch: true,
  markdown: {
    // 代码高亮：Shiki 服务端渲染，浅色暖纸主题与设计令牌一致
    shikiConfig: {
      themes: {
        light: 'vitesse-light',
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
