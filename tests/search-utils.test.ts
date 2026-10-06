/**
 * 搜索页纯函数单元测试：加权匹配、转义、高亮（含 XSS 顺序约定）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, escapeHtml, buildHighlightPattern, highlight } from '../src/components/search/utils.ts';
import type { SearchItem } from '../src/components/search/utils.ts';

const item: SearchItem = {
  type: '文章',
  title: '零 JS 站点的搜索是怎么做的',
  desc: '构建时内嵌索引、客户端加权匹配、关键词高亮。',
  meta: '2026.10 · 架构 · 6 分钟',
  tags: ['Astro', '静态站', '搜索'],
  url: '/blog/zero-js-search',
};

test('score：标题命中 ×4，优先于标签 ×2 与描述 ×1', () => {
  assert.equal(score(item, '搜索'), 4);
  assert.equal(score(item, 'astro'), 2);
  assert.equal(score(item, '索引'), 1);
});

test('score：多关键词取最小分（AND 语义），任一词不命中即 0', () => {
  assert.equal(score(item, '搜索 astro'), 2);
  assert.equal(score(item, '搜索 不存在的词'), 0);
});

test('score：大小写不敏感，空/纯空白查询返回 0', () => {
  assert.equal(score(item, 'ASTRO'), 2);
  assert.equal(score(item, ''), 0);
  assert.equal(score(item, '   '), 0);
});

test('escapeHtml：五个 HTML 特殊字符全部转义', () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml(`a&b'c`), 'a&amp;b&#39;c');
});

test('buildHighlightPattern：正则元字符被转义，空查询返回 null', () => {
  assert.equal(buildHighlightPattern('a.b (c)'), 'a\\.b|\\(c\\)');
  assert.equal(buildHighlightPattern('  '), null);
});

test('highlight：先转义再替换——含 <script> 的文本不产生可执行标签', () => {
  const out = highlight(`<script>alert(1)</script>`, buildHighlightPattern('script'));
  assert.ok(!out.includes('<script>'), '不得包含未转义的 <script>');
  assert.ok(out.includes('&lt;') && out.includes('&gt;'), '尖括号应已转义');
  assert.match(out, /<mark>/);
});

test('highlight：正则元字符查询不抛错、不高亮错误片段', () => {
  assert.doesNotThrow(() => highlight('C++ 与 C#（2026）', buildHighlightPattern('c++ (2026)')));
  assert.equal(highlight('纯文本', null), '纯文本');
});

test('highlight：命中片段包裹 <mark>，其余部分保持转义文本', () => {
  assert.equal(highlight('Astro 加静态站', buildHighlightPattern('astro')), '<mark>Astro</mark> 加静态站');
});
