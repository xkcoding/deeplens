## Context

DeepLens Phase 1 需要从零构建一个 CLI Agent 核心引擎，实现"选目录 → 探索 → 大纲审查 → 深度生成 → VitePress 预览"的完整流程。

核心技术约束：
- 使用 `@anthropic-ai/claude-agent-sdk` TypeScript 版本，通过 `query()` 函数驱动 Agent Loop
- Agent SDK 底层运行 Claude Code CLI，仅支持 Claude 模型（Anthropic API）
- 自定义工具通过 SDK 的 `createSdkMcpServer()` + `tool()` 注入，遵循 MCP 协议
- 用户可通过 `.env` 配置 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY`，兼容国内 Coding Plan 代理
- Phase 1 为纯 CLI 模式，无桌面 UI，无 Q&A，无 MCP 对外服务

## Goals / Non-Goals

**Goals:**
- 跑通从项目扫描到文档预览的完整 Agent 驱动流程
- 验证 claude-agent-sdk + 自定义工具的技术可行性
- 产出可复用的 Agent 工具集和 Prompt 模板
- 生成结构化的 Hub-and-Spoke 文档 + Mermaid 图表
- 支持通过环境变量配置 API 端点（兼容国内代理）

**Non-Goals:**
- 桌面 UI（Tauri）— Phase 3
- Q&A 引擎 / RAG / Embedding — Phase 2
- MCP 对外暴露服务 — Phase 4
- Git 增量分析 — Phase 4
- 多语言 Prompt 优化（先做通用，后续按语言微调）

## Decisions

### D1: 使用 `query()` V1 API 而非 V2 Session API

**选择**: 使用 `query()` 函数（V1 API）

**理由**:
- V2 Session API（`unstable_v2_createSession`）仍标记为 `unstable_`，API 可能变更
- 我们的场景是"单轮任务执行"（给 Agent 一个目标，它自主完成），而非"多轮对话"
- `query()` 更简单直接：传入 prompt + options → 迭代 message stream → 获取结果
- 探索和生成是两个独立的 `query()` 调用，无需跨轮保持会话状态

**替代方案**: V2 Session API — 适合 Phase 3 桌面应用中的交互式对话，但 Phase 1 不需要。

### D2: 禁用所有内置工具，仅使用自定义 MCP Tools

**选择**: `tools: []` + 自定义 `mcpServers`

**理由**:
- Agent SDK 内置的工具（Bash, Read, Edit 等）是面向通用编码任务的
- DeepLens 需要精确控制 Agent 可以做什么：只读文件、只写到输出目录
- 禁用内置工具防止 Agent 意外执行 shell 命令或修改用户代码
- 自定义工具可以添加访问控制（如限制写入路径在 `deeplens-docs/` 目录内）

**工具命名**: `mcp__deeplens__<tool_name>` 格式

### D3: 两阶段 Agent 调用，独立 System Prompt

**选择**: 探索和生成分为两次独立的 `query()` 调用，各自使用专门的 System Prompt

```
第一次 query(): 探索 Agent
  → systemPrompt: "Code Archaeologist"
  → 输入: 项目路径
  → 输出: JSON 知识大纲
  → 工具: list_files, read_file, read_file_snippet, grep_search

        ↓ 用户审查 (HITL) ↓

第二次 query(): 生成 Agent
  → systemPrompt: "Deep Writer"
  → 输入: 确认的知识骨架 JSON
  → 输出: Markdown 文件 + Mermaid 图表
  → 工具: read_file, read_file_snippet, grep_search, write_file
