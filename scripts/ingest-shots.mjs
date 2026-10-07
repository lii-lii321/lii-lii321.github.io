/**
 * 项目截图入库（一次性工具，可重跑）：从三个真实仓库拷贝 UI 截图，
 * 压缩为 WebP（≤1200px）到 public/projects/<id>/，供项目详情页与首页精选行使用；
 * 并把产物真实宽高写回 src/data/projects.json 的 shots（详情页按真实比例完整展示、不裁切）。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT_ROOT = new URL('../public/projects/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** [仓库路径, 项目 id, [文件名, 说明][]] */
const SHOTS = [
  {
    id: 'smart-tutor',
    repo: 'D:\\My_Project\\smart_tutor\\docs\\images',
    files: [
      ['teacher-board-mobile.png', '教员橱窗地图 · 公开获客页'],
      ['admin-batch-import-desktop.png', 'AI 批量导入 · 71 单一次识别'],
      ['admin-financial-desktop.png', '财务流水'],
      ['teacher-recommend-mobile.png', '智能推荐 · 画像排序'],
    ],
  },
  {
    id: 'math-tutor-rag',
    repo: 'D:\\My_Project\\Math_Tutor_RAG\\docs\\screenshots',
    files: [
      ['notebook.png', '错题本'],
      ['review.png', 'SM-2 闪卡复习'],
      ['graph.png', '知识点共现图谱'],
      ['dashboard.png', '学情看板'],
    ],
  },
  {
    id: 'research-lab',
    repo: 'D:\\My_Project\\research-lab\\docs\\images',
    files: [
      ['ui_flow.png', '研究流程'],
      ['ui_ml.png', 'ML 基线与实验追踪'],
      ['ui_agent.png', 'Agent 界面'],
    ],
  },
];

/** 本轮入库的产物尺寸（src → width/height），收尾统一写回 projects.json */
const sizeBySrc = new Map();
/** 640w 小档产物（1200w 产物 src → 640w 产物 src），首页卡片等小尺寸场景使用 */
const smallBySrc = new Map();

for (const { id, repo, files } of SHOTS) {
  const outDir = path.join(OUT_ROOT, id);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, caption] of files) {
    const src = path.join(repo, name);
    if (!fs.existsSync(src)) {
      console.warn(`[缺] ${src}`);
      continue;
    }
    const out = path.join(outDir, name.replace(/\.png$/i, '.webp'));
    await sharp(src).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
    const meta = await sharp(out).metadata();
    sizeBySrc.set(`/projects/${id}/${path.basename(out)}`, { width: meta.width, height: meta.height });
    const smallName = path.basename(out).replace(/\.webp$/i, '-640w.webp');
    const small = path.join(outDir, smallName);
    await sharp(src).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 80 }).toFile(small);
    smallBySrc.set(`/projects/${id}/${path.basename(out)}`, `/projects/${id}/${smallName}`);
    console.log(`[ok] /projects/${id}/${path.basename(out)}  ${meta.width}x${meta.height}  ${caption}`);
  }
}

// 写回 projects.json：按 src 匹配，给 shots 补产物真实宽高（缺失或比例变化时以实测为准）
const PROJECTS_JSON = new URL('../src/data/projects.json', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
);
const projectsData = JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf8'));
let updated = 0;
for (const proj of projectsData) {
  // 封面的 640w 小档：首页精选卡 160px 槽位不再加载 1200w 产物
  if (proj.cover && smallBySrc.has(proj.cover)) {
    proj.coverSmall = smallBySrc.get(proj.cover);
  }
  for (const shot of proj.shots ?? []) {
    const size = sizeBySrc.get(shot.src);
    if (size) {
      shot.width = size.width;
      shot.height = size.height;
      updated++;
    }
  }
}
fs.writeFileSync(PROJECTS_JSON, JSON.stringify(projectsData, null, 2) + '\n');
console.log(`截图入库完成：${updated} 条 shots 宽高已写回 src/data/projects.json。`);
