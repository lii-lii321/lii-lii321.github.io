/**
 * 站点个人信息配置（单一出口，全站读取）。
 * ✅ 已接真实数据：姓名 / 学校 / 邮箱 / GitHub / 项目 / 旅行照片。
 * ⚠️ 仍可打磨：availability（当前状态）、timeline 工作经历（当前只有开源项目里程碑）。
 */
import { execSync } from "node:child_process";
import travelsData from "../data/travels.json";
import projectsData from "../data/projects.json";
import type { TravelData, Project } from "../types";

/** 数字带 / 文案与数据同源的依据：照片数、相册数、省份/国家数全部来自管线产物，
 *  构建 时计算，杜绝「站点数字与事实脱节」（此前手写 340 张，实际已 592 张）。 */
const travelStats = (travelsData as TravelData).stats;
const projectCount = (projectsData as Project[]).length;

/** 「最后更新」兜底值：git 不可用（如无 .git 的构建环境）时使用 */
const FALLBACK_UPDATED_AT = "2026-10-06";

/** 站点最后更新日期：构建时取 git 最近一次提交日期（%cs = YYYY-MM-DD），
 *  不再手动维护——此前手写 2026-10-03，其后 10-05/10-06 多次内容变更，三处展示随之过期漂移 */
function deriveUpdatedAt(): string {
  try {
    return execSync("git log -1 --format=%cs", { encoding: "utf8" }).trim() || FALLBACK_UPDATED_AT;
  } catch {
    return FALLBACK_UPDATED_AT;
  }
}

export const siteConfig = {
  /** 姓名（真实） */
  name: "李云强",
  /** 姓名拼音，导航品牌区与页脚等宽小字用 */
  enName: "Li Yunqiang",
  /** 职位定位 */
  title: "数据科学在读 · 全栈 / AI 应用开发者",
  /** 定位句 */
  tagline: "做产品的工程师，也该写代码。",
  /** 自我介绍三段（基于真实项目与身份撰写，可再润色） */
  bio: [
    "西南石油大学数据科学与大数据技术专业在读，全栈与 AI 应用开发者。做过家教订单匹配平台 smart_tutor、基于视觉大模型与 RAG 的智能错题本 Math_Tutor_RAG、从一份 CSV 自动产出可复现研究报告的 research-lab——全部开源在 GitHub 上，点开就能跑。",
    "我习惯把工程实践沉淀成文章：RAG 检索质量怎么做评测、个人站怎么做到零客户端 JS、六千多张旅行照片怎么自动变成相册和地图。这个站本身也是一次实践——首页零客户端 JS，照片丢进文件夹就能自动长出足迹。",
    "不写代码的时候在旅行。去过的地方整理成了 11 本相册，钉在足迹地图的 8 个省级地区上——那也是这个站最初的起点。",
  ],
  /** 所在地（西南石油大学位于成都） */
  location: "中国 · 成都",
  /** 状态胶囊文案（⚠️ 按实际情况修改：求职/实习/竞赛……） */
  availability: "开放实习与远程协作",
  /** GitHub 主页（真实） */
  github: "https://github.com/lii-lii321",
  /** GitHub 用户名：构建时抓取贡献热力图用（真实） */
  githubUser: "lii-lii321",
  /** 联系邮箱（真实） */
  email: "3028410005@qq.com",
  /** 简历 PDF：放在 public/ 下（public/resume.pdf，⚠️ 需要你自己提供） */
  resumeUrl: "/resume.pdf",
  /** 站点最后更新日期（构建时从 git 派生，git 不可用时回退兜底值） */
  updatedAt: deriveUpdatedAt(),

  /** 首页数字带（构建时从 data/ 派生，永远与事实一致；href 让数字可点击） */
  stats: [
    { num: String(projectCount), unit: "个", label: "在线项目", sub: "全部开源在 GitHub", href: "/projects" },
    {
      num: String((travelsData as TravelData).trips.length),
      unit: "本",
      label: "旅行相册",
      sub: `${travelStats.provinces} 个省级地区`,
      href: "/travel",
    },
    { num: String(travelStats.photoCount), unit: "张", label: "旅行照片", sub: "自动管线持续更新", href: "/travel" },
    // 「0 KB 客户端 JS」不可验证（Base 布局有约 0.8 KB 渐进增强脚本）；改用可核实口径：首页 0 个 island
    { num: "0", unit: "个", label: "首页 island", sub: "渐进增强脚本 <1 KB", href: "/blog/zero-js-personal-site" },
  ],

  /** 技术栈矩阵（来自三个仓库的真实技术选型） */
  stack: [
    { name: "语言", items: ["Python", "TypeScript", "SQL"] },
    { name: "前端", items: ["Vue 3", "React", "Astro", "Streamlit", "Tailwind"] },
    { name: "后端", items: ["FastAPI", "SQLAlchemy", "MySQL", "PostgreSQL", "Redis GEO"] },
    { name: "AI / 数据", items: ["RAG", "ChromaDB", "视觉大模型", "Agent / MCP", "SM-2", "SciPy"] },
    { name: "工程化", items: ["Docker", "GitHub Actions", "pytest", "Playwright", "Alembic"] },
  ],

  /** 经历时间线（⚠️ 当前只有开源项目里程碑，请补充真实工作经历，每条 ≥2 条量化成果） */
  timeline: [
    {
      start: "2026",
      end: "至今",
      duration: "持续迭代",
      role: "独立开发者",
      org: "Math_Tutor_RAG · research-lab",
      desc: "迭代基于视觉大模型与 RAG 的智能错题本（拍照录题 → 数学验证 → 向量归档 → SM-2 自适应复习）；同时开发 AI 数据研究工具，把一份 CSV 自动变成可复现的研究报告。",
      outcomes: [
        "Math_Tutor_RAG 积累 287 项自动化测试（pytest 采集），CI 全绿",
        "research-lab 打通画像 → 研究问题 → 实验计划 → 统计检验 → 报告导出五阶段全自动流水线",
      ],
    },
    {
      start: "2025",
      end: "2026",
      duration: "约 1 年",
      role: "独立开发者",
      org: "smart_tutor 智派家教",
      desc: "从 0 到 1 做多租户家教订单匹配平台：中介批量发单、教员地图找单、试课定金尾款全流程，用 AI 把微信聊天记录变成结构化订单。",
      outcomes: [
        "整段微信文本一次识别 71 单，逐条校对后入库（AI 解析管道实测）",
        "覆盖中介 / 教员 / 老板三端：橱窗地图、智能推荐、财务流水与经营看板",
      ],
    },
  ],

  /** 教育背景（真实） */
  education: [
    {
      school: "西南石油大学",
      what: "数据科学与大数据技术 · 本科在读",
      period: "在读",
      note: "课程之外的时间都给了这三个仓库：把数据科学的课堂知识，做成能跑、能测、能复现的完整产品",
    },
  ],

  /** Now（首页 3 行摘要） */
  now: [
    { key: "Building", text: "迭代 Math_Tutor_RAG：掌握度引擎与 Agent 工具编排" },
    { key: "Reading", text: "《Designing Data-Intensive Applications》第二遍" },
    { key: "Learning", text: "RAG 检索质量评测：把「感觉不准」变成可复现指标" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
