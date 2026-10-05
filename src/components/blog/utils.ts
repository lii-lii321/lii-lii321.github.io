/**
 * 博客展示用小工具（仅服务端执行）。
 */

/** 文章条目的结构类型（不依赖 astro 虚拟模块的 CollectionEntry 导入，页间复用；兼容 render(entry)） */
export interface PostEntry {
  id: string;
  collection: 'blog';
  body?: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    category: '工程' | '架构' | '随笔' | '开源';
    tags: string[];
    featured: boolean;
    draft: boolean;
  };
}

/** 中文按 400 字/分钟、西文按 200 词/分钟估算阅读时长（由 entry.body 现算，不手填） */
export function readingMinutes(body?: string | null): number {
  if (!body) return 1;
  const cjk = (body.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const rest = body.replace(/[\u4e00-\u9fff]/g, ' ');
  const words = rest.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(cjk / 400 + words / 200));
}

/** Date → "2025 年 8 月 14 日"（本地时区解析，避免 UTC 偏移） */
export function formatDateCN(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/** Date → "2025-08-14"（frontmatter datetime 属性用） */
export function formatISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
