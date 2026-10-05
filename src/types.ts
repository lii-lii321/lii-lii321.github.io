/**
 * 照片数据管线的类型契约（与 scripts/build-photos.mjs 的输出严格对应）。
 * travels.json 由管线生成到 src/data/travels.json，页面可直接 import 并断言为 TravelData。
 */

/** 地点：经纬度使用 WGS84 十进制度 */
export interface Place {
  /** 地点名，如 "大理古城" */
  name: string;
  /** 国家，如 "中国" */
  country: string;
  /** 省份；国外为 null */
  province: string | null;
  lng: number;
  lat: number;
}

/** 单张照片 */
export interface Photo {
  /** 原图公开 URL，如 "/photos/2025-yunnan/01.jpg"（对应 public/photos/...） */
  src: string;
  /** 640 宽 WebP 缩略图 URL，如 "/photos/2025-yunnan/thumbs/01.webp" */
  thumb: string;
  /** 16 宽 WebP 模糊占位图，data:image/webp;base64,... 形式，可直接放进 img/CSS */
  blur: string;
  /** 原图宽（像素） */
  width: number;
  /** 原图高（像素） */
  height: number;
  /** EXIF DateTimeOriginal（ISO 8601 字符串）；无 EXIF 时为 null */
  takenAt: string | null;
  /** EXIF 相机型号；无 EXIF 时为 null */
  camera: string | null;
  /** EXIF GPS 坐标；无 EXIF 时为 null */
  gps: { lng: number; lat: number } | null;
  /** 子景点（原始目录的子文件夹名，gen-scenes 生成）；无子景点结构的相册为 null */
  scene: string | null;
}

/** 一次旅行（一个相册） */
export interface Trip {
  /** 相册目录名，如 "2025-yunnan"，同时是 public/photos 下的子目录名 */
  id: string;
  /** 相册标题（来自 album.json） */
  title: string;
  /** 出行日期（来自 album.json，如 "2025-04-12"） */
  date: string;
  /** 标签（来自 album.json） */
  tags: string[];
  /** 描述（来自 album.json） */
  description: string;
  place: Place;
  /** 封面图：public 下可访问的完整 URL 路径，如 "/photos/2025-yunnan/01.jpg" */
  cover: string;
  photos: Photo[];
}

/** 聚合统计 */
export interface TravelStats {
  /** 到过的国家数（按 trip.place.country 去重） */
  countries: number;
  /** 到过的省份数（按非空 trip.place.province 去重） */
  provinces: number;
  /** 照片总数 */
  photoCount: number;
}

/** src/data/travels.json 的顶层结构（由管线生成，请勿手工编辑） */
export interface TravelData {
  stats: TravelStats;
  trips: Trip[];
}

/** src/data/visited.json 的结构（地图点亮名单，手动维护） */
export interface VisitedData {
  countries: string[];
  provinces: string[];
}

/** 项目状态：在线 / 已归档 / 进行中 */
export type ProjectStatus = 'live' | 'archived' | 'wip';

/** 项目分类（/projects 筛选 chips 用） */
export type ProjectCategory = '产品' | '开源' | '实验';

/** 项目指标卡（详情页「03 — 结果」，规格 §10.2） */
export interface ProjectMetric {
  num: string;
  unit?: string;
  label: string;
  /** 等宽基线对比文案，如「改造前 2.1s」 */
  baseline?: string;
}

/** 「02 — 做法」的一个编号步骤 */
export interface ProjectStep {
  /** 步骤号，如 "01" */
  n: string;
  title: string;
  body: string;
}

/** src/data/projects.json 的条目（规格 §10.2） */
export interface Project {
  /** 路由 /projects/[id] */
  id: string;
  title: string;
  year: string;
  period: string;
  role: string;
  /** 列表页一句话 */
  summary: string;
  /** 详情页导语 2–3 行 */
  standfirst: string;
  status: ProjectStatus;
  category: ProjectCategory;
  stack: string[];
  metrics: ProjectMetric[];
  /** 详情页「01 — 问题」中的引用块（可选，3px accent 竖线 + 衬线斜体） */
  pull?: string;
  /** 封面截图（真实产品截图 URL，如 /projects/<id>/cover.webp）；缺省时显示占位块 */
  cover?: string;
  /** 详情页截图画廊（真实产品截图） */
  shots?: { src: string; caption: string }[];
  problem: string[];
  approach: ProjectStep[];
  /** 「02 — 做法」中的引用块之后的「关键决策」（可选） */
  decisions?: { title: string; body: string }[];
  outcome: string[];
  /** 踩过的坑（<details> 折叠块） */
  pitfalls: string[];
  /** 仓库地址（真实 GitHub 仓库；本站自身暂无远端可省略） */
  repoUrl?: string;
  /** 是否进首页精选 */
  featured: boolean;
  order: number;
}

/** GitHub 贡献数据（scripts/fetch-github.mjs 构建时生成，抓取失败也保证字段完整） */
export interface GitHubData {
  user: string;
  fetchedAt: string | null;
  /** 数据来源：GraphQL（有 token）/ 公共 contributions API / 空（抓取失败） */
  source: 'graphql' | 'jogruber' | 'empty';
  /** 近一年总贡献数；抓取失败为 null */
  total: number | null;
  /** 53 周 × 7 天的贡献等级矩阵（0–4），行 = 星期几；抓取失败为 null */
  weeks: number[][] | null;
  /** 抓取失败原因（source 为 empty 时有值） */
  error?: string;
}
