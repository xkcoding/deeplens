## Why

DeepLens 目前是一个空项目，需要从零构建核心 Agent 引擎。Phase 1 的目标是以 CLI 形式跑通完整的代码分析流程：用户指定本地代码目录 → Agent 自主探索并生成知识大纲 → 用户审查确认 → Agent 深度生成文档 → 本地 VitePress 预览。这是整个产品的技术基石，后续的 Q&A、桌面 UI、MCP 服务都建立在此之上。

## What Changes

- 新建 Node.js + TypeScript 项目，集成 `claude-agent-sdk`（TypeScript 版本）
- 实现一组自定义 MCP Tools，供 Agent 在探索和生成过程中操作文件系统
- 实现 **探索 Agent**（Phase 1 Prompt）：自主扫描代码库，按业务概念生成 JSON 知识大纲
- 实现 **CLI 大纲审查流程**（HITL）：用户通过命令行确认或修改 Agent 产出的大纲
- 实现 **生成 Agent**（Phase 3 Prompt）：按确认的大纲逐节点生成 Hub-and-Spoke 文档 + Mermaid 图表
- 实现 **VitePress 集成**：自动生成 VitePress 配置和 sidebar，启动本地预览服务
- 支持通过 `.env` 文件配置 Anthropic API 端点和 Key（兼容国内 Coding Plan 代理）

## Capabilities

### New Capabilities

- `agent-tools`: Agent 与文件系统交互的自定义 MCP Tools 实现（list_files, read_file, read_file_snippet, grep_search, write_file）
- `exploration-agent`: 自主探索代码库、识别业务领域边界、生成 JSON 知识大纲的 Agent 能力
- `outline-review`: CLI 模式下的 HITL 大纲审查流程（展示、确认、修改）
- `generation-agent`: 按知识骨架逐节点深度生成 Hub-and-Spoke 文档 + Mermaid 图表的 Agent 能力
- `vitepress-integration`: 自动生成 VitePress 项目配置、sidebar 导航、启动本地预览服务
- `cli-orchestrator`: CLI 入口，串联探索 → 审查 → 生成 → 预览的完整流程

### Modified Capabilities

（无，这是全新项目）

## Impact

- **新增依赖**: `@anthropic-ai/claude-agent-sdk`, `vitepress`, `commander`（CLI 框架）, `dotenv`
- **新增项目结构**: `src/` 源码目录、`prompts/` System Prompt 模板、`bin/` CLI 入口
- **外部依赖**: 需要系统已安装 Claude Code CLI，或通过环境变量配置 API 端点
- **API 消耗**: 每次项目分析会消耗 Anthropic API Token（Claude 模型），成本取决于项目规模
- **文件系统**: Agent 会在目标项目同级或指定目录下创建 `deeplens-docs/` 文档输出目录
