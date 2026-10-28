# Traveling · 李云强的个人站

作者李云强，数据科学在读 · 全栈 / AI 应用开发者。全静态个人站：博客、项目展示、工程履历与旅行足迹地图，Astro 5 构建。全站静态输出 46 页；照片从 6746 张原始图库均匀抽样入库 532 张；CI 焊四道门禁；首页 Lighthouse 四项满分。

**在线访问**：**https://lii-lii321.github.io**

## 亮点

- **性能**：首页 Lighthouse **100 · 100 · 100 · 100**（性能 / 可访问性 / 最佳实践 / SEO）；首页 **0 个 React island**，内联渐进增强脚本合计约 1.8 KB（另有 View Transitions 客户端路由外链 chunk 约 12.8 KB）
- **照片管线**：**10 本相册、532 张**照片，从 **6746 张**原始图库按脚本均匀抽样入库（单册上限 60 张）；构建时每张派生 4 类文件——640 宽 WebP 缩略图、1280 宽 WebP 缩略图（仅对宽 ≥1280 的原图生成）、原图同宽灯箱显示档、16px 模糊占位图
- **足迹地图**：足迹覆盖国内 **8 个省级行政区**（**10 次行程**，按地点聚合点亮；ECharts）
- **站内搜索**：构建期生成索引、内嵌进搜索页，运行时零请求；搜索页内联脚本合计约 11 KB（含内嵌索引）
- **质量门禁**：`astro check` → `node --test`（**26 个单元测试**）→ `astro build` → 死链审计，四道焊进 GitHub Actions，任一失败不发布
- **体验细节**：View Transitions 换页过渡 + hover 预取；文章 sticky 目录；相册子景点分组 + 灯箱
- **简历双版本**：中文 `/resume` 页 + 英文 PDF（`make-resume.mjs` 从 `site.ts` 同源生成）

> **数字口径**：页数 / 照片数 / 相册数 / 省份数来自构建产物（`src/data/travels.json` 构建时统计）与测试，clone 后可复现；**6746**（原始图库张数）与 Lighthouse 四项满分为作者测量快照，仓库未存报告档。两个 KB 数为 2026-10-28 对当前 `dist/` 构建产物的内联脚本字节数实测。

**技术栈**：Astro 5 · React 19（仅足迹地图 / 小地图 / 灯箱 / 文章目录 4 个 island）· Tailwind CSS v4 · ECharts 5 · sharp / exifr（照片管线）

## 架构

```
构建期（Node，本地与 CI 相同入口）
─────────────────────────────────────────────────────────────
原始图库（私人，仓库外）
  │  均匀抽样选片 → 入库（10 册，单册 ≤ 60 张）
  ▼
scripts/ingest-photos.mjs ─▶ photos/<trip>/    入库 JPEG（1600px · q80 · 保留 EXIF）
scripts/gen-scenes.mjs    ─▶ photos/<trip>/scenes.json（子景点分组）
scripts/build-photos.mjs  ─▶ public/photos/    WebP 缩略图 + 同宽灯箱档 + 模糊占位
scripts/fetch-github.mjs  ─▶ src/data/github.json（GitHub 热力图数据）

src/config/site.ts（身份 / 履历，单一出口）      ┐
src/data/*.json（travels / projects / visited）  ├─▶ astro build ─▶ dist/
src/content/blog/*.md（Content Collections）     ┘

运行时（浏览器）
─────────────────────────────────────────────────────────────
静态 HTML/CSS + 少量内联 JS（搜索 / 折叠 / 目录等渐进增强）
仅 4 个 React 19 island：TravelMap · MiniMap · Lightbox · Toc

CI（.github/workflows/deploy.yml → GitHub Pages）
─────────────────────────────────────────────────────────────
npm run check ─▶ npm test ─▶ npm run build ─▶ npm run audit ─▶ deploy-pages
（类型检查      单测        抓取+照片派生+构建  死链审计）
```

## 快速开始

要求 Node 24（本地开发与 CI 均为 24；`npm test` 用 `node --test` 直跑 `.ts` 用例，依赖新版 Node 的 TS 类型剥离）。

```bash
npm install
npm run dev      # 开发预览（热更新），http://localhost:4321
npm test         # node --test 单元测试（地图纯函数 / 阅读时长 / 搜索打分 / 相册折叠）
npm run build    # = GitHub 抓取 + 照片派生（build-photos）+ astro build，产出 dist/
```

新 clone 即可完整构建：入库照片与各册 `album.json` 已随仓库提交（`photos/` 目录），`.gitignore` 仅排除灯箱显示档（构建时由 `build-photos` 重新生成）——`npm run build` 与 CI 都不依赖仓库外的私人原始图库，只有给新行程入库时才需要（`fetch-github` 一步需要访问 GitHub API）。

