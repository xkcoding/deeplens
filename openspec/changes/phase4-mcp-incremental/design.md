## Context

Phase 1-3 已交付完整管线：Explorer Agent → HITL 大纲审查 → Generator Agent → VitePress → 向量索引 → Fast/Deep Search → Tauri 桌面应用。

现有架构拓扑：

```
Tauri Shell (Rust)
  └─ externalBin → Node.js Sidecar (Hono HTTP)
       ├─ /api/analyze (explore→outline→generate, SSE)
       ├─ /api/search (Fast Search, streamText, 文档 RAG)
       ├─ /api/investigate (Deep Search, streamText + tools, 文档+代码 RAG)
       ├─ /api/vectorize (embedding pipeline, SSE)
       ├─ /api/preview (VitePress dev server 子进程)
       └─ SQLite + sqlite-vec (向量存储)
```

关键现状约束：
- Fast/Deep Search 均已使用 Vercel AI SDK (`streamText`)，`messages` 参数当前为单条 `[{ role: "user", content: query }]`
- `VectorStore` 已有 `deleteBySource()` 方法，支持按文件路径删除 chunk
- VitePress scaffold 只生成基础 `config.mts`，无自定义主题
- `ProjectSelectionPage` 的 `projects` 状态初始化为空数组，`~/.deeplens/projects.json` 未接入
- ThoughtChainList 中 `ReasoningRow` 使用 `line-clamp-3` 截断

## Goals / Non-Goals

**Goals:**
- G1: 实现 MCP Server，让 Cursor/Windsurf 通过 stdio 传输层调用 DeepLens 知识
- G2: 实现 Git 增量分析，仅重生成受影响的 domain 文档并更新索引
- G3: 实现 VitePress 静态站点导出
- G4: 移除 thinking 截断，展开时显示完整 reasoning
- G5: 自定义 VitePress 主题，DeepWiki 风格 + 橙色系主色调
- G6: Fast/Deep Search 支持最近 5 条历史追问
- G7: 多项目管理，项目列表持久化、快速切换、独立状态

**Non-Goals:**
- 跨项目搜索（每个项目独立的索引和 VitePress）
- MCP 的 SSE/HTTP 传输层（优先 stdio，覆盖 Cursor/Windsurf 主流场景）
- 实时文件监听（保持手动触发模式，增量分析由用户主动触发）
- VitePress 主题的夜间模式（后续迭代）
- Chat 引用特定段落追问（基于历史即可）

## Decisions

### D1: MCP Server 传输层 — stdio

**选择**: stdio（标准输入/输出）

**备选**: SSE/HTTP（Streamable HTTP）

**理由**: Cursor、Windsurf、Claude Code 等主流 IDE Agent 均通过 stdio 启动 MCP Server 进程。stdio 模式下 MCP Server 是一个独立进程，由 IDE 负责启动和管理，不需要用户手动配置端口。对于桌面应用场景，stdio 是最自然的集成方式。

**实现**: 新建 `src/mcp/server.ts`，使用 `@modelcontextprotocol/sdk` 的 `McpServer` + `StdioServerTransport`。MCP Server 进程需要知道 Sidecar 的 HTTP 端口（通过环境变量 `DEEPLENS_SIDECAR_PORT` 传递），以便内部调用 Sidecar API 完成实际搜索。

```
IDE (Cursor/Windsurf)
  │ stdio
  ▼
MCP Server 进程 (src/mcp/server.ts)
  │ HTTP (localhost)
  ▼
Sidecar HTTP Server (已有 Hono API)
```

### D2: MCP 工具实现 — 复用 Sidecar API

**选择**: MCP 工具内部通过 HTTP 调用 Sidecar 已有 API 端点

**备选**: 在 MCP Server 进程中直接引入 VectorStore/EmbeddingClient 等模块

