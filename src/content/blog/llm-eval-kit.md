---
title: "把评测做成一件趁手的工具：llm-eval-kit"
description: "评测方法写进博客容易腐烂，长在工具里才会被真的执行。这篇讲 llm-eval-kit 的设计取舍：Retriever 协议怎么定、纯 stdlib 的 BM25 怎么把 2 万段语料的 P50 从 23.4ms 压到 0.6ms、LLM-as-judge 的噪声怎么压。"
pubDate: 2026-11-23
category: "架构"
tags: ["RAG", "评测", "工程效率", "Python"]
featured: false
draft: false
---

之前写过[评测方法](/blog/rag-retrieval-quality)：bad case 入库、指标正交、评测集即代码。方法写清楚之后我发现一个问题——**方法躺在博客里会腐烂，长在工具里才会被真的执行**。于是有了 [llm-eval-kit](https://github.com/lii-lii321/llm-eval-kit)：34 个提交，核心零第三方依赖，全部功能离线可复现，评测报告由 GitHub Pages 在每次 push 后自动重新发布。

## 合成评测集：没有标注数据也能开跑

冷启动最大的障碍是「没有评测集」。工具内置规则式合成：词频 × 逆文档频率选关键词、查询模板拼 query-doc-answer 三元组，固定 seed 完全可复现；再支持同义改写——**故意造出词面不匹配的困难样本**，专测检索器的语义鲁棒性。等到有人工标注了，JSONL 通道直接接管：缺字段、重复 id、空相关文档全部报错且带行号，`_meta` 行记录标注日期与版本，评测集的「腐烂」从数据格式这一层就被拦住。

## 一个协议，让任何检索器同台

工具最有价值的设计是 Retriever 协议：duck typing，任何检索系统实现一个 `retrieve(query, top_k)` 方法，就能和内置的 BM25、词频、加权混合、RRF 融合四条管线同台对比。协议不满足时报的是可诊断的错误，而不是莫名其妙的 KeyError。

<aside-note>

外接向量库、Elasticsearch、自研 RAG，改动量只有一层薄适配——协议宽容归一化（CallableRetriever）负责把各种返回形状收敛成统一格式。评测工具的格局应该是「我适配你」，而不是「你迁就我」。

</aside-note>

## 性能优化，以及它的诚实边界

内置玩具语料跑演示没问题，真实语料上来 BM25 就成了瓶颈。`FastBM25Retriever` 用纯 stdlib 实现倒排索引，打分口径与玩具版完全一致——2 万段语料实测单查询 P50 从 **23.4ms 降到 0.6ms**。但 README 里同样写了收益的边界：中频词元查询约 40 倍，**查询含高频词元时收益收窄到 2.6 倍**。基准脚本随库发布，数字随时可复现，而不是只活在幻灯片里。

## LLM-as-judge 的噪声问题

答案质量用四维评分（正确性 / 相关性 / 可操作性 / 清晰度，1–5 分）。judge 是可插拔的：内置确定性 `MockJudge` 保证离线可跑、测试不花钱；`OpenAICompatibleJudge` 读环境变量，没配 key 优雅跳过；真正有意思的是 `SelfConsistencyJudge`——**采样 n 次按维度多数票**，用多次采样压单次评分的噪声。单次 judge 打分抖一下就可能误导调参方向，这笔账算下来多花的 token 是值的。

## 把评测焊进 CI

最后一块拼图是回归门禁：`--fail-under recall@5=0.9` 这样的参数，任一指标低于阈值进程退出码 1，并输出实测值 vs 阈值 vs 差距。检索策略一动、评测不过线，合并就被挡下——[方法文里的铁律](/blog/rag-retrieval-quality)到这里才真正有了牙齿。badcase 也没漏掉：top-K 未命中自动归因成三类（关键词不匹配 / 语义漂移 / 语料缺失），报告里附未命中示例，Markdown + HTML 双格式。

---

24 段玩具语料、一条命令跑通全链路，`--corpus-dir` 换成你自己的语料目录就能出第一份报告。工具仓库就是它的说明书：[llm-eval-kit](https://github.com/lii-lii321/llm-eval-kit)，在线评测报告每次 push 自动更新。
