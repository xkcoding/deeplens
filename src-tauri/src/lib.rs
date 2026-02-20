use std::sync::Mutex;
use std::time::Duration;

use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::Sha256;
use tauri::async_runtime::Receiver;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

// ---------------------------------------------------------------------------
// 3.1 SidecarState
// ---------------------------------------------------------------------------

struct SidecarState {
    child: Mutex<Option<CommandChild>>,
    port: Mutex<Option<u16>>,
    retry_count: Mutex<u32>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
            port: Mutex::new(None),
            retry_count: Mutex::new(0),
        }
    }
}

// ---------------------------------------------------------------------------
// 4.1 AES-256-GCM encryption helpers
// ---------------------------------------------------------------------------

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

#[cfg(target_os = "macos")]
fn get_machine_uuid() -> Result<String, String> {
    let output = std::process::Command::new("ioreg")
        .args(["-rd1", "-c", "IOPlatformExpertDevice"])
        .output()
        .map_err(|e| format!("Failed to run ioreg: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.contains("IOPlatformUUID") {
            if let Some(uuid) = line.split('"').nth(3) {
                return Ok(uuid.to_string());
            }
        }
    }
    Err("IOPlatformUUID not found".into())
}

#[cfg(target_os = "linux")]
fn get_machine_uuid() -> Result<String, String> {
    std::fs::read_to_string("/etc/machine-id")
        .map(|s| s.trim().to_string())
        .map_err(|e| format!("Failed to read /etc/machine-id: {e}"))
}

#[cfg(target_os = "windows")]
fn get_machine_uuid() -> Result<String, String> {
    let output = std::process::Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Cryptography",
            "/v",
            "MachineGuid",
        ])
        .output()
        .map_err(|e| format!("Failed to query registry: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.contains("MachineGuid") {
            if let Some(guid) = line.split_whitespace().last() {
                return Ok(guid.to_string());
            }
        }
    }
    Err("MachineGuid not found in registry".into())
}

