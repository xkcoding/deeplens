## Why

Phase 1 完成了 "探索 → 生成 → 预览" 的文档生产流水线，但生成的文档是**静态的**——用户只能浏览，无法对话式提问。对于开发者日常工作（"这个接口怎么调用？""数据流是怎么走的？"），需要一个**智能问答引擎**，让文档从 "可读" 升级为 "可交互"。这是 DeepLens 区别于静态文档工具的核心价值。

## What Changes

- **新增 Embedding 管线**：接入 SiliconFlow Embedding API，将生成的文档 Markdown 和源码关键片段分块后向量化
- **新增本地向量存储**：基于 SQLite + sqlite-vec 实现轻量级向量数据库，支持相似度检索、增删管理
- **新增 Fast Search（Layer 1）**：文档 RAG 模式，检索文档向量库 → SiliconFlow LLM 生成结构化回答，响应快速
- **新增 Deep Search（Layer 2）**：基于 Vercel AI SDK 的 Agent Loop，SiliconFlow LLM 驱动多轮推理，可调用向量检索、文件读取、grep 搜索等工具深入代码细节
- **新增 Hono API 服务**：REST 接口层，统一暴露 Fast/Deep Search 能力，供前端 Chat UI 和后续 MCP 服务调用
- **新增 CLI 命令**：`deeplens index` 执行向量化索引，`deeplens serve` 启动 API + VitePress 联合服务

## Capabilities

### New Capabilities

- `embedding-pipeline`: 文档和源码的分块策略、SiliconFlow Embedding API 调用、批量向量化流程
- `vector-store`: SQLite + sqlite-vec 向量存储的初始化、索引、检索、增量更新接口
- `fast-search`: Layer 1 文档 RAG 查询——向量检索 → 上下文组装 → SiliconFlow LLM 生成回答
- `deep-search`: Layer 2 Agent Loop 查询——Vercel AI SDK 多轮推理，工具调用（向量检索、read_file、grep_search），CoT 流式输出
- `qa-api-server`: Hono REST API 服务，暴露 `/api/search`（Fast）和 `/api/investigate`（Deep）端点，流式 SSE 响应

### Modified Capabilities

（无需修改现有 Phase 1 specs 的行为规格）

## Impact

**新增依赖**：
- `hono` — 轻量 API 框架
- `@ai-sdk/openai-compatible` + `ai` — Vercel AI SDK（SiliconFlow OpenAI-compatible 接入）
- `better-sqlite3` + `sqlite-vec` — 本地向量存储
- SiliconFlow API（Embedding + LLM）— 需要用户配置 API Key

**新增目录结构**：
- `src/embedding/` — 分块器、Embedding 客户端、索引管线
- `src/vector/` — SQLite-vec 存储层
- `src/search/` — Fast Search 和 Deep Search 实现
- `src/api/` — Hono API 路由和中间件

**配置变更**：
- `.env` 新增 `SILICONFLOW_API_KEY`、`SILICONFLOW_BASE_URL`、`SILICONFLOW_EMBED_MODEL`、`SILICONFLOW_LLM_MODEL`
- `src/config/env.ts` 需要扩展以加载和验证新配置项

**CLI 变更**：
- 新增 `deeplens index <project-path>` 命令
- 新增 `deeplens serve [docs-path]` 命令
- 现有命令不受影响
