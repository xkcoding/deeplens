# DeepLens

DeepLens 是一个基于 Claude Agent SDK 的代码深度分析与文档生成工具。Phase 1 为纯 CLI 模式。

## 技术栈

- **语言**: TypeScript (ESM)
- **Agent SDK**: `@anthropic-ai/claude-agent-sdk` — 通过 `query()` V1 API 驱动 Agent Loop
- **CLI 框架**: Commander.js
- **Schema 校验**: Zod
- **文档站**: VitePress (npx 方式启动)
- **配置**: dotenv (.env 文件)

## 核心架构决策

- **D1**: 使用 `query()` V1 API，不用 V2 Session API（unstable）
- **D2**: 禁用所有 SDK 内置工具 (`tools: []`)，仅注入自定义 MCP Tools
- **D3**: 两阶段 Agent 调用 — 探索 Agent ("Code Archaeologist") + 生成 Agent ("Deep Writer")，各自独立 System Prompt
- **D5**: Zod Schema 严格校验 Agent 输出的 JSON 大纲
- **D6**: 文档输出到 `<project>/.deeplens/` 目录
- **D7**: 流式事件处理，CLI 实时显示 Agent 进度

## 项目结构

```
src/
├── cli/           # Commander.js CLI 入口和命令
├── agent/         # Agent 核心逻辑 (explorer.ts, generator.ts, tools.ts)
├── tools/         # 自定义 MCP 工具实现 (list-files, read-file, etc.)
├── prompts/       # System Prompt 模板 (explorer.ts, generator.ts)
├── outline/       # 大纲 Schema 类型、解析器、CLI 审查
├── vitepress/     # VitePress 配置生成、sidebar、预览服务
└── config/        # .env 加载和验证
bin/
└── deeplens.ts    # CLI 可执行入口
```

## Agent SDK 使用模式 (TypeScript)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

// 自定义工具通过 MCP server 注入
const mcpServer = createSdkMcpServer({
  name: "deeplens",
  tools: [listFilesTool, readFileTool, /* ... */],
});

// query() 调用
for await (const message of query({
  prompt: "...",
  options: {
    systemPrompt: "...",
    tools: [],              // 禁用内置工具
    maxTurns: 20,
    mcpServers: { deeplens: mcpServer },
    permissionMode: "bypassPermissions",
  },
})) {
  // 处理流式事件
}
```

## 文件所有权（Agent Team 分工）

| 模块 | Owner | 文件 |
|------|-------|------|
| MCP 工具 + Server | tool-smith | `src/tools/*.ts`, `src/agent/tools.ts` |
| Agent 调用逻辑 | agent-architect | `src/agent/explorer.ts`, `src/agent/generator.ts` |
| Prompt + Schema | prompt-engineer | `src/prompts/*.ts`, `src/outline/types.ts`, `src/outline/parser.ts` |
| CLI + Config + VitePress + Review | shell-builder | `src/config/env.ts`, `src/outline/review.ts`, `src/vitepress/*.ts`, `src/cli/*.ts`, `bin/deeplens.ts` |
| 代码审查 + Git | reviewer | 只读角色，不修改源码，负责审查和 git 提交 |

## 规格文档

详细 spec 在 `openspec/changes/phase1-cli-agent-core/specs/` 下：
- `agent-tools/spec.md` — 5 个 MCP 工具的输入输出规格
- `exploration-agent/spec.md` — 探索 Agent 行为规格
- `outline-review/spec.md` — HITL 大纲审查规格
- `generation-agent/spec.md` — 生成 Agent 行为规格
- `vitepress-integration/spec.md` — VitePress 集成规格
- `cli-orchestrator/spec.md` — CLI 命令规格

设计决策在 `openspec/changes/phase1-cli-agent-core/design.md`。
