## Why

Phase 1-3 已完成从代码探索到桌面应用的完整管线，但存在四类问题：

1. **封闭系统**：生成的知识只能通过内置 UI 消费，Cursor/Windsurf 等外部 Coding Agent 无法调用
2. **一次性快照**：代码变更后只能全量重新分析，成本高且体验差
3. **体验粗糙**：Deep 模式 thinking 内容被截断无法调试 prompt、VitePress 默认样式不够专业、Chat 不支持追问只能单轮对话
4. **单项目限制**：只能分析一个代码库，无法管理多个项目

Phase 4 解决这四类问题：生态集成（MCP）、持续更新（Git 增量）、体验优化（thinking/VitePress/追问）、多项目管理。

## What Changes

### 新增：MCP Server 对外服务
- 实现 MCP 协议服务端，通过 stdio 或 SSE 传输层暴露给外部 IDE Agent
- 提供 4 个工具：`get_architecture_map`、`consult_knowledge_base`、`investigate_implementation`、`visualize_data_flow`
- `get_architecture_map` 返回项目知识大纲（domains、tech stack、模块关系）
- `consult_knowledge_base` 封装现有 Fast Search（文档 RAG），Layer 1 快速查询
- `investigate_implementation` 封装现有 Deep Search（代码 RAG + Agent Loop），Layer 2 深度查询
- `visualize_data_flow` 基于大纲 + 代码生成 Mermaid 数据流图
- MCP Server 端口在 Settings UI 中可配置

### 新增：Git 增量分析
- 执行 `git diff` 识别上次分析以来的变更文件
- 基于知识大纲，溯源影响到的 domain 和文档节点
- 仅对受影响的节点重新执行生成 Agent（局部重生成）
- 更新向量索引（删除旧 chunk、插入新 chunk）
- UI 中新增"增量更新"按钮，展示变更影响范围摘要

### 新增：静态站点导出
- 调用 `vitepress build` 生成静态 HTML 站点
- UI 中新增"导出站点"按钮，选择输出目录
- 导出结果可直接部署到任意静态托管服务

### 优化：Deep 模式 Thinking 完整展示
- 移除 ThoughtChainList 中 reasoning 的 `line-clamp-3` 截断
- 展开 ThoughtChain 时显示完整 reasoning 内容，不做任何截断
- 便于用户调试 prompt、观察完整思考链路

### 优化：VitePress 主题 — DeepWiki 风格
- 自定义 VitePress 主题，参考 DeepWiki（deepwiki.com）的布局风格
- 首页直接展示 Overview 内容页，去掉默认 hero 页
- 主色调使用 DeepLens 橙色系（primary-500: `#F97316`）
- 侧边栏分组编号（1. Overview, 2. Architecture...）
- 干净的文档风格，突出内容可读性

### 优化：Chat 追问（多轮对话）
- Fast Search 和 Deep Search 均支持基于历史上下文追问
- 前端发送最近 5 条消息历史（含用户和助手消息）
- 后端 Fast Search 将历史注入 AI SDK `messages` 参数
- 后端 Deep Search 将历史作为 AI SDK `messages` 参数传递，Agent Loop 在历史基础上继续推理

### 优化：多项目管理
- 项目选择页加载 `~/.deeplens/projects.json` 显示历史项目列表（名称、路径、状态、最后分析时间）
- 分析完成后自动注册到 projects.json
- AppHeader 支持项目切换下拉菜单，无需回首页
- 每个项目独立的 VitePress 实例、向量索引、session 状态
- 切换项目时保留各项目的 UI 状态（事件流、导航选中项等）

## Capabilities

### New Capabilities
- `mcp-server`: MCP 协议服务端实现，暴露 4 个工具供外部 Coding Agent 调用
- `git-incremental-update`: Git 增量分析与局部重生成管线（diff 解析 → 影响溯源 → 局部生成 → 索引更新）
- `static-site-export`: VitePress 静态站点构建与导出
- `vitepress-theme`: 自定义 VitePress 主题，DeepWiki 风格布局 + DeepLens 橙色系主色调
- `chat-follow-up`: Chat 多轮追问支持，Fast/Deep 模式均基于最近 5 条历史上下文
- `multi-project`: 多项目管理，项目列表持久化、切换、独立状态

### Modified Capabilities
- `cli-orchestrator`: 新增 `deeplens mcp-server` 和 `deeplens update` CLI 命令
- `settings-management`: 新增 MCP Server 端口配置项
- `ipc-protocol`: 新增增量更新和导出的 SSE 端点
- `cot-visualization`: 移除 reasoning 截断，展开时显示完整 thinking 内容

## Impact

- **新增依赖**: `@modelcontextprotocol/sdk`（MCP 协议 SDK）
- **新增模块**: `src/mcp/`（MCP Server）、`src/update/`（增量分析）、`src/export/`（站点导出）
- **修改模块**:
  - `src/cli/index.ts` — 新增 CLI 命令
  - `src/api/sidecar-server.ts` — 新增路由（增量更新、导出）
  - `src/api/routes/search.ts` — 接受 messages 历史参数
  - `src/api/routes/investigate.ts` — 接受 messages 历史参数
  - `src/search/fast.ts` — streamText 传入历史 messages
  - `src/search/deep.ts` — streamText 传入历史 messages
  - `src/config/env.ts` — 新增 MCP 端口配置项
  - `src/vitepress/scaffold.ts` — 生成自定义主题文件
- **UI 变更**:
  - `ThoughtChainList.tsx` — 移除 line-clamp-3
  - `ChatWidget.tsx` / `useChat.ts` — 发送历史消息
  - `ProjectSelectionPage.tsx` — 加载项目列表
  - `AppHeader.tsx` — 项目切换下拉、增量更新和导出按钮
  - Settings — MCP 端口配置
- **Tauri 变更**: `src-tauri/src/lib.rs` 注入 MCP 端口环境变量
- **VitePress 变更**: 新增 `.vitepress/theme/` 自定义主题目录
- **外部影响**: Cursor/Windsurf 用户可通过 MCP 协议接入 DeepLens 知识库
