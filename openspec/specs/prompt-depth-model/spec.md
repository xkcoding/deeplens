# Prompt Depth Model

## ADDED Requirements

### R1: Four-Layer Depth Model

定义 WHAT-HOW-WHY-EDGE 四层文档深度标准，贯穿 Generator/Overview/Summary Prompt：

| 层 | 含义 | 必须包含 |
|----|------|---------|
| **WHAT** | 组件/域做什么 | 职责描述、接口列表 |
| **HOW** | 具体怎么做 | 设计模式、调用链、Mermaid 图、代码片段 |
| **WHY** | 为什么这样设计 | 设计决策、tradeoff 分析、替代方案 |
| **EDGE** | 边界与约束 | 并发处理、异常策略、性能约束、已知限制 |

### R2: Depth Distribution by Document Type

| 文档类型 | WHAT | HOW | WHY | EDGE |
|---------|------|-----|-----|------|
| Generator Hub | 必须 | 必须（域数据流图） | 必须（域级决策） | 可选（域间契约） |
| Generator Spoke | 必须 | 必须（模式+代码） | 必须（组件决策） | 必须 |
| Overview | 必须 | 必须（关键流程图） | 可选 | — |
| Summary | 必须 | 可选 | 必须（架构洞察） | 可选（技术债务） |

### R3: Generic Example Strategy

所有 Prompt 中的示例必须满足：
- 使用通用领域术语（如 UserService、OrderController、AuthMiddleware）
- 不引用特定项目名、函数名或技术栈
- 规则描述优先于硬编码列表（如"项目名取自 package manifest"而非"DeepLens"）
- 示例至少覆盖两种项目类型（Web 应用 + CLI 工具/库）
