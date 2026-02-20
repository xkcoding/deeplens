## Context

DeepLens GUI (Tauri) 已完成 Live Document Preview + Layout Redesign，实现了实时 markdown 渲染和 ActivitySidebar。但所有分析状态仅存在于前端内存（`useAgentStream` 的 `AgentStreamState`），关闭应用即丢失。CLI 模式已有 VitePress 预览和 embedding 索引，但 GUI 无对应入口。

当前 `.deeplens/` 目录结构:
```
.deeplens/
├── docs/domains/...     ← write_file tool 已持久化
├── outline.json         ← 仅 CLI 保存，sidecar 不保存
├── deeplens.db          ← embedding 向量库
└── (缺少 session.jsonl)
```

关键约束:
- SSE 事件流通过 `src/api/routes/analyze.ts` 的 `streamSSE()` 传递给前端
- 前端 `useAgentStream.ts` 中的 `toAgentEvent()` + `setState` 回调处理所有事件
- Sidecar 的 Q&A 路由在 `sidecar-server.ts` 启动时一次性注册，无法动态添加

## Goals / Non-Goals

**Goals:**
- 分析事件流持久化到 `session.jsonl`，项目打开时自动回放恢复 UI 状态
- Sidecar 模式持久化 `outline.json`
- 提供 Preview 按钮（VitePress 预览）和 Vectorize 按钮（embedding 索引）
- Vectorize 完成后 Q&A 路由动态启用，无需重启 sidecar

**Non-Goals:**
- 不做自动 VitePress scaffold / 自动 embedding（用户手动触发）
- 不做 session 历史管理（多次分析只保留最新一次）
- 不做 Storage Path 自定义（改为 read-only 展示）
- 不做动画回放（批量处理，瞬间恢复）

## Decisions

### D1: Session 持久化格式 — JSONL 追加写入

**选择**: `.deeplens/session.jsonl`，每行一个 `{ ts, event, data }` JSON 对象，通过 `fs.appendFile` 逐条追加。

**替代方案**:
- 单个 JSON 文件（需要整体读写，大文件操作成本高）
- SQLite 表（引入额外依赖，过度设计）

**理由**: JSONL 天然适合追加写入场景，读取时逐行 parse 即可，Node.js 原生支持。

### D2: doc_written 事件只存路径引用

**选择**: session.jsonl 中 `doc_written` 事件只记录 `{ path }` 不记录 `{ path, content }`。回放时通过 `POST /api/docs/read` 批量读取文件内容。

**替代方案**: 完整写入 content（自包含，但文件膨胀）

**理由**: docs 文件已由 write_file tool 持久化到 `.deeplens/docs/`，生成后手动修改机会不大，引用模式避免重复存储。

### D3: 回放方式 — 批量同步处理

**选择**: 前端一次性读取 session.jsonl 所有事件，通过纯函数 `applyEvent()` 同步累积 state，最后一次性 `setState`。

**替代方案**: 逐条异步回放（模拟实时）、后端生成最终快照

**理由**: 复用现有 `toAgentEvent()` 逻辑，几百条事件 10-20ms 处理完毕，无需维护额外快照格式，且保留了查看历史思考过程的能力。

### D4: Q&A 路由热注册 — Late-binding 代理模式

**选择**: 在 sidecar 启动时注册 catch-all 路由 `/api/search/*` 和 `/api/investigate/*`，内部代理到动态创建的 Hono 子应用。Vectorize 完成后创建子应用实例。

**替代方案**: 重启 sidecar（中断连接）、Hono 动态路由注册（API 不支持）

**理由**: 对外路由路径不变，内部实现可动态切换。启动时若 `deeplens.db` 已存在则立即初始化子应用，否则返回 503 直到 Vectorize 完成。

### D5: Preview — 后端启动 VitePress + 前端打开浏览器

**选择**: `POST /api/preview` 后端调用现有 `scaffoldVitePress()` + `startVitePressPreview()`，返回 URL 给前端。前端通过 Tauri `shell.open()` 或 `window.open()` 打开系统浏览器。

**理由**: 复用 CLI 已有的 VitePress scaffold 逻辑（`src/vitepress/`），不在 Tauri webview 内嵌渲染。

## Risks / Trade-offs

**[session.jsonl 文件增长]** → 单次分析通常几百条事件（~100-500KB），可接受。新分析会覆盖旧 session，不会无限增长。

**[doc_written 引用断裂]** → 如果用户手动删除 `.deeplens/docs/` 下的文件，回放时对应文档内容为空。→ `POST /api/docs/read` 对不存在的文件静默跳过，UI 显示空预览。

**[VitePress 端口冲突]** → `startVitePressPreview` 已有端口自动递增逻辑。多次点击 Preview 需要管理进程生命周期。→ 记录子进程 PID，再次点击时先 kill 旧进程。

**[Vectorize 耗时]** → 取决于文档量和 SiliconFlow API 速度，可能 30s-2min。→ 按钮显示 loading 状态，不阻塞其他操作。

**[Hono catch-all 路由性能]** → 每个 Q&A 请求多一层代理。→ 内存中函数调用，开销可忽略。
