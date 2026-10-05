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
