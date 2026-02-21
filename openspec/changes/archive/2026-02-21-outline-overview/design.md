## Context

当前 outline schema 只包含 `knowledge_graph`（domain 列表），没有项目级概览数据。生成的文档站首页是静态模板（项目名 + summary + domain 链接），缺少架构、技术栈角色、关键流程等鸟瞰信息。VitePress 没有 hero 页，`/` 默认就是内容页，自然承载 Overview。

此外，缺少一个项目级的总结页面来汇总跨域关注点、架构洞察和改进方向。分析期间操作按钮的隐藏/显示逻辑不够友好，进度条在 Overview/Summary 阶段丢失。

相关现有文件：
- `src/outline/types.ts` — outlineSchema（Zod）
- `src/prompts/explorer.ts` — Explorer Agent system prompt
- `src/prompts/generator.ts` — Generator Agent system prompt
- `src/prompts/overview.ts` — Overview Generator system prompt
- `src/agent/generator.ts` — 文档生成调用逻辑
- `src/vitepress/sidebar.ts` — sidebar 生成
- `src/vitepress/scaffold.ts` — VitePress 脚手架（含 telescope.svg）
- `ui/src/components/outline/OutlineEditor.tsx` — HITL 大纲编辑器
- `ui/src/components/AppHeader.tsx` — 顶部操作栏
- `ui/src/hooks/useAgentStream.ts` — SSE 事件处理和进度追踪

## Goals / Non-Goals

**Goals:**
- Explorer Agent 在探索阶段同时产出项目级 overview 数据（架构、技术栈角色、关键流程、目录结构）
- overview 数据作为 outline schema 的顶层必选字段
- HITL 编辑器中 overview 固定在顶部，可编辑但不可排序
- Generator 从 overview 数据生成 `index.md`（VitePress 首页），合并原有 `architecture.md` 的内容
- Overview prompt 新增 Quick Start 段，为新开发者提供入门导读
- VitePress sidebar 首项为 "Overview" 链接到 `/`
- 新增 Project Summary 结尾总结页（`summary.md`），由独立 sub-agent 在 overview 之后生成
- Summary 包含：At a Glance、Domain Recap、Cross-cutting Concerns、Architectural Insights、Potential Improvements
- HITL 编辑器中 summary 固定在底部，不可排序
- VitePress sidebar 末项为 "Summary" 链接到 `/summary`
- 分析期间操作按钮（Preview/Vectorize/Update/Export）改为 disabled 状态替代隐藏
- 进度条追踪 generate/overview/summary 三阶段
- Analyze 按钮显示具体阶段文案
- VitePress telescope.svg 与应用图标 logo.svg 路径同步

**Non-Goals:**
- 不改变 domain 级别的 hub-and-spoke 文档结构
- 不新增额外的导航层级或页面（Summary 与 Overview 同级）
- 不支持多 overview（每个项目只有一个）
- incremental update 模式不重新生成 overview/summary（仅 full fallback 时重新生成）

## Decisions

### D1: overview 作为 outline schema 顶层字段

**选择**: 在 `outlineSchema` 中新增 `overview` required 字段

```typescript
const overviewSchema = z.object({
  architecture: z.string(),        // 含 Mermaid 图
  tech_stack_roles: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })),
  key_flows: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  project_structure: z.string(),
});

export const outlineSchema = z.object({
  project_name: z.string(),
  summary: z.string(),
  detected_stack: z.array(z.string()),
  overview: overviewSchema,              // ← 新增
  knowledge_graph: z.array(domainSchema),
  ignored_files: z.array(...),
});
```

**理由**: overview 是项目级元数据，与 domain 列表平级，不应嵌套在 knowledge_graph 内。

**替代方案**: 放在 knowledge_graph 第一个元素作为特殊 domain → 语义混乱，domain schema 字段（files, sub_concepts）不适用于 overview。

### D2: 合并 architecture.md 到 index.md

**选择**: 不再生成独立的 `architecture.md`，所有架构内容进入 `index.md`

**理由**: VitePress 没有 hero 页，`/` 就是内容页。分开为 `index.md` + `architecture.md` 会导致内容重复（summary 出现两次，技术栈出现两次）。合并后 `index.md` 就是 Overview 页。

**替代方案**: 保留 `architecture.md` 作为独立页 → 与 `index.md` 内容高度重叠，用户困惑。

