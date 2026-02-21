# DeepLens - 需求规格说明书

> **版本**: 1.1.0
> **日期**: 2026-02-22
> **状态**: 已确认
> **变更记录**: v1.1.0 — SiliconFlow 替换为 OpenRouter；更新路线图状态；新增 Phase 5/6/7

---

## 1. 产品定位

DeepLens 是一款桌面端 AI Agent 应用，定位为 **"前置介入的主动式代码架构师"**。

用户导入本地代码库后，DeepLens 通过 Claude Agent 自主探索代码结构，识别业务领域边界，生成按业务概念组织的深度文档站点（VitePress），并提供智能问答和 MCP 服务供外部 Coding Agent 调用。

### 1.1 核心价值

- **主动探索**：Agent 自主启动认知循环，像高级架构师一样探索代码
- **深度解读**：不是代码翻译，而是"聪明的简化"——提取业务逻辑、数据流和架构意图
- **概念重组**：文档按业务领域组织，打破文件目录的物理限制
- **双层查询**：文档优先（快速）+ 代码 RAG 兜底（深度），兼顾速度和精度
- **生态集成**：MCP 协议暴露给 Cursor/Windsurf 等外部 IDE Agent

### 1.2 差异化（对比 DeepWiki）

| 维度 | DeepWiki | DeepLens |
|------|----------|----------|
| 文档组织 | 文件目录映射 | 业务概念重组 |
| 分析深度 | 代码罗列 + 浅层描述 | 数据流分析 + 架构意图提取 |
| 可视化 | 基础类图 | 动态时序图/流程图 |
| 人工介入 | 无 | HITL 大纲审查 |
| 噪音处理 | 全量展示 | 聪明简化（业务优先） |
| 运行方式 | 云端 SaaS | 本地桌面应用 |

---

## 2. 技术架构