```

**理由**:
- 关注点分离：探索 Prompt 优化"归类准确性"，生成 Prompt 优化"文档深度"
- HITL 审查发生在两次调用之间，用户有机会修正大纲
- 各阶段可以使用不同的 `maxTurns` 控制成本（探索可以短，生成可以长）
- 便于独立调试和迭代 Prompt

### D4: 项目结构采用 monorepo 风格

**选择**: 单包 Node.js 项目，按功能目录组织

```
deeplens/
├── src/
│   ├── cli/                    # CLI 入口和命令定义
│   │   ├── index.ts            # commander 入口
│   │   ├── analyze.ts          # analyze 命令
│   │   └── preview.ts          # preview 命令
│   ├── agent/                  # Agent 核心逻辑
│   │   ├── explorer.ts         # 探索 Agent 编排
│   │   ├── generator.ts        # 生成 Agent 编排
│   │   └── tools.ts            # MCP Tools 注册
│   ├── tools/                  # 自定义工具实现
│   │   ├── list-files.ts
│   │   ├── read-file.ts
│   │   ├── read-file-snippet.ts
│   │   ├── grep-search.ts
│   │   └── write-file.ts
│   ├── prompts/                # System Prompt 模板
│   │   ├── explorer.ts         # Code Archaeologist prompt
│   │   └── generator.ts        # Deep Writer prompt
│   ├── outline/                # 大纲处理
│   │   ├── types.ts            # 大纲 JSON Schema 类型定义
│   │   ├── parser.ts           # Agent 输出解析
│   │   └── review.ts           # CLI 审查交互
│   ├── vitepress/              # VitePress 集成
│   │   ├── scaffold.ts         # 生成 VitePress 配置
│   │   ├── sidebar.ts          # 从大纲生成 sidebar
│   │   └── server.ts           # 启动 dev server
│   └── config/                 # 配置管理
│       └── env.ts              # .env 加载和验证
├── bin/
│   └── deeplens.ts             # CLI 可执行入口
├── package.json
├── tsconfig.json
└── .env.example                # 配置模板
```

**理由**:
- Phase 1 规模不大，单包即可，避免 monorepo 工具链开销
- 按功能目录组织（而非按类型），每个模块职责清晰
- `prompts/` 单独目录方便频繁迭代 Prompt 而不影响逻辑代码

### D5: 大纲 JSON Schema 严格类型化

**选择**: 使用 Zod 定义大纲 Schema，Agent 输出后进行校验

```typescript
// outline/types.ts
const OutlineSchema = z.object({
  project_name: z.string(),
  summary: z.string(),
  detected_stack: z.array(z.string()),
  knowledge_graph: z.array(z.object({
    id: z.string(),                    // kebab-case slug
    title: z.string(),                 // 人类可读标题
    description: z.string(),           // 模块职责描述
    reasoning: z.string(),             // Agent 归类理由
    files: z.array(z.object({
      path: z.string(),               // 源文件路径
      role: z.string(),               // 在此模块中的角色
    })),
    sub_concepts: z.array(z.lazy(() => SubConceptSchema)).optional(),
  })),
  ignored_files: z.array(z.object({
    path: z.string(),
    reason: z.string(),
  })),
});
```

**理由**:
- Agent 输出 JSON 不一定 100% 合规，Zod 校验提供安全网
- 类型定义同时作为 Prompt 中 `<output_format>` 的规范来源
- 前端（Phase 3 的大纲编辑器）可直接复用类型

### D6: VitePress 输出目录独立于源码

**选择**: 文档输出到 `<project>/.deeplens/` 或 `--output` 指定的目录

```
target-project/
├── src/                    # 用户源码（只读）
├── .deeplens/              # DeepLens 输出目录
│   ├── docs/               # 生成的 Markdown 文件
│   │   ├── index.md        # 首页
│   │   ├── architecture.md # 架构总览
│   │   └── domains/        # 按业务领域组织
│   │       ├── user-auth/
│   │       │   ├── index.md    # Hub 文档
│   │       │   ├── controller.md # Spoke 文档
│   │       │   └── middleware.md
│   │       └── order-processing/
│   │           ├── index.md
│   │           └── ...
│   ├── .vitepress/         # VitePress 配置
│   │   └── config.ts
│   ├── outline.json        # 确认的知识大纲
│   └── package.json        # VitePress 依赖
```

**理由**:
- 不污染用户项目根目录（只增加一个 `.deeplens/` 目录）
- `.deeplens/` 可以加入 `.gitignore`
- VitePress 配置和文档放在一起，`vitepress dev .deeplens/docs` 即可启动
- 用户也可以通过 `--output` 参数指定其他位置

### D7: 流式事件处理，CLI 实时显示 Agent 进度

**选择**: 遍历 `query()` 的 message stream，提取关键事件打印到终端

```typescript
for await (const message of query({ prompt, options })) {
  if (message.type === "assistant") {
    // 提取工具调用信息
    for (const block of message.message.content) {
      if (block.type === "tool_use") {
        console.log(`  🔧 ${block.name}(${JSON.stringify(block.input)})`);
      }
    }
  }
  if (message.type === "result" && message.subtype === "success") {
    // 最终结果
    return message.result;
  }
}
```

**理由**:
- 用户需要看到 Agent 在做什么（透明度 = 信任）
- Phase 1 CLI 用简单的 console.log，Phase 3 桌面应用替换为 IPC 事件流
- message stream 天然支持这种模式，无需额外抽象

### D8: CLI 框架选择 Commander.js

**选择**: `commander`

**命令设计**:
```
deeplens analyze <project-path>     # 完整流程：探索 → 审查 → 生成 → 预览
deeplens explore <project-path>     # 仅探索，输出大纲 JSON
deeplens generate <outline-path>    # 从已有大纲生成文档
deeplens preview [docs-path]        # 启动 VitePress 预览
```

**理由**:
- 拆分子命令方便开发调试（可以单独测试探索或生成）
- `analyze` 是"一键全流程"入口，串联其他子命令
- 后续可扩展 `deeplens update` (增量)、`deeplens serve` (MCP) 等

## Risks / Trade-offs

### R1: Agent 输出 JSON 格式不稳定
**风险**: 探索 Agent 可能输出非法 JSON 或不符合 Schema 的结构
**缓解**:
- Prompt 中明确要求 JSON 格式，提供完整的 Schema 示例
- Zod 校验 + 自动重试（最多 2 次，每次把错误信息反馈给 Agent）
- 最坏情况下提示用户手动编辑 `outline.json`

### R2: 大型项目 Token 消耗失控
**风险**: 探索阶段 Agent 读取太多文件，Token 消耗超出预期
**缓解**:
- Prompt 要求"采样策略"：不超过 5-8 个关键文件
- `read_file_snippet` 工具限制返回行数（默认 200 行）
- `maxTurns` 限制 Agent 最大循环轮次（探索阶段建议 15-20 轮）
- CLI 显示 Token 消耗估算（如果 SDK 暴露此信息）

### R3: 文档生成质量依赖 Prompt 调优
**风险**: 初版 Prompt 生成的文档可能不够"深"，或图表过于简单
**缓解**:
- 将 Prompt 作为独立文件（`prompts/`），便于快速迭代
- 提供 `--verbose` 模式查看完整的 Agent 思考过程
- 预留 Prompt 版本管理机制

### R4: Claude Code CLI 未安装或版本不兼容
**风险**: TypeScript SDK 需要系统安装 Claude Code CLI
**缓解**:
- 启动时检测 CLI 是否可用，给出安装指引
- 记录兼容的 CLI 版本范围
- `.env.example` 中提供完整配置示例

### R5: VitePress 需要额外安装
**风险**: VitePress 是 Node.js 工具，需要在目标项目的 `.deeplens/` 中安装
**缓解**:
- `deeplens analyze` 完成后自动在 `.deeplens/` 中初始化 `package.json` 并安装 vitepress
- 或者使用 `npx vitepress dev` 避免安装步骤
- 使用 `npx` 方案更轻量，优先采用
