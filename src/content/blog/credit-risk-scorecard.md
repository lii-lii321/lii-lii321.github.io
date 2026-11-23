---
title: "LR 赢了 LightGBM：一张信贷评分卡的科研式全链路"
description: "1000 行的公开数据集上，逻辑回归把 LightGBM 甩开 3 个 AUC 点。这篇复盘 credit-risk-modeling 的完整链路：WOE 编码、2×3 实验矩阵、SHAP 解释、PSI 稳定性与 FastAPI 评分服务——以及两个反直觉的结论。"
pubDate: 2026-11-23
category: "工程"
tags: ["风控", "机器学习", "可解释性", "Python"]
featured: false
draft: false
---

[credit-risk-modeling](https://github.com/lii-lii321/credit-risk-modeling) 是我给自己的一个问题：**给定申请人的 20 维画像，预测违约概率（PD），并且让每一个分数都能被审计**。载体是公开的 OpenML credit-g（Statlog German Credit）：1000 行、20 特征、坏样本率 30%，分层切分 800/200（seed=42），5 折分层交叉验证。

小数据 + 强监管场景，恰恰是把「科研式链路」走一遍的最好练习：问题 → 数据 → 实验 → 解释 → 部署，每一步都要留下可复查的产物。

## 特征层：自实现 WOE 编码

评分卡的地基是 WOE（Weight of Evidence）编码。我没有引第三方评分卡库，而是自己实现了分位数分箱 + WOE 转换：加法平滑 α=0.5 防止某箱坏样本率为零时 WOE 飞天；缺失值与训练期未见值统一映射到中性 0——这两处正是线上「训练得分、上线翻车」的经典源头，值得用测试钉死。

## 实验矩阵：2 模型 × 3 不平衡策略

教科书说类不平衡要用 SMOTE，于是我把「该不该用」做成了实验：

| model | strategy | CV AUC | CV KS | test AUC | test KS |
|---|---|---|---|---|---|
| logistic_regression | weight | 0.7836 | 0.4935 | **0.8013** | 0.5119 |
| logistic_regression | smote | 0.7824 | 0.4976 | 0.8004 | 0.5143 |
| logistic_regression | none | 0.7823 | 0.4994 | 0.8004 | 0.5238 |
| lightgbm | none | 0.7468 | 0.4196 | 0.7711 | 0.4286 |
| lightgbm | weight | 0.7462 | 0.4065 | 0.7775 | 0.4738 |
| lightgbm | smote | 0.7453 | 0.4119 | 0.7617 | 0.4452 |

两个反直觉的结论，都写进了 README 的结论段：

<div class="callout">

**一、LR 赢了 LightGBM**：部署模型（LR + class_weight=balanced）独立测试集 AUC 0.8013 / KS 0.5119，比最好的 LightGBM 组合高约 3 个 AUC 点。1000 行的小数据上，WOE 这种强先验特征工程比模型的复杂度更值钱。

**二、SMOTE 没有可辨识收益**：坏样本率 30% 的温和不平衡下，weight 与 SMOTE 的 CV AUC 差距只有 0.0012（LR）/ 0.0009（LightGBM）。加权以更低复杂度、更小的线上副作用达到同等效果，所以部署选 weight。当然结论有边界——README 里明确写了：若业务坏样本率 <5%，需要重新实验。

</div>

## 解释层：每个分数都要能回答「为什么」

风控模型的生死线是可解释性。项目里两条解释通道并存：

- **线性通道**：LR 的系数 × WOE 值，天然给出逐特征的方向与幅度，审计人员可以直接读懂；
- **SHAP 通道**：LightGBM 与 LR 各自的全局重要性 + 单样本 force plot，验证线性归因没有系统性偏差。

配套的还有稳定性：自实现 PSI 做 train vs test 对比，并额外做一个「漂移注入」测试——人为把测试分布推偏，看 PSI 是否如预期报警。

## 校准与部署：概率要能当钱算

PD 是要拿去做业务决策的数，排序对还不够，**概率本身也要准**。所以有一步校准修复：在 OOF held-out 上对 Platt scaling 与 isotonic regression 择优，用 Brier / ECE 验证校准质量；再往下一层是阈值-业务分析——同一个阈值对应的批准率与坏账率曲线，让业务方拿业务语言选阈值，而不是拿 AUC 选。

最终交付是 [FastAPI](https://github.com/lii-lii321/credit-risk-modeling) 的 `/score` 端点：入参 20 维画像，出参校准后 PD + 风险分档 + top 解释项；另有 Streamlit 交互 Demo。工程护栏照旧：150 个 pytest 全绿，ruff + mypy 进 CI 门禁。

---

30 个提交做完这一条链路，最大的收获不是模型，而是**结论的边界感**：SMOTE 的适用条件、小数据上特征工程的杠杆、校准为什么不能省——这些写进 Model Card 的句子，比 AUC 本身更接近风控的日常。
