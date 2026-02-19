## Context

Phase 1 已交付 CLI 文档生成流水线（探索 → 大纲审查 → 生成 → VitePress 预览）。Phase 2 在此基础上增加智能问答能力，让生成的文档变为可交互知识库。

当前项目状态：
- TypeScript ESM 项目，依赖 `@anthropic-ai/claude-agent-sdk`、`commander`、`zod`、`chalk`
- 文档输出在 `<project>/.deeplens/docs/`，由 VitePress 渲染
- 已有 5 个自定义 MCP Tools（list_files, read_file, read_file_snippet, grep_search, write_file）+ render_mermaid
- CLI 入口 `src/cli/index.ts`，配置管理 `src/config/env.ts`

Phase 2 核心约束：
- 保持纯 CLI/Node.js 模式，桌面 UI 在 Phase 3
- 使用 SiliconFlow API 做 Embedding + LLM 推理（成本优化，高频场景用便宜模型）
- 探索/生成仍用 Claude（Phase 1），Q&A 用 SiliconFlow（Phase 2）
- 本地存储，不依赖云端向量数据库

## Goals / Non-Goals

**Goals:**
- 实现文档和源码的向量化索引管线
- 提供 Fast Search（文档 RAG）和 Deep Search（Agent Loop）两层查询能力
- 通过 Hono API 暴露 REST 接口，支持流式 SSE 响应
- 新增 `deeplens index` 和 `deeplens serve` CLI 命令
- 确保与 Phase 1 现有功能兼容，不破坏已有命令

**Non-Goals:**
- 桌面 UI / 前端 Chat 界面（Phase 3）
- MCP Server 对外暴露（Phase 4）
- Git 增量更新索引（Phase 4）
- 多语言 AST 解析优化（后续迭代）

## Decisions

### D1: Embedding 模型选择 — Qwen/Qwen3-Embedding-8B

**选择**: `Qwen/Qwen3-Embedding-8B`（SiliconFlow 托管）
**替代方案**: `BAAI/bge-m3`（固定 1024 维，成本更低但上下文仅 8K），`bge-large-zh`（仅 512 token 上下文太短）

**理由**:
- 可变维度向量（默认 2048 维以获取最佳精度，可降至 1024/512 节省存储），为后续调优留空间
- 32768 token 上下文窗口，能容纳完整的大型源码文件和长文档片段，减少分块导致的语义割裂
- 支持指令感知 Embedding（Instruct prefix），可对 query 和 document 使用不同前缀提升检索精度
- 8B 参数量，MTEB 榜单排名优于 bge-m3，语义理解更强
- 多语言支持（中英文代码注释都能处理）

**指令前缀约定**:
- Document embedding: 不加前缀（直接嵌入原文）
- Query embedding: `"Instruct: Given a user question about a software project, retrieve the relevant documentation or code.\nQuery: {user_query}"`

### D2: 向量存储 — SQLite + sqlite-vec

**选择**: `better-sqlite3` + `sqlite-vec` 扩展
**替代方案**: `faiss-node`（性能更好但安装复杂），`chromadb`（需要单独服务），`lancedb`（生态不够成熟）

**理由**:
- 零外部服务依赖，纯文件存储，完美适配本地桌面应用场景
- `sqlite-vec` 支持 cosine distance、KNN 查询，性能在 10 万条以内完全够用
- 与未来 Phase 3 的 SQLite 配置存储可以共享同一个数据库文件
- better-sqlite3 是同步 API，简化了事务处理逻辑

**数据库位置**: `<project>/.deeplens/deeplens.db`，所有向量表和元数据表在同一文件中

**表设计**:
```sql
-- 文档向量表
CREATE VIRTUAL TABLE doc_chunks USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  embedding float[2048] distance_metric=cosine
);

-- 文档元数据表（非向量字段）
CREATE TABLE doc_chunk_meta (
  chunk_id INTEGER PRIMARY KEY,
  source_path TEXT NOT NULL,     -- 文档路径 (e.g., "domains/auth/index.md")
  source_type TEXT NOT NULL,     -- "doc" | "code"
  header_path TEXT,              -- 标题层级路径 (e.g., "## Auth > ### Login Flow")
  content TEXT NOT NULL,         -- 原始文本内容
  start_line INTEGER,
  end_line INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_chunk_source ON doc_chunk_meta(source_path);
CREATE INDEX idx_chunk_type ON doc_chunk_meta(source_type);

-- 索引状态表
CREATE TABLE index_status (
  source_path TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,       -- SHA-256，增量更新时比对
  chunk_count INTEGER NOT NULL,
  indexed_at TEXT DEFAULT (datetime('now'))
);
```

