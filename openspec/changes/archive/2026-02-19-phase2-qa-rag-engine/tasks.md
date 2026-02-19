## 1. 项目基础设施

- [x] 1.1 安装新依赖：`better-sqlite3`、`sqlite-vec`、`hono`、`@hono/node-server`、`ai`、`@ai-sdk/openai-compatible` 及对应 `@types/*`
- [x] 1.2 扩展 `src/config/env.ts`：新增 `siliconflowApiKey`、`siliconflowBaseUrl`、`siliconflowEmbedModel`、`siliconflowLlmModel` 配置项，仅在 index/serve 命令中校验必填
- [x] 1.3 创建目录结构：`src/embedding/`、`src/vector/`、`src/search/`、`src/api/`、`src/api/routes/`

## 2. 向量存储层（vector-store）

- [x] 2.1 实现 `src/vector/schema.ts`：定义建表 SQL（`doc_chunks` vec0 虚拟表 **float[4096]**、`doc_chunk_meta` 元数据表、`index_status` 状态表）和索引
- [x] 2.2 实现 `src/vector/store.ts`：SQLite 数据库初始化，加载 sqlite-vec 扩展，创建表
- [x] 2.3 实现 chunk 插入方法：单条和批量插入，事务写入 `doc_chunks` + `doc_chunk_meta`（主键使用 BigInt）
- [x] 2.4 实现 chunk 删除方法：按 `source_path` 删除，事务操作两张表
- [x] 2.5 实现 KNN 搜索方法：接收 4096 维查询向量和 topK，支持 `source_type` 过滤，返回内容+元数据+距离分数
- [x] 2.6 实现 index_status CRUD：`getStatus()`、`upsertStatus()`，用于增量索引判断
- [x] 2.7 验证向量存储层：编译通过，手动测试建表、插入、查询流程

## 3. Embedding 管线（embedding-pipeline）

- [x] 3.1 实现 `src/embedding/chunker.ts` — Markdown 分块器：按 H1/H2/H3 标题切分，超长 section 递归按段落/行切分，保护 fenced code block，携带 header_path 元数据
- [x] 3.2 实现 `src/embedding/chunker.ts` — 源码分块器：按空行分割代码块，携带 source_path/start_line/end_line 元数据
- [x] 3.3 实现 `src/embedding/client.ts`：SiliconFlow Embedding API 客户端，使用 Vercel AI SDK `embed()`/`embedMany()`，支持 document/query 两种模式（query 加 Instruct 前缀），批量处理（每批 20），3 次指数退避重试
- [x] 3.4 实现 `src/embedding/indexer.ts`：索引编排器，扫描 `.deeplens/docs/` 和项目源码目录，SHA-256 增量判断，分块 → 嵌入 → 存储，进度显示
- [x] 3.5 验证 Embedding 管线：编译通过，用真实 SiliconFlow API Key 测试索引（67 files = 29 docs + 38 code）

## 4. 搜索引擎（fast-search + deep-search）

- [x] 4.1 实现 `src/search/fast.ts`：Fast Search 管线 — query embedding → KNN top-5 → 上下文组装（带 source_path/header_path 归因，超 24000 char 截断到 top-3）→ `streamText()` 流式生成
- [x] 4.2 编写 Fast Search system prompt：指导 LLM 基于上下文回答并引用来源
- [x] 4.3 实现 `src/search/tools.ts`：定义 Deep Search 的 4 个 Vercel AI SDK tool — `search_docs`、`search_code`、`read_file`、`grep_search`
- [x] 4.4 实现 `src/search/deep.ts`：Deep Search Agent Loop — `streamText()` + `stopWhen: stepCountIs(10)` + 4 个工具，流式输出 tool_start/tool_end/text-delta/done 事件
- [x] 4.5 编写 Deep Search system prompt：指导 Agent 多轮推理、按需调用工具、综合回答
- [x] 4.6 验证搜索引擎：编译通过，手动测试 Fast Search 和 Deep Search 端到端流程

## 5. Hono API 服务（qa-api-server）

- [x] 5.1 实现 `src/api/middleware.ts`：CORS 中间件（allow all origins）、全局错误处理中间件（500 不暴露堆栈、30s 超时返回 502）
- [x] 5.2 实现 `src/api/routes/search.ts`：`POST /api/search` 路由，校验 query 参数，调用 Fast Search，SSE 流式返回
- [x] 5.3 实现 `src/api/routes/investigate.ts`：`POST /api/investigate` 路由，校验 query 参数，调用 Deep Search，SSE 流式返回（含 tool_start/tool_end 事件）
- [x] 5.4 实现 `src/api/routes/status.ts`：`GET /api/status` 路由，返回 totalChunks/totalFiles/lastIndexed/embedModel
- [x] 5.5 实现 `src/api/server.ts`：Hono app 初始化，注册路由和中间件，`GET /health` 健康检查，端口自动检测（从指定端口递增）
- [x] 5.6 验证 API 服务：编译通过，启动服务后 curl 测试 /health、/api/status

## 6. CLI 命令集成

- [x] 6.1 实现 `deeplens index <project-path>` 命令：校验 SILICONFLOW_API_KEY，调用索引编排器，显示进度和完成摘要（文件数/chunk 数），支持 `--code` 选项
- [x] 6.2 实现 `deeplens serve [project-path]` 命令：校验 SILICONFLOW_API_KEY，同时启动 Hono API 服务和 VitePress 预览服务，支持 `--api-port` 和 `--docs-port` 参数，SIGINT/SIGTERM 双服务优雅关闭
- [x] 6.3 确保现有命令（explore/generate/preview/analyze）不受影响，Phase 1 功能回归验证

## 7. 端到端验证

- [x] 7.1 完整流程测试：`deeplens index .` → `deeplens index . --code` → `deeplens serve .` → curl /health → curl /api/status
- [x] 7.2 增量索引测试：重新 `deeplens index .`，验证全部 skipped (unchanged)
- [x] 7.3 `npx tsc --noEmit` 全项目编译通过

## 8. 测试期间修复（额外）

- [x] 8.1 修复向量维度：Qwen3-Embedding-8B 实际输出 4096 维（非 2048），更新 `schema.ts` float[4096]
- [x] 8.2 修复 vec0 主键类型：sqlite-vec 要求 BigInt 主键，`Number()` → `BigInt()`
- [x] 8.3 修复 vec0 向量绑定：直接传 `Float32Array`，不需要 `Buffer.from()`
- [x] 8.4 修复 docs 扫描混入 node_modules：scanDirectory 跳过 VitePress 产物目录
- [x] 8.5 分离 ignore 规则：docs 扫描用硬编码排除，code 扫描用 `.deeplensignore`（不读 `.gitignore`）
- [x] 8.6 添加 `ignore` npm 包支持 `.deeplensignore` 文件
- [x] 8.7 更新 `.env.example` 添加 Phase 2 SiliconFlow 配置项
