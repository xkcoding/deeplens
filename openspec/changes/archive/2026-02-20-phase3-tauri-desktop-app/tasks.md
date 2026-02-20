## 1. Project Scaffolding & Build Infrastructure

- [x] 1.1 Initialize Tauri v2 project: run `npm create tauri-app` in project root, generate `src-tauri/` directory with `Cargo.toml`, `tauri.conf.json`, `src/main.rs`
- [x] 1.2 Create `ui/` directory with Vite + React + TypeScript scaffold: `index.html`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`
- [x] 1.3 Install and configure Tailwind CSS v4 in `ui/`
- [x] 1.4 Install shadcn/ui and initialize base components: Button, Dialog, Tabs, ScrollArea, Input, Select, DropdownMenu
- [x] 1.5 Configure `tauri.conf.json`: window settings (1440x900 default, 1024x768 min), CSP (`connect-src 'self' http://localhost:*`), `bundle.externalBin` registration
- [x] 1.6 Add `tauri-plugin-shell` and `tauri-plugin-dialog` to Rust dependencies and register in `main.rs`
- [x] 1.7 Configure `src-tauri/capabilities/default.json` with `shell:allow-spawn`, `shell:allow-execute`, `dialog:allow-open` permissions
- [x] 1.8 Update root `package.json` with build scripts: `dev` (concurrent Vite + Tauri dev), `build` (production build), `build:sidecar`, `pkg`, platform-specific `pkg:*` variants

## 2. Sidecar Packaging (spec: sidecar-packaging)

- [x] 2.1 Create `src/sidecar/index.ts` entry point: parse `--port` argument, call `loadConfig()`, start Hono server in sidecar mode
- [x] 2.2 Add esbuild config/script for sidecar bundling: `platform: "node"`, `format: "cjs"`, externalize `better-sqlite3` and `sqlite-vec` native modules, output to `dist/bundle.cjs`
- [x] 2.3 Install `@yao-pkg/pkg` and configure `package.json` `"pkg"` field for native module asset bundling
- [x] 2.4 Create `scripts/rename-sidecar.js`: read `rustc --print host-tuple`, rename pkg output to `src-tauri/binaries/deeplens-sidecar-{triple}`
- [x] 2.5 Add `POST /api/shutdown` endpoint to Hono server: close VectorStore, kill VitePress subprocess, stop HTTP server, `process.exit(0)`
- [x] 2.6 Verify end-to-end sidecar build: `npm run build:sidecar && npm run pkg` produces working binary, binary starts and responds to `GET /health`

## 3. Tauri Shell — Sidecar Lifecycle (spec: tauri-shell)

- [x] 3.1 Implement `SidecarState` Rust struct with `Mutex<Option<CommandChild>>` and register as Tauri managed state
- [x] 3.2 Implement sidecar spawn logic in `setup()`: call `app.shell().sidecar("deeplens-sidecar")` with `--port` argument, store `CommandChild` in state
- [x] 3.3 Implement health check polling: async loop calling `GET http://localhost:{port}/health` every 500ms, timeout after 10s, emit `sidecar-ready` or `sidecar-fatal` event
- [x] 3.4 Implement stdout/stderr forwarding: consume `CommandEvent::Stdout`/`Stderr` from sidecar rx channel, emit as Tauri events for debugging
- [x] 3.5 Implement crash recovery: on `CommandEvent::Terminated`, retry spawn with exponential backoff (2s/4s/8s), max 3 retries, emit `sidecar-fatal` on exhaustion
- [x] 3.6 Implement graceful shutdown in `RunEvent::Exit`: send `POST /api/shutdown`, wait 5s, fallback `child.kill()`
- [x] 3.7 Implement `check_sidecar_status` Tauri command: return `{ running: bool, port: Option<u16> }`
- [x] 3.8 Implement native file picker: Tauri command using `tauri-plugin-dialog` to open directory selection dialog

## 4. Configuration & Encryption (specs: settings-management, tauri-shell)

- [x] 4.1 Implement AES-256-GCM encryption in Rust: derive key from machine UUID + random salt via PBKDF2, expose `encrypt_value` and `decrypt_value` Tauri commands
- [x] 4.2 Create `~/.deeplens/global.db` SQLite database with `config` table (`key TEXT PRIMARY KEY, value TEXT NOT NULL`)
- [x] 4.3 Implement `save_config` Tauri command: encrypt sensitive keys (API keys) before storage, store others as plaintext
- [x] 4.4 Implement `load_all_config` Tauri command: read all config, decrypt sensitive values, return as JSON object
- [x] 4.5 Implement config injection at sidecar spawn: read config from `global.db`, decrypt API keys, set as environment variables on the spawn command
- [x] 4.6 Add `POST /api/reload-config` endpoint to sidecar: re-read `process.env` and update in-memory `DeepLensConfig`

