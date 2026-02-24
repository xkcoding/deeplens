## Why

当前生成的文档只覆盖 WHAT 层（组件做什么），缺少 HOW（怎么做）、WHY（为什么这样设计）、EDGE（边界约束）三个深度层。用户反馈"不够 deep"。根因是全流水线 Prompt（Explorer → Generator → Overview → Summary → Translator）缺少深度模型引导，Agent 默认只写表面概要。

此外，Prompt 中的示例绑定了 DeepLens 自身术语，导致在其他项目上效果偏差。

## What Changes

- **Generator Prompt 大改**: 加入 Hub/Spoke 标准模板、WHAT-HOW-WHY-EDGE 四层深度要求、BAD vs GOOD 对比示例、代码片段量化标准（每 spoke 1-3 段，不超过 20 行）、压缩 render_mermaid 示例节省 token 空间
- **Explorer Prompt 中改**: 强化 sub_concepts 质量标准（每个应对应一个可独立文档化的功能单元）、抽样从 3-8 调整为 5-12、grep_search 策略化引导发现跨文件调用链、增加域间交互信号
- **Overview Prompt 小改**: Key Flows 增加 Mermaid sequence diagram 要求、Architecture 图标注边语义、Quick Start 增强为可执行步骤
- **Summary Prompt 小改**: 收紧 Potential Improvements 为"基于文档中已发现的事实"、增强 At a Glance 指标
- **Translator Prompt 微调**: 增加 HTML 结构保留规则、术语示例通用化（去除项目特有示例，改为规则描述）
- **所有 Prompt**: 示例统一使用通用术语（UserService、OrderController 等），不绑定特定项目

## Capabilities

### New Capabilities
- `prompt-depth-model`: WHAT-HOW-WHY-EDGE 四层深度模型定义，贯穿 Generator/Explorer/Overview/Summary 全流水线
- `prompt-templates`: Generator Hub/Spoke 标准文档模板，确保输出结构一致且有深度

### Modified Capabilities
- `exploration-agent`: Explorer 抽样策略调整（5-12 文件）、sub_concepts 质量标准强化、grep_search 策略化引导
- `generation-agent`: Generator Prompt 全面重写，加入深度模型和标准模板

## Impact

- **文件**: `src/prompts/explorer.ts`, `src/prompts/generator.ts`, `src/prompts/overview.ts`, `src/prompts/summary.ts`, `src/prompts/translator.ts`
- **生成质量**: 文档从 WHAT-only 提升到 WHAT-HOW-WHY-EDGE 四层深度
- **Token 消耗**: Generator 阶段 token 预计增加 30-50%（更深的分析和更多代码引用）
- **兼容性**: 纯 Prompt 改动，无 API/接口变更，完全向后兼容
