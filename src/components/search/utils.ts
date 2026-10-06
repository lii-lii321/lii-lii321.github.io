/**
 * 搜索页的纯函数：客户端加权匹配与关键词高亮（node --test 可测，见 tests/search-utils.test.ts）。
 * 注意 highlight 的「先转义再替换」是安全关键的顺序约定（先替换后转义 = 经典 XSS 坑，见
 * 《零 JS 站点的搜索是怎么做的》），改动前先看测试。
 */

export interface SearchItem {
  type: '文章' | '项目' | '相册';
  title: string;
  desc: string;
  meta: string;
  tags: string[];
  url: string;
}

/**
 * 加权子序列匹配：标题 ×4、标签 ×2、描述 ×1；
 * 多关键词取最小分（AND 语义——任一词不命中即 0 分），空查询返回 0。
 */
export function score(item: SearchItem, query: string): number {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const title = item.title.toLowerCase();
  const desc = item.desc.toLowerCase();
  const tags = item.tags.join(' ').toLowerCase();
  let total = Infinity;
  for (const w of words) {
    let s = 0;
    if (title.includes(w)) s = 4;
    else if (tags.includes(w)) s = 2;
    else if (desc.includes(w)) s = 1;
    if (s === 0) return 0;
    total = Math.min(total, s);
  }
  return total;
}

/** HTML 转义：& < > " ' 五个字符 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/**
 * 查询词 → 高亮用的正则源（各词转义正则元字符后按 | 连接，大小写不敏感）；
 * 空查询返回 null（不高亮）。
 */
export function buildHighlightPattern(query: string): string | null {
  const pattern = query
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return pattern || null;
}

/** 关键词高亮：先转义再替换——顺序不可反转，含 <script> 的文本与正则元字符查询都必须安全 */
export function highlight(text: string, pattern: string | null): string {
  if (!pattern) return escapeHtml(text);
  return escapeHtml(text).replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
}
