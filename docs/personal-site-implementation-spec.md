# 个人站改造实施规格 · Traveling

> **交付对象**：zcode（落代码的 agent）
> **文档版本**：v1 · 2026-10-02
> **目标仓库**：`D:\Traveling`（Astro 5 + React 19 + Tailwind v4 静态站）
> **视觉参考稿**：`D:\Traveling\docs\ui-design-personal-site-2026-10-02.html`（本地双击打开，含 7 个可切换页面）

---

## 目录

- [1. 任务目标](#1-任务目标)
- [2. 现状盘点](#2-现状盘点)
- [3. 设计决策摘要](#3-设计决策摘要)
- [4. 设计令牌（可直接落地的 CSS）](#4-设计令牌可直接落地的-css)
- [5. 字体与排版规格](#5-字体与排版规格)
- [6. 栅格与间距](#6-栅格与间距)
- [7. 信息架构与路由](#7-信息架构与路由)
- [8. 逐页面规格](#8-逐页面规格)
- [9. 组件规格清单](#9-组件规格清单)
- [10. 数据模型](#10-数据模型)
- [11. 现有文件改造清单](#11-现有文件改造清单)
- [12. 施工顺序](#12-施工顺序)
- [13. 验收标准](#13-验收标准)
- [14. 占位内容清单（需用户替换）](#14-占位内容清单需用户替换)
- [15. 风险与注意事项](#15-风险与注意事项)

---

## 1. 任务目标

把现有的「旅行相册站」升级为**个人博客 + 项目展示 + 工程履历**三合一的个人站。

| 维度 | 现状 | 目标 |
|---|---|---|
| 站点定位 | 旅行照片集 | 个人技术刊物（博客 / 项目 / 履历） |
| 首页主题 | 最新一次旅行 | 「我是谁 + 我做过什么」 |
| 视觉风格 | 暗色夜空（深海军蓝 + 照片封面 + 卡片瀑布） | 浅色编辑 / 杂志风（纸白 + 衬线大标题 + 发丝线行式列表） |
| 履历 | 无 | 工程向：项目 / 技术栈 / 开源贡献 / GitHub 活跃度 |
| 旅行内容 | 站点主体 | 保留为一个板块，不降级、不删除 |

**关键取舍**：旅行内容在浅色页面中保留为一块**深色「岛屿」**（首页 `TravelIsland` 组件）。深夜蓝在纸白页面里形成反差，是全站唯一的暗色块，也是记忆点。

---

## 2. 现状盘点

### 2.1 技术栈

```
Astro 5 + @astrojs/react 19 + Tailwind CSS v4（@tailwindcss/vite 插件方式）
额外依赖：echarts（足迹地图）、exifr（照片元数据）、sharp（构建期缩略图）
构建命令：node scripts/build-photos.mjs && astro build
```

### 2.2 现有文件结构

```
src/
├── config/site.ts              站点个人信息（当前全是占位："你的名字"）
├── data/travels.json           旅行数据（管线生成，字段见 types.ts）
├── data/visited.json           已访问地点
├── types.ts                    TravelData / Trip 契约类型
├── layouts/Base.astro          全站布局：暗色导航 + 页脚
├── pages/
│   ├── index.astro             首页：Hero → StatsBand → FeaturedTrips → AboutMe
│   ├── travel/index.astro      足迹地图
│   └── travel/[id].astro       相册详情
├── components/
│   ├── home/{Hero,StatsBand,FeaturedTrips,TripCard,AboutMe}.astro + utils.ts
│   ├── gallery/{PhotoGrid.astro,Lightbox.tsx}
│   └── map/{TravelMap.tsx,mapOptions.ts}
└── styles/global.css           设计令牌（@theme）+ 暗色 body 背景

public/photos/2024-japan|2024-sichuan|2025-yunnan/   各 8 张 jpg + thumbs/*.webp
scripts/{build-photos.mjs,make-sample-photos.mjs}
```

### 2.3 现有设计令牌（将被整体替换）

```css
/* 现状：暗色夜空风 */
--color-night: #0a0f1e;   --color-panel: #111a30;
--color-sky:   #38bdf8;   --color-amber: #f59e0b;
--color-ink:   #e6eaf2;
```

---

## 3. 设计决策摘要

| 决策项 | 结论 | 理由 |
|---|---|---|
| 站点形态 | 在现有工程上扩展，不新建仓库 | 复用 Astro 工程、构建管线、照片资源 |
| 视觉风格 | 浅色编辑 / 杂志风 | 长文和履历可读性最好，最能撑起「个人品牌」 |
| 层级手段 | **只用 1px 发丝线，不用阴影** | 杂志感的核心来源 |
| 字体分工 | 衬线做标题 / 无衬线做正文 / 等宽做元信息 | 衬线给「刊物感」，等宽给「工程感」 |
| 列表形态 | 行式（编号 + 标题 + 摘要 + chips）而非卡片网格 | 更像刊物目录，信息密度高 |
| 履历重心 | 工程向：量化成果 + 技术栈 + GitHub | 用数据说话，不用形容词 |
| 强调色 | 靛蓝 `#2F4BFF`（默认）/ 朱橙 `#D9481F` 二选一 | 顶栏可实时切换评审，建议两个都感受后定 |
| 夜间模式 | **本版不做**，列入 v2 | 避免第一版范围失控 |

---

## 4. 设计令牌（可直接落地的 CSS）

替换 `src/styles/global.css` 的 `@theme` 块。**注意：删掉 `body` 上的天蓝 radial-gradient**（浅色页不需要）。

```css
@import "tailwindcss";

@theme {
  /* 纸面 */
  --color-paper:   #FBFAF7;
  --color-paper-2: #F3F1EA;
  --color-paper-3: #E9E6DC;
  /* 墨色（ink-3 需对 paper ≥4.5:1 过 WCAG AA，小字号 meta 文本适用） */
  --color-ink:     #15151A;
  --color-ink-2:   #4B4B55;
  --color-ink-3:   #6F6F7A;
  /* 线 */
  --color-rule:    #E2DFD6;
  --color-rule-2:  #CFCBBD;
  /* 强调色（靛蓝，2026-10-05 终审定稿） */
  --color-accent:      #2F4BFF;
  --color-accent-soft: rgba(47,75,255,.09);
  --color-code-bg:     #F4F2EB;
  /* 状态 */
  --color-ok: #22A06B;

  --font-sans:  "Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
                "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-serif: "Noto Serif SC", "Source Serif 4", Songti SC, SimSun, Georgia, serif;
  --font-mono:  "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
}

html { scroll-behavior: smooth; }
* { -webkit-print-color-adjust: exact; }
::selection { background: var(--color-accent); color: #fff; }
```

### 4.1 强调色（已终审）

**2026-10-05 定稿：靛蓝 #2F4BFF。** 朱橙备选方案（#D9481F）与页脚切换按钮已移除；
若未来重开此决策，用 `<html data-accent>` 方案驱动即可（历史实现见 git 记录）。

**中文 webfont 注意**：Google Fonts 的 Noto Serif SC 全字重体积大，生产环境务必做 subset 或退回系统字体（`Songti SC` / `SimSun`），否则首屏会拖垮 LCP。设计稿里的 CDN 链接**仅供评审**，不要直接搬进生产。

---

## 5. 字体与排版规格

| 层级 | 字体 | 规格 | 用在哪 |
|---|---|---|---|
| Display | serif 700 | `clamp(2.9rem, 7.4vw, 6.2rem)` / line-height .98 / letter-spacing -.025em | 首页大标题、页面 H1 |
| H1 | serif 700 | `clamp(2.1rem, 4.6vw, 3.6rem)` / 1.08 | 页面主标题 |
| H2 | serif 600 | `clamp(1.5rem, 2.7vw, 2.1rem)` / 1.18 | 区块标题 |
| H3 | serif 600 | `1.2rem` / 1.35 | 卡片 / 步骤标题 |
| Lede | sans 400 | `clamp(1.05rem, 1.5vw, 1.22rem)` / 1.72 / max 56ch | 首页与详情页导语 |
| Body | sans 400 | `1.06rem` / 1.9 / **max 68ch** | 文章正文 |
| Meta | mono | `11–12.5px` / letter-spacing .04em / 大写 | 日期、编号、标签、状态 |
| Code | mono | `12.3px` / 1.75 | 代码块、行内 `code` |

**核心**：衬线 / 无衬线 / 等宽的三层分工，是新版和旧版的根本差别——旧版只有无衬线，所以看着像工具站而不是个人站。

---

## 6. 栅格与间距

| 项 | 值 | 说明 |
|---|---|---|
| 容器 | `max-width: 1280px` | |
| 边距 | `40px`（移动端 `20px`） | |
| 区块垂直间距 | `clamp(56px, 8vw, 112px)` | **大留白是杂志感主要来源，不要压缩** |
| 行式列表条目 | `padding: 34–38px` + 1px rule | 首页项目列表、文章列表统一 |
| 行内元素 | `8px` | chips / tags |
| 区块内 | `16 / 24px` | |
| 圆角 | `4 / 10 / 14px` | 仅图片容器、卡片、按钮胶囊；**文字块一律 0** |
| 阴影 | 仅 `--shadow: 0 1px 2px rgba(20,20,25,.05), 0 10px 30px rgba(20,20,25,.05)` | hover 态用，不用作常规层级 |
| 断点 | `1080px` / `900px` | 900px 以下：项目行式列表转单列、统计带转 2×2、导航链接收起 |

---

## 7. 信息架构与路由

```
/                         首页：定位句 → 4 个数字 → 精选项目 3 → 最新文章 3 → Now → 旅行板块
├── /projects             项目索引：筛选 chips + 行式列表
│   └── /projects/[id]    详情：meta 表 → 问题 → 做法 01-03 → 指标卡 → 结果 → 踩坑折叠 → 上/下一个
├── /blog                 头条大卡 + 按年份分组的文章流 + 分类筛选
│   └── /blog/[id]        详情：sticky 目录 + 68ch 正文 + 代码块 + 作者卡 + 上/下一篇
├── /about                履历：定位 → 经历时间线 → 代表作 → 技术栈矩阵 → GitHub → 教育 → CTA
├── /travel               （保留）足迹地图
│   └── /travel/[id]      （保留）相册详情
└── /now                  可选：Now 完整页（首页只放 3 行摘要）

/resume.pdf               静态资源，不做页面
/rss.xml                  Astro 内置 @astrojs/rss
```

**导航结构**（5 个入口 + 右侧 CTA）：

```
[姓名（衬线） + 拼音（等宽）]        首页 项目 文章 关于 旅行    [GitHub] [Email] [简历 PDF]
────────────────────────────────────────────────────────────────────── 1px rule
```

当前页导航项加 2px `--color-accent` 下划线（`.nav-link.on::after`）。

---

## 8. 逐页面规格

### 8.1 首页 `/`

按顺序纵向排列，区块间距用 `--sec` 的 clamp 值：

1. **Hero**
   - 状态胶囊：`● 目前可接远程合作 · 上海`（`.pulse` 绿点带 2.4s 呼吸动画，需 `prefers-reduced-motion` 降级）
   - Display 衬线大标题：两行，第二行用 `--color-ink-3` 弱化
   - Lede 导语：3 行以内，`max-width: 56ch`
   - 3 个 CTA：主按钮（`--color-ink` 底 / hover 转 accent）+ 2 个描边按钮
   - meta 行（等宽）：`全栈 / AI 应用 · React · Vue · Python · 本站最后更新 2026-10-02`
2. **数字带 StatBand**（本项目的核心说服力组件）
   - 4 列，上下 1px rule，列间 1px 竖线，**无卡片无阴影**
   - 每列：大号衬线数字（含 `<small>` 单位小字）+ 说明 + 等宽副信息
   - 工程向指标：上线项目数 / GitHub Stars / 年度 PR / 服务用户数
3. **精选项目**（3 条，完整版见 `/projects`）
   - 区块头：eyebrow（`SELECTED WORK`）+ H2 + 右侧「全部 12 个项目 →」
   - 行式条目：网格 `44px | 1fr | 1fr`
     - 左：等宽编号 `01`
     - 中：项目名（衬线 H3）+ 等宽 meta（年份 · 角色）+ 摘要（`max 42ch`）+ 状态点 + 技术栈 chips
     - 右：占位图 `16:10` + 右对齐指标 chips
     - 交互：整行 hover 时项目名转 accent
4. **最新文章**（3 条）
   - 网格 `150px | 1fr | auto`：日期（等宽）| 标题 + 摘要 | 阅读时长 + 分类
5. **Now**（3 行）
   - 网格 `170px | 1fr`：等宽大写 key（`Building` / `Reading` / `Learning`）| 内容
   - 行间用虚线 rule，最后一条实线
6. **TravelIsland 旅行板块**
   - 唯一暗色块：`#0a0f1e` 底 + 径向天蓝辉光 + 14px 圆角
   - 左文右图（`1.2fr | 1fr`）：eyebrow `OFF THE CLOCK` → 衬线标题 → 描述 → 3 个数字（天蓝）→「打开足迹地图 →」（琥珀色）
   - 右侧地图占位（`min-height: 230px`），左下角叠一行等宽经纬度
7. **页脚**
   - 顶部 1px `--color-ink` 粗线
   - 4 列：品牌（衬线姓名 + 2 行介绍）/ 站点 / 项目 / 联系
   - 底栏：版权 + 「本站用 Astro 构建」+ 最后更新日期 + RSS

### 8.2 项目列表 `/projects`

- 页头：eyebrow `PROJECT INDEX` + H1 + 导语
- 筛选 chips：`全部 12 / 产品 6 / 开源 4 / 实验 2 / 已归档 3`，选中态为 `--color-ink` 实心胶囊
- 行式列表，网格 `56px | 1.15fr | 1fr | 132px`
  - 编号 / 项目名 + 摘要 + 技术栈 chips / 角色 + 状态 / 年份（**右对齐**）
  - 行 hover 底色转 `--color-paper-2`，标题转 accent

### 8.3 项目详情 `/projects/[id]`

固定骨架，严格按序：

1. 面包屑（等宽）：`项目 / 产品 / MathMaster Edu`
2. eyebrow（年份 · 角色）+ H1（`max-width: 16ch`）+ standfirst
3. **MetaGrid**：4 列，上下 1px rule（顶线用 `--color-ink` 加粗），列间竖线
   - 角色 / 周期 / 技术栈（chips）/ 状态（绿点 + 数字）
4. `01 — 问题`：H2 + 2–3 段 + 引用块（左侧 3px accent 竖线，衬线斜体）
5. 整宽配图（`21:9` 占位）+ figcaption（等宽小字）
6. `02 — 做法`：H2 + 编号步骤列表，每步 `60px | 1fr`，步骤号用 accent 等宽
7. `03 — 结果`：H2 + 3 张指标卡（衬线大数字 + 单位小字 + 说明 + 等宽基线对比）
8. **踩过的坑**：`<details>` 折叠块，summary 底 `--color-paper-2`，`+ / −` 符号
9. Pager：两列，上一个 / 下一个，间 1px 竖线

### 8.4 文章列表 `/blog`

- 页头 + 分类 chips
- **头条大卡**：网格 `1.1fr | 1fr`，左侧占位图 `4:3`，右侧 eyebrow + 大衬线标题 + 摘要 + 「读全文 →」
- **按年份分组**：年份头（衬线年份 + 等数字数，底部 1px `--color-ink` 粗线）→ 该年文章行（复用 `PostRow`）
- 不做分页，用「加载更多」或直接渲染全部（预计 < 100 篇）

### 8.5 文章详情 `/blog/[id]`

- 面包屑 → eyebrow（分类）→ H1 → standfirst（衬线 1.42rem）→ post-meta 横条（日期 · 阅读时长 · 标签 · 最后更新，上下 1px rule）
- **两栏布局**：`200px | 1fr`，间距 64px
  - 左栏 sticky 目录（`top: 132px`）：从 Markdown headings 自动生成，当前项 accent 2px 左边线；底部 meta 小块（用例数 / 代码行数 / 更新日期）
  - 右栏正文：`max-width: 68ch`，字号 `1.06rem` / line-height `1.9`
- **正文内元素样式**（全部要用到）：
  - `pre` 代码块：带 1px rule 的圆角容器 + 顶部工具条（三个圆点 + 文件名 + 语言标签），行内 `code` 去掉边框
  - `.callout` 提示框：左侧 3px accent 竖线 + `--accent-soft` 底
  - `.aside-note` 旁注块：`--color-paper-2` 底 + 1px rule
  - `blockquote` 引用：左侧 2px `--rule-2` 竖线 + 衬线斜体
  - `mark` 高亮：`--accent-soft` 底 + accent 字色
  - 表格：表头等宽大写字 + 底边 1px `--color-ink` 粗线
- 结尾：作者卡（头像圆 + 姓名 + 一行介绍 + 「更多 →」）→ Pager 上/下一篇

### 8.6 关于 / 履历 `/about`（本页是工程向说服力的核心）

1. **头部两栏** `1fr | 1.15fr`
   - 左：3:4 竖版头像占位 + 2×2 事实表（当前 / 所在地 / 状态 / 邮箱）
   - 右：eyebrow `ABOUT` + H1 两行 + Lede + 3 段自我介绍 + 2 个按钮（下载简历 / 发邮件）
2. **经历时间线 Timeline**
   - 每条网格 `150px | 1fr`，条目间 1px rule
   - 左：起止年份（衬线）+ 时长（等宽）
   - 右：角色（衬线 H3）+ 公司（accent 文字）+ 描述（`max 60ch`）
   - **每条必须带 2 条量化成果**，用 `→` 项目符号：
     ```html
     <ul class="tl-out">
       <li>MathMaster 从 0 到 3,142 名学生，19 个月平均连续复习 23 天（行业中位数 9 天）</li>
     </ul>
     ```
3. **代表作**：复用 `WorkRow`，3 条，右侧不放图只放 chips（反向引用 `/projects`，不重复写内容）
4. **技术栈矩阵 StackMatrix**
   - 5 列（语言 / 前端 / 后端 / AI·数据 / 基础设施），顶部 1px `--color-ink` 粗线，列间竖线
   - 每列标题用等宽大写字，chips 排列
   - 数据放 `site.ts`，改栈不碰组件
5. **开源与 GitHub**
   - 布局 `auto | 1fr`：左为 53 周 × 7 天热力图（9px 方块、3px 间隔、4 级 accent 递进），右侧 2×2 数字 + 一段说明
   - 热力图数据**构建时抓取**写入 `src/data/github.json`，零客户端 JS
6. **教育背景**：两列
7. **CTA 区块**：`--color-paper-2` 底 + 1px rule + 圆角，左文右两个按钮

---

## 9. 组件规格清单

### 9.1 需新建

| 组件 | 路径 | Props | 说明 |
|---|---|---|---|
| `ProjectMeta` | `components/project/ProjectMeta.astro` | `role, period, stack[], status, note` | 4 列 meta 表，全站复用 |
| `WorkRow` | `components/project/WorkRow.astro` | `index, title, meta, desc, stack[], status, metrics[], thumb?` | 行式项目条目，首页精选 + `/projects` + `/about` 三处复用，靠 `dense` 控制密度 |
| `PostRow` | `components/blog/PostRow.astro` | `date, title, desc?, readingTime, category` | 行式文章条目，博客列表 + 首页复用 |
| `StatBand` | `components/common/StatBand.astro` | `items: {num, unit, label, sub}[]` | 数字带，1–4 列自适应 |
| `Timeline` | `components/about/Timeline.astro` | `items: TimelineItem[]` | 履历时间线 |
| `StackMatrix` | `components/about/StackMatrix.astro` | `groups: {name, items[]}[]` | 技术栈矩阵，数据来自 `site.ts` |
| `Heatmap` | `components/about/Heatmap.astro` | `weeks: number[][]` | GitHub 贡献热力图，纯 CSS grid，零 JS |
| `Toc` | `components/blog/Toc.tsx` | `headings: {id, text, level}[]` | 文章目录，IntersectionObserver 高亮当前项 |
| `TravelIsland` | `components/home/TravelIsland.astro` | `stats[]` | 旅行板块深色卡片，全站唯一暗色块 |
| `FilterChips` | `components/common/FilterChips.astro` | `items: {label, count, value}[]`, `active` | 通用筛选 chips |
| `Pill` | `components/common/Pill.astro` | `variant: 'default'\|'accent'\|'ok'` | 状态胶囊 / 技术栈标签 |

### 9.2 需改造

| 组件 | 改造要点 |
|---|---|
| `home/Hero.astro` | 照片封面 → 纯文字大标题 + 状态胶囊；原封面图移入 `TravelIsland` |
| `home/StatsBand.astro` | 保留结构，改为 4 列数字带，内容换成工程向指标 |
| `home/TripCard.astro` | 卡片网格 → 行式条目（实际会被 `WorkRow` 取代，保留给 `/travel` 用） |
| `home/AboutMe.astro` | 缩成首页底部 3 行 `Now`，长介绍移到 `/about` |
| `map/TravelMap.tsx` | ECharts 配色从暗色适配到浅色（`mapOptions.ts` 里的背景色、边框色、tooltip） |

### 9.3 导航响应式

- `> 900px`：完整导航
- `<= 900px`：`.nav-links` 隐藏，右侧 CTA 只保留简历按钮；**需要补一个汉堡菜单**（设计稿未画，移动端要自己补，建议下划滑出式面板）

---

## 10. 数据模型

### 10.1 `src/config/site.ts`（单一出口，全站读取）

```ts
export const siteConfig = {
  name: "你的名字",
  enName: "Your Name",
  title: "全栈 / AI 应用工程师",
  tagline: "做产品的工程师，也该写代码。",
  bio: "……三段自我介绍……",
  location: "中国 · 上海",
  availability: "目前可接远程合作",
  github: "https://github.com/yourname",
  email: "you@example.com",
  resumeUrl: "/resume.pdf",
  updatedAt: "2026-10-02",
  stats: [
    { num: "12",  unit: "个", label: "上线产品与站点", sub: "2023 → 至今" },
    { num: "2.4", unit: "k",  label: "累计 GitHub Stars", sub: "主力仓库 xxx" },
    { num: "318", unit: "次", label: "开源 PR / Issue", sub: "近 12 个月" },
    { num: "5.8", unit: "w",  label: "服务过的注册用户", sub: "两款教育产品合计" },
  ],
  stack: [
    { name: "语言",       items: ["TypeScript", "Python", "Go", "SQL"] },
    { name: "前端",       items: ["Vue 3", "React", "Astro", "Tailwind", "Vite"] },
    { name: "后端",       items: ["FastAPI", "Node / Nest", "PostgreSQL", "Redis"] },
    { name: "AI / 数据",  items: ["RAG", "ChromaDB", "bge-m3", "Whisper", "DuckDB"] },
    { name: "基础设施",   items: ["Docker", "GitHub Actions", "Nginx", "Playwright"] },
  ],
} as const;
```

### 10.2 `src/data/projects.json`（与现有 `travels.json` 同构风格）

```ts
interface Project {
  id: string;              // 用于路由 /projects/[id]
  title: string;
  year: string;            // "2025"
  period: string;          // "2025.03 —"
  role: string;            // "独立开发"
  summary: string;         // 一句话，列表页用
  standfirst: string;      // 详情页导语，2–3 行
  status: "live" | "archived" | "wip";
  stack: string[];
  metrics: { num: string; unit?: string; label: string; baseline?: string }[];
  problem: string[];       // 段落数组
  approach: { n: string; title: string; body: string }[];
  outcome: string[];
  pitfalls: string[];      // 折叠块
  featured: boolean;       // 是否进首页精选
  order: number;
}
```

**项目数量少、字段固定 → 用 JSON，不用 Content Collection。** 理由：轻，不需要 schema 校验的收益。

### 10.3 文章 → Content Collections

```
src/content/blog/*.md（+ 可选 *.mdx）
src/content.config.ts:
  const blog = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),     // standfirst
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      category: z.enum(["工程", "架构", "随笔", "开源"]),
      tags: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
      readingTime: z.number(),     // 构建时算，别手填
      draft: z.boolean().default(false),
    }),
  });
```

### 10.4 其他

| 内容 | 存储 | 理由 |
|---|---|---|
| GitHub 数据 | 构建时抓 → `src/data/github.json` | 静态页不需要运行时请求，零客户端 JS |
| 简历 | `public/resume.pdf` | 不排版、不进版本库、HR 拿到的一定是对的 |
| 头像 | `public/portrait.*` | 单文件，压到 200KB 内 |

---

## 11. 现有文件改造清单

| 文件 | 改动 | 工作量 |
|---|---|---|
| `styles/global.css` | 整套 `@theme` 换掉；删 `body` 的天蓝 radial-gradient | 小 |
| `layouts/Base.astro` | 导航重做（5 入口 + GitHub/Email/简历）；品牌区改衬线姓名 + 等宽拼音；页脚四列 | 中 |
| `config/site.ts` | 按 §10.1 扩字段 | 小 |
| `pages/index.astro` | 结构重排：Hero → 数字带 → 精选项目 → 最新文章 → Now → 旅行板块 | 中 |
| `components/home/Hero.astro` | 照片封面 → 文字大标题 + 状态胶囊 | 中 |
| `components/home/StatsBand.astro` | 改 4 列数字带，内容换工程向指标 | 小 |
| `components/home/TripCard.astro` | 卡片 → 行式（实际由 `WorkRow` 取代） | 中 |
| `components/home/AboutMe.astro` | 缩成底部 3 行 `Now` | 小 |
| `components/map/TravelMap.tsx` + `mapOptions.ts` | ECharts 配色适配浅色 | 中 |
| `pages/travel/**` | **保持原样**，只做配色适配 | 小 |
| **新建** `pages/projects/index.astro` | 行式索引 + 筛选 chips | 中 |
| **新建** `pages/projects/[id].astro` | 详情，数据源 `projects.json` | 大 |
| **新建** `pages/blog/index.astro` | 头条 + 年份分组 | 中 |
| **新建** `pages/blog/[id].astro` | 接 Content Collections | 大 |
| **新建** `pages/about.astro` | 履历全页 | 大 |
| **新建** `src/content.config.ts` + `src/content/blog/*.md` | 文章体系 | 中 |

---

## 12. 施工顺序

**严格按阶段做，每阶段结束跑一次 `npm run build` 确认能过。**

| 阶段 | 内容 | 产出 |
|---|---|---|
| **P0** | 换 `global.css` 令牌 + 重做 `Base.astro` 导航/页脚 + 扩 `site.ts` | 骨架成型，全站变色 |
| **P1** | `/about` 履历页（新建全部基础组件） | **信息最密，最能体现「个人站」定位** |
| **P2** | `/projects` 列表 + 详情 + `projects.json` | 工程向说服力主体 |
| **P3** | 博客：Content Collections + `/blog` 列表 + `/blog/[id]` 详情 | 内容沉淀 |
| **P4** | 首页重排（Hero / 数字带 / 精选 / 文章 / Now / TravelIsland） | 门面 |
| **P5** | `TravelMap` 配色适配 + 移动端汉堡菜单 | 收尾 |
| **P6** | SEO / 性能清单（见 §13.4） | 上线准备 |

> **P0 + P1 做完就已经比现在像样很多了**。如果时间紧，可以先交付到 P1 给用户看效果，再决定要不要继续。

---

## 13. 验收标准

### 13.1 构建与功能

- [ ] `npm run build` 零报错零警告（含 `build-photos.mjs` 管线）
- [ ] 五个一级路由全部可访问，无 404
- [ ] 导航当前项高亮正确，`/travel` 原有功能**未回归**
- [ ] `PhotoGrid` / `Lightbox` / `TravelMap` 交互正常
- [ ] 移动端（375px / 768px）无横向滚动、无元素重叠

### 13.2 视觉还原度

- [ ] 层级**只靠 1px 线**，页面中除 hover 外无阴影
- [ ] 衬线 / 无衬线 / 等宽三层字体分工正确落地
- [ ] 行式列表（项目 / 文章）样式统一，行高与 padding 一致
- [ ] 首页旅行板块是全站唯一暗色块
- [ ] 数字带 4 列，900px 以下转 2×2

### 13.3 内容

- [ ] 每条经历**至少 2 条量化成果**
- [ ] 每个项目详情包含：问题 / 做法（≥ 3 步）/ 指标卡（3 个）/ 踩过的坑
- [ ] GitHub 热力图数据为真实抓取，非假数据
- [ ] §14 占位内容已全部替换为真实信息

### 13.4 SEO / 性能

- [ ] 每页唯一 `title` / `description`，模板 `{page} · {name} · {tagline}`
- [ ] OG 图 + Twitter card
- [ ] 结构化数据：Person（about 页）+ BlogPosting（文章页）
- [ ] `rss.xml` + `sitemap`
- [ ] 代码块语法高亮（Shiki，Astro 内置，服务端渲染）
- [ ] 中文字体做 subset，首屏字体资源 < 100KB
- [ ] 所有图片 lazy + 显式宽高，**CLS = 0**
- [ ] 目录高亮用 IntersectionObserver，滚动零卡顿
- [ ] Lighthouse：Performance / SEO / Accessibility 均 ≥ 90

---

## 14. 占位内容清单（需用户替换）

> 以下内容在设计稿中**全部是占位**。落代码前必须向用户索要真实值。
> 工程向履历的说服力完全建立在这些数字的真实性和可核实性上。

| # | 内容 | 现状占位 | 位置 |
|---|---|---|---|
| 1 | 姓名 / 拼音 / 职位 | 「陈屿 / Yu Chen」 | `site.ts` |
| 2 | 定位句 | 「做产品的工程师，也该写代码。」 | `site.ts.tagline` |
| 3 | 自我介绍（3 段） | 占位 | `/about` |
| 4 | 四个核心数字 | `12 / 2.4k / 318 / 5.8w` | `site.ts.stats` |
| 5 | 公司名与时间线 | 「某教育科技公司」等 | `/about` |
| 6 | 各项成果数字 | 召回率、用户数、订单数… | 需核实 |
| 7 | 项目清单 | MathMaster Edu / 智派家教 / open-draft-kit | `projects.json` |
| 8 | GitHub 账号与真实数据 | 热力图为 CSS 假数据 | `github.json` |
| 9 | 文章内容 | 《RAG 检索质量》为示例文章 | `content/blog/` |
| 10 | 头像 / 项目截图 | 全部为占位块 | `public/` |
| 11 | 简历 PDF | 需用户自己提供 | `public/resume.pdf` |

**两个待用户拍板的问题**：

1. **强调色**：靛蓝 `#2F4BFF`（工程、稳）还是朱橙 `#D9481F`（刊物、暖）？
2. **是否上夜间模式**：建议第二阶段（v2）再做。

---

## 15. 风险与注意事项

| 风险 | 影响 | 应对 |
|---|---|---|
| **中文字体体积** | Noto Serif SC 全字重 ~8MB，直接上线会拖垮 LCP | 必须 subset 或退回系统字体（`Songti SC` / `SimSun`）。设计稿的 CDN 链接仅供评审 |
| **Tailwind v4 `@theme` 语义** | 换令牌后所有 `bg-night` / `text-ink` 类名失效 | 一次性全局替换，不要留半新半旧的类名 |
| **ECharts 浅色适配** | `TravelMap.tsx` 深色配色在浅色页会突兀 | `mapOptions.ts` 里的背景、边框、tooltip 全部要重调 |
| **工程量被低估** | 3 个新详情页 + 博客体系 + 移动端菜单 = 中等偏大 | 严格按 P0–P6 分阶段，**不要一次性全做** |
| **占位内容外泄** | 假数据被当真数据发布 | 交付前逐项核对 §14 |
| **`build-photos.mjs` 管线** | 换主题时误改会导致照片构建失败 | 该管线与设计无关，**不要动** |

---

## 附：快速自查清单

落代码完成后，逐条打勾：

- [ ] `npm run build` 通过
- [ ] 五个路由可访问，`/travel` 无回归
- [ ] 层级只用 1px 线，无多余阴影
- [ ] 衬线 / 无衬线 / 等宽三层分工正确
- [ ] 首页旅行板块是唯一暗色块
- [ ] 每条经历 ≥ 2 条量化成果
- [ ] 占位内容已全部替换
- [ ] 中文字体已 subset
- [ ] Lighthouse 三项均 ≥ 90
