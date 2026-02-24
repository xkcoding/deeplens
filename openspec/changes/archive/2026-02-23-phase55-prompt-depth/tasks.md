# Phase 5.5: Prompt 深度优化 — Tasks

## Group 1: Generator Prompt 大改（核心瓶颈）

- [x] 1.1 定义 WHAT-HOW-WHY-EDGE 四层深度模型文本，嵌入 Generator Prompt
- [x] 1.2 编写 Hub 文档标准模板（7 个固定章节），替换当前 5 bullet list
- [x] 1.3 编写 Spoke 文档标准模板（7 个固定章节），替换当前 5 bullet list
- [x] 1.4 编写 BAD vs GOOD 对比表（3+ 组，通用术语），展示浅概要 vs 深分析
- [x] 1.5 定义代码片段标准（1-3 段/spoke，≤20 行/段，带文件路径引用）
- [x] 1.6 压缩 render_mermaid 示例（3 个完整 JSON → 1 个示例 + 格式说明表）
- [x] 1.7 增加 Deep Reading Strategy（两遍阅读：快速浏览 + 深入分析）
- [x] 1.8 增加 Writing Depth Guidance（Hub 300-600 词，Spoke 400-1000 词）
- [x] 1.9 重写 Writing Style 章节（强化 WHY/EDGE 要求）

## Group 2: Explorer Prompt 中改

- [x] 2.1 调整抽样范围：3-8 → 5-12，增加大/小项目判断引导
- [x] 2.2 增加 sub_concepts 质量标准 + BAD vs GOOD 示例（通用术语）
- [x] 2.3 增加 grep_search 策略化引导（import 关系、接口实现、错误模式）
- [x] 2.4 增加域间交互信号要求（reasoning 字段标注已知依赖方向）

## Group 3: Overview Prompt 小改

- [x] 3.1 Key Flows 章节增加 Mermaid sequence diagram 要求
- [x] 3.2 Architecture 图引导增加边语义标注（数据方向、依赖类型）
- [x] 3.3 Quick Start 增强为可执行步骤（安装命令、启动命令）

## Group 4: Summary Prompt 小改

- [x] 4.1 收紧 Potential Improvements 为"基于文档中已发现的事实"
- [x] 4.2 增强 At a Glance 表格（增加总文件数、核心入口、架构风格）
- [x] 4.3 Domain Recap 增加每域的设计亮点

## Group 5: Translator Prompt 微调

- [x] 5.1 增加 HTML 结构保留规则（`<div class="...">` 等标签保持不翻译）
- [x] 5.2 术语分类示例通用化（Category A/B/C 改为规则描述，去除项目特有示例）

## Group 6: 验证

- [x] 6.1 TypeScript 编译通过（`npx tsc --noEmit`）
- [ ] 6.2 对 DeepLens 自身运行 generate，对比优化前后文档质量
