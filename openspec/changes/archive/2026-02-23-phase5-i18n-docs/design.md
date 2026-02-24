## Context

DeepLens 当前的文档生成管线为：`Explorer → Outline Review → Generator (Domains) → Overview → Summary → VitePress scaffold`。所有文档输出到 `.deeplens/docs/` 扁平目录，仅英文。VitePress 配置为单语言模式。

本次变更需要在现有管线末尾插入一个独立的翻译阶段，并将文档目录结构重组为 `/en/` 和 `/zh/` 双语布局，VitePress 配置升级为 i18n 模式。

**现有调用链**:
- `src/cli/index.ts` — CLI 编排，4 阶段 `[x/4]`
- `src/api/routes/analyze.ts` — Sidecar SSE 编排，4 个 phase（explore → generate → overview → summary）
- `src/agent/generator.ts` — 一次 `query()` 调用生成所有 Domain，Prompt 中路径为 `domains/{id}/index.md`
- `src/vitepress/scaffold.ts` — 生成 config.mts（单语言），`sidebar.ts` 生成 sidebar 数据

**关键约束**:
- Agent SDK `query()` V1 API，每次调用为独立会话
- Generator Prompt 中 `write_file` 路径硬编码为 `domains/{id}/...`
- VitePress config 通过 `SIDEBAR_PLACEHOLDER` 模板替换注入 sidebar

## Goals / Non-Goals

**Goals:**
- 生成管线末尾新增翻译阶段，全部英文完成后统一翻译
- 翻译前提取全局术语表，确保跨 Domain 术语一致性
- 文档目录从扁平结构迁移到 `/en/` + `/zh/` 双语布局
- VitePress 支持 i18n：语言切换、双语 sidebar、按语言路由
- CLI 和 UI 进度步骤统一为 6 步
- Sidecar 各阶段补全 console.log 日志

**Non-Goals:**
- 不支持英文/中文以外的语言（后续扩展）
- 不在 Generator Prompt 内嵌翻译逻辑（翻译完全独立）
- 不引入第三方翻译 API（使用 Claude Agent SDK 翻译）
- 不做 VitePress 搜索的多语言分词优化（依赖 VitePress 内置）

## Decisions

### D32: 翻译 Agent 架构 — 独立 `runTranslator()` 函数 + 专属 Prompt

**选择**: 新增 `src/agent/translator.ts`，暴露 `runTranslator()` 函数，模式与 `runGenerator()` / `runOverviewGenerator()` 一致

**替代方案**:
- A) 在 Generator Prompt 中嵌入翻译指令 → 拒绝：Prompt 已很复杂，职责混合影响两端质量
- B) 用 Node.js 代码调用翻译 API → 拒绝：Markdown 格式保持不如 Claude，且引入额外依赖

**理由**: 与现有 Agent 调用模式一致（query() + MCP tools + onEvent），复用事件处理、错误恢复等基础设施。翻译 Agent 仅需 `read_file` 和 `write_file` 两个工具。

### D33: 术语表提取策略 — Prompt 内指令 + 两阶段翻译

**选择**: 翻译 Agent 的 System Prompt 分两阶段工作：
1. **扫描阶段**: 读取所有英文文档，提取技术术语及其上下文，在 Agent 思考中建立术语映射表
2. **翻译阶段**: 逐 Domain 翻译，每次 write_file 前参照术语表确保一致性

**替代方案**:
- A) 预定义静态术语表 → 拒绝：无法覆盖项目特有术语
- B) 先用一次 query() 提取术语表输出为 JSON，再用另一次 query() 翻译 → 拒绝：两次调用间上下文断裂，且增加成本

**理由**: 在同一 query() 会话中完成术语提取和翻译，Agent 上下文连贯，术语表隐含在 Agent 的推理过程中，无需额外持久化。

### D34: 文档路径迁移策略 — Generator Prompt 路径前缀

**选择**: 修改 `src/prompts/generator.ts`、`overview.ts`、`summary.ts` 中的路径模板，加 `en/` 前缀：
- `domains/{id}/index.md` → `en/domains/{id}/index.md`
- `index.md` → `en/index.md`
- `summary.md` → `en/summary.md`

**替代方案**:
- A) 在 `write_file` 工具层拦截，自动加前缀 → 拒绝：隐式行为，Prompt 中的路径与实际不一致造成困惑
- B) 生成完后用脚本移动文件 → 拒绝：额外步骤，且中间状态不一致

