---
title: "用 ECharts 画一张可点亮的旅行足迹地图"
description: "去过的地方在地图上点亮、照片地点变成光点、点击直达相册——不用任何地图服务，GeoJSON 本地化的完整思路。"
pubDate: 2025-06-20
category: "工程"
tags: ["ECharts", "可视化", "GeoJSON"]
featured: false
draft: false
---

个人站的旅行板块需要一张地图：去过的国家填色点亮，照片地点变成光点，点击光点直达相册。需求定下来后，第一个决定就是——**不用任何在线地图服务**。

## 为什么不用瓦片地图

Leaflet + OSM 是常规答案，但瓦片服务意味着：第三方依赖、国内访问质量不可控、隐私问题（每次加载都在向瓦片服务器暴露访客）。而 ECharts 的 geo 组件只需要一份 GeoJSON，构建时打进站点，运行时零外部请求。

```ts
// GeoJSON 本地化 + registerMap，中国省级与世界地图各一份
import chinaUrl from '../../assets/geo/china.json?url';
import worldUrl from '../../assets/geo/world.json?url';

const res = await fetch(chinaUrl);
echarts.registerMap('china', await res.json());
```

## 点亮的本质是 regions 配置

「点亮」不需要任何特殊机制，就是给命中的 region 单独配置样式：

```ts
geo: {
  map: view,
  roam: true,
  itemStyle: {
    areaColor: '#e9e6dc',      // 未点亮：纸色陆地
    borderColor: '#cfcbbd',
  },
  regions: highlighted.map((name) => ({
    name,                       // 与 GeoJSON 的 feature 名对应
    itemStyle: {
      areaColor: 'rgba(47,75,255,.16)',
      borderColor: 'rgba(47,75,255,.6)',
    },
  })),
}
```

真正的工程量在**名字对齐**：世界地图的 feature 名是英文（`United Kingdom`），省级地图是全称（`云南省`），而我的点亮名单是简称（`云南`）。解法是给 ECharts 传 `nameMap` 做一次映射，映射表数据驱动、单独维护。

<aside-note>

省份简称映射要处理「内蒙古自治区 → 内蒙古」「新疆维吾尔自治区 → 新疆」这类规则，两条正则可以覆盖绝大多数，但「香港特别行政区」要单独想清楚展示口径。

</aside-note>

## 照片地点：effectScatter 光点

照片聚合成地点后，用 effectScatter 画涟漪光点，大小随照片数：

```ts
{
  type: 'effectScatter',
  coordinateSystem: 'geo',
  symbolSize: (_v, p) => 9 + Math.sqrt(p.data.photoCount) * 2.6,
  rippleEffect: { brushType: 'stroke', scale: 2.8 },
  data: clusters.map((c) => ({ value: [c.lng, c.lat], ...c })),
}
```

点击事件绑在 series 上，弹出侧面板列出该地点的相册——地图从这里开始变成导航，而不只是装饰。

> 数据从哪来？照片的 EXIF。构建管线读 GPS、生成缩略图、按地点聚合——这部分在另一篇里展开，这里只说一句：把「整理照片」的成本压到建一个文件夹，地图才会一直活着。

## 一个教训

世界地图的中文 nameMap 表有 200 多个条目，我一开始手工翻译，漏了 `W. Sahara` 这类缩写名导致控制台刷屏。后来改成从 GeoJSON 的 feature 名单反向生成 + 人工核对，错了会显式报出来。**数据对齐永远应该 fail loud，而不是 fail silent**。