**理由**: Sidecar 已持有 SQLite 连接和 VectorStore 实例，如果 MCP Server 进程也直接打开同一个 SQLite 数据库，会产生锁竞争。通过 HTTP 调用 Sidecar，复用已有的 `/api/search`、`/api/investigate` 端点，零重复代码，且 Sidecar 负责所有状态管理。

**工具映射**:

| MCP Tool | Sidecar API | 说明 |
|----------|-------------|------|
| `get_architecture_map` | `GET /api/outline?projectPath=...` | 返回知识大纲 JSON |
| `consult_knowledge_base` | `POST /api/search` | 内部收集完整 SSE 流后返回文本 |
| `investigate_implementation` | `POST /api/investigate` | 内部收集完整 SSE 流后返回文本 |
| `visualize_data_flow` | 新增 `POST /api/visualize` | 调用 OpenRouter LLM 生成 Mermaid |

MCP 工具需要将 SSE 流消费完毕后返回纯文本结果（MCP 工具返回值是同步的）。

### D3: Git 增量分析 — 基于 outline 溯源

**选择**: `git diff --name-only <last-commit>` → 匹配 outline 中 domain.files → 仅重生成受影响 domain

**流程**:

```
1. 读取 .deeplens/last_analyzed_commit (上次分析时的 commit SHA)
2. git diff --name-only <last_commit>..HEAD → changedFiles[]
3. 对每个 domain, 检查 domain.files 是否与 changedFiles 有交集
4. affectedDomains = 有交集的 domain 列表
5. 对 affectedDomains 逐个调用 runGenerator (单 domain 模式)
6. 删除旧 chunk (store.deleteBySource) → 重新向量化新文档
7. 更新 .deeplens/last_analyzed_commit = HEAD
```

**关键设计**: `runGenerator` 需要支持"单 domain 模式"——当前它遍历整个 outline 的 knowledge_graph，需要增加一个 `domainFilter?: string[]` 参数，只生成指定 domain 的文档。

### D4: VitePress 自定义主题 — 橙色系 + DeepWiki 布局

**选择**: 在 `.vitepress/theme/` 下创建自定义主题，继承默认主题并覆盖 CSS 变量

**方案**:
- `scaffold.ts` 生成 `.vitepress/theme/index.ts`（注册自定义主题）和 `.vitepress/theme/custom.css`（CSS 变量覆盖）
- 主色调映射：VitePress 的 `--vp-c-brand-*` 系列变量 → DeepLens 橙色系 `#F97316`
- 首页处理：`config.mts` 中不设置 hero，`index.md` 内容为项目 Overview + 直接链接到第一个 domain
- 侧边栏：保持现有 `generateSidebar()` 逻辑，增加编号前缀（`1. Overview`, `2. Architecture`...）

**CSS 变量覆盖核心**:

```css
:root {
  --vp-c-brand-1: #F97316;  /* primary-500 */
  --vp-c-brand-2: #EA580C;  /* primary-600 */
  --vp-c-brand-3: #C2410C;  /* primary-700 */
  --vp-c-brand-soft: rgba(249, 115, 22, 0.14);
}
```

### D5: Chat 追问 — 最近 5 条历史

**选择**: 前端发送最近 5 条消息，后端直接传入 AI SDK `messages` 参数

**实现**:

前端 (`useChat.ts`):
- `sendMessage` 时，从当前 mode 的 messages 数组取最近 5 条（含 user + assistant）
- POST body 从 `{ query }` 改为 `{ query, messages: [...] }`
- `messages` 格式: `Array<{ role: "user" | "assistant", content: string }>`

后端 (`fast.ts` / `deep.ts`):
- 函数签名新增 `history?: Array<{ role: "user" | "assistant", content: string }>` 参数
- `streamText({ messages: [...history, { role: "user", content: query }] })`
- history 仅传 content（不传 reasoning/toolCalls），控制 token 开销

**为什么 5 条**: 5 条 ≈ 2-3 轮对话。Fast Search 没有 tool calling 开销，Deep Search 有 tool calling + reasoning，但最近 5 条历史的 content 总量通常在 2000-4000 token，加上 RAG context 和 tool results 总共不超过模型上下文窗口的 30%。

