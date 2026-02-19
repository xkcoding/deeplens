## Context

DeepLens Phase 1 和 Phase 2 已实现完整的 CLI 管线：代码探索 → HITL 大纲审查 → 文档生成 → VitePress 预览 → 向量化索引 → Fast/Deep 搜索 API。现有架构以 Commander.js CLI 为入口，Hono HTTP 服务器提供 Q&A API，所有 Agent 事件通过 `process.stdout` 输出。

Phase 3 需要将这些能力封装为 Tauri 桌面应用，核心挑战在于：
1. Node.js Sidecar 的打包与生命周期管理
2. 前端与 Sidecar 之间的实时双向通信
3. 将 CLI 交互式流程（大纲审查）转换为 GUI 异步流程
4. Agent 事件的结构化协议和前端渲染

参考实现：[WorkAny](https://github.com/workany-ai/workany) — 同样采用 Tauri + Node.js Sidecar 架构。

## Goals / Non-Goals

**Goals:**

- 完整的桌面 GUI 体验，用户无需命令行即可完成全流程
- 实时透明的 Agent 思考流（Manus 风格）
- 可视化大纲编辑，支持拖拽和重命名
- 嵌入式 Chat（Fast/Deep 模式），集成到文档预览面板
- 统一设置管理，支持 Claude API 和 SiliconFlow 配置
- 保持 CLI 模式完全可用（桌面模式是增量能力，不破坏现有 CLI）

**Non-Goals:**

- 多窗口/多项目同时分析（Phase 3 限定单项目）
- 云端同步或团队协作功能
- 自定义主题/插件系统
- 移动端适配
- Phase 4 的 MCP Server 对外暴露（仅桌面内部使用）

## Decisions

### D1: 前端与 Sidecar 通信方式 — 前端直连 Sidecar HTTP

**选择**: 前端 React 直接通过 `fetch()` / `EventSource` 调用 Sidecar 的 Hono HTTP 服务

**替代方案**:
- A) Rust 代理模式：前端 `invoke()` → Rust → `reqwest` → Sidecar HTTP。增加延迟和代码量，SSE 流需要通过 Tauri Channel 中转
- B) stdin/stdout IPC：Rust 写 Sidecar stdin，读 stdout。不支持并发请求，不适合 SSE 流式响应

**理由**: WorkAny 验证了此模式的可行性。Sidecar 已有完整的 Hono API（`/api/search`、`/api/investigate`、`/api/status`），前端直连复用现有代码。CSP 配置 `connect-src http://localhost:*` 即可解决跨域。Hono 中间件已配置 `cors()`，无需额外修改。Rust 层仅负责 Sidecar 进程管理，不参与业务数据转发。

**Windows 混合内容问题**: Tauri 在 Windows 上从 `https://tauri.localhost` 提供服务，调用 `http://localhost` 属于混合内容。通过 CSP `connect-src` 显式允许解决。

### D2: Sidecar 打包方案 — @yao-pkg/pkg（esbuild 预构建）

**选择**: esbuild 打包为单文件 CJS → `@yao-pkg/pkg` 编译为独立二进制

**替代方案**:
- A) `bun build --compile`：二进制更小（~18MB vs ~40MB），启动更快。但 `@anthropic-ai/claude-agent-sdk` 依赖 Node.js 原生模块，Bun 兼容性未经验证
- B) Node.js SEA（Single Executable Applications）：仍在实验阶段，仅支持 CJS，不支持 ESM，原生模块处理复杂
- C) `@vercel/ncc` + 独立 Node.js runtime：非独立二进制，需要额外打包 Node.js

**理由**: WorkAny 已验证 `esbuild + pkg` 流程。`@yao-pkg/pkg` 是 `vercel/pkg` 的活跃社区分支，支持 Node 20/22。构建流程清晰：

```bash
# 1. TypeScript → 单文件 CJS
esbuild src/sidecar/index.ts --bundle --platform=node --format=cjs --outfile=dist/bundle.cjs

# 2. CJS → 平台二进制
pkg dist/bundle.cjs --targets node22-macos-arm64 --output src-tauri/binaries/deeplens-sidecar-aarch64-apple-darwin
```