**理由**: Prompt 是路径的 single source of truth，直接在 Prompt 中声明输出路径最清晰。改动量小（3 个 Prompt 文件的路径字符串）。

### D35: VitePress i18n 配置方案 — locales 配置 + 双语 sidebar

**选择**: 使用 VitePress 原生 `locales` 配置：

```typescript
defineConfig({
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: { sidebar: enSidebar, nav: [...] }
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: { sidebar: zhSidebar, nav: [...] }
    }
  }
})
```

**替代方案**:
- A) 使用 vitepress-i18n 第三方插件 → 拒绝：引入额外依赖，且 VitePress 原生已满足需求
- B) 两个独立 VitePress 站点 → 拒绝：维护成本翻倍，无法共享主题

**理由**: VitePress 原生 i18n 支持成熟，自动处理语言切换 UI、路由前缀、搜索隔离。`sidebar.ts` 需修改为接受 locale 参数，分别生成 `/en/` 和 `/zh/` 的 sidebar。

### D36: 翻译阶段进度追踪 — 复用现有 SSE 事件体系

**选择**: 翻译阶段复用 `progress`、`thought`、`tool_start`、`doc_written` 等现有 SSE 事件类型，新增 `phase: "translate"` 标识

**理由**: UI 侧 `useAgentStream.ts` 和 `ActivitySidebar.tsx` 已有成熟的事件处理逻辑，仅需扩展 phase 枚举值，无需新增事件类型。

### D37: 增量更新时的翻译策略 — 仅翻译受影响的 Domain

**选择**: `src/update/index.ts` 在增量更新时，通过 `domainFilter` 识别受影响的 Domain，翻译阶段仅翻译这些 Domain 的英文文档变更

**替代方案**:
- A) 增量更新时全量重新翻译 → 拒绝：不必要的成本浪费
- B) 对比中英文档 diff 决定是否翻译 → 拒绝：过度工程化

**理由**: 已有 `domainFilter` 机制标识变更的 Domain，翻译 Agent 接收同样的 filter，自然实现增量翻译。Overview 和 Summary 如果英文有更新则同步翻译。

### D38: CLI 阶段编号方案 — 6 步统一

**选择**: CLI 和 UI 统一为 6 步：

| 步骤 | CLI 显示 | UI Label | Sidecar phase |
|------|---------|----------|---------------|
| 1 | `[1/6] Running exploration agent...` | Explore | `explore` |
| 2 | `[2/6] Outline review` | Outline Review | `outline_review` |
| 3 | `[3/6] Generating documentation...` | Generate | `generate` |
| 4 | `[4/6] Generating overview...` | Overview | `overview` |
| 5 | `[5/6] Generating summary...` | Summary | `summary` |
| 6 | `[6/6] Translating documentation...` | Translate | `translate` |

**理由**: CLI 原来是 4 步（把 overview/summary 合并在 generate 里显示），UI 是 5 步。统一为 6 步后两端一致，用户体验更清晰。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 翻译 Agent 单次 query() 上下文窗口不足 | Domain 数量多时（>15），扫描全部英文文档 + 逐 Domain 翻译可能超出上下文 | `maxTurns` 按 Domain 数量动态计算；极端情况下分批翻译（Phase 1 先不实现分批） |
| 术语一致性在长会话后退化 | Agent 后半段可能忘记前半段建立的术语映射 | Prompt 中强调术语表优先级；翻译 Prompt 在每次 write_file 前提醒参照术语表 |
| BREAKING 目录结构变更 | 已有用户的 `.deeplens/docs/` 失效 | CLI analyze 时自动检测旧目录结构，提示需重新生成；不做自动迁移 |
| 翻译阶段增加整体耗时 | 用户等待时间增加 30-50% | 翻译阶段有独立进度显示（逐 Domain 完成度），用户可感知进展 |
| VitePress i18n 配置与现有主题冲突 | 样式可能需要适配 | locale 配置复用同一 theme，仅 sidebar/nav 不同，风险低 |

## Open Questions

- ~~翻译时机：逐 Domain 翻译 vs 全部完成后统一翻译~~ → 已决策：全部英文完成后统一翻译（方案 B）
- 是否需要支持用户跳过翻译阶段（`--skip-translate` flag）？建议后续按需添加
- 术语表是否需要持久化到文件供用户自定义？当前设计为 Agent 内部隐含，后续可扩展
