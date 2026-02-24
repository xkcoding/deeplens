# Prompt Templates

## ADDED Requirements

### R1: Hub Document Template

Generator Prompt 必须包含 Hub 文档标准模板，定义以下固定章节：

1. **域标题 + 一句话定位**
2. **概述** (WHAT): 该域在项目中的角色和职责
3. **架构决策** (WHY): 1-3 个关键设计决策及 tradeoff
4. **核心组件表**: | 组件 | 职责 | 关键接口 |
5. **数据流** (HOW): Mermaid 图展示域内组件间调用链
6. **关联领域**: 与其他域的交互关系，标注数据方向
7. **Spoke 导航**: 链接到所有 spoke 文档

### R2: Spoke Document Template

Generator Prompt 必须包含 Spoke 文档标准模板，定义以下固定章节：

1. **组件标题 + 一句话定位**
2. **职责与接口** (WHAT): 做什么，暴露什么接口
3. **实现机制** (HOW): 设计模式、调用链、Mermaid 局部交互图
4. **关键代码**: 1-3 段核心代码片段，每段不超过 20 行，需包含文件路径引用
5. **设计决策** (WHY): 为什么选择这个方案，tradeoff 分析
6. **边界与约束** (EDGE): 并发、异常处理策略、性能约束、已知限制
7. **关联组件**: 链接到相关 spoke/hub

### R3: BAD vs GOOD Comparison Table

Generator Prompt 必须包含 BAD（浅）vs GOOD（深）对比示例，使用通用术语：
- 至少 3 组对比，分别覆盖 WHAT-only vs WHAT+HOW+WHY+EDGE
- 展示"浅概要"和"深分析"的具体差异

### R4: Code Snippet Standards

- 每个 Spoke 文档包含 1-3 个关键代码片段
- 每段代码不超过 20 行
- 必须标注来源文件路径
- 聚焦核心业务逻辑，省略 import/boilerplate
- 配文字说明代码做了什么、为什么重要

### R5: render_mermaid Example Compression

将 render_mermaid 示例从 3 个完整 JSON 压缩为 1 个 flowchart 示例 + 格式说明表，节省约 40 行 Prompt 空间。