**未来可选升级**: 验证 Bun 兼容性后可切换至 `bun build --compile`，减小二进制体积。

### D3: Sidecar 入口模式 — 新增 `sidecar` 子命令

**选择**: 在现有 CLI 中新增 `deeplens sidecar` 命令，启动 HTTP 服务模式

**替代方案**: 创建独立的 `sidecar.ts` 入口文件，与 CLI 完全分离

**理由**: 复用现有 CLI 基础设施（`loadConfig()`、`Commander` 框架）。`sidecar` 模式与 `serve` 模式的区别在于：
- `sidecar`: 启动完整 HTTP API（含 Agent 管线端点），等待前端触发操作
- `serve`: 仅启动 Q&A API + VitePress 预览（Phase 2 行为不变）

`sidecar` 命令同时启动 Hono API 和 VitePress dev server（如果已有文档），并暴露新增的管线端点。

### D4: 管线端点设计 — SSE 流式响应

**选择**: 新增管线端点统一使用 SSE（`streamSSE`）回传事件，复用已有 `hono/streaming` 模式

新增端点：

| 端点 | 方法 | 用途 | SSE 事件 |
|------|------|------|----------|
| `POST /api/explore` | POST | 触发探索 Agent | `thought`, `tool_start`, `tool_end`, `progress`, `outline_ready`, `error` |
| `POST /api/generate` | POST | 触发生成 Agent | `thought`, `tool_start`, `tool_end`, `section_ready`, `progress`, `done`, `error` |
| `GET /api/outline` | GET | 获取当前大纲 | 同步 JSON 响应 |
| `POST /api/outline/confirm` | POST | 确认/提交编辑后的大纲 | 同步 JSON 响应 |
| `POST /api/analyze` | POST | 完整管线（探索→等待确认→生成→索引） | 复合 SSE 流，含所有事件类型 |

**SSE 事件协议**（统一格式，扩展现有 Deep Search 事件体系）:

```
event: thought        data: {"content": "正在分析项目结构..."}
event: tool_start     data: {"tool": "read_file", "args": {"path": "src/auth.ts"}}
event: tool_end       data: {"tool": "read_file", "duration_ms": 120}
event: outline_ready  data: {"outline": <JSON>}
event: section_ready  data: {"target_file": "docs/auth.md", "domain_id": "auth"}
event: progress       data: {"phase": "explore|generate|index", "completed": 3, "total": 8}
event: done           data: {"phase": "explore|generate|index"}
event: error          data: {"message": "...", "phase": "explore"}
event: waiting        data: {"for": "outline_confirm"}
```

**理由**: 前端已需要消费 SSE（Deep Search），统一所有流式交互为 SSE 简化前端实现。`POST /api/analyze` 是长时间运行的复合流，其中在 `outline_ready` 后进入 `waiting` 状态，等待前端调用 `POST /api/outline/confirm` 后继续。

### D5: 大纲审查流程 — 异步等待模式

**选择**: 探索完成后 Sidecar 通过 SSE 发送 `outline_ready` 事件，进入等待状态。前端通过 `GET /api/outline` 获取大纲，编辑后通过 `POST /api/outline/confirm` 提交。Sidecar 收到确认后继续生成。

**实现机制**: 使用 `Promise` + resolve callback 模式

```typescript
// Sidecar 内部
let resolveOutline: (outline: Outline) => void;
const outlineConfirmed = new Promise<Outline>((resolve) => { resolveOutline = resolve; });

// POST /api/outline/confirm 路由
app.post("/api/outline/confirm", async (c) => {
  const body = await c.req.json();
  const parsed = outlineSchema.safeParse(body.outline);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  resolveOutline(parsed.data);
  return c.json({ status: "confirmed" });
});

// 管线中
const outline = await runExplorer(projectPath);
stream.writeSSE({ event: "outline_ready", data: JSON.stringify({ outline }) });
stream.writeSSE({ event: "waiting", data: JSON.stringify({ for: "outline_confirm" }) });
const confirmedOutline = await outlineConfirmed;  // 阻塞等待前端确认
await runGenerator(confirmedOutline, projectPath);
```

**替代方案**: 探索和生成拆为两个独立 HTTP 调用，前端负责编排。增加前端复杂度，且断开后无法恢复管线状态。