### D3: 分块策略 — 结构感知的 Markdown 分块

**选择**: Header-based splitting + recursive fallback
**替代方案**: Fixed-size sliding window（简单但破坏语义），Sentence-based（对代码块效果差）

**策略**:
1. **Markdown 文档**：按 H1/H2/H3 标题分割为语义完整的 section
2. **超长 section**：递归按 `\n\n`（段落）→ `\n`（行）进一步切分
3. **代码块保护**：\`\`\` 围栏内的代码块永远不拆分
4. **元数据保留**：每个 chunk 携带 `header_path`（如 "## Auth > ### Login Flow"）
5. **源码文件**：按函数/类级别分块（简单的行范围切分，不做 AST）

**参数**:
- 目标 chunk 大小：512 tokens（约 2000 字符）
- 最大 chunk 大小：1024 tokens
- 相邻 chunk 重叠：50 tokens

### D4: Q&A 推理引擎 — Vercel AI SDK + SiliconFlow

**选择**: `@ai-sdk/openai-compatible` + `ai` (Vercel AI SDK)
**替代方案**: 直接调用 OpenAI-compatible REST API（更轻量但缺少 Agent Loop），`langchain`（过重）

**理由**:
- `createOpenAICompatible()` 原生支持 SiliconFlow 的 OpenAI-compatible 接口
- 内置 Agent Loop（`maxSteps` / tool calling），Deep Search 需要多轮工具调用
- `streamText()` 提供标准的 streaming API，方便对接 SSE
- 统一的 `tool()` 定义，与 Phase 1 的 MCP tool 模式类似

**SiliconFlow 接入配置**:
```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const siliconflow = createOpenAICompatible({
  name: "siliconflow",
  apiKey: config.siliconflowApiKey,
  baseURL: config.siliconflowBaseUrl ?? "https://api.siliconflow.cn/v1",
});

// Embedding
const embedder = siliconflow.embeddingModel("Qwen/Qwen3-Embedding-8B");

// LLM (Q&A)
const llm = siliconflow.chatModel("deepseek-ai/DeepSeek-V3");
```

### D5: API 框架 — Hono

**选择**: `hono`
**替代方案**: `express`（笨重、非 TypeScript-first），`fastify`（较重），直接用 Node http（太底层）

**理由**:
- 极轻量，TypeScript-first，Web 标准 API（Request/Response）
- 内置 `streamSSE` helper，完美适配流式 Q&A 响应
- 与 Phase 3 的 Tauri Sidecar 架构兼容（Hono 可运行在多种 runtime）
- 需求文档已指定 Hono

**路由设计**:
```
POST /api/search        → Fast Search (文档 RAG)
POST /api/investigate   → Deep Search (Agent Loop)
GET  /api/status        → 索引状态
POST /api/index         → 触发索引（可选）
GET  /health            → 健康检查
```

### D6: Fast Search 流程设计

```
用户查询 → Embedding → 向量检索 (top-K) → 上下文组装 → LLM 生成回答 → 流式返回
```

1. 将用户 query 通过 Qwen3-Embedding-8B 转为向量（带 Instruct 前缀）
2. 在 `doc_chunks` 表中执行 KNN 查询，取 top-5 最相似的 chunk
3. 用 `doc_chunk_meta` 查出 chunk 的原文和元数据
4. 组装 system prompt（包含检索到的上下文片段）+ 用户 query
5. 调用 SiliconFlow LLM（`streamText`）流式生成回答
6. 通过 SSE 返回前端

### D7: Deep Search 流程设计

```
用户查询 → Agent Loop (LLM + 工具调用) → 多轮推理 → 流式返回
```

使用 Vercel AI SDK 的 `generateText` + `maxSteps` 实现 Agent Loop：
1. System prompt 指导 Agent 按需使用工具
2. 可用工具集：
   - `search_docs(query)` — 向量检索文档
   - `search_code(query)` — 向量检索源码
   - `read_file(path)` — 读取源码文件
   - `grep_search(pattern, path?)` — 搜索代码模式
3. Agent 自主决定调用哪些工具、调用几次
4. 每次工具调用结果回传给 LLM 继续推理
5. 最终输出结构化回答
6. `maxSteps: 10` 防止无限循环

**流式输出**：Deep Search 使用 `streamText` + SSE，实时输出：
- 工具调用事件（`tool_start` / `tool_end`）
- 思考过程文本（CoT）
- 最终回答文本

### D8: 配置管理扩展

扩展 `src/config/env.ts`，新增 SiliconFlow 相关配置：

```typescript
interface DeepLensConfig {
  // Phase 1 (已有)
  apiKey: string;           // ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN
  baseUrl?: string;         // ANTHROPIC_BASE_URL