fn derive_key(machine_uuid: &str, salt: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    pbkdf2_hmac::<Sha256>(machine_uuid.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    key
}

#[tauri::command]
fn encrypt_value(plaintext: String) -> Result<String, String> {
    let machine_uuid = get_machine_uuid()?;
    let mut salt = [0u8; SALT_LEN];
    OsRng.fill_bytes(&mut salt);
    let key = derive_key(&machine_uuid, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;
    // Encode: salt + nonce + ciphertext
    let mut combined = Vec::with_capacity(SALT_LEN + NONCE_LEN + ciphertext.len());
    combined.extend_from_slice(&salt);
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(&combined))
}

#[tauri::command]
fn decrypt_value(ciphertext: String) -> Result<String, String> {
    let machine_uuid = get_machine_uuid()?;
    let combined = BASE64
        .decode(&ciphertext)
        .map_err(|e| format!("Base64 decode failed: {e}"))?;
    if combined.len() < SALT_LEN + NONCE_LEN {
        return Err("Ciphertext too short".into());
    }
    let salt = &combined[..SALT_LEN];
    let nonce_bytes = &combined[SALT_LEN..SALT_LEN + NONCE_LEN];
    let encrypted = &combined[SALT_LEN + NONCE_LEN..];
    let key = derive_key(&machine_uuid, salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, encrypted)
        .map_err(|_| "Decryption failed (wrong key or corrupted data)".to_string())?;
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// 4.2 global.db helpers
// ---------------------------------------------------------------------------

fn ensure_global_db() -> Result<rusqlite::Connection, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let deeplens_dir = home.join(".deeplens");
    std::fs::create_dir_all(&deeplens_dir).map_err(|e| e.to_string())?;
    let db_path = deeplens_dir.join("global.db");
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

// ---------------------------------------------------------------------------
// 4.3 save_config
// ---------------------------------------------------------------------------

#[tauri::command]
fn save_config(key: String, value: String) -> Result<(), String> {
    let is_sensitive = key.contains("api_key");
    let stored_value = if is_sensitive {
        encrypt_value(value)?
    } else {
        value
    };
    let conn = ensure_global_db()?;
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
        [&key, &stored_value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// 4.4 load_all_config
// ---------------------------------------------------------------------------

#[tauri::command]
fn load_all_config() -> Result<serde_json::Value, String> {
    let conn = ensure_global_db()?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM config")
        .map_err(|e| e.to_string())?;
    let mut config = serde_json::Map::new();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (key, value) = row.map_err(|e| e.to_string())?;
        let decrypted = if key.contains("api_key") {
            decrypt_value(value).unwrap_or_default()
        } else {
            value
        };
        config.insert(key, serde_json::Value::String(decrypted));
    }
    Ok(serde_json::Value::Object(config))
}

// ---------------------------------------------------------------------------
// 3.7 check_sidecar_status
// ---------------------------------------------------------------------------

#[tauri::command]
fn check_sidecar_status(state: tauri::State<SidecarState>) -> serde_json::Value {
    let running = state.child.lock().unwrap().is_some();
    let port = *state.port.lock().unwrap();
    serde_json::json!({ "running": running, "port": port })
}

// ---------------------------------------------------------------------------
// 3.8 pick_directory
// ---------------------------------------------------------------------------

#[tauri::command]
async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app.dialog().file().blocking_pick_folder();
    Ok(path.map(|p| p.to_string()))
}

// ---------------------------------------------------------------------------
// 4.5 spawn sidecar with config injection
// ---------------------------------------------------------------------------

fn spawn_sidecar_with_config(
    app: &tauri::AppHandle,
    port: u16,
) -> Result<(Receiver<CommandEvent>, CommandChild), String> {
    let config = load_all_config().unwrap_or(serde_json::Value::Object(serde_json::Map::new()));
    let mut cmd = app
        .shell()
        .sidecar("deeplens-sidecar")
        .map_err(|e| e.to_string())?
        .args(["--port", &port.to_string()]);

    // Inject config as env vars (UI saves keys as claude_api_key, openrouter_api_key, etc.)
    if let Some(obj) = config.as_object() {
        let key_map: &[(&str, &str)] = &[
            ("claude_api_key", "ANTHROPIC_API_KEY"),
            ("claude_base_url", "ANTHROPIC_BASE_URL"),
            ("claude_model", "ANTHROPIC_MODEL"),
            ("openrouter_api_key", "OPENROUTER_API_KEY"),
            ("openrouter_base_url", "OPENROUTER_BASE_URL"),
            ("openrouter_embedding_model", "OPENROUTER_EMBED_MODEL"),
            ("openrouter_llm_model", "OPENROUTER_LLM_MODEL"),
        ];
        for (config_key, env_var) in key_map {
            if let Some(v) = obj.get(*config_key) {
                let val = v.as_str().unwrap_or_default();
                if !val.is_empty() {
                    cmd = cmd.env(env_var, val);
                }
            }
        }
    }

    cmd.spawn().map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// 3.3 Health check polling
// ---------------------------------------------------------------------------

async fn health_check(port: u16) -> bool {
    let url = format!("http://localhost:{port}/health");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .unwrap();
    match client.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => true,
        _ => false,
    }
}

fn start_health_check(app_handle: tauri::AppHandle, port: u16) {
    tauri::async_runtime::spawn(async move {
        let max_attempts = 20; // 20 * 500ms = 10s timeout
        for _ in 0..max_attempts {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if health_check(port).await {
                app_handle
                    .emit("sidecar-ready", serde_json::json!({ "port": port }))
                    .ok();
                return;
            }
        }
        app_handle
            .emit(
                "sidecar-fatal",
                serde_json::json!({ "error": "Health check timeout" }),
            )
            .ok();
    });
}

// ---------------------------------------------------------------------------
// 3.4 stdout/stderr forwarding + 3.5 crash recovery
// ---------------------------------------------------------------------------

fn start_event_forwarding(
    app_handle: tauri::AppHandle,
    rx: Receiver<CommandEvent>,
    port: u16,
) {
    tauri::async_runtime::spawn(async move {
        let mut rx = rx;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line).to_string();
                    eprintln!("[sidecar stdout] {}", text.trim());
                    app_handle.emit("sidecar-stdout", &text).ok();
                }
                CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line).to_string();
                    eprintln!("[sidecar stderr] {}", text.trim());
                    app_handle.emit("sidecar-stderr", &text).ok();
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!(
                        "Sidecar terminated: code={:?}, signal={:?}",
                        payload.code, payload.signal
                    );
                    // Clear old child
                    if let Some(state) = app_handle.try_state::<SidecarState>() {
                        *state.child.lock().unwrap() = None;
                    }
                    // 3.5 Crash recovery
                    attempt_recovery(app_handle.clone(), port);
                    return;
                }
                CommandEvent::Error(err) => {
                    eprintln!("[sidecar error] {}", err);
                    app_handle.emit("sidecar-stderr", &err).ok();
                }
                _ => {}
            }
        }
    });
}

