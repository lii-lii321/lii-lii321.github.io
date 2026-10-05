# Traveling · 个人站

李云强的个人站：博客 + 项目展示 + 工程履历 + 旅行足迹地图。
浅色编辑 / 杂志风：纸白底、衬线大标题、发丝线行式列表，层级只用 1px 线。

**技术栈**：Astro 5 · React 19（仅地图 / 灯箱两个 island）· Tailwind CSS v4 · ECharts 5 · sharp / exifr（照片管线）

## 站点结构

```
src/
├── config/site.ts            站点个人信息（单一出口：身份/履历/数字/技术栈/Now）
├── data/                     travels.json（照片管线生成）· projects.json（项目）
│                             · visited.json（点亮名单）· github.json（构建时抓取）
├── content/blog/*.md         文章（Content Collections，frontmatter 见 content.config.ts）
├── content.config.ts         文章 schema
├── types.ts                  全部数据契约（Trip/Photo/Project/GitHubData…）
├── layouts/Base.astro        浅色杂志风布局：导航/页脚/汉堡菜单/强调色切换/返回顶部
├── pages/
│   ├── index.astro           首页：Hero→数字带→精选项目→最新文章→Now→旅行暗岛
│   ├── projects/             项目索引（筛选 chips）+ 详情（问题/做法/决策/指标/踩坑）
│   ├── blog/                 文章列表（头条+年份分组）+ 详情（sticky 目录+进度条+复制按钮）
│   ├── travel/               足迹地图 + 相册详情（子景点分组+小地图+灯箱+翻页）
│   ├── about.astro now.astro archives.astro search.astro tags/ 404.astro
│   └── rss.xml.js            RSS 订阅
├── components/
│   ├── common/               Pill · StatBand · FilterChips
│   ├── project/              WorkRow · ProjectMeta
│   ├── blog/                 PostRow · Toc · AuthorCard
│   ├── about/                Timeline · StackMatrix · Heatmap
│   ├── home/                 Hero · FeaturedProjects · LatestPosts · NowList · TravelIsland
│   ├── map/                  TravelMap（足迹地图）· MiniMap（相册单点小地图）
│   └── gallery/              PhotoGrid（子景点分组瀑布流）· Lightbox
└── styles/global.css         设计令牌（@theme）+ 排版层级 + 正文元素 + 打印样式

photos/<trip>/                入库照片 + album.json + scenes.json（子景点清单）
public/photos/                管线产物：原图 + 缩略图（构建时生成，勿手改）
scripts/                      照片入库/子景点/构建管线 + GitHub 抓取 + 截图入库 + 死链审计
.github/workflows/deploy.yml  GitHub Pages 部署（构建后自动跑死链审计）
.github/workflows/deploy.yml  GitHub Pages 部署（构建后自动跑死链审计）
```

## 快速开始

```bash
npm install
npm run dev      # 开发预览（热更新），默认 http://localhost:4321
npm run build    # 构建前自动跑 GitHub 抓取 + 照片管线
npm run preview  # 预览构建产物
```

## 站点结构

| 路由 | 内容 |
|---|---|
| `/` | 首页：定位句 → 数字带 → 精选项目 → 最新文章 → Now → 旅行板块（全站唯一暗色块） |
| `/projects`、`/projects/[id]` | 项目索引（筛选 chips + 行式列表）与详情（问题 / 做法 / 指标 / 踩坑） |
| `/blog`、`/blog/[id]` | 文章（Content Collections）：头条 + 年份分组；详情带 sticky 目录 |
| `/about` | 履历：时间线（每条 ≥2 条量化成果）→ 代表作 → 技术栈矩阵 → GitHub 热力图 → 教育 → CTA |
| `/travel`、`/travel/[id]` | 足迹地图（世界 / 中国点亮）与相册（瀑布流 + 灯箱） |
| `/rss.xml`、`/sitemap-index.xml` | 订阅与站点地图（构建时生成） |

## 怎么加内容

**写一篇文章**：在 `src/content/blog/` 新建 `.md`，frontmatter 参考 `src/content.config.ts` 的 schema（阅读时长自动计算）。

**加一个项目**：在 `src/data/projects.json` 追加条目（字段见 `src/types.ts` 的 `Project`），`featured: true` 会进首页精选。

**改个人信息 / 履历 / 数字 / 技术栈**：全部在 `src/config/site.ts`（单一出口）。

**加一次旅行**：原始照片按行程放好后，在 `scripts/trips.config.mjs` 里加一条配置（含地点坐标），跑 `node scripts/ingest-photos.mjs --only=<id>` → `node scripts/gen-scenes.mjs` → `node scripts/build-photos.mjs`。管线只读原始图库，均匀抽样（每册 ≤32 张）、压缩到 1600px、保留 EXIF；有子文件夹结构的相册自动按子景点分组展示。

**点亮的国家 / 省份**：`src/data/visited.json`。

**项目截图**：`node scripts/ingest-shots.mjs` 从各仓库 `docs/` 拷贝压缩；截图清单在 `projects.json` 的 `cover` / `shots` 字段。

**GitHub 热力图**：`site.ts` 的 `githubUser`（当前 lii-lii321），构建时自动抓取（可选 `GITHUB_TOKEN` 走 GraphQL）。

**质量工具**：`npm run check`（astro check 类型检查）· `npm test`（node --test 单元测试：地图纯函数 / 阅读时长）· `npm run audit`（扫描产物死链）——三者已焊进部署工作流，任一失败不发布；`scripts/make-og.mjs` / `make-resume.mjs` 重新生成占位分享图 / 简历。

## 部署

`.github/workflows/deploy.yml` 已就绪（withastro/action 构建 + deploy-pages 发布）。步骤：

1. 在 GitHub 建**用户站仓库** `lii-lii321.github.io`（根路径部署，站内链接无需 base 适配）；
2. `git remote add origin https://github.com/lii-lii321/lii-lii321.github.io.git && git push -u origin main`；
3. 仓库 Settings → Pages → Source 选 **GitHub Actions**；
4. 之后每次 push 到 main 自动构建发布。`astro.config.mjs` 的 `site` 已指向对应域名。

> 注意：仓库里包含 photos/（入库照片约 120MB），首次 push 会比较慢；若部署为项目站（子路径），需要额外做 base 适配。

## ⚠️ 仍可完善

- 站点数字带 / 部分项目指标的口径可随进展更新（当前全部取自仓库可核实事实）；
- `public/resume.pdf` 简历、`public/portrait.*` 头像待放入；
- 强调色默认靛蓝，页脚「● 强调色」按钮可切换朱橙预览（决定后删按钮、改 `global.css` 令牌）；
- 青城后山相册因 iPhone HEIC（HEVC）解码限制暂缺：手机导出 JPG 后跑 `node scripts/ingest-photos.mjs --only=qingcheng`。

## 设计与施工规格

见 `docs/personal-site-implementation-spec.md`（设计令牌、逐页规格、组件清单、验收标准），
`docs/ui-design-personal-site-2026-10-02.html` 为视觉参考稿。
