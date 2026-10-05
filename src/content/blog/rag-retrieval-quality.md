---
title: "RAG 检索质量：从 bad case 到评测集"
description: "「感觉不准」是 RAG 项目最贵的技术债。这篇讲我们如何把主观感受变成三个可复现的指标，以及评测集怎么管才不会腐烂。"
pubDate: 2025-08-14
category: "工程"
tags: ["RAG", "检索", "评测"]
featured: true
draft: false
---

做 RAG 应用最容易陷入的循环是：改一版切分策略 → 自己试几个问题 → 感觉「好像好了一点」→ 上线 → 用户反馈退回原点。**感觉是 RAG 项目里最贵的技术债**，因为它不可复现、不可比较、不可回滚。

在 [Math_Tutor_RAG](/projects/math-tutor-rag) 的检索链路上，真正起作用的从来不是某个聪明的技巧，而是先把评测做对了。这篇把这套方法整理成可以照抄的四步。

## 第一步：把 bad case 变成资产

每个用户投诉的 bad case，都是一条免费的评测用例。我们给评测用例定义了三个必填字段：

```yaml
- id: case-0042
  question: "二次函数顶点式怎么配方？"
  expect_sources: ["课本·必修一·P52", "教研·二次函数专题·§2"]
  must_contain: ["y = a(x-h)² + k", "对称轴 x = h"]
  note: "线上投诉的 bad case 原样入库"
```

`expect_sources` 是关键——它让「检索对了没有」变成一个可以机判的布尔问题，而不是靠人读一遍生成结果。

<aside-note>

评测集要进版本库，和代码一起 review。谁改了切分策略，谁就要对着同一份基准重跑评测，这正是「评测集即代码」的全部含义。

</aside-note>

## 第二步：三个指标说清楚

指标不求多，求互相正交：

| 指标 | 回答的问题 | 示例目标（按项目自定） |
|---|---|---|
| 召回率 | 该找的片段找到了吗 | 教材原文召回 ≥ 90% |
| MRR | 找到的片段排得靠前吗 | 首位命中率 ≥ 0.85 |
| 忠实度 | 生成是否超出检索内容 | 引用可溯源 ≥ 95% |

前两个纯规则可算；忠实度我们用「规则 + 模型」双通道——纯模型打分在不同模型间漂移太大，这一点<mark>踩过很深的坑</mark>，详见文末的坑列表。

## 第三步：让 bad case 可以回放

评测只是发现问题，定位问题靠回放。每次评测自动留存检索快照，任何一个 bad case 可以一键还原当时的检索过程：

```python
def replay(case_id: str) -> ReplayReport:
    snapshot = store.load_snapshot(case_id)
    chunks = retrieve(snapshot.question, config=snapshot.config)
    return ReplayReport(
        hits=rank_overlap(chunks, snapshot.expect_sources),
        misses=diagnose(snapshot, chunks),  # 切分 / 嵌入 / 排序 三选一归因
    )
```

归因只有三个出口，逼着团队把问题收敛到具体一层：

<div class="callout">

**经验**：bad case 归因时，先查切分（40% 的案例出在这里），再查嵌入，最后才怀疑排序。顺序错了会在错误的层上调一周参数。

</div>

## 我们踩过的坑

> 切分策略一动，指标全线飘红、上线反而变差的经历几乎人人都有——典型原因是评测集没有覆盖内容源的真实分布（扫描版、表格、公式混排各占多少，评测集里就要占多少）。

所以有一条铁律：**评测集的构成必须对齐内容源的构成**。离线指标再好看，分布不对齐就是自欺。

---

这套方法后来沉淀进了 [Math_Tutor_RAG](/projects/math-tutor-rag)（错题本的 RAG 链路正是用它调优的），欢迎拿来跑你自己的链路。
