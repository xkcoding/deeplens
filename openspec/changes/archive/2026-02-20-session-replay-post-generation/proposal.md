## Why

GUI (Tauri) 模式下分析会话是纯内存状态——关闭应用后所有中间态（思考过程、工具调用、大纲、生成文档）全部丢失，重新打开已分析过的项目需要从零开始。同时 CLI 已有的 VitePress 预览和 embedding 索引功能在 GUI 中没有入口，导致用户无法完成"分析 → 预览 → 问答"的完整闭环。

## What Changes

- **Session 事件流持久化**: 分析过程中所有 SSE 事件同步写入 `.deeplens/session.jsonl`（JSONL 格式），打开项目时批量回放事件流恢复 UI 状态
- **Outline 持久化修复**: Sidecar 模式在 outline confirm 后保存 `outline.json`（当前只有 CLI 模式会保存）
- **Session 读取 API**: 新增 `GET /api/session` 和 `POST /api/docs/read` 路由，前端回放时读取历史事件和文档内容
- **前端回放机制**: `useAgentStream` 抽取 `applyEvent` 纯函数，新增 `replaySession` 方法批量处理事件
- **Preview 按钮**: 分析完成后出现，后端启动 VitePress dev server 并在系统浏览器中打开
- **Vectorize 按钮**: 分析完成后出现，调用 embedding indexer 创建向量数据库，完成后 Q&A 自动解锁
- **Q&A 路由热注册**: 将 sidecar 的 Q&A 路由从启动时一次性注册改为 late-binding，Vectorize 完成后动态启用
- **Settings Storage Path**: 改为 read-only 展示（当前该字段无后端消费者）

## Capabilities

### New Capabilities
- `session-persistence`: 分析事件流持久化写入与回放加载，实现跨会话状态恢复
- `post-generation-actions`: 分析完成后的 Preview（VitePress 预览）和 Vectorize（embedding 索引）手动操作按钮

### Modified Capabilities
- `qa-api-server`: Q&A 路由注册从启动时固定改为 late-binding 模式，支持 Vectorize 后动态启用

## Impact

- **Backend**: `src/api/routes/analyze.ts` 增加事件写入逻辑；`src/api/sidecar-server.ts` 新增 4 个路由 + Q&A 热注册重构
- **Frontend**: `useAgentStream.ts` 重构事件处理为纯函数 + 回放方法；`App.tsx` 增加自动加载 + 按钮处理；`AppHeader.tsx` 增加 Preview/Vectorize 按钮
- **Dependencies**: 无新依赖，复用现有 VitePress scaffold (`src/vitepress/`)、embedding indexer (`src/embedding/indexer.ts`)
- **`.deeplens/` 目录结构**: 新增 `session.jsonl` 文件（与现有 `outline.json`、`docs/`、`deeplens.db` 并列）
