## Context

DeepLens 的文档生成流水线由 5 个 Agent Prompt 驱动：Explorer（代码分析）→ Generator（域文档生成）→ Overview（项目首页）→ Summary（项目总结）→ Translator（中文翻译）。当前生成文档只覆盖 WHAT 层，缺少 HOW/WHY/EDGE 深度。Prompt 示例绑定 DeepLens 自身术语，在其他项目上表现不佳。

**约束**:
- 纯 Prompt 文本改动，无 API/接口/类型变更
- 必须保持向后兼容（无 breaking change）
- Token 预算：深度提升会增加 Generator 阶段 30-50% token 消耗，需在深度和效率间平衡
- 所有示例使用通用术语，不绑定特定项目

## Goals / Non-Goals

**Goals**:
- 定义 WHAT-HOW-WHY-EDGE 四层深度模型，贯穿全流水线
- Generator 输出结构一致的 Hub/Spoke 文档，含设计决策和边界约束
- Explorer 提供更高质量的 sub_concepts 和域间关系信号
- 所有 Prompt 示例通用化

**Non-Goals**:
- 不改动 Agent 调用逻辑（`src/agent/*.ts`）
- 不改动 MCP 工具（`src/tools/*.ts`）
- 不改动 outline schema（`src/outline/types.ts`）
- 不引入 LSP（Phase 8 范围）

## Design

### 四层深度模型

贯穿 Generator、Overview、Summary 的统一深度标准：

| 层 | 含义 | Generator Hub | Generator Spoke | Overview | Summary |
|----|------|--------------|----------------|----------|---------|
| **WHAT** | 做什么 | 域职责概述 | 组件职责与接口 | 项目架构概述 | 域回顾 |
| **HOW** | 怎么做 | 域内数据流图 | 设计模式、调用链、代码片段 | 关键流程图 | 跨域模式 |
| **WHY** | 为什么 | 域级架构决策 | 组件设计决策与 tradeoff | 架构风格选择 | 架构洞察 |
| **EDGE** | 边界 | 域间契约 | 并发、异常、性能约束 | — | 技术债务 |

### Generator Hub 模板

```markdown
# {Domain Title}

> 一句话定位

## 概述
该域在项目中的角色和职责（WHAT）

## 架构决策
为什么采用这种设计（WHY）— 列出 1-3 个关键决策及 tradeoff

## 核心组件
| 组件 | 职责 | 关键接口 |
|------|------|---------|
| ... | ... | ... |

## 数据流
Mermaid 图：域内组件间调用链（HOW）

## 关联领域
与其他域的交互关系 + 边标注（数据方向、依赖类型）

## Spoke 导航
- [Component A](./component-a.md) — 简述
- [Component B](./component-b.md) — 简述
```

### Generator Spoke 模板

```markdown
# {Component Title}

> 一句话定位

## 职责与接口（WHAT）
做什么，暴露什么接口

## 实现机制（HOW）
设计模式、调用链
Mermaid 局部交互图

## 关键代码
1-3 段核心代码片段，每段不超过 20 行，带文件路径和行号引用

## 设计决策（WHY）
为什么选择这个方案，有什么 tradeoff

## 边界与约束（EDGE）
并发、错误处理策略、性能约束、已知限制

## 关联组件
链接到相关 spoke
```

### Explorer 增强

- 抽样范围: 3-8 → 5-12 文件
- sub_concepts 质量标准: 每个 sub_concept 必须是一个可独立文档化的功能单元（对应一个 spoke 文档）
- Probe 阶段增加 grep_search 策略: 用 grep 发现跨文件导入/调用关系，而非仅依赖文件内容推理
- 输出增加域间交互提示: reasoning 字段要求标注与其他域的依赖方向

### Prompt 示例通用化策略

| 类型 | BAD（绑定项目） | GOOD（通用） |
|------|----------------|-------------|
| 组件名 | "Explorer Agent", "Deep Writer" | "UserService", "OrderController", "AuthMiddleware" |
| 项目名 | "DeepLens pipeline" | "the project's main pipeline" |
| 函数名 | `runGenerator()`, `parseOutline()` | `processOrder()`, `validateInput()` |
| 术语分类 | 硬编码 "DeepLens, VitePress, Zod" | 规则描述："项目名取自 package manifest，技术栈取自 detected_stack" |

### 改动影响矩阵

| 文件 | 改动规模 | 核心改动 |
|------|---------|---------|
| `src/prompts/generator.ts` | 大改（~60% 重写） | Hub/Spoke 模板 + 深度模型 + BAD vs GOOD + render_mermaid 压缩 |
| `src/prompts/explorer.ts` | 中改（~30% 修改） | sub_concepts 标准 + 抽样策略 + grep 引导 |
| `src/prompts/overview.ts` | 小改（~15% 修改） | Key Flows 图 + Architecture 边语义 + Quick Start |
| `src/prompts/summary.ts` | 小改（~10% 修改） | At a Glance + Potential Improvements 收紧 |
| `src/prompts/translator.ts` | 微调（~5% 修改） | HTML 保留规则 + 示例通用化 |

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Prompt 过长导致 system prompt 被截断 | 低 | Generator prompt 可能超出模型限制 | 压缩 render_mermaid 示例（从 3 个减到 1 个），节省 ~50 行 |
| 深度要求导致 Agent 生成过多内容 | 中 | Token 消耗大幅增加 | "深度优先广度"策略：每个 spoke 写深，控制 spoke 数量 |
| 通用示例不够贴合特定领域 | 低 | 某些领域文档略显泛化 | 示例覆盖 Web 应用、CLI 工具、库三种项目类型 |