## 5. IPC Protocol & Pipeline Endpoints (specs: ipc-protocol, cli-orchestrator)

- [x] 5.1 Add `deeplens sidecar [project-path] [--port]` command to Commander.js CLI in `src/cli/index.ts`
- [x] 5.2 Create `src/api/routes/explore.ts`: `POST /api/explore` endpoint using `streamSSE`, wrap `runExplorer()` and emit `thought`/`tool_start`/`tool_end`/`outline_ready` events
- [x] 5.3 Create `src/api/routes/generate.ts`: `POST /api/generate` endpoint using `streamSSE`, wrap `runGenerator()` and emit `thought`/`tool_start`/`tool_end`/`section_ready`/`progress`/`done` events
- [x] 5.4 Create `src/api/routes/analyze.ts`: `POST /api/analyze` full pipeline endpoint — explore → emit `outline_ready` + `waiting` → await `outlineConfirmed` Promise → generate → index → `done`
- [x] 5.5 Create `src/api/routes/outline.ts`: `GET /api/outline` (return current outline or 404) and `POST /api/outline/confirm` (validate with Zod, resolve waiting Promise)
- [x] 5.6 Refactor `src/agent/explorer.ts` to accept an event emitter callback instead of writing directly to `process.stdout`, enabling both CLI and SSE output modes
- [x] 5.7 Refactor `src/agent/generator.ts` to accept an event emitter callback for dual CLI/SSE output
- [x] 5.8 Register pipeline routes conditionally: only mount `/api/explore`, `/api/generate`, `/api/analyze`, `/api/outline` when started via `deeplens sidecar`
- [x] 5.9 Add `POST /api/reload-config` route implementation
- [x] 5.10 Update `src/outline/review.ts`: add sidecar mode with Promise-based waiting mechanism alongside existing CLI mode

## 6. React Frontend — Layout & Navigation (spec: manus-ui-layout)

- [x] 6.1 Create `ThreePanelLayout` component: resizable three-panel layout with Navigation (left), Flow (center), Artifact (right) panels using CSS Grid or Flexbox + drag handles
- [x] 6.2 Implement panel resize logic with minimum widths (Navigation: 200px, Flow: 300px, Artifact: 400px)
- [x] 6.3 Create `NavigationPanel` component: tree view of documentation structure with collapsible domain groups, status indicators (completed/generating/pending)
- [x] 6.4 Create `FlowPanel` component: scrollable container for Agent event stream with auto-scroll and "Jump to latest" button
- [x] 6.5 Create `ArtifactPanel` component: iframe container for VitePress preview with loading skeleton
- [x] 6.6 Create `ProjectSelectionPage`: welcome page with project list (`~/.deeplens/projects.json`), "Open Project" button (triggers native directory picker via Tauri invoke)
- [x] 6.7 Create `AppHeader` component: project name display, settings gear icon, project switcher dropdown
- [x] 6.8 Implement responsive behavior: Navigation panel collapses to icon sidebar below 1200px width
- [x] 6.9 Create `useSidecar` React hook: listen for `sidecar-ready`/`sidecar-fatal` events, manage sidecar connection state and API base URL

## 7. React Frontend — Outline Editor (spec: outline-editor-ui)