采用 **Tauri (Host) + Node.js (Sidecar)** 异构架构，参考 [WorkAny](https://github.com/workany-ai/workany) 的成熟模式。

### 2.1 技术栈

| 模块 | 选型 | 职责 |
|------|------|------|
| 桌面外壳 | **Tauri** (Rust) | 窗口管理、系统集成、外部二进制管理 |
| 前端 UI | **React** + Tailwind CSS | Manus 风格交互界面 |
| Node API | **Hono** (Node.js) | Agent 编排、API 服务，编译为独立二进制 |
| Agent 探索/生成 | **claude-agent-sdk** (TypeScript) | Claude Code CLI 编程接口，自主工具调用循环 |
| Agent 推理 | **Anthropic API** (Claude Sonnet/Opus) | 代码探索 + 文档生成（高质量推理） |
| Q&A Agent | **Vercel AI SDK** | 轻量 Agent Loop，OpenRouter LLM 推理 |
| Embedding | **OpenRouter** Embedding API | 文档 + 代码向量化（OpenAI-compatible 协议） |
| Q&A 推理 | **OpenRouter** LLM API | 日常问答推理（成本优化） |
| 向量存储 | **SQLite + sqlite-vec** | 本地轻量向量数据库 |
| 文档引擎 | **VitePress** | 静态站点生成 + 本地预览 |
| 语言支持 | Java / TypeScript / Python / Go | 优先支持主流语言，后续扩展 |

> **变更说明 (v1.1.0)**: Embedding 和 Q&A 推理从 SiliconFlow 切换为 OpenRouter。原因：SiliconFlow Embedding API 在实际接入中存在兼容性问题，OpenRouter 提供统一的 OpenAI-compatible 接口，模型选择更丰富（默认 Embedding: `qwen/qwen3-embedding-8b`，LLM: `qwen/qwen3-32b`）。

### 2.2 架构拓扑

```
┌──────────────────── Desktop App ────────────────────┐
│                                                      │
│  ┌──────────────┐        ┌────────────────────────┐ │
│  │  Tauri Shell │        │   React Frontend       │ │
│  │  (Rust)      │◄──────►│   Manus-style UI       │ │
│  │  - 窗口管理   │        │   - 思考流             │ │
│  │  - 系统集成   │        │   - 文档预览           │ │
│  │  - externalBin│        │   - 大纲编辑器         │ │
│  └──────┬───────┘        └────────────────────────┘ │
│         │                                            │
│         ▼ externalBin / Sidecar                      │
│  ┌─────────────────────────────────────┐            │
│  │  Node.js API Sidecar (Hono)        │            │
│  │                                     │            │
│  │  ┌───────────────────────────────┐  │            │
│  │  │ claude-agent-sdk (TS)         │  │  Anthropic │
│  │  │ → 自主探索 + 文档生成          │──────► API   │
│  │  │ → 自定义 MCP Tools            │  │  (Claude)  │
│  │  └───────────────────────────────┘  │            │
│  │                                     │            │
│  │  ┌───────────────────────────────┐  │            │
│  │  │ Vercel AI SDK                 │  │ Open-      │
│  │  │ → Fast Search (文档 RAG)       │──────► Router│
│  │  │ → Deep Search (代码 RAG +      │  │ (Embed +  │
│  │  │   Agent Loop + CoT)           │  │  LLM)     │
│  │  └───────────────────────────────┘  │            │
│  │                                     │            │
│  │  ┌───────────────────────────────┐  │            │
│  │  │ MCP Server (对外暴露)          │◄─── Cursor   │
│  │  └───────────────────────────────┘  │   Windsurf │
│  └──────────────┬──────────────────────┘            │
│                 │                                    │
│  ┌──────────────┴──────────────┐  ┌───────────────┐ │
│  │ SQLite + sqlite-vec         │  │ VitePress     │ │
│  │ 向量存储                     │  │ (子进程)      │ │
│  └─────────────────────────────┘  └───────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 2.3 成本模型

| 场景 | 频率 | 模型 | 成本 |
|------|------|------|------|
| 首次项目分析 + 文档生成 | 一次性 | Claude (Anthropic API) | 高 |
| Git 增量更新 | 偶尔 | Claude (Anthropic API) | 中 |
| 用户日常问答 (Fast/Deep) | 高频 | OpenRouter LLM | 低 |
| Embedding 向量化 | 一次性 + 增量 | OpenRouter Embedding | 极低 |

---

## 3. 核心工作流

### 3.1 Phase 1: 自主探索 (Agent-Driven Exploration)

**触发**: 用户选择项目文件夹

**执行者**: claude-agent-sdk (Claude 模型)

**Agent 行为**:
1. 读取 `README.md`、`package.json`（或等效文件）建立初步心智模型
2. 调用 `list_files` 探索目录结构
3. 采样 3-8 个关键文件（入口点、核心类、大型 Controller）
4. 识别 3-8 个核心业务领域（Domain），按"Ubiquitous Language"命名
5. 将源文件按逻辑归类到各 Domain（一个文件可属于多个 Domain）
6. 输出 JSON 格式的 **知识大纲 (Concept Map)**

**核心原则**:
- "Code is Truth, Structure is Deception" — 不跟随文件目录，按业务概念重组
- "Signal over Noise" — 忽略脚手架代码（config、test setup、lint 配置等）
- "80% 置信度即可停止" — 不需要读完所有文件，采样即可

**产出**: JSON 大纲，包含：
- `project_summary`: 项目摘要
- `detected_stack`: 识别的技术栈
- `knowledge_graph`: 领域划分 + 文件映射 + 归类理由
- `ignored_files`: 被过滤的噪音文件

### 3.2 Phase 2: HITL 架构审查

**交互方式**: 可视化树状大纲编辑器

**用户操作**:
- 检查 Agent 的模块分类是否准确
- 拖拽调整节点归属和层级
- 重命名模块/概念
- 确认 → 锁定为 **"知识骨架 (Knowledge Skeleton)"**

### 3.3 Phase 3: 深度生成 (Agent-Driven Deep Generation)

**执行者**: claude-agent-sdk (Claude 模型)

**策略**: Hub-and-Spoke 模式

**Agent 行为**（按骨架逐节点遍历）:
1. 读取当前节点关联的所有源码文件
2. 提取核心业务逻辑（过滤 logging、metrics、boilerplate 等噪音）
3. 生成 **Hub 文档（父文档）**:
   - 全局业务视角
   - 宏观数据流图（Mermaid 时序图/流程图）
   - 引用各 Spoke 子文档
4. 生成 **Spoke 文档（子文档）**:
   - 具体实现细节
   - 局部时序图
   - 互相引用（如"后续逻辑请参阅 AuthMiddleware"）
5. 写入 Markdown 文件到 VitePress 目录

**图表策略 — 聪明的简化 (Smart Simplification)**:
- 只画核心业务逻辑，隐藏技术实现细节
- 使用业务概念命名（如 `UserStrategy` 而不是 `AbstractUserStrategyImpl`）
- 过滤 Logger、Metrics、Connection Pool 初始化等非业务代码
- 侧重**动态行为**（数据如何流转），而非仅静态依赖

### 3.4 Phase 4: 索引 + 服务启动

**向量化**:
- 使用 OpenRouter Embedding API（默认模型 `qwen/qwen3-embedding-8b`）
- 文档 Markdown 分块 + 向量化 → SQLite-vec
- 源码关键 Chunk 分块 + 向量化 → SQLite-vec

**服务启动**:
- VitePress dev server（子进程）
- MCP Server（端口监听）
- Q&A API（Hono 服务）

### 3.5 运行态

#### Fast Search (Layer 1)
- 用户在 VitePress 页面内嵌 Chat 窗口提问
- 检索 VitePress 文档向量库
- OpenRouter LLM 生成结构化回答
- 响应快速，适合宏观问题

#### Deep Search (Layer 2)
- 用户切换到 Deep 模式
- 启动 **Vercel AI SDK Agent Loop**（OpenRouter LLM）
- Agent 可调用工具：向量检索、文件读取、grep 搜索
- 多轮推理，追踪引用，深入代码细节
- **Glass Box 体验**：CoT 思维链实时展示
- 适合具体实现细节问题

#### MCP 服务
- 外部 Coding Agent 通过 MCP 协议连接
- 工具集:
  - `get_architecture_map`: 获取模块全景
  - `consult_knowledge_base`: Layer 1 文档查询
  - `investigate_implementation`: Layer 2 代码深入
  - `visualize_data_flow`: 生成数据流图

### 3.6 更新机制（快照式）

**触发方式**: 手动（非实时监听）

**两种模式**:
1. **全量重新分析**: 重新走完 Phase 1 → 2 → 3 → 4
2. **Git 增量分析**:
   - 执行 `git diff` 识别变更文件
   - 溯源影响到的文档节点
   - 仅重写相关文档和图表
   - 更新向量索引

---

## 4. UI/UX 设计

### 4.1 交互风格

参考 **Manus** 的透明化思考体验。

### 4.2 布局

**三栏式布局**:

```
┌──────────┬────────────────────────┬──────────────────────┐
│ 左侧      │ 中间                    │ 右侧                 │
│ Navigation│ The Flow (思考流)        │ The Artifact (预览)   │
├──────────┼────────────────────────┼──────────────────────┤
│          │                        │                      │
│ 文档目录  │ Agent 思考日志:          │ VitePress 文档       │
│ 树状图    │                        │ 实时预览              │
│          │ > reading README.md... │                      │
│ ● 已完成  │ 🤔 "检测到 Spring Boot  │ ## 用户鉴权模块       │
│ ○ 生成中  │    项目结构..."         │                      │
│ ◦ 待生成  │ > scanning src/...     │ 本模块负责处理用户    │
│          │ 💡 "识别到 3 个核心      │ 认证和授权的完整      │
│          │    业务域..."           │ 流程...              │
│          │                        │                      │
│          │                        │ ```mermaid           │
│          │                        │ sequenceDiagram      │
│          │                        │ ...                  │
│          │                        │ ```                  │
│          │                        │                      │
│          │                        │ ┌──────────────────┐ │
│          │                        │ │ 💬 Chat (嵌入式)  │ │
│          │                        │ │ Fast │ Deep       │ │
│          │                        │ └──────────────────┘ │
└──────────┴────────────────────────┴──────────────────────┘
```

### 4.3 刷新策略

**块级刷新 (Block Refresh)**:
- Agent 写完一个完整 Section（含 Mermaid 图表）后，才触发前端更新
- 前端使用 DOM Diff 平滑插入，避免字符级跳动和布局抖动
- Section 生成中显示骨架屏 "Agent 正在撰写此章节..."

### 4.4 思考流事件协议

Node Sidecar → 前端的 IPC 事件格式:

```json
{"type": "thought", "content": "正在分析 Auth 模块..."}
{"type": "tool_start", "tool": "read_file", "args": {"path": "src/auth.ts"}}
{"type": "tool_end", "tool": "read_file", "duration_ms": 120}
{"type": "section_ready", "target_file": "docs/auth.md", "block_id": "section-auth-flow", "status": "completed"}
{"type": "progress", "completed": 3, "total": 8}
```

---

## 5. 设置与配置

### 5.1 设置界面

应用需要提供一个统一的设置界面，让用户配置所有外部服务的连接参数。

#### Claude Code / Agent SDK 配置

Claude Code 支持通过环境变量切换 API 端点和认证方式，使用户可以从 Anthropic 官方切换到国内的 Coding Plan 代理服务。DeepLens 必须在设置界面中暴露这些配置项：

| 配置项 | 环境变量 | 说明 |
|--------|---------|------|
| API Base URL | `ANTHROPIC_BASE_URL` | API 端点地址，默认 Anthropic 官方，可切换为国内代理 |
| API Key | `ANTHROPIC_API_KEY` | 认证令牌 |
| 模型选择 | `CLAUDE_CODE_USE_BEDROCK` / `CLAUDE_MODEL` | 指定使用的 Claude 模型（Sonnet/Opus 等） |

> **背景**: 国内用户可通过 Coding Plan 等方式获得 Claude API 访问，其端点 URL 与官方不同。DeepLens 需要让用户自由配置，而不是硬编码官方地址。

#### OpenRouter 配置

| 配置项 | 环境变量 | 说明 |
|--------|---------|------|
| API Base URL | `OPENROUTER_BASE_URL` | OpenRouter API 端点，默认 `https://openrouter.ai/api/v1` |
| API Key | `OPENROUTER_API_KEY` | OpenRouter 认证令牌 |
| Embedding 模型 | `OPENROUTER_EMBED_MODEL` | 向量化模型，默认 `qwen/qwen3-embedding-8b` |
| LLM 模型（Q&A 推理） | `OPENROUTER_LLM_MODEL` | 问答推理模型，默认 `qwen/qwen3-32b` |

> **变更说明 (v1.1.0)**: 从 SiliconFlow 切换为 OpenRouter。OpenRouter 提供统一的 OpenAI-compatible 接口，通过 `@ai-sdk/openai-compatible` 适配器接入 Vercel AI SDK。支持项目级覆盖模型配置（存储在 `.deeplens/settings.json`）。

#### 通用配置

| 配置项 | 说明 |
|--------|------|
| 项目存储路径 | 文档和向量索引的本地存储位置 |
| VitePress 端口 | 本地预览服务端口，默认自动分配 |
| MCP Server 端口 | 对外暴露的 MCP 服务端口 |

### 5.2 配置存储

- 配置持久化到本地 SQLite（与 WorkAny 一致）
- 敏感信息（API Key）加密存储（Tauri 端使用 AES-GCM + PBKDF2）
- 首次启动时引导用户完成必要配置（至少需要 Claude API 和 OpenRouter API 的 Key）
- 支持配置导入/导出（方便团队共享非敏感配置）

### 5.3 配置传递机制

```
设置界面 (React)
    │ Tauri IPC
    ▼
Rust 后端 → SQLite (持久化)
    │ 启动 Sidecar 时注入
    ▼
Node.js Sidecar
    ├─ claude-agent-sdk → 通过环境变量配置 (ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY)
    └─ Vercel AI SDK → 通过配置对象传递 (OpenRouter baseURL, apiKey, model)
```

---

## 6. MCP Server 接口定义

### 6.1 工具列表

```json
{
  "tools": [
    {
      "name": "get_architecture_map",
      "description": "获取项目的宏观架构地图。返回核心业务领域划分、模块间依赖关系。在任何具体查询前应先调用此工具建立上下文。",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "consult_knowledge_base",
      "description": "【Layer 1 - Fast】基于已生成的架构文档回答问题。适用于查询业务流程、核心概念、数据流向等宏观问题。响应快速，优先使用。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "具体的架构或业务问题"
          },
          "domain_filter": {
            "type": "string",
            "description": "（可选）限制在特定业务领域内搜索"
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "investigate_implementation",
      "description": "【Layer 2 - Deep】直接深入源代码进行实时分析。适用于文档未覆盖的细节、具体参数配置、边缘情况。成本较高，仅在 Layer 1 无法满足时使用。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "question": {
            "type": "string",
            "description": "需要代码级证据的具体问题"
          },
          "target_files": {
            "type": "array",
            "items": {"type": "string"},
            "description": "（可选）指定分析的文件路径列表"
          }
        },
        "required": ["question"]
      }
    },
    {
      "name": "visualize_data_flow",
      "description": "生成特定业务场景下的数据流图（Mermaid 格式）。帮助理解跨模块的交互逻辑。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "scenario": {
            "type": "string",
            "description": "业务场景描述，例如 '当用户发起退款请求时'"
          },
          "detail_level": {
            "type": "string",
            "enum": ["high_level", "detailed"],
            "description": "抽象级别"
          }
        },
        "required": ["scenario"]
      }
    }
  ]
}
```

---

## 7. 开发路线图（分层递进）

> 注：设置界面在 Phase 3（桌面应用）中实现，Phase 1 CLI 阶段通过环境变量或 `.env` 文件传递配置。

### Phase 1: CLI Agent 核心 ✅ 已完成

**目标**: 跑通 "选目录 → Agent 探索 → 大纲确认 → 深度生成 → VitePress 预览"

| 子任务 | 说明 | 状态 |
|--------|------|------|
| 1.1 项目脚手架 | Node.js + TypeScript (ESM) 项目，集成 claude-agent-sdk | ✅ |
| 1.2 自定义 MCP Tools | list_files, read_file, read_file_snippet, grep_search, write_file | ✅ |
| 1.3 探索 Agent | "Code Archaeologist" System Prompt，输出 JSON 大纲 | ✅ |
| 1.4 CLI 大纲审查 | 打印大纲 → 用户 CLI 交互确认/修改 | ✅ |
| 1.5 生成 Agent | "Deep Writer" System Prompt，Hub-and-Spoke 文档生成 | ✅ |
| 1.6 VitePress 集成 | 自动生成 VitePress 配置 + sidebar，本地启动预览 | ✅ |

### Phase 2: Q&A 引擎 + RAG ✅ 已完成

**目标**: 实现智能问答能力

| 子任务 | 说明 | 状态 |
|--------|------|------|
| 2.1 Embedding 管线 | OpenRouter Embedding API 接入，文档/代码分块+向量化 | ✅ |
| 2.2 SQLite-vec 存储 | 本地向量存储、检索、增删管理 | ✅ |
| 2.3 Fast Search | 文档 RAG → OpenRouter LLM 生成回答 | ✅ |
| 2.4 Deep Search | Vercel AI SDK Agent Loop，OpenRouter LLM + 工具调用 | ✅ |
| 2.5 Hono API 服务 | REST 接口供前端/MCP 调用 | ✅ |

### Phase 3: 桌面应用 (Tauri) ✅ 已完成

**目标**: 完整桌面体验

| 子任务 | 说明 | 状态 |
|--------|------|------|
| 3.1 Tauri 脚手架 | 参考 WorkAny 结构，Tauri + React | ✅ |
| 3.2 Sidecar 打包 | Node.js Sidecar 打包为 externalBin (pkg) | ✅ |
| 3.3 Manus 风格 UI | 三栏布局：目录树 + 思考流 + 文档预览 | ✅ |
| 3.4 HITL 大纲编辑器 | 可拖拽树状图，节点操作 | ✅ |
| 3.5 嵌入式 Chat | VitePress 页面内 Chat 窗口，Fast/Deep 切换 | ✅ |
| 3.6 CoT 展示 | Deep Search 思维链实时渲染 | ✅ |
| 3.7 设置界面 | Claude API + OpenRouter 配置（URL/Key/模型）、通用配置（端口/存储路径） | ✅ |

### Phase 4: MCP 服务 + 增量更新 ✅ 已完成

**目标**: 生态集成 + 持续更新

| 子任务 | 说明 | 状态 |
|--------|------|------|
| 4.1 MCP Server | 实现 MCP 协议，暴露 4 个工具 | ✅ |
| 4.2 Git 增量分析 | git diff → 影响分析 → 局部重生成 → 索引更新 | ✅ |
| 4.3 导出能力 | VitePress build → 静态站点导出 | ✅ |

### Phase 5-7: 见 `specs/requirements-v2.md`

---

## 8. 关键设计决策记录

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| D1 | 文档组织方式 | 按业务概念重组 | 避免 DeepWiki 式的文件目录映射 |
| D2 | 探索模式 | 全自动（README 为参考） | Agent 自主寻址，LLM 自行识别 |
| D3 | 纠错机制 | HITL 大纲审查 | 先出大纲 → 人工审查 → 再生成 |
| D4 | 文档结构 | Hub-and-Spoke | 父文档全局视角 + 子文档实现细节 |
| D5 | 图表策略 | 聪明简化 + 动态行为 | 业务优先，时序图/流程图，过滤噪音 |
| D6 | 同步机制 | 快照式（全量 + Git 增量） | 手动触发，避免持续消耗 |
| D7 | 问答入口 | 嵌入 VitePress 页面 | 上下文感知，类 DeepWiki 体验 |
| D8 | 搜索模式 | Fast (文档 RAG) + Deep (代码 RAG + Agent Loop) | 兼顾速度和深度 |
| D9 | Deep Search 可见性 | Glass Box (CoT 展示) | 建立用户信任 |
| D10 | UI 风格 | Manus 风格 | 思考流 + Artifact 预览 |
| D11 | 刷新策略 | 块级刷新 | 写完 Section 才渲染，避免字符级跳动 |
| D12 | 桌面框架 | Tauri (参考 WorkAny) | 轻量安装包，成熟参考实现 |
| D13 | Agent 引擎 | claude-agent-sdk (TypeScript) | Claude Code CLI 编程接口 |
| D14 | Agent 推理 | Claude (Anthropic API) | agent-sdk 原生支持 |
| D15 | Q&A Agent | Vercel AI SDK | 轻量 Agent Loop，OpenAI-compatible |
| D16 | Q&A/Embedding | OpenRouter | 成本优化，高频场景用便宜模型，OpenAI-compatible 协议统一 |
| D17 | 语言支持 | Java/TS/Python/Go 优先 | 主流语言先行 |
| D18 | MVP 策略 | 分层递进 | CLI → Q&A → Desktop → MCP |
| D19 | API 端点可配置 | 设置界面暴露 Base URL + Key | 支持国内 Coding Plan 代理，不硬编码官方地址 |
| D20 | 模型可选择 | Claude 模型 + OpenRouter 模型均可配置 | 用户按需选择性价比最优组合，支持项目级覆盖 |

---

## 9. 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| 大型代码库 Token 消耗 | 成本失控 | AST 预解析提取骨架，减少全文发送 |
| Agent 分类错误 | 文档结构不准确 | HITL 审查环节兜底 |
| VitePress 冷启动慢 | 用户体验差 | 预热机制 + HMR 热更新 |
| MCP 端口冲突 | 外部 Agent 无法连接 | 动态端口 + 配置导出 |
| claude-agent-sdk 版本兼容 | 升级可能 break | 锁定版本，跟踪 changelog |
| OpenRouter API 不稳定 | 问答功能受影响 | 错误重试（3 次指数退避）+ 降级提示 |
