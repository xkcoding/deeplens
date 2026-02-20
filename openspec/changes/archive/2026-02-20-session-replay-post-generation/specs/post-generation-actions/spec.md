## ADDED Requirements

### Requirement: Preview button in header
The AppHeader SHALL display a "Preview" button when analysis is complete (`isRunning === false` and at least one `done` event exists and `navItems.length > 0`). The button SHALL use an Eye icon and "Preview" label.

#### Scenario: Preview button appears after analysis
- **WHEN** the analysis completes successfully
- **THEN** a "Preview" button appears in the header action area

#### Scenario: Preview button hidden during analysis
- **WHEN** analysis is in progress
- **THEN** the Preview button is not displayed

### Requirement: Preview launches VitePress in system browser
When the user clicks Preview, the frontend SHALL call `POST /api/preview` with the current project path. The backend SHALL scaffold VitePress config (using existing `scaffoldVitePress()`), start a VitePress dev server (using existing `startVitePressPreview()`), and return the URL. The frontend SHALL open the URL in the system browser via Tauri `shell.open()` or `window.open()`.

#### Scenario: Click Preview opens browser
- **WHEN** the user clicks the Preview button
- **THEN** VitePress dev server starts and the system browser opens at the preview URL

#### Scenario: VitePress already running
- **WHEN** the user clicks Preview and a VitePress process is already running from a previous click
- **THEN** the old process is killed before starting a new one

### Requirement: Preview backend route
The sidecar server SHALL expose `POST /api/preview` accepting `{ "projectPath": string }`. The route SHALL read the outline from `.deeplens/outline.json`, scaffold VitePress config into `.deeplens/docs/`, start the VitePress dev server, and return `{ "ok": true, "url": "http://localhost:<port>" }`.

#### Scenario: Successful preview start
- **WHEN** a client sends `POST /api/preview` with a valid project path that has docs
- **THEN** the server responds with `{ "ok": true, "url": "http://localhost:5173" }` (or next available port)

#### Scenario: No docs directory
- **WHEN** a client sends `POST /api/preview` but `.deeplens/docs/` does not exist
- **THEN** the server responds with `{ "ok": false, "error": "No docs found" }`

### Requirement: Vectorize button in header
The AppHeader SHALL display a "Vectorize" button when analysis is complete. The button SHALL be disabled when SiliconFlow API Key is not configured, with a tooltip "Configure SiliconFlow API Key first". The button SHALL show a loading spinner and "Vectorizing..." text during execution. After completion, the button SHALL be replaced by a "Vectorized" status indicator with a check icon.

#### Scenario: Vectorize button with SiliconFlow configured
- **WHEN** analysis is complete and SiliconFlow API Key is configured
- **THEN** the Vectorize button is enabled and clickable

#### Scenario: Vectorize button without SiliconFlow configured
- **WHEN** analysis is complete but SiliconFlow API Key is not configured
- **THEN** the Vectorize button is disabled with tooltip

#### Scenario: Vectorize in progress
- **WHEN** the user clicks Vectorize
- **THEN** the button shows spinner + "Vectorizing..." and is disabled

#### Scenario: Vectorize complete
- **WHEN** vectorization finishes successfully
- **THEN** the button is replaced by a "Vectorized" text with check icon

### Requirement: Vectorize backend route
The sidecar server SHALL expose `POST /api/vectorize` accepting `{ "projectPath": string }`. The route SHALL invoke the existing embedding indexer (`indexDocs` from `src/embedding/indexer.ts`) with `includeSource: false` (docs only). Upon success, the route SHALL return `{ "ok": true }`.

#### Scenario: Successful vectorization
- **WHEN** a client sends `POST /api/vectorize` with a valid project path
- **THEN** the embedding indexer runs, creates/updates `deeplens.db`, and the server responds with `{ "ok": true }`

#### Scenario: Vectorize without SiliconFlow key
- **WHEN** a client sends `POST /api/vectorize` but SiliconFlow API Key is not in config
- **THEN** the server responds with `{ "ok": false, "error": "SiliconFlow API Key is required" }`

### Requirement: Q&A auto-unlock after vectorize
After a successful Vectorize operation, the ChatWidget's index readiness check (`GET /api/status`) SHALL return positive results, automatically enabling the Q&A input. The frontend SHALL NOT require a page refresh or sidecar restart.

#### Scenario: Q&A unlocks after vectorize
- **WHEN** vectorization completes successfully
- **THEN** the next `GET /api/status` poll returns `totalChunks > 0`
- **AND** the ChatWidget enables its input field

### Requirement: Settings Storage Path read-only
The GeneralSettings component SHALL display the Storage Path as a read-only field showing `<projectRoot>/.deeplens/`. The field SHALL NOT be editable. The label SHALL indicate "Output directory (read-only)".

#### Scenario: Storage path displays correctly
- **WHEN** the user opens Settings → General
- **THEN** the Storage Path field shows the `.deeplens/` path for the current project as read-only text