### D6: 多项目管理 — projects.json + 独立状态

**选择**: `~/.deeplens/projects.json` 作为项目注册表，每个项目的数据独立存储在 `<project>/.deeplens/` 下

**数据结构**:

```typescript
interface ProjectEntry {
  path: string;           // 绝对路径
  name: string;           // 项目名 (从 path 推导)
  lastAnalyzed?: string;  // ISO 时间戳
  lastCommit?: string;    // 上次分析时的 commit SHA
  status: "ready" | "analyzing" | "error";
}
```

**项目切换流程**:

```
AppHeader 下拉选择 Project B
  │
  ├─ 保存当前项目的 UI 状态到 Map<projectPath, UIState>
  ├─ setCurrentProject(projectB.path)
  ├─ 恢复 Project B 的 UI 状态 (如果有)
  └─ 加载 Project B 的 session (GET /api/session?projectPath=...)
```

**Sidecar 多项目支持**: Sidecar 本身已经是无状态的（每个 API 调用都带 `projectPath` 参数），VectorStore 按 `<project>/.deeplens/vectors.db` 路径打开。唯一需要改的是 VitePress 子进程管理——需要支持同时运行多个 VitePress dev server（每个项目一个，端口自动分配）。

### D7: visualize_data_flow 工具 — LLM 生成 Mermaid

**选择**: 新增 `POST /api/visualize` 端点，接受 `scenario` 和 `detail_level` 参数，调用 OpenRouter LLM 生成 Mermaid 图

**实现**:
- 从 outline 中提取相关 domain 信息作为上下文
- 使用 RAG 检索相关代码片段
- 构建 prompt 要求 LLM 输出 Mermaid 格式的数据流图
- 返回 Mermaid 源码字符串

## Risks / Trade-offs

### R1: MCP Server 进程生命周期
**风险**: MCP Server 是独立进程（stdio），依赖 Sidecar HTTP Server 运行。如果 Sidecar 未启动或崩溃，MCP 工具调用会失败。
**缓解**: MCP 工具内部对 Sidecar HTTP 调用做超时 + 重试 (3次, 1s/2s/4s)；失败时返回清晰的错误消息告知用户需要先启动 DeepLens 应用。

### R2: Git 增量分析的准确性
**风险**: 文件变更可能影响未直接关联的 domain（跨模块依赖），导致部分文档过时。
**缓解**: 增量分析输出变更影响摘要，提示用户检查相关 domain；保留"全量重新分析"作为兜底选项。

### R3: 多 VitePress 实例资源占用
**风险**: 每个项目一个 VitePress dev server 子进程，多项目时内存占用增加。
**缓解**: 只启动当前活动项目的 VitePress；切换项目时关闭前一个的 dev server。同一时刻最多一个 VitePress 进程。

### R4: Chat 历史 token 膨胀
**风险**: 5 条历史消息 + RAG context + tool results 可能接近模型上下文限制。
**缓解**: 历史消息只传 content（不含 reasoning/toolCalls）；如果总 token 超限，从最旧的历史开始裁剪。

### R5: 静态站点导出时 Mermaid 渲染
**风险**: `vitepress build` 在 SSR 模式下渲染 Mermaid 图需要额外配置。
**缓解**: 现有 `vitepress-plugin-mermaid` 已支持 SSR 构建，只需确保 `package.json` 中版本锁定正确。

## Open Questions

- Q1: `visualize_data_flow` 是否需要支持用户指定输出格式（Mermaid vs PlantUML），还是统一 Mermaid？**倾向统一 Mermaid**，与现有文档生成一致。
- Q2: 增量分析是否需要支持"预览模式"（只显示影响范围，不实际重生成），让用户确认后再执行？
- Q3: 多项目的 VitePress 端口分配策略——固定偏移（base + projectIndex）还是完全随机可用端口？