### D6: 项目结构 — 前端独立目录

**选择**: 前端代码放在 `ui/` 顶层目录，与 `src/`（Node.js 后端）、`src-tauri/`（Rust）平级

```
deeplens/
├── src/                # Node.js 后端（Sidecar 代码）
├── src-tauri/          # Tauri Rust 外壳
│   ├── src/main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   └── binaries/       # pkg 编译产物（.gitignore）
├── ui/                 # React 前端
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── lib/
│   ├── index.html
│   └── vite.config.ts
├── package.json        # 根 package.json（workspace 或 scripts 编排）
└── tsconfig.json
```

**替代方案**: 前端放在 `src/ui/`。但前端构建工具链（Vite + React）与后端（tsc）完全不同，混在同一 `src/` 下增加 tsconfig 冲突风险。

**理由**: WorkAny 的 `src/`（前端）+ `src-api/`（后端）+ `src-tauri/`（Rust）模式。我们采用 `ui/` + `src/` + `src-tauri/` 更清晰，`ui/` 名称明确表示前端。

### D7: 配置持久化 — 复用 deeplens.db + 新增 config 表

**选择**: 在现有 `<project>/.deeplens/deeplens.db` 中新增 `config` 表，存储全局配置

```sql
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**API Key 加密**: 使用 AES-256-GCM 对称加密，密钥派生自机器唯一标识（macOS: `IOPlatformUUID`、Linux: `/etc/machine-id`、Windows: `MachineGuid` 注册表项）。Rust 层通过 Tauri 命令提供加密/解密服务，Node.js Sidecar 通过 HTTP 端点调用。

**替代方案**:
- A) 独立全局配置数据库（`~/.deeplens/config.db`）：跨项目共享配置。但增加复杂度，且不同项目可能需要不同配置
- B) JSON 配置文件：简单但无法加密，API Key 明文存储不安全
- C) 系统 Keychain（macOS Keychain / Windows Credential Vault）：最安全，但跨平台实现复杂，且 Sidecar 访问需要额外桥接

**理由**: SQLite 已是项目依赖，复用降低复杂度。AES-256-GCM + 机器标识的方案在不依赖系统 Keychain 的前提下提供了合理的安全性。配置项数量有限（~10 个），key-value 表足够。

**全局 vs 项目配置**: API 密钥等全局配置存储在 `~/.deeplens/global.db` 的 `config` 表中；项目特定配置（端口、输出路径）存储在 `<project>/.deeplens/deeplens.db`。Sidecar 启动时合并两层配置，项目级覆盖全局级。

### D8: Sidecar 生命周期管理

**选择**: Rust 层通过 `tauri-plugin-shell` 管理 Sidecar 进程

**启动流程**:
1. Tauri `setup()` 钩子中 spawn sidecar，传入 `--port <N>` 参数
2. 后台任务轮询 `GET /health` 直到返回 200（超时 10s）
3. 发送 `sidecar-ready` 事件给前端，携带端口号
4. 前端收到事件后初始化 API 客户端

**关闭流程**:
1. Tauri `RunEvent::Exit` 中发送 `POST /api/shutdown` 给 Sidecar
2. Sidecar 收到后执行优雅关闭（close VectorStore、stop VitePress）
3. 超时 5s 后 Rust 层 `child.kill()` 强制终止

**异常恢复**:
1. `CommandEvent::Terminated` 触发自动重启（最多 3 次，间隔 2s 指数退避）
2. 重启失败后 emit `sidecar-fatal` 事件，前端显示错误对话框

### D9: VitePress 预览嵌入方式 — iframe

**选择**: 右侧 Artifact 面板通过 `<iframe src="http://localhost:{vitepressPort}">` 嵌入 VitePress dev server

**替代方案**: 解析 VitePress 输出的 HTML 直接渲染在 React 组件中。需要处理 Mermaid 渲染、样式隔离、路由同步，工作量过大。

**理由**: VitePress dev server 已具备 HMR 热更新，Agent 写入新文档后自动刷新。iframe 天然样式隔离，零额外开发成本。通过 `postMessage` 实现页面跳转同步（左侧导航点击 → iframe 导航到对应页面）。

### D10: UI 框架选型 — React + Tailwind CSS + shadcn/ui

**选择**: React 18 + Tailwind CSS v4 + shadcn/ui 组件库

**理由**: 需求规格已指定 React + Tailwind CSS。shadcn/ui 提供高质量的无头组件（Dialog、Tabs、Tree、ScrollArea），可直接用于设置界面、大纲编辑器和 Chat 组件，减少自定义 UI 开发量。

### D11: 拖拽大纲编辑器 — @dnd-kit/core

**选择**: `@dnd-kit/core` + `@dnd-kit/sortable` 实现树状拖拽

**理由**: `@dnd-kit` 是 React 生态中最成熟的拖拽库，原生支持嵌套树结构（`SortableTree` 示例）。支持键盘操作（无障碍）和触摸设备。

**交互映射**:
- 拖拽节点：调整 domain/sub_concept 的归属和顺序
- 双击节点标题：inline 重命名
- 右键菜单：删除节点、添加子节点
- 底部操作栏：确认（锁定 Knowledge Skeleton）、重新探索、导出 JSON

### D12: 配置传递机制

**选择**: Tauri 启动 Sidecar 时通过环境变量注入配置

```
Tauri Setup
  → 读取 global.db config 表
  → 解密 API Key（Rust AES-256-GCM）
  → spawn sidecar with env vars:
      ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY,
      SILICONFLOW_API_KEY, SILICONFLOW_BASE_URL,
      SILICONFLOW_EMBED_MODEL, SILICONFLOW_LLM_MODEL,
      DEEPLENS_API_PORT, DEEPLENS_DOCS_PORT
  → Sidecar loadConfig() 读取 env vars（现有逻辑不变）
