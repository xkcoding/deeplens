## Why

DeepLens 当前仅生成英文文档。作为面向国际+国内开发者的工具，缺少中文文档支持限制了一半以上的目标用户群体。需要在文档生成流程中增加翻译阶段，并让 VitePress 站点支持中英文双语切换。

## What Changes

- 新增独立的翻译 Agent 阶段（`runTranslator`），在所有英文文档（Domains + Overview + Summary）生成完毕后执行
- 翻译前自动扫描全部英文文档，提取术语表，确保跨 Domain 术语一致性
- 英文文档目录从 `.deeplens/docs/` 迁移到 `.deeplens/docs/en/`，中文文档写入 `.deeplens/docs/zh/`
- VitePress config.ts 重构为 i18n 模式：双语 sidebar、语言切换导航、按语言独立路由
- CLI 和桌面端进度步骤统一为 6 步：Explore → Outline Review → Generate → Overview → Summary → Translate
- CLI `analyze` 命令阶段编号从 `[x/4]` 扩展为 `[x/6]`，`update` 命令同步增加翻译阶段
- 桌面端 UI ActivitySidebar 阶段步骤新增 `Translate`（index=5），AppHeader 进度按钮同步适配
- Sidecar API `analyze.ts` 路由增加 `phase: "translate"` 的 SSE progress 事件，并补全各阶段的 console.log（当前仅 explore 阶段有日志，generate/overview/summary 缺失）
- **BREAKING**: 文档输出目录结构变更（`/domains/` → `/en/domains/`），已有生成结果需重新生成

## Capabilities

### New Capabilities

- `translation-agent`: 独立翻译 Agent，负责术语表提取、逐 Domain 翻译、Overview/Summary 翻译，写入 `/zh/` 目录
- `vitepress-i18n`: VitePress i18n 配置生成，包括双语 sidebar、语言切换 UI、按语言路由

### Modified Capabilities

- `generation-agent`: 文档输出路径从 `/domains/` 变更为 `/en/domains/`，Overview/Summary 同理迁移到 `/en/`
- `vitepress-integration`: config.ts 从单语言重构为 i18n 模式，scaffold 需生成双语目录结构
- `cli-orchestrator`: analyze/update 命令增加翻译阶段编排，阶段编号统一为 6 步
- `ipc-protocol`: analyze SSE 事件流增加 `translate` phase，补全各阶段 console.log 日志，UI 侧进度状态机扩展
- `git-incremental-update`: 增量更新时同步触发变更 Domain 的中文翻译

## Impact

**代码变更**:
- `src/agent/generator.ts` — write_file 路径加 `/en/` 前缀
- `src/prompts/generator.ts`, `overview.ts`, `summary.ts` — Prompt 中的输出路径调整
- `src/agent/translator.ts` — 新增翻译 Agent 核心逻辑
- `src/prompts/translator.ts` — 新增翻译 System Prompt（含术语表注入）
- `src/vitepress/scaffold.ts` — i18n config 生成
- `src/vitepress/sidebar.ts` — 双语 sidebar 生成
- `src/cli/index.ts` — 阶段编号 [x/4] → [x/6]，与 UI 6 步统一，新增翻译阶段
- `src/update/index.ts` — 增量翻译编排
- `src/api/routes/analyze.ts` — 新增 `phase: "translate"` SSE 事件，补全 generate/overview/summary 阶段的 console.log
- `ui/src/components/ActivitySidebar.tsx` — 阶段步骤从 5 步扩展为 6 步，新增 Translate
- `ui/src/components/AppHeader.tsx` — 进度按钮适配 translate phase
- `ui/src/hooks/useAgentStream.ts` — 处理 translate phase 的 progress 事件

**依赖**:
- 无新增 npm 依赖（翻译使用 Claude Agent SDK 同一 query() API）

**用户影响**:
- 已有 `.deeplens/docs/` 目录结构不兼容，需重新运行 `deeplens analyze`
- 文档生成时间增加约 30-50%（翻译阶段）
- VitePress 预览站点 URL 从 `/domains/auth/` 变为 `/en/domains/auth/`