  // Phase 2 (新增)
  siliconflowApiKey?: string;   // SILICONFLOW_API_KEY (Q&A 命令必填)
  siliconflowBaseUrl?: string;  // SILICONFLOW_BASE_URL (默认 https://api.siliconflow.cn/v1)
  siliconflowEmbedModel?: string; // SILICONFLOW_EMBED_MODEL (默认 Qwen/Qwen3-Embedding-8B)
  siliconflowLlmModel?: string;   // SILICONFLOW_LLM_MODEL (默认 deepseek-ai/DeepSeek-V3)
}
```

SiliconFlow 配置仅在 `index` 和 `serve` 命令中校验为必填，不影响 Phase 1 的 `explore` / `generate` / `preview` 命令。

### D9: 目录结构

```
src/
├── api/               # Hono API 服务
│   ├── server.ts      # Hono app 初始化和路由注册
│   ├── routes/
│   │   ├── search.ts  # POST /api/search (Fast Search)
│   │   ├── investigate.ts  # POST /api/investigate (Deep Search)
│   │   └── status.ts  # GET /api/status
│   └── middleware.ts   # CORS、错误处理
├── embedding/          # Embedding 管线
│   ├── chunker.ts      # Markdown/代码分块器
│   ├── client.ts       # SiliconFlow Embedding API 客户端
│   └── indexer.ts      # 索引编排（扫描文件 → 分块 → Embedding → 存储）
├── vector/             # 向量存储层
│   ├── store.ts        # SQLite-vec 初始化、CRUD、KNN 查询
│   └── schema.ts       # 建表 SQL 和迁移
├── search/             # 搜索引擎
│   ├── fast.ts         # Fast Search (Layer 1)
│   ├── deep.ts         # Deep Search (Layer 2)
│   └── tools.ts        # Deep Search 可用的工具定义
└── (existing modules)  # cli/, agent/, tools/, prompts/, outline/, vitepress/, config/
```

## Risks / Trade-offs

**[R1] sqlite-vec 原生模块安装** → better-sqlite3 和 sqlite-vec 都含 native addon，部分环境（尤其 Windows）可能编译失败
- **缓解**: 项目 README 注明 Node.js 版本要求，提供 prebuild 安装指引；Phase 3 Tauri 打包时用 `prebuildify`

**[R2] SiliconFlow API 稳定性** → 第三方 API 可能响应慢或不可用
- **缓解**: 请求超时（30s）+ 自动重试（3 次指数退避）；LLM 模型配置可切换（用户可换模型）

**[R3] Embedding 维度/模型变更** → 换模型或维度需要重建索引
- **缓解**: `index_status` 表记录模型信息和维度配置，检测到变更时提示用户重建；Qwen3-Embedding-8B 支持可变维度，减少因维度不匹配而重建的频率

**[R4] 大项目索引耗时** → 大量文件分块 + Embedding API 调用可能较慢
- **缓解**: 批量 Embedding（每批 20 个 chunk），进度条显示，增量索引（通过 file_hash 跳过未变更文件）

**[R5] Deep Search 成本** → Agent Loop 多轮调用消耗更多 token
- **缓解**: `maxSteps: 10` 限制循环次数；默认引导用户先用 Fast Search

**[R6] Hono 端口冲突** → API 服务端口可能与 VitePress 或其他服务冲突
- **缓解**: 复用 Phase 1 的端口检测逻辑（从 3000 递增），可通过 `--api-port` 参数自定义