- [x] 7.1 Install `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- [x] 7.2 Create `OutlineEditor` component: render outline JSON as interactive tree using `@dnd-kit` `SortableTree` pattern
- [x] 7.3 Implement drag-and-drop reordering: domain reorder and sub-concept cross-domain transfer with visual drop indicators
- [x] 7.4 Implement inline rename: double-click title → text input, Enter to confirm, Escape to cancel
- [x] 7.5 Implement context menu: right-click with Rename/Delete/Add Sub-Concept/View Files actions using shadcn DropdownMenu
- [x] 7.6 Create `OutlineActionBar` component: Confirm/Re-explore/Export JSON buttons at bottom of editor
- [x] 7.7 Implement client-side Zod validation: validate tree state before confirm, highlight invalid nodes with red borders and error tooltips
- [x] 7.8 Wire `OutlineEditor` to Artifact panel: show editor when `outline_ready` + `waiting` events received, dismiss after confirm

## 8. React Frontend — Embedded Chat (spec: embedded-chat-ui)

- [x] 8.1 Create `ChatWidget` component: collapsible overlay at bottom of Artifact panel with toggle button
- [x] 8.2 Implement Fast/Deep mode tabs with visual highlight for active mode
- [x] 8.3 Create `ChatMessage` component: user and assistant message bubbles with Markdown rendering (react-markdown + syntax highlighting)
- [x] 8.4 Implement SSE streaming consumer: `useSSE` hook that connects to `/api/search` or `/api/investigate`, parses `text-delta`/`tool_start`/`tool_end`/`done` events
- [x] 8.5 Implement incremental text rendering: append `text-delta` chunks to assistant message in real-time
- [x] 8.6 Create `SourceCitations` component: render source file links from `done` event, click navigates VitePress iframe
- [x] 8.7 Create `ToolCallCard` inline component for Deep mode: compact card with tool name, args, duration badge
- [x] 8.8 Implement empty state and index guard: check `GET /api/status`, disable input if `totalChunks === 0`
- [x] 8.9 Implement chat history persistence in React state across mode switches

## 9. React Frontend — CoT Visualization (spec: cot-visualization)

- [x] 9.1 Create `EventTimeline` component: chronological list of Agent events in the Flow panel
- [x] 9.2 Create `ThoughtBlock` component: styled text paragraph with blue left border, timestamp, expand/collapse for long content
- [x] 9.3 Create `ToolCallBlock` component: compact card with wrench icon, tool name, args summary, spinning indicator → duration badge on completion
- [x] 9.4 Create `ProgressBar` component: horizontal bar with phase label, completed/total count, percentage fill
- [x] 9.5 Create `ErrorBlock` component: red-highlighted block with error icon, message, and phase label
- [x] 9.6 Create `PhaseSeparator` component: horizontal line with phase name label
- [x] 9.7 Implement auto-scroll logic: auto-scroll when user is at bottom, "Jump to latest" floating button when scrolled up
- [x] 9.8 Implement event type filter toggles (Thoughts/Tools/Errors) with session persistence
- [x] 9.9 Create `useAgentStream` hook: consume SSE from pipeline endpoints (`/api/explore`, `/api/generate`, `/api/analyze`), dispatch events to Flow panel and Navigation panel state
- [x] 9.10 Implement Deep Search CoT grouping: group investigation events under query header in Flow panel

## 10. Settings UI (spec: settings-management)

- [x] 10.1 Create `SettingsDialog` component: modal dialog with three tabs (Claude API / SiliconFlow / General) using shadcn Dialog + Tabs
- [x] 10.2 Create `ClaudeApiSettings` tab: Base URL input, API Key password input with reveal toggle, Model dropdown
- [x] 10.3 Create `SiliconFlowSettings` tab: Base URL input, API Key password input, Embedding Model dropdown, LLM Model dropdown
- [x] 10.4 Create `GeneralSettings` tab: Storage Path input with folder picker, API Port number input, VitePress Port number input with restart notice
- [x] 10.5 Implement `useConfig` hook: load config via `invoke("load_all_config")`, save via `invoke("save_config", { key, value })` with encryption for API keys
- [x] 10.6 Implement "Test Connection" button for Claude API: make minimal API call, display green check or red X with error
- [x] 10.7 Implement "Test Connection" button for SiliconFlow: call embedding endpoint with test input
- [x] 10.8 Implement config Export/Import: download non-sensitive config as JSON, import from JSON file
- [x] 10.9 Create `SetupWizard` component: first-launch dialog requiring Claude API Key, optional SiliconFlow configuration
- [x] 10.10 Wire settings save to sidecar reload: after saving config, call `invoke("save_config")` → Rust updates env → `POST /api/reload-config`

## 11. Integration & Polish

- [x] 11.1 Implement VitePress iframe navigation sync: Navigation panel click → `postMessage` to iframe → iframe navigates to page
- [x] 11.2 Create `~/.deeplens/projects.json` management: add project on first analysis, store path + name + last analyzed timestamp
- [x] 11.3 Wire full pipeline flow: Open Project → Explore → Outline Editor → Confirm → Generate (Flow panel + Navigation updates) → Index → VitePress Preview + Chat enabled
- [x] 11.4 Add loading states and skeleton screens: sidecar connecting, exploration in progress, generation in progress, indexing
- [x] 11.5 Add error dialogs: sidecar crash, API key missing, network errors, exploration/generation failures
- [x] 11.6 Test cross-platform: verify CSP and mixed-content behavior on macOS, Windows (https://tauri.localhost → http://localhost)
- [x] 11.7 Add `.gitignore` entries: `src-tauri/binaries/`, `dist/`, `ui/dist/`, `src-tauri/target/`
- [x] 11.8 Verify `tauri dev` workflow: concurrent sidecar (Node.js dev mode), Vite HMR, and Tauri WebView hot reload
- [x] 11.9 Verify `tauri build` workflow: sidecar binary bundled, frontend assets embedded, installer produced for current platform
