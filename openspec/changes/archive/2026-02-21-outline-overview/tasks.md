## 1. Schema

- [x] 1.1 在 `src/outline/types.ts` 中新增 `overviewSchema`（architecture, tech_stack_roles, key_flows, project_structure）并添加到 `outlineSchema`
- [x] 1.2 导出 `Overview` 类型，确保 `Outline` 类型包含 `overview` 字段

## 2. Explorer Agent

- [x] 2.1 在 `src/prompts/explorer.ts` 中追加 overview 生成指令（architecture + Mermaid、tech_stack_roles、key_flows、project_structure）
- [x] 2.2 更新 JSON 输出格式示例，包含 overview 字段

## 3. Generator Agent

- [x] 3.1 在 `src/prompts/generator.ts` 中更新指令：从 overview 数据生成 `index.md`（架构图、技术栈表格、关键流程、目录结构、domain 导航）
- [x] 3.2 在 `src/agent/generator.ts` 中移除独立 `architecture.md` 生成逻辑（如有），确保 `index.md` 由 overview 数据驱动
- [x] 3.3 更新 `src/vitepress/scaffold.ts`：移除静态 index.md 模板生成（index.md 由 Generator 产出）

## 4. VitePress Sidebar

- [x] 4.1 在 `src/vitepress/sidebar.ts` 的 `generateSidebar` 中插入 Overview 首项 `{ text: "Overview", link: "/" }`
- [x] 4.2 在 `src/vitepress/sidebar.ts` 的 `generateSidebar` 中追加 Summary 末项 `{ text: "Summary", link: "/summary" }`

## 5. HITL 大纲编辑器

- [x] 5.1 在 `OutlineEditor.tsx` 中新增 OverviewSection 组件：固定在顶部，不参与 dnd-kit 排序
- [x] 5.2 OverviewSection 支持内联编辑：architecture（文本域）、project_structure（文本域）、tech_stack_roles（列表编辑）、key_flows（列表编辑）
- [x] 5.3 Outline confirm 时将 overview 数据一并提交
- [x] 5.4 新增 SummarySection 组件：固定在底部，不参与 dnd-kit 排序

## 6. 向后兼容

- [x] 6.1 在加载旧 outline（无 overview 字段）时提供 fallback 默认值或使用 `.optional()` 标记，避免 Zod 解析报错

## 7. Overview Prompt 增强

- [x] 7.1 在 `src/prompts/overview.ts` 中新增 Quick Start 段，为新开发者提供入门导读链接

## 8. Summary Generator

- [x] 8.1 新建 `src/prompts/summary.ts`：Summary Generator 的 system prompt（At a Glance、Domain Recap、Cross-cutting Concerns、Architectural Insights、Potential Improvements）
- [x] 8.2 在 `src/agent/generator.ts` 中新增 `runSummaryGenerator()` 函数
- [x] 8.3 Pipeline 集成：`src/cli/index.ts` 在 overview 后追加 summary 调用
- [x] 8.4 Pipeline 集成：`src/api/routes/analyze.ts` 在 overview 后追加 summary 阶段
- [x] 8.5 Pipeline 集成：`src/api/routes/generate.ts` 在 overview 后追加 summary 调用
- [x] 8.6 Pipeline 集成：`src/update/index.ts` full fallback 模式追加 summary 调用

## 9. UI 优化

- [x] 9.1 `AppHeader.tsx`：Preview/Vectorize/Update/Export 按钮改为始终渲染 + disabled 状态替代隐藏
- [x] 9.2 `AppHeader.tsx`：Analyze 按钮根据 `progress.phase` 显示具体阶段文案
- [x] 9.3 `useAgentStream.ts`：`generateProgress` 增加 `phase` 字段，追踪 generate/overview/summary 三阶段
- [x] 9.4 `useAgentStream.ts`：新增 `SUMMARY_NAV_ID`，`outlineToNavItems()` 追加 Summary 条目
- [x] 9.5 `useAgentStream.ts`：`doc_written` 事件处理 `summary.md` 写入
- [x] 9.6 `ActivitySidebar.tsx`：`generateProgress` 类型同步
- [x] 9.7 `App.tsx`：`progressInfo` 使用 `generateProgress.phase` + Summary 导航支持

## 10. VitePress 修复

- [x] 10.1 `src/vitepress/scaffold.ts`：`buildTelescopeSvg()` 使用与 `src-tauri/icons/logo.svg` 一致的 SVG 路径
