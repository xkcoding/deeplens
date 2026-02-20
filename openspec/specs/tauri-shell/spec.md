## ADDED Requirements

### Requirement: Tauri application window
The system SHALL create a single main window using Tauri v2 with the following properties: title "DeepLens", default size 1440x900, minimum size 1024x768. The window SHALL load the React frontend from the bundled Vite output. The window SHALL be resizable and support macOS traffic light controls.

#### Scenario: Application launch
- **WHEN** the user launches the DeepLens application
- **THEN** a single window opens at 1440x900 displaying the React frontend

#### Scenario: Minimum window size
- **WHEN** the user attempts to resize the window below 1024x768
- **THEN** the window stops resizing at the minimum dimensions

### Requirement: Sidecar process management
The system SHALL spawn the Node.js sidecar binary as a Tauri `externalBin` during the `setup()` lifecycle hook. The sidecar binary SHALL be registered in `tauri.conf.json` under `bundle.externalBin` with platform-specific target-triple naming (e.g., `deeplens-sidecar-aarch64-apple-darwin`). The Rust layer SHALL use `tauri-plugin-shell` to spawn, monitor, and terminate the sidecar process.

#### Scenario: Sidecar startup
- **WHEN** the Tauri application starts
- **THEN** the Rust `setup()` hook spawns the sidecar with `--port <N>` argument and polls `GET /health` until it returns 200 (timeout 10 seconds)

#### Scenario: Sidecar ready notification
- **WHEN** the sidecar health check succeeds
- **THEN** Rust emits a `sidecar-ready` event to the frontend containing `{ port: number }`

#### Scenario: Sidecar startup timeout
- **WHEN** the sidecar health check does not return 200 within 10 seconds
- **THEN** Rust emits a `sidecar-fatal` event and the frontend displays an error dialog

### Requirement: Sidecar graceful shutdown
The system SHALL gracefully shut down the sidecar when the application exits. On `RunEvent::Exit`, the Rust layer SHALL send `POST /api/shutdown` to the sidecar. The sidecar SHALL close VectorStore connections, stop VitePress, and exit within 5 seconds. If the sidecar does not terminate within 5 seconds, the Rust layer SHALL force-kill the process.

#### Scenario: Graceful shutdown on app close
- **WHEN** the user closes the application window
- **THEN** Rust sends `POST /api/shutdown` to the sidecar, waits up to 5 seconds, then kills the process if still running

### Requirement: Sidecar crash recovery
The system SHALL automatically restart the sidecar if it terminates unexpectedly. The restart logic SHALL use exponential backoff (2s, 4s, 8s) with a maximum of 3 retry attempts. After 3 failed restarts, the system SHALL emit a `sidecar-fatal` event and display an error dialog to the user.

#### Scenario: Sidecar crash with recovery
- **WHEN** the sidecar process terminates unexpectedly (non-zero exit or signal)
- **THEN** the Rust layer waits 2 seconds and respawns the sidecar, incrementing the retry counter

#### Scenario: Repeated crash failure
- **WHEN** the sidecar crashes 3 times consecutively
- **THEN** the system stops retrying, emits `sidecar-fatal`, and displays "Sidecar failed to start. Please restart the application."

### Requirement: Native file picker dialog
The system SHALL use Tauri's native file dialog (`tauri-plugin-dialog`) to let users select a project directory for analysis. The dialog SHALL filter to directories only (not files).

#### Scenario: User selects project directory
- **WHEN** the user clicks "Open Project" in the UI
- **THEN** a native OS directory picker dialog opens, and the selected path is returned to the frontend

#### Scenario: User cancels file picker
- **WHEN** the user dismisses the directory picker without selecting
- **THEN** no action is taken and the UI remains in its current state

### Requirement: Sidecar state management
The Rust layer SHALL store the sidecar `CommandChild` handle in a `Mutex<Option<CommandChild>>` managed state. This state SHALL be accessible from Tauri commands for starting, stopping, and checking sidecar status.

#### Scenario: Check sidecar status
- **WHEN** the frontend invokes `check_sidecar_status`
- **THEN** the Rust command returns `{ running: boolean, port: number | null }`

### Requirement: Configuration encryption commands
The Rust layer SHALL expose Tauri commands for encrypting and decrypting sensitive configuration values (API keys). Encryption SHALL use AES-256-GCM with a key derived from the machine's unique identifier (macOS: `IOPlatformUUID`, Linux: `/etc/machine-id`, Windows: `MachineGuid`) combined with a random salt via PBKDF2.

#### Scenario: Encrypt API key
- **WHEN** the frontend invokes `encrypt_value` with a plaintext API key
- **THEN** the Rust command returns the encrypted ciphertext as a base64 string

#### Scenario: Decrypt API key
- **WHEN** the frontend invokes `decrypt_value` with a base64 ciphertext
- **THEN** the Rust command returns the original plaintext value

### Requirement: CSP security configuration
The `tauri.conf.json` SHALL configure Content Security Policy to allow the frontend to connect to the local sidecar HTTP server. The CSP SHALL include `connect-src 'self' http://localhost:*` to permit direct HTTP and SSE connections from the WebView to the sidecar.

#### Scenario: Frontend fetches sidecar API
- **WHEN** the React frontend calls `fetch("http://localhost:{sidecarPort}/api/search", ...)`
- **THEN** the request succeeds without being blocked by CSP
