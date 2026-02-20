## 1. CoT Visualization Fix

- [x] 1.1 Remove `line-clamp-3` from ThoughtChainList ReasoningRow — ensure expanded reasoning shows full text without truncation
- [x] 1.2 Verify collapsed ThoughtChain header still shows summary ("Thought for X.Xs · N tools") correctly
- [x] 1.3 Verify tool duration display — spinner while running, duration badge (e.g. "1.2s") on completion, computed from `tool_start`/`tool_end` time delta

## 2. Chat Follow-up — Backend

- [x] 2.1 Update `fastSearch()` in `src/search/fast.ts` to accept optional `history` parameter (`Array<{ role, content }>`) and pass `messages: [...history, { role: "user", content: query }]` to `streamText()`
- [x] 2.2 Update `deepSearch()` in `src/search/deep.ts` to accept optional `history` parameter and pass combined messages to `streamText()`
- [x] 2.3 Update `POST /api/search` route to parse `messages` from request body and pass to `fastSearch()` (backward compatible — `messages` is optional)
- [x] 2.4 Update `POST /api/investigate` route to parse `messages` from request body and pass to `deepSearch()` (backward compatible)

## 3. Chat Follow-up — Frontend

- [x] 3.1 Update `useChat.ts` `sendMessage()` to extract the most recent 5 messages (user + assistant, content only) and include in request body as `{ query, messages }`
- [x] 3.2 Implement history sanitization — only include `content` field, strip reasoning, toolCalls, sources from assistant messages
- [x] 3.3 Verify Fast mode follow-up — send 2+ messages, confirm second message includes history and response references prior context
- [x] 3.4 Verify Deep mode follow-up — send 2+ messages, confirm Agent Loop has conversation context from history

## 4. VitePress Custom Theme

- [x] 4.1 Update `src/vitepress/scaffold.ts` to generate `.vitepress/theme/index.ts` that imports and extends VitePress default theme with custom CSS
- [x] 4.2 Create custom CSS template in scaffold — override `--vp-c-brand-1` (`#F97316`), `--vp-c-brand-2` (`#EA580C`), `--vp-c-brand-3` (`#C2410C`), `--vp-c-brand-soft` (rgba)
- [x] 4.3 Add sidebar active link color, code block accent, and badge color overrides to match orange palette
- [x] 4.4 Add DeepWiki-inspired layout refinements — content area max-width for wide screens, sidebar font size tuning, code block left accent border, mermaid diagram centering
- [x] 4.5 Update homepage `index.md` generation — remove hero layout, output project name as h1, summary, tech stack badges, and domain table of contents with links
- [x] 4.6 Update `src/vitepress/sidebar.ts` to add numeric prefixes to domain groups ("1. Authentication", "2. Data Access", etc.)
- [x] 4.7 Use `/ui-ux-pro-max` skill to design and polish the VitePress documentation site — evaluate overall visual harmony (typography, spacing, color contrast, responsive layout), generate refined CSS customizations beyond brand colors, and ensure the documentation site achieves a professional, production-quality appearance
- [x] 4.8 Verify VitePress renders correctly — orange brand colors, content-first homepage, numbered sidebar, readable layout on wide screens, polished visual design

## 5. Git Incremental Update — Core

- [x] 5.1 Create `src/update/` module with `diff.ts` — implement `getChangedFiles(projectRoot, lastCommit)` that runs `git diff --name-only <lastCommit>..HEAD` and returns file list
- [x] 5.2 Implement `traceImpact(changedFiles, outline)` in `src/update/impact.ts` — match changed files against outline domain `files` arrays, return affected/unchanged domain lists and untracked files
- [x] 5.3 Add `domainFilter?: string[]` parameter to `runGenerator()` in `src/agent/generator.ts` — when provided, only iterate and generate docs for the filtered domains
- [x] 5.4 Implement `runIncrementalUpdate(projectRoot, opts)` orchestrator in `src/update/index.ts` — read last_analyzed_commit, call getChangedFiles, traceImpact, selective runGenerator, delete old chunks via `VectorStore.deleteBySource()`, re-index new docs, update last_analyzed_commit to HEAD
- [x] 5.5 Handle edge cases: no `last_analyzed_commit` file → fall back to full analysis; empty diff → report "no changes" and exit; file not in any domain → list as "untracked change"

