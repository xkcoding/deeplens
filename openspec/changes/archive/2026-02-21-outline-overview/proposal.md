## Why

当前 outline schema 只有 domain 级别的 `knowledge_graph`，缺少项目顶层的整体介绍。用户打开生成的文档站后，直接看到分域文档列表，没有鸟瞰式的项目全局视图（架构、技术栈角色、关键流程、目录结构）。VitePress 没有 hero 页，`/` 默认就是内容页，应当作为 Overview 页承载项目概览内容。此外，缺少一个项目总结页来汇总跨域关注点、架构洞察和改进方向。

## What Changes

- 在 outline schema 中新增顶层 `overview` 字段，包含 `architecture`、`tech_stack_roles`、`key_flows`、`project_structure` 等子字段
- Explorer Agent prompt 增加 overview 生成指令，在探索阶段同时产出项目概览
- Generator Agent 将 overview 数据渲染为 `index.md`（VitePress 首页）
- Overview prompt 新增 Quick Start 段，为新开发者提供入门导读
- HITL 大纲审查 UI 中 overview 固定在顶部展示，不可拖拽排序
- VitePress sidebar 生成逻辑调整，Overview 作为第一项链接到 `/`
- 新增 Project Summary 结尾总结页 (`summary.md`)，由独立 sub-agent 在 overview 之后生成
- Summary 在 sidebar 底部、OutlineEditor 底部展示，与 Overview 同级
- Summary 内容包含：At a Glance、Domain Recap、Cross-cutting Concerns、Architectural Insights、Potential Improvements
- 分析期间 Preview/Vectorize/Update/Export 按钮改为 disabled 状态（替代隐藏）
- Header 进度条追踪 overview 和 summary 阶段（不再只追踪 generate 阶段）
- Analyze 按钮显示具体阶段文案（Exploring / Generating / Review Outline / Generating Overview / Generating Summary）
- VitePress telescope.svg 与应用图标 logo.svg 路径同步

## Capabilities

### New Capabilities
- `outline-overview`: 在 outline schema 中新增 overview 字段，Explorer 生成、HITL 展示（固定顶部不可拖拽）、Generator 渲染为 index.md、sidebar 首项
- `project-summary`: 新增 Summary Generator sub-agent，在 overview 之后生成 `summary.md` 项目总结页，包含跨域关注点、架构洞察、改进方向

### Modified Capabilities
- `exploration-agent`: Explorer prompt 新增 overview 生成指令，要求在探索阶段同时产出项目级概览数据
- `generation-agent`: Generator 从 overview 数据生成 `index.md`；新增 `runSummaryGenerator()` 在 overview 之后调用
- `outline-editor-ui`: HITL 大纲编辑器中 overview 区块固定在顶部、summary 区块固定在底部，不参与拖拽排序
- `vitepress-integration`: sidebar 生成逻辑新增 Overview 首项和 Summary 末项
- `app-header`: 按钮始终渲染但在分析期间 disabled；Analyze 按钮显示具体阶段文案
- `progress-tracking`: `generateProgress` 增加 `phase` 字段，追踪 generate/overview/summary 三阶段进度

## Impact

- `src/outline/types.ts` — outlineSchema 新增 overview 字段 + Zod 校验
- `src/prompts/explorer.ts` — 探索 prompt 新增 overview 生成指令
- `src/prompts/generator.ts` — 生成 prompt 新增 index.md 渲染指令
- `src/prompts/overview.ts` — overview prompt 新增 Quick Start 段落
- `src/prompts/summary.ts` — **新增** Summary Generator 的 system prompt
- `src/agent/generator.ts` — overview → index.md 输出逻辑 + 新增 `runSummaryGenerator()`
- `src/cli/index.ts` — pipeline 集成：overview 后追加 summary 调用
- `src/api/routes/analyze.ts` — SSE pipeline 集成：overview 后追加 summary 阶段
- `src/api/routes/generate.ts` — SSE pipeline 集成：overview 后追加 summary 调用
- `src/update/index.ts` — incremental update full fallback 模式集成 summary 调用
- `ui/src/components/outline/OutlineEditor.tsx` — overview 固定区块 UI + summary 区块
- `ui/src/components/outline/SummarySection.tsx` — **新增** Summary 标签组件
- `ui/src/components/AppHeader.tsx` — 按钮 disabled 替代隐藏 + Analyze 阶段文案
- `ui/src/hooks/useAgentStream.ts` — generateProgress 增加 phase 字段 + SUMMARY_NAV_ID + summary.md 事件处理
- `ui/src/components/ActivitySidebar.tsx` — generateProgress 类型同步
- `ui/src/App.tsx` — progressInfo 使用 generateProgress.phase + Summary 导航支持
- `src/vitepress/sidebar.ts` — sidebar 首项插入 Overview + 末项插入 Summary
- `src/vitepress/scaffold.ts` — telescope.svg 路径与 logo.svg 同步
