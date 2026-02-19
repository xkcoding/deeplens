## 1. 项目初始化

- [x] 1.1 初始化 Node.js + TypeScript 项目（package.json、tsconfig.json、.gitignore）
- [x] 1.2 安装核心依赖：`@anthropic-ai/claude-agent-sdk`、`commander`、`dotenv`、`zod`、`chalk`
- [x] 1.3 按 D4 设计创建目录结构：`src/{cli,agent,tools,prompts,outline,vitepress,config}`、`bin/`
- [x] 1.4 配置 TypeScript 编译（ESM 输出、路径别名）和 `bin/deeplens.ts` CLI 入口文件
- [x] 1.5 创建 `.env.example` 配置模板（ANTHROPIC_API_KEY、ANTHROPIC_BASE_URL）

## 2. 配置管理

- [x] 2.1 实现 `src/config/env.ts`：加载 `.env` 文件、验证 `ANTHROPIC_API_KEY` 必填、`ANTHROPIC_BASE_URL` 可选
- [x] 2.2 实现配置缺失时的友好错误提示（按 cli-orchestrator spec 要求）

## 3. 大纲 Schema 定义

- [x] 3.1 实现 `src/outline/types.ts`：用 Zod 定义完整的 Outline Schema（project_name、summary、detected_stack、knowledge_graph、ignored_files），包含 sub_concepts 递归类型
- [x] 3.2 实现 `src/outline/parser.ts`：从 Agent 输出文本中提取 JSON 并执行 Zod 校验，返回结构化结果或错误详情

## 4. Agent MCP Tools

- [x] 4.1 实现 `src/tools/list-files.ts`：接受 path + depth 参数，排除 .git/node_modules 等目录，返回树形结构
- [x] 4.2 实现 `src/tools/read-file.ts`：读取完整文件内容，拒绝二进制文件和超过 1MB 的文件
- [x] 4.3 实现 `src/tools/read-file-snippet.ts`：按 start_line + max_lines 读取文件片段，默认返回前 200 行
- [x] 4.4 实现 `src/tools/grep-search.ts`：跨项目搜索文本模式，返回匹配行及上下文（前后各 2 行）
- [x] 4.5 实现 `src/tools/write-file.ts`：仅允许写入 `.deeplens/docs/` 目录，自动创建父目录，拒绝路径穿越
- [x] 4.6 实现 `src/agent/tools.ts`：用 `createSdkMcpServer()` + `tool()` 将 6 个工具注册为 `deeplens` MCP server，输入校验使用 Zod schema（含 render_mermaid）

## 5. 探索 Agent

- [x] 5.1 编写 `src/prompts/explorer.ts`："Code Archaeologist" System Prompt 模板，包含采样策略指导（Survey → Anchor → Probe → Synthesize）、领域识别规则（3-8 个业务领域、保留项目原始命名）、噪声过滤规则、JSON 输出格式要求
- [x] 5.2 实现 `src/agent/explorer.ts`：调用 `query()` V1 API，传入 explorer prompt + MCP server（仅 4 个只读工具），设置 `tools: []` 禁用内置工具，配置 `maxTurns: 50`
- [x] 5.3 实现流式事件处理：遍历 message stream，实时打印工具调用（🔧 格式）和 Agent 推理过程
- [x] 5.4 实现输出解析与校验：提取 Agent 最终输出 → 解析 JSON → Zod 校验 → 失败时重试（最多 2 次，携带错误信息）→ 全部失败时保存原始输出并提示用户

## 6. 大纲审查（HITL）

- [x] 6.1 实现 `src/outline/review.ts` 大纲展示：将 JSON 大纲渲染为彩色终端树（域名 bold/cyan，文件路径 dim），显示每个域的文件数和描述
- [x] 6.2 实现用户确认流程：Accept（接受） / Edit（编辑后重新验证）/ Re-run（重新探索）/ Abort（中止）四选一交互
- [x] 6.3 实现大纲持久化：确认后保存到 `.deeplens/outline.json`，支持后续 `deeplens generate` 命令复用

## 7. 生成 Agent

- [x] 7.1 编写 `src/prompts/generator.ts`："Deep Writer" System Prompt 模板，包含 Hub-and-Spoke 文档结构要求、Mermaid 图表规范（通过 render_mermaid 工具保障语法正确性）、Smart Simplification 噪声过滤规则、交叉引用规则
- [x] 7.2 实现 `src/agent/generator.ts`：调用 `query()` V1 API，传入 generator prompt + 确认的大纲 JSON + MCP server（含 write_file + render_mermaid），按域顺序生成文档
- [x] 7.3 实现逐域进度追踪：每完成一个域打印进度（✓ Domain Name (3/7 domains complete)），中间结果即时写入磁盘（中断安全）
- [x] 7.4 实现 `architecture.md` 和 `index.md` 顶层文档生成（项目总览、技术栈、架构图、域索引表）

## 8. VitePress 集成

- [x] 8.1 实现 `src/vitepress/scaffold.ts`：在 `.deeplens/docs/` 下生成 `.vitepress/config.mts`（站点标题、Mermaid 插件支持、锁定 mermaid 版本）和 `package.json`
- [x] 8.2 实现 `src/vitepress/sidebar.ts`：扫描实际生成的文档目录自动生成 VitePress sidebar 配置（域 → 折叠组，Hub → 组索引，Spoke → 子项）
- [x] 8.3 实现 `src/vitepress/server.ts`：自动安装依赖、检测可用端口（从 5173 递增）、启动 `npx vitepress dev`、优雅处理 Ctrl+C 退出

## 9. CLI 命令串联

- [x] 9.1 实现 `src/cli/index.ts`：Commander.js 程序入口，注册 4 个子命令（analyze、explore、generate、preview）
- [x] 9.2 实现 `analyze` 命令：串联 探索 → HITL 审查 → 生成 → VitePress 预览 完整流程，支持 `--output <dir>` 和 `--no-preview` 参数
- [x] 9.3 实现 `explore` 命令：仅运行探索 Agent，输出大纲 JSON 到 `.deeplens/outline.json` 并打印摘要
- [x] 9.4 实现 `generate` 命令：从已有大纲 JSON 文件生成文档，先执行 Zod 校验，校验失败时显示错误并退出
- [x] 9.5 实现 `preview` 命令：启动 VitePress dev server，支持 `--port` 和 `--open` 参数，未找到文档目录时提示运行 `deeplens analyze`

## 10. 集成验证

- [x] 10.1 用当前 DeepLens 项目自身作为测试目标，运行 `deeplens explore .` 和 `deeplens generate` 端到端测试
- [x] 10.2 验证生成的文档结构：Hub-and-Spoke 文档完整、交叉引用链接正确、28 个 .md 文件覆盖 7 个域
- [x] 10.3 验证 VitePress 预览：站点正常启动、sidebar 结构正确、Mermaid 图表可渲染、Ctrl+C 优雅退出