## 6. Git Incremental Update — Integration

- [x] 6.1 Add `deeplens update [project-path]` CLI command in `src/cli/index.ts` with `--full` flag support
- [x] 6.2 Add `POST /api/update` SSE route in `src/api/routes/update.ts` — emit `diff_start`, `diff_result`, `impact_summary`, per-domain `progress`/`section_ready`/`index_update`, and `done` events
- [x] 6.3 Register `/api/update` route in `src/api/sidecar-server.ts` (sidecar mode only)
- [x] 6.4 Add "Update" button in AppHeader UI (enabled when project has been analyzed) — call `POST /api/update` and render SSE events in Flow panel
- [ ] 6.5 Verify incremental flow end-to-end — modify a source file, run update, confirm only affected domain docs regenerated and vector index updated

## 7. Static Site Export

- [x] 7.1 Create `src/export/index.ts` — implement `buildStaticSite(docsDir, outputDir?)` that runs `npx vitepress build` as child process and optionally copies dist to outputDir
- [x] 7.2 Add `deeplens export [project-path]` CLI command with `--output <directory>` flag
- [x] 7.3 Add `POST /api/export` SSE route in `src/api/routes/export.ts` — emit `build_start`, `build_log`, `build_complete`, optional `copy_start`, and `done` events
- [x] 7.4 Register `/api/export` route in `src/api/sidecar-server.ts`
- [x] 7.5 Add "Export Site" button in AppHeader UI — enabled only when docs exist, triggers native directory picker via Tauri dialog, calls `POST /api/export`, shows success notification
- [ ] 7.6 Verify export — run export, confirm `.vitepress/dist/` contains valid static HTML site

## 8. MCP Server

- [x] 8.1 Install `@modelcontextprotocol/sdk` dependency
- [x] 8.2 Create `src/mcp/server.ts` — instantiate `McpServer` with `StdioServerTransport`, read `DEEPLENS_SIDECAR_PORT` env var for Sidecar HTTP base URL
- [x] 8.3 Implement `get_architecture_map` tool — call `GET /api/outline?projectPath=...` on Sidecar, return outline JSON as text
- [x] 8.4 Implement `consult_knowledge_base` tool — call `POST /api/search` on Sidecar, consume SSE stream, collect text-delta chunks, return assembled text
- [x] 8.5 Implement `investigate_implementation` tool — call `POST /api/investigate` on Sidecar, consume SSE stream, collect text-delta chunks, return assembled text
- [x] 8.6 Implement `visualize_data_flow` tool — call `POST /api/visualize` on Sidecar, return Mermaid source string
- [x] 8.7 Add timeout (30s) and retry (3 attempts, 1s/2s/4s backoff) for all Sidecar HTTP calls; return clear error message if Sidecar unreachable
- [x] 8.8 Add `deeplens mcp-server` CLI command with `--sidecar-port <number>` option
- [x] 8.9 Add `POST /api/visualize` endpoint in `src/api/routes/visualize.ts` — load outline, RAG retrieve relevant context, call LLM to generate Mermaid, return JSON response
- [x] 8.10 Register `/api/visualize` route in `src/api/sidecar-server.ts`

## 9. Multi-Project — Backend

