---
title: "把个人站做到零客户端 JS：Astro Islands 实践"
description: "重做个人站时我给自己立了一条规矩：能用服务端渲染的，一个字节的客户端 JS 都不写。这篇记录哪些交互留了下来、它们为什么值得。"
pubDate: 2025-10-02
category: "架构"
tags: ["Astro", "性能", "静态站"]
featured: false
draft: false
---

个人站的内容 90% 是文字和图片，它们的最佳渲染位置是构建时的服务端，而不是用户的浏览器。这次重做我给自己立了一条规矩：**能用服务端渲染的，一个字节的客户端 JS 都不写**。

## 数字带、行式列表：根本不需要 JS

首页的数字带、项目与文章的行式列表，全部是构建时的静态 HTML。一个常见的误区是「列表筛选需要框架」——其实一个 20 行的事件委托脚本就够了：

```ts
// 点击 chips 组 → 联动同 scope 下所有条目的显隐
document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-filter-value]');
  if (!btn) return;
  const scope = btn.closest('[data-filter-chips]')?.getAttribute('data-filter-chips');
  const value = btn.getAttribute('data-filter-value');
  document
    .querySelectorAll(`[data-filter-item][data-filter-scope="${scope}"]`)
    ?.forEach((el) => {
      const values = (el.getAttribute('data-filter-value') ?? '').split(/\s+/);
      el.toggleAttribute('hidden', !(value === 'all' || values.includes(value)));
    });
});
```

这段脚本服务全站所有筛选组，总共 1 KB 不到。作为对比，引入一个组件框架做同样的事，基线成本是它的 40 倍以上。

## 交互岛屿：只给真正需要的组件

全站最后保留了四个 island（Astro 的 Islands 架构允许页面大部分静态、局部hydrate）：

1. **足迹地图**——ECharts 必须在客户端初始化，`client:load`；
2. **相册小地图**——同样是 ECharts 画的单点光点，在折叠线下方，`client:idle`；
3. **相册灯箱**——键盘导航和焦点管理，`client:load`；
4. **文章目录**——滚动高亮需要维护 aria-current 状态，`client:load`。

<aside-note>

判断标准很简单：这个交互离了 JS 是否根本不成立？以文章目录为例：目录本身仍是静态生成的（页面从 Markdown headings 直接渲染），成为 island 的只有滚动高亮那一小块交互。

</aside-note>

## 样式即架构

Tailwind v4 的 `@theme` 让设计令牌变成了 CSS 变量——上线前评审用的强调色切换（靛蓝 vs 朱橙），就是靠纯 CSS 变量级联完成的（靛蓝终审定稿后，这套切换已随页脚按钮一并移除，这里留作机制样例）：

```css
/* <html data-accent="vermilion"> 一属性切换全站强调色 */
html[data-accent="vermilion"] {
  --color-accent: #d9481f;
  --color-accent-soft: rgba(217, 72, 31, .09);
}
```

> 静态站的「动态」需求，一大半其实是样式问题。样式问题就该用 CSS 解决，JS 只是最后的手段。

## 结果

首页没有任何框架 island，客户端脚本只有约 0.8 KB 的渐进增强（汉堡菜单、`/` 快捷键、返回顶部，均为原生 JS）。LCP 是首屏那行衬线大标题本身。这个站没有存在的性能借口——它就应该快。

如果你也在做个人站，我的建议是：先把「零 JS」当成默认假设，让每个字节的客户端代码都自己证明必要性。