配套检查：`npm run check`（astro check 类型检查）、`npm run audit`（扫描构建产物死链）——与上面四条命令一起构成部署工作流的完整门禁（`deploy.yml` 中的执行顺序即 check → test → build → audit）。

## 照片管线

站点最大的工程量在照片：行程取舍与地点坐标人工完成（微信传输会剥离 EXIF GPS，坐标在 `trips.config.mjs` 人工标注），选片 / 入库 / 派生 / 部署全程脚本化。

1. **均匀抽样选片**（`scripts/ingest-photos.mjs`）：对原始图库按文件名排序等距取样，单册上限 60 张（`DEFAULT_CAP`），并保证各景点子文件夹之间有分布；压缩到 1600px / JPEG q80，保留 EXIF 供后续读取拍摄时间；
2. **视觉质量评审换片**（动态工作流编排，2026-10）：站上 532 张全部经视觉模型逐张打分（均分 6.4，119 张判差），差片回到原始图库定位同场景邻近帧对比评估，18 张以明显更优帧完成替换（同分不硬凑）——选片从「等距取到什么用什么」升级为「识别出好的再上站」；
3. **子景点分组**（`scripts/gen-scenes.mjs`）：用同一抽样算法生成 `scenes.json`，相册页按子景点分组展示；
4. **构建派生**（`scripts/build-photos.mjs`）：为每张入库照片派生 4 类文件——640 / 1280 两档 WebP 缩略图（1280 档仅对宽 ≥1280 的原图生成）、原图同宽的灯箱显示档 WebP、16px 宽的模糊 base64 占位图——页面端 `srcset` 按视口取档、加载前先显模糊占位；
5. **新增一次旅行**：在 `scripts/trips.config.mjs` 加一条配置（地点坐标人工标注），然后依次运行：

   ```bash
   node scripts/ingest-photos.mjs --only=<id>
   node scripts/gen-scenes.mjs
   node scripts/build-photos.mjs
   ```

## 目录结构

```
src/
├── config/site.ts            站点个人信息（单一出口：身份/履历/技术栈/Now）
├── data/                     travels.json（照片管线生成）· projects.json · visited.json · github.json
├── content/blog/*.md         文章（Content Collections，schema 见 content.config.ts）
├── content.config.ts         文章 schema
├── types.ts                  全部数据契约（Trip/Photo/Project/GitHubData…）
├── layouts/Base.astro        浅色杂志风布局：导航/页脚/汉堡菜单/返回顶部/View Transitions
├── pages/
│   ├── index.astro           首页：Hero→数字带→精选项目→最新文章→Now→旅行板块（TravelIsland，纯静态组件）
│   ├── projects/             项目索引（筛选 chips）+ 详情（问题/做法/决策/指标/踩坑）
│   ├── blog/                 文章列表（头条+年份分组）+ 详情（sticky 目录+进度条+复制按钮）
│   ├── travel/               足迹地图 + 相册详情（子景点分组+小地图+灯箱+翻页）
│   ├── about.astro now.astro archives.astro search.astro resume.astro tags/ 404.astro
│   └── rss.xml.js            RSS 订阅
├── components/
│   ├── common/               Pill · SectionHead · StatBand · FilterChips
│   ├── project/ · blog/ · about/ · home/ · search/
│   ├── map/                  TravelMap（足迹地图）· MiniMap（相册单点小地图）· mapOptions.ts
│   └── gallery/              PhotoGrid（子景点分组瀑布流）· Lightbox
└── styles/global.css         设计令牌（@theme）+ 排版层级 + 打印样式

photos/<trip>/                入库照片 + album.json（ingest-photos 生成：标题/日期/标签/地点坐标/封面）+ scenes.json（子景点清单）
public/photos/                管线产物：缩略图/显示档（构建时生成，勿手改）
scripts/                      照片入库/子景点/构建管线 + GitHub 抓取 + 截图入库 + 死链审计
                              + 简历/OG 图生成（trips.config.mjs 为行程配置）
tests/                        node --test 单元测试（4 个文件）
.github/workflows/deploy.yml  GitHub Pages 部署（构建后自动跑死链审计）
```

日常维护入口：**写文章**在 `src/content/blog/` 新建 `.md`；**加项目**改 `src/data/projects.json`（`featured: true` 进首页精选）；**改个人信息/履历**只动 `src/config/site.ts`（站点数字由照片管线写入 `src/data/travels.json`、构建时自动派生，无需手改）；**点亮名单**在 `src/data/visited.json`。部署推送到 `lii-lii321.github.io` 用户站仓库即自动构建发布。

## License

暂未附带 LICENSE 文件：个人站点，代码与内容（文章、照片）默认保留所有权利；想参考或引用，欢迎开 issue 或联系作者。

## 作者

**李云强** —— 数据科学在读 · 全栈 / AI 应用开发者。完整履历与代表作见 [关于我 /about](https://lii-lii321.github.io/about) · GitHub [@lii-lii321](https://github.com/lii-lii321)