- [x] 9.1 Create `src/projects/registry.ts` — implement `loadProjects()`, `registerProject()`, `updateProject()`, `removeProject()` operating on `~/.deeplens/projects.json`
- [x] 9.2 Define `ProjectEntry` type: `{ path, name, lastAnalyzed?, lastCommit?, status }`
- [x] 9.3 Hook into analysis pipeline — call `registerProject()` on analysis start (status: "analyzing"), call `updateProject()` on completion (status: "ready", lastAnalyzed, lastCommit)
- [x] 9.4 Add `GET /api/projects` route returning the projects list from `projects.json`
- [x] 9.5 Add `DELETE /api/projects` route accepting `{ path }` to remove a project from registry (does NOT delete `.deeplens/` directory)
- [x] 9.6 Register project routes in `src/api/sidecar-server.ts`

## 10. Multi-Project — Frontend

- [x] 10.1 Update `ProjectSelectionPage.tsx` — load projects from `GET /api/projects` on mount, display as cards with name, path, status badge, relative last analyzed time
- [x] 10.2 Handle empty project list — show welcome message with "Open Project" button only
- [x] 10.3 Implement project card click — set current project, load session, navigate to main view
- [x] 10.4 Add project removal — context menu or delete action on project card, call `DELETE /api/projects`, refresh list
- [x] 10.5 Add AppHeader project switcher dropdown — show current project name as trigger, dropdown lists all projects with status badges, selecting switches active project
- [x] 10.6 Implement project switch logic — save current project UI state to in-memory `Map<projectPath, UIState>`, load target project state (or fresh state if first visit), update VitePress preview to target project
- [x] 10.7 Verify independent project state — two projects with different analysis results show independent search results, VitePress docs, and event timelines

## 11. Settings & Config Integration

- [x] 11.1 Add MCP Server port field to Settings "General" tab — number input, default 3100, persisted as `general.mcp_port`
- [x] 11.2 Update Tauri `lib.rs` to pass `DEEPLENS_SIDECAR_PORT` environment variable to MCP Server process using the configured port
- [x] 11.3 Verify settings round-trip — set MCP port in UI → restart → value persisted and used by MCP Server process

## 11b. Settings Hierarchy — Global vs Project-level

- [x] 11b.1 Create `src/config/project-settings.ts` — `loadProjectSettings(projectPath)` reads `<project>/.deeplens/settings.json`, `saveProjectSetting(projectPath, key, value)` writes to it, `resolveConfig(envConfig, projectPath?)` merges project overrides onto global config
- [x] 11b.2 Define overridable keys list: `openrouter_llm_model`, `openrouter_embedding_model` — only these keys can be set per-project; all other keys (api_key, ports, base_url) are global-only
- [x] 11b.3 Add `GET /api/project-config?projectPath=...` and `POST /api/project-config` routes in `src/api/routes/project-config.ts` — returns/saves project-level settings
- [x] 11b.4 Update search/investigate route handlers to use `resolveConfig()` — when request includes `projectPath`, merge project settings before passing config to fastSearch/deepSearch
- [x] 11b.5 Update `GeneralSettings.tsx` — when `currentProject` is set, show "Project Overrides" section with overridable keys, each showing global default and optional project override; add "Reset to global" action per key
- [x] 11b.6 Register project-config routes in `sidecar-server.ts`

## 12. Verification

- [x] 12.1 Run `cd ui && npx tsc --noEmit` — TypeScript compilation passes with no errors
- [x] 12.2 Run `cd src-tauri && cargo check` — Rust compilation passes
- [ ] 12.3 End-to-end: Deep mode Q&A → ThoughtChain shows full reasoning (no truncation), follow-up question uses history context
- [ ] 12.4 End-to-end: Run analysis → VitePress preview shows orange theme, content-first homepage, numbered sidebar
- [ ] 12.5 End-to-end: Modify source file → incremental update → only affected domain regenerated → search returns updated content
- [ ] 12.6 End-to-end: Export static site → open `dist/index.html` in browser → renders correctly
- [ ] 12.7 End-to-end: Configure MCP Server in Cursor/Windsurf → call `get_architecture_map` and `consult_knowledge_base` → returns valid results
- [ ] 12.8 End-to-end: Open second project → switch between projects → each has independent state and search results