fn attempt_recovery(app_handle: tauri::AppHandle, port: u16) {
    let state = app_handle.state::<SidecarState>();
    let mut retry_count = state.retry_count.lock().unwrap();
    if *retry_count >= 3 {
        app_handle
            .emit(
                "sidecar-fatal",
                serde_json::json!({ "error": "Sidecar crashed 3 times, giving up" }),
            )
            .ok();
        return;
    }
    let count = *retry_count;
    *retry_count = count + 1;
    drop(retry_count);

    let delay_secs = 2u64.pow(count + 1); // 2, 4, 8
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(delay_secs)).await;
        match spawn_sidecar_with_config(&handle, port) {
            Ok((rx, child)) => {
                let state = handle.state::<SidecarState>();
                *state.child.lock().unwrap() = Some(child);
                // Reset retry count on successful health check
                start_health_check_with_reset(handle.clone(), port);
                start_event_forwarding(handle, rx, port);
            }
            Err(e) => {
                eprintln!("Failed to respawn sidecar: {e}");
                handle
                    .emit(
                        "sidecar-fatal",
                        serde_json::json!({ "error": format!("Respawn failed: {e}") }),
                    )
                    .ok();
            }
        }
    });
}

fn start_health_check_with_reset(app_handle: tauri::AppHandle, port: u16) {
    tauri::async_runtime::spawn(async move {
        let max_attempts = 20;
        for _ in 0..max_attempts {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if health_check(port).await {
                // Reset retry count on successful recovery
                if let Some(state) = app_handle.try_state::<SidecarState>() {
                    *state.retry_count.lock().unwrap() = 0;
                }
                app_handle
                    .emit("sidecar-ready", serde_json::json!({ "port": port }))
                    .ok();
                return;
            }
        }
        app_handle
            .emit(
                "sidecar-fatal",
                serde_json::json!({ "error": "Health check timeout after recovery" }),
            )
            .ok();
    });
}

// ---------------------------------------------------------------------------
// 3.6 Graceful shutdown helper
// ---------------------------------------------------------------------------

fn graceful_shutdown(app_handle: &tauri::AppHandle) {
    let state = app_handle.state::<SidecarState>();
    let port = *state.port.lock().unwrap();

    // Try POST /api/shutdown
    if let Some(port) = port {
        let url = format!("http://localhost:{port}/api/shutdown");
        // Use a blocking client since we're in the exit handler
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .ok();
        if let Some(client) = client {
            let _ = client.post(&url).send();
        }
    }

    // Wait a bit then force kill if still running
    std::thread::sleep(Duration::from_secs(5));
    let mut child_guard = state.child.lock().unwrap();
    if let Some(child) = child_guard.take() {
        let _ = child.kill();
    }
}

// ---------------------------------------------------------------------------
// Main entry: run()
// ---------------------------------------------------------------------------

fn find_available_port(start: u16) -> u16 {
    for port in start..start + 100 {
        // Check both IPv4 and IPv6 — Hono binds to :: (all interfaces)
        let ipv4_ok = std::net::TcpListener::bind(("0.0.0.0", port)).is_ok();
        let ipv6_ok = std::net::TcpListener::bind(("::1", port)).is_ok();
        if ipv4_ok && ipv6_ok {
            return port;
        }
    }
    start // fallback
}

pub fn run() {
    let port: u16 = find_available_port(54321);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarState::default())
        .setup(move |app| {
            let handle = app.handle().clone();

            // Store port in state
            let state = handle.state::<SidecarState>();
            *state.port.lock().unwrap() = Some(port);

            // 3.2 Spawn sidecar
            match spawn_sidecar_with_config(&handle, port) {
                Ok((rx, child)) => {
                    *state.child.lock().unwrap() = Some(child);
                    // 3.3 Health check
                    start_health_check(handle.clone(), port);
                    // 3.4 stdout/stderr forwarding (includes 3.5 crash recovery)
                    start_event_forwarding(handle, rx, port);
                }
                Err(e) => {
                    eprintln!("Failed to spawn sidecar: {e}");
                    handle
                        .emit(
                            "sidecar-fatal",
                            serde_json::json!({ "error": format!("Spawn failed: {e}") }),
                        )
                        .ok();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_sidecar_status,
            pick_directory,
            encrypt_value,
            decrypt_value,
            save_config,
            load_all_config,
        ])
        .build(tauri::generate_context!())
        .expect("error building tauri application");

    // 3.6 Graceful shutdown on exit
    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            graceful_shutdown(app_handle);
        }
    });
}