### D3: sidebar domain 标题直接链接到 hub

**选择**: VitePress sidebar 中 domain 标题自身可点击（通过 `link` 属性），不再在子项中放置冗余的 "Overview"

修复前:
```
1. Agent Core          ← 不可点击
   ├ Overview          ← 冗余入口
   ├ Explorer
   └ Generator
```

修复后:
```
Overview               ← 项目级，flat link to /
1. Agent Core          ← 可点击，进入 hub
   ├ Explorer
   └ Generator
...
Summary                ← 项目级，flat link to /summary
```

**理由**: 减少一层无意义缩进，sidebar 更紧凑。VitePress 原生支持 group 的 `link` 属性。

### D4: HITL 中 overview 固定顶部、summary 固定底部

**选择**: OutlineEditor 中 overview 作为独立 section 渲染在顶部，summary 作为独立 section 渲染在底部，均不注册为 `@dnd-kit` sortable item。

**理由**: overview 始终是第一项（对应 index.md），summary 始终是最后一项（对应 summary.md），允许排序会导致 sidebar 和 VitePress 路由不一致。

### D5: Explorer prompt 增量修改

**选择**: 在现有 Explorer system prompt 末尾追加 overview 生成指令，不重写整个 prompt。

指令要求 Agent 在探索完 domain 后，额外填充 `overview` 字段：
- `architecture`: 用 1-2 段文字描述高层架构 + 一个 Mermaid 组件图
- `tech_stack_roles`: 从 `detected_stack` 展开，每个技术说明具体角色
- `key_flows`: 识别 3-5 个最重要的用户/数据流
- `project_structure`: 描述目录布局的逻辑

**理由**: 探索阶段已经收集了足够信息，overview 只是对已知信息的结构化提炼，不需要额外工具调用。

### D6: Summary 作为独立 sub-agent

**选择**: 新增 `runSummaryGenerator()` 函数，使用独立 system prompt (`getSummaryPrompt`)，在 overview 生成完成后调用。

**理由**: Summary 需要读取 overview (index.md) 和所有 domain hub 文档来综合提炼，与 overview 生成逻辑分离，职责清晰。

**替代方案**: 在 overview prompt 中同时生成 summary → overview 已经够复杂，合并会导致 prompt 过长且输出质量下降。

### D7: 按钮 disabled 替代隐藏

**选择**: Preview/Vectorize/Update/Export 按钮始终渲染，分析期间通过 `disabled` 属性置灰。

**理由**: 按钮隐藏后突然出现会让用户困惑，disabled 状态能让用户提前知道这些功能的存在。

### D8: generateProgress 增加 phase 字段

**选择**: `generateProgress` 类型从 `{ current, total }` 扩展为 `{ phase, current, total }`，追踪 generate/overview/summary 三阶段。

**理由**: 前端需要根据不同阶段显示不同文案（"Generating X/N..." / "Generating Overview..." / "Generating Summary..."），phase 字段避免了额外状态变量。

### D9: telescope.svg 与 logo.svg 同步

**选择**: `buildTelescopeSvg()` 使用与 `src-tauri/icons/logo.svg` 完全一致的 Lucide Telescope 路径。

**理由**: 原有 SVG 路径与应用图标不一致，用户在文档站看到的图标与桌面应用不同。

## Risks / Trade-offs

- **[Token 增加]** Explorer 输出变大（overview 约 500-1000 tokens）→ 在 maxTurns 范围内可接受，overview 数据是从已读文件的理解中提炼，不需要额外工具调用
- **[向后兼容]** 旧项目的 outline.json 没有 overview 字段 → Zod 解析会失败 → **缓解**: 在加载旧 outline 时用 `.safeParse()` + fallback 默认空 overview，或用 `.optional()` 标记
- **[HITL 复杂度]** overview 编辑器需要支持列表编辑（tech_stack_roles, key_flows）→ 用简单的 add/remove 控件，不过度设计
- **[Summary 额外延迟]** Summary sub-agent 增加约 1-2 分钟的分析时间 → 可接受，因为在 overview 之后执行，用户可以看到进度
- **[Summary 内容质量]** Summary 依赖 overview 和 domain docs 的质量 → 如果前面的文档生成质量好，summary 自然高质量
