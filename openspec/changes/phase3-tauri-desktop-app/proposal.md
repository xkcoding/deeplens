## Why

DeepLens Phase 1（CLI Agent 核心）和 Phase 2（Q&A + RAG 引擎）已完成，具备了完整的代码探索、文档生成、向量化索引和智能问答能力。但当前仅有 CLI 交互方式，缺乏图形化桌面体验。Phase 3 将这些能力封装为 Tauri 桌面应用，提供 Manus 风格的透明化思考 UI、可视化大纲编辑、嵌入式 Chat 和统一设置管理，让用户无需命令行即可完成全流程操作。

## What Changes

- 新增 Tauri (Rust) 桌面外壳，管理窗口、系统集成和 Node.js Sidecar 生命周期
- 将现有 Node.js CLI 打包为独立 externalBin 二进制，作为 Tauri Sidecar 运行
- 定义 Tauri 前端与 Node.js Sidecar 之间的双向 IPC 事件协议
- 新增 React + Tailwind CSS 前端，实现三栏布局（导航树 + 思考流 + 文档预览）
- 新增可视化 HITL 大纲编辑器（拖拽树状图），替代 CLI 交互式审查
- 新增嵌入式 Chat 组件（Fast/Deep 模式切换），嵌入文档预览面板
- 新增 CoT 思维链实时渲染，展示 Deep Search 的 Agent 推理过程
- 新增设置界面，支持 Claude API / SiliconFlow API / 通用配置的持久化管理
- **修改** `outline-review`：增加 IPC 模式，通过 HTTP 端点发送/接收大纲 JSON，替代 CLI 交互
- **修改** `cli-orchestrator`：增加 Sidecar 模式入口，将 `analyze`/`explore`/`generate`/`index` 等命令暴露为 HTTP 端点并流式回传事件

## Capabilities

### New Capabilities

- `tauri-shell`: Tauri Rust 桌面外壳 — 窗口管理、原生文件选择对话框、externalBin Sidecar 进程管理（启动/监控/重启/关闭）、系统托盘
- `sidecar-packaging`: Node.js Sidecar 打包 — 将现有 CLI + Hono 服务编译为独立二进制（pkg/ncc），Tauri externalBin 注册和平台适配
- `ipc-protocol`: IPC 事件协议 — Tauri 前端与 Node.js Sidecar 之间的双向通信规范，定义 `thought`/`tool_start`/`tool_end`/`section_ready`/`progress` 等事件格式，涵盖 Agent 探索、生成、搜索全流程
- `manus-ui-layout`: Manus 风格三栏 UI 布局 — 左侧导航树（文档目录 + 生成状态指示）、中间思考流面板（Agent 事件流）、右侧 Artifact 预览（VitePress iframe 嵌入），响应式设计
- `outline-editor-ui`: 可视化大纲编辑器 — 树状拖拽组件，支持节点拖拽重排、重命名、归属调整，通过 IPC 与 Sidecar 交互确认 Knowledge Skeleton
- `embedded-chat-ui`: 嵌入式 Chat 组件 — 文档预览面板内的 Chat 窗口，Fast/Deep 模式 Tab 切换，SSE 流式消息渲染，来源引用展示
- `cot-visualization`: CoT 思维链可视化 — 中间面板实时渲染 Deep Search 的 `tool_start`/`tool_end`/`text-delta` 事件，Glass Box 体验，动画过渡效果
- `settings-management`: 设置管理系统 — 设置 UI（Claude API Base URL/Key/Model、SiliconFlow Base URL/Key/Embedding Model/LLM Model、通用配置）+ SQLite 配置持久化 + API Key 加密存储 + 首次启动引导 + 配置导入导出

### Modified Capabilities

- `outline-review`: 新增 IPC 模式 — 探索完成后通过 `GET /api/outline` 返回大纲 JSON，前端编辑后通过 `POST /api/outline/confirm` 提交确认，Sidecar 等待确认后再进入生成阶段；保留 CLI 模式兼容
- `cli-orchestrator`: 新增 Sidecar 模式 — 增加 `deeplens sidecar` 命令启动 HTTP 服务模式，暴露 `POST /api/analyze`、`POST /api/explore`、`POST /api/generate` 等端点，通过 SSE 流式回传 Agent 事件；现有 CLI 命令不变

## Impact

**新增依赖**:
- `@tauri-apps/api` + `@tauri-apps/cli` (Tauri 桌面框架)
- `react` + `react-dom` + `@vitejs/plugin-react` (前端 UI)
- `tailwindcss` (样式)
- `@dnd-kit/core` 或类似库 (拖拽交互)
- `pkg` 或 `@vercel/ncc` (Node.js 二进制打包)

**受影响模块**:
- `src/outline/review.ts` — 增加 HTTP 端点模式
- `src/cli/index.ts` — 增加 `sidecar` 子命令
- `src/api/` — 新增 analyze/explore/generate/outline 路由
- 新增 `src-tauri/` 目录（Rust 代码）
- 新增 `src/ui/` 目录（React 前端代码）

**项目结构变化**:
```
deeplens/
├── src/              # 现有 Node.js 后端（不变）
├── src-tauri/        # 新增: Tauri Rust 外壳
│   ├── src/main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/ui/           # 新增: React 前端
│   ├── App.tsx
│   ├── components/
│   ├── layouts/
│   └── pages/
└── package.json      # 新增前端 + Tauri 依赖
```

**构建流程**:
- 前端: Vite 构建 React → Tauri 嵌入 WebView
- Sidecar: Node.js 编译为独立二进制 → Tauri externalBin
- 桌面: `tauri build` 生成安装包（macOS .dmg / Windows .msi / Linux .AppImage）
