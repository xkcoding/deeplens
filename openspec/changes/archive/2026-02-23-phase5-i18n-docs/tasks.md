## 1. Generator 输出路径迁移

- [x] 1.1 修改 `src/prompts/generator.ts` — 所有 write_file 路径模板加 `en/` 前缀（`domains/{id}/` → `en/domains/{id}/`）
- [x] 1.2 修改 `src/prompts/overview.ts` — 输出路径从 `index.md` → `en/index.md`
- [x] 1.3 修改 `src/prompts/summary.ts` — 输出路径从 `summary.md` → `en/summary.md`
- [x] 1.4 修改 `src/agent/generator.ts` — `runGenerator()` 中 hub 检测路径匹配逻辑适配 `en/domains/` 前缀
- [x] 1.5 修改 `src/agent/generator.ts` — `runOverviewGenerator()` 和 `runSummaryGenerator()` 中 write_file 检测路径适配

## 2. 翻译 Agent 核心

- [x] 2.1 新建 `src/prompts/translator.ts` — 翻译 System Prompt，包含术语表提取指令、翻译规则（保留 Mermaid/代码块/内联代码）、输出路径规则（en/ → zh/）
- [x] 2.2 新建 `src/agent/translator.ts` — `runTranslator()` 函数，接受 Outline + projectRoot + onEvent + domainFilter 参数，调用 query() 执行翻译
- [x] 2.3 `runTranslator()` 中注册 MCP server（仅 read_file + write_file 工具），复用 `createGeneratorServer` 或创建精简版
- [x] 2.4 `runTranslator()` 实现 onEvent 事件分发（progress/thought/tool_start/doc_written），phase 标识为 "translate"
- [x] 2.5 `runTranslator()` 动态计算 maxTurns：(domainCount * 10 + 20) 基线

## 3. VitePress i18n 配置

- [x] 3.1 修改 `src/vitepress/scaffold.ts` — `buildVitePressConfig()` 重构为 `locales` 模式，包含 en/zh 两个 locale 配置
- [x] 3.2 修改 `src/vitepress/scaffold.ts` — `scaffoldVitePress()` 创建 `en/` 和 `zh/` 目录结构
- [x] 3.3 修改 `src/vitepress/sidebar.ts` — `generateSidebar()` 增加 `locale` 参数，链接路径加 `/{locale}/` 前缀
- [x] 3.4 修改 `src/vitepress/sidebar.ts` — 扫描目录从 `docsDir/domains/` 变为 `docsDir/{locale}/domains/`
- [x] 3.5 修改 sidebar 注入逻辑 — 分别生成 enSidebar 和 zhSidebar，注入到 config.mts 对应 locale 的 themeConfig 中

## 4. CLI 编排

- [x] 4.1 修改 `src/cli/index.ts` — analyze 命令阶段编号从 `[x/4]` 改为 `[x/6]`，拆分 overview/summary 为独立步骤
- [x] 4.2 修改 `src/cli/index.ts` — 在 summary 之后、VitePress scaffold 之前，新增 `[6/6] Translating documentation...` 阶段，调用 `runTranslator()`
- [x] 4.3 修改 `src/cli/index.ts` — VitePress scaffold 和 sidebar 注入调用适配新的 i18n 接口（传 locale 参数生成双语 sidebar）
- [x] 4.4 修改 `src/update/index.ts` — 增量更新流程中 `runGenerator()` 之后调用 `runTranslator()` 并传递 domainFilter
- [x] 4.5 修改 `src/update/index.ts` — 全量回退流程中在 summary 之后调用 `runTranslator()`

## 5. Sidecar API 适配

- [x] 5.1 修改 `src/api/routes/analyze.ts` — 补全 generate/overview/summary 阶段的 console.log（`[analyze] Starting generator/overview/summary...`）
- [x] 5.2 修改 `src/api/routes/analyze.ts` — summary 之后新增 translate phase：发送 `{ phase: "translate", status: "started" }` SSE 事件，调用 `runTranslator()`，新增 `[analyze] Starting translator...` 日志
- [x] 5.3 修改 `src/api/routes/analyze.ts` — VitePress scaffold 调用适配 i18n（双语 sidebar）
- [x] 5.4 修改 `src/api/routes/generate.ts` — 如有独立调用 path，适配 en/ 前缀
- [x] 5.5 修改 `src/api/routes/update.ts` — 增量更新 SSE 流中增加 translate phase 事件

## 6. 桌面端 UI 适配

- [x] 6.1 修改 `ui/src/components/ActivitySidebar.tsx` — `getPhaseSteps()` 新增第 6 步 "Translate"（index=5），调整 phase 判断逻辑
- [x] 6.2 修改 `ui/src/components/AppHeader.tsx` — 进度按钮处理 `phase === "translate"` 显示 "Translating..."
- [x] 6.3 修改 `ui/src/hooks/useAgentStream.ts` — 处理 `phase: "translate"` 的 progress 事件，更新 generateProgress 状态

## 7. 增量更新翻译

- [x] 7.1 确认 `runTranslator()` 的 domainFilter 参数传递链路：update/index.ts → runTranslator() → Prompt 中注入需翻译的 domain 列表
- [x] 7.2 增量更新时 Overview/Summary 翻译：英文 overview/summary 更新后，translator 同步翻译 zh/index.md 和 zh/summary.md
- [x] 7.3 向量索引路径适配：`VectorStore.deleteBySource()` 路径从 `domains/` 改为 `en/domains/`，中文文档不入索引

## 8. 验证与测试

- [ ] 8.1 端到端验证：对示例项目运行 `deeplens analyze`，确认 en/ 和 zh/ 双语文档均正确生成
- [ ] 8.2 VitePress 预览验证：启动 VitePress dev server，确认语言切换正常、双语 sidebar 链接正确
- [ ] 8.3 增量更新验证：修改源码后运行 `deeplens update`，确认仅受影响 domain 的中英文文档被重新生成
- [ ] 8.4 桌面端验证：通过 Tauri 应用运行 analyze，确认 ActivitySidebar 显示 6 步进度，Tauri 控制台打印全部阶段日志
