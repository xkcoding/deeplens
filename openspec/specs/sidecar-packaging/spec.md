## ADDED Requirements

### Requirement: Sidecar entry point
The system SHALL provide a `src/sidecar/index.ts` entry point that starts the Hono HTTP server in sidecar mode. This entry point SHALL accept a `--port <number>` CLI argument to specify the listening port. It SHALL load configuration from environment variables (injected by Tauri at spawn time) using the existing `loadConfig()` function.

#### Scenario: Sidecar starts with specified port
- **WHEN** the sidecar binary is invoked with `--port 54321`
- **THEN** the Hono server starts listening on port 54321

#### Scenario: Sidecar starts without port argument
- **WHEN** the sidecar binary is invoked without `--port`
- **THEN** the sidecar auto-detects an available port starting from 54321

### Requirement: esbuild bundling
The build process SHALL use esbuild to bundle the sidecar TypeScript source into a single CommonJS file (`dist/bundle.cjs`). The esbuild configuration SHALL set `platform: "node"`, `format: "cjs"`, and `bundle: true`. Native modules (`better-sqlite3`, `sqlite-vec`) SHALL be marked as external and handled by pkg's asset bundling.

#### Scenario: esbuild bundle creation
- **WHEN** `npm run build:sidecar` is executed
- **THEN** esbuild produces `dist/bundle.cjs` containing all application code except native modules

### Requirement: pkg binary compilation
The build process SHALL use `@yao-pkg/pkg` to compile the esbuild output into a standalone platform binary. The binary SHALL embed Node.js 22 runtime. The output binary SHALL be named with Tauri's target-triple convention: `deeplens-sidecar-{target-triple}` (e.g., `deeplens-sidecar-aarch64-apple-darwin`).

#### Scenario: Build macOS ARM binary
- **WHEN** `npm run pkg:macos-arm64` is executed on an Apple Silicon machine
- **THEN** pkg produces `src-tauri/binaries/deeplens-sidecar-aarch64-apple-darwin`

#### Scenario: Build for current platform
- **WHEN** `npm run pkg` is executed
- **THEN** pkg detects the current platform via `rustc --print host-tuple` and outputs the correctly-named binary to `src-tauri/binaries/`

### Requirement: Tauri externalBin registration
The `tauri.conf.json` SHALL register the sidecar binary under `bundle.externalBin` as `"binaries/deeplens-sidecar"`. The `src-tauri/capabilities/default.json` SHALL include `shell:allow-spawn` permission for the sidecar binary.

#### Scenario: Tauri recognizes sidecar
- **WHEN** `tauri build` is executed
- **THEN** Tauri bundles the platform-specific sidecar binary from `src-tauri/binaries/`

### Requirement: Native module handling
The build process SHALL handle `better-sqlite3` and `sqlite-vec` native `.node` addons. These modules SHALL be either bundled as pkg assets or pre-compiled for the target platform. The sidecar SHALL verify native module availability on startup and report errors clearly.

#### Scenario: SQLite native module loads successfully
- **WHEN** the sidecar starts on the target platform
- **THEN** `better-sqlite3` and `sqlite-vec` load without errors and database operations work correctly

#### Scenario: Native module missing
- **WHEN** a native module fails to load
- **THEN** the sidecar logs a clear error message: "Native module {name} failed to load: {error}" and exits with code 1

### Requirement: Build scripts
The `package.json` SHALL provide the following build scripts for the sidecar packaging pipeline:

| Script | Action |
|--------|--------|
| `build:sidecar` | esbuild bundle TypeScript → `dist/bundle.cjs` |
| `pkg` | pkg compile for current platform → `src-tauri/binaries/` |
| `pkg:macos-arm64` | Cross-compile for macOS ARM64 |
| `pkg:macos-x64` | Cross-compile for macOS x64 |
| `pkg:linux-x64` | Cross-compile for Linux x64 |
| `pkg:win-x64` | Cross-compile for Windows x64 |

#### Scenario: Full sidecar build pipeline
- **WHEN** `npm run build:sidecar && npm run pkg` is executed
- **THEN** a working sidecar binary appears at `src-tauri/binaries/deeplens-sidecar-{triple}`

### Requirement: Shutdown endpoint
The sidecar SHALL expose a `POST /api/shutdown` endpoint. When called, it SHALL gracefully close all resources (VectorStore, VitePress subprocess, HTTP server) and exit with code 0 within 5 seconds.

#### Scenario: Graceful shutdown via API
- **WHEN** `POST /api/shutdown` is called
- **THEN** the sidecar closes database connections, kills VitePress subprocess, stops the HTTP server, and exits with code 0
