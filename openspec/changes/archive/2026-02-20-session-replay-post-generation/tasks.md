## 1. Session Persistence — Backend

- [x] 1.1 Add `appendSession` helper function in `src/api/routes/analyze.ts` — writes JSONL line with `{ ts, event, data }` via `fs.appendFile`
- [x] 1.2 At start of new analysis in `analyze.ts`, ensure `.deeplens/` dir exists and truncate `session.jsonl`
- [x] 1.3 Wire `appendSession` into explore `onEvent` callback (all event types)
- [x] 1.4 Wire `appendSession` into `outline_ready` and `waiting` events
- [x] 1.5 Add `outline_confirmed` event write when outline is confirmed; also persist `outline.json`
- [x] 1.6 Wire `appendSession` into generate `onEvent` callback — doc_written stores path only, others store full data
- [x] 1.7 Wire `appendSession` into `done` and `error` events

## 2. Session & Docs Read APIs

- [x] 2.1 Add `GET /api/session` route in `src/api/sidecar-server.ts` — reads session.jsonl, returns `{ exists, events }`
- [x] 2.2 Add `POST /api/docs/read` route in `src/api/sidecar-server.ts` — batch reads files from `.deeplens/docs/`, returns `{ files }` map

## 3. Frontend Session Replay

- [x] 3.1 Extract `applyEvent(state, event) → state` pure function from `useAgentStream.ts` setState callback
- [x] 3.2 Refactor SSE consumption loop to use `applyEvent`
- [x] 3.3 Add `replaySession` method: batch process events, collect doc paths, fetch via `/api/docs/read`, fill documents map, set final state
- [x] 3.4 Export `replaySession` from `useAgentStream` hook return value

## 4. Auto-load Session on Project Open

- [x] 4.1 Add `useEffect` in `App.tsx` that fetches `GET /api/session` when `currentProject` and `baseUrl` are set
- [x] 4.2 Call `replaySession` if session exists, silently catch errors
- [x] 4.3 Add `analysisComplete` derived state for button visibility

## 5. Preview Button & Backend

- [x] 5.1 Add `POST /api/preview` route in `sidecar-server.ts` — read outline, scaffold VitePress, start dev server, return URL
- [x] 5.2 Track VitePress child process reference for cleanup on re-preview
- [x] 5.3 Add Preview button to `AppHeader.tsx` — Eye icon, shown when `analysisComplete`
- [x] 5.4 Add `handlePreview` in `App.tsx` — fetch `/api/preview`, open URL via Tauri `shell.open()` or `window.open()`
- [x] 5.5 Pass `analysisComplete` and `onPreview` props to AppHeader

## 6. Vectorize Button & Backend

- [x] 6.1 Add `POST /api/vectorize` route in `sidecar-server.ts` — call `indexDocs` with `includeSource: false`, return `{ ok: true }`
- [x] 6.2 Add Vectorize button to `AppHeader.tsx` — Sparkles icon, disabled when OpenRouter not configured, loading state during execution
- [x] 6.3 Add Vectorized status indicator (Check icon + "Vectorized" text)
- [x] 6.4 Add `vectorizeStatus` state and `handleVectorize` handler in `App.tsx`
- [x] 6.5 Pass `vectorizeStatus`, `openrouterConfigured`, and `onVectorize` props to AppHeader

## 7. Q&A Route Hot-Registration

- [x] 7.1 Refactor `sidecar-server.ts` Q&A route registration to late-binding proxy pattern with `qaApp` variable
- [x] 7.2 Extract `initQARoutes(dbPath, config)` helper that creates Hono sub-app with search/investigate/status routes
- [x] 7.3 At startup: if `deeplens.db` exists, call `initQARoutes` to initialize `qaApp`
- [x] 7.4 In `POST /api/vectorize`: after indexDocs, call `initQARoutes` to activate Q&A
- [x] 7.5 Catch-all routes return 503 when `qaApp` is null

## 8. Settings Cleanup

- [x] 8.1 Change Storage Path field in `GeneralSettings.tsx` to read-only display of `.deeplens/` path
