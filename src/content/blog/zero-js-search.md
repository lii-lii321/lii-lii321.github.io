---
title: "零 JS 站点的搜索是怎么做的"
description: "构建时内嵌索引、客户端加权匹配、关键词高亮——不引入任何搜索服务，给纯静态站做一个 3KB 的全站搜索。"
pubDate: 2026-10-04
category: "架构"
tags: ["Astro", "静态站", "搜索"]
featured: false
draft: false
---

这个站的搜索页（按 <mark>/</mark> 就能到）覆盖文章、项目、相册三类内容，跑在一个零框架依赖的静态页面上。没有 Algolia、没有 Pagefind、没有客户端词库下载——整条方案就是一个内嵌 JSON 数组加一百来行原生 JS。

## 索引：构建时生成，页面内嵌

搜索的第一性原理是：**哪些内容可搜，构建时就知道**。Astro 页面的 frontmatter 里直接把三类内容拍平成同构条目：

```ts
interface SearchItem {
  type: '文章' | '项目' | '相册';
  title: string;      // ×4 权重
  desc: string;       // ×1
  meta: string;       // 展示用：日期 · 分类 · 时长
  tags: string[];     // ×2（分类、技术栈、地点都进来）
  url: string;
}
```

相册的 tags 特意混入了地点名与省份——所以搜「云南」「大理」能命中相册，搜「RAG」能命中文章和项目。然后 `set:html={JSON.stringify(index)}` 内嵌进页面：索引跟着 HTML 一起到达，**零额外请求**。

<div class="callout">

**为什么不用 Pagefind**：Pagefind 很好，但它为「几百篇文章」设计——分片词库、WASM 匹配。我的检索对象是 20 条结构化条目，杀鸡用牛刀，还多了一层依赖。工具的体量应该匹配问题的体量。

</div>

## 匹配：多关键词 AND，标题优先

评分函数刻意简单：标题命中 ×4、标签 ×2、描述 ×1，多个关键词取最小分（AND 语义——搜「RAG 评测」不允许只满足一半）：

```ts
const score = (item: Item, query: string): number => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let total = Infinity;
  for (const w of words) {
    let s = 0;
    if (item.title.toLowerCase().includes(w)) s = 4;
    else if (item.tags.join(' ').toLowerCase().includes(w)) s = 2;
    else if (item.desc.toLowerCase().includes(w)) s = 1;
    if (s === 0) return 0;   // 任一关键词不命中 → 整条出局
    total = Math.min(total, s);
  }
  return total;
};
```

为什么不搞模糊匹配 / 拼音检索？<aside-note>对一个 20 条目、作者就是用户自己的站点，子串匹配的召回已经足够；模糊匹配引入的误召回反而伤害「搜即所得」的确定性。等条目过百再升级不迟——到时候这是下一篇的文章。</aside-note>

## 高亮：先转义，再替换

结果里的关键词高亮有一个经典 XSS 坑：直接把用户输入拼进正则或 HTML。顺序必须是**先 HTML 转义条目文本，再对转义后的文本做正则替换**——而且用户输入要先剥掉正则元字符：

```ts
const escaped = text.replace(/[&<>"']/g, (c) => ({...}[c] ?? c));
const pattern = query.split(/\s+/)
  .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
escaped.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
```

反过来的顺序（先高亮再转义）会把 `<mark>` 一起转义掉；不做正则转义则一个 `(` 就能让搜索页抛异常。

## 总账

| 项 | 成本 |
|---|---|
| 索引体积 | ~6 KB（内嵌在页面里，随 HTML 一次到达） |
| 客户端脚本 | ~3 KB，零依赖 |
| 构建时增量 | 一次数组拍平 |

> 这套东西的全部源码在 `src/pages/search.astro` 一个文件里。如果你也想给自己的静态站加个搜索，先数一数要搜多少条——十条和一万条的正确答案完全不同。