```

**设置界面更新配置流程**:
1. 前端 `invoke("save_config", { key, value })` → Rust 写入 SQLite（加密）
2. Rust 发送 `POST /api/reload-config` → Sidecar 重新加载环境变量
3. 对于需要重启才能生效的配置（如端口变更），提示用户重启应用

## Risks / Trade-offs

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| `@yao-pkg/pkg` 对 `claude-agent-sdk` 原生模块兼容性 | Sidecar 构建失败 | 在 Phase 3 开始前做 PoC 验证；失败则改用 `ncc + 嵌入 Node.js runtime` 方案（WorkAny CLI bundle 模式） |
| Windows 混合内容（HTTPS → HTTP localhost） | 前端无法调用 Sidecar API | CSP `connect-src` 显式允许；若仍失败则加 Rust 代理层 |
| Sidecar 二进制体积过大（~40MB） | 安装包膨胀 | 后续验证 `bun build --compile`（~18MB）；`pkg` 支持 `--compress` 压缩 |
| 大纲异步确认中断 | 管线状态丢失 | `POST /api/analyze` 端点维护状态机，支持断点续传（outline 已持久化到磁盘） |
| VitePress iframe 跨域限制 | 无法通过 postMessage 通信 | VitePress 和 Tauri 均在 localhost，同源策略不阻拦；必要时注入 VitePress 插件响应 message |
| Agent SDK 更新导致流式事件格式变化 | 事件解析断裂 | 锁定 `@anthropic-ai/claude-agent-sdk` 版本，跟踪 changelog |
| 配置加密密钥泄露（机器标识可预测） | API Key 泄露 | 机器标识 + 随机盐 + PBKDF2 派生密钥，对于本地应用已足够；高安全场景可后续迁移到系统 Keychain |

## Open Questions

1. **Monorepo 结构**: `ui/`、`src/`、`src-tauri/` 是否使用 pnpm workspace 管理，还是通过 npm scripts 编排？需要评估 `tauri dev` 与 `tsc --watch` + `vite dev` 的协调方式
2. **Bun 兼容性**: 是否在 Phase 3 启动前做一次 `bun build --compile` PoC？如果可行，可以显著减小安装包体积
3. **首次启动引导**: 是否实现 Setup Wizard（多步引导设置 API Key），还是直接打开设置页面？
4. **多平台 CI/CD**: 是否在 Phase 3 范围内建立 GitHub Actions 构建流水线（macOS arm64/x64、Windows、Linux）？
