import { useState, useEffect } from "react";

const isTauri =
  typeof window !== "undefined" &&
  !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

/** Default sidecar port for browser dev mode */
const DEV_SIDECAR_PORT = 45678;

export interface SidecarState {
  status: "connecting" | "ready" | "error";
  port: number | null;
  error: string | null;
}

export function useSidecar(): SidecarState {
  const [state, setState] = useState<SidecarState>({
    status: "connecting",
    port: null,
    error: null,
  });

  useEffect(() => {
    if (isTauri) {
      // Tauri mode: listen for sidecar events from Rust backend
      let cancelled = false;
      (async () => {
        const { listen } = await import("@tauri-apps/api/event");
        if (cancelled) return;

        const unlistenReady = await listen<{ port: number }>("sidecar-ready", (event) => {
          setState({ status: "ready", port: event.payload.port, error: null });
        });
        const unlistenFatal = await listen<{ error: string }>("sidecar-fatal", (event) => {
          setState({ status: "error", port: null, error: event.payload.error });
        });

        // Check current status in case event fired before listener was registered
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const status = await invoke<{ running: boolean; port: number | null }>("check_sidecar_status");
          if (!cancelled && status.running && status.port) {
            setState({ status: "ready", port: status.port, error: null });
          }
        } catch {
          // check_sidecar_status not available
        }

        // Store cleanup
        (window as unknown as Record<string, unknown>).__deeplens_sidecar_cleanup = () => {
          unlistenReady();
          unlistenFatal();
        };
      })();
      return () => {
        cancelled = true;
        const cleanup = (window as unknown as Record<string, unknown>).__deeplens_sidecar_cleanup;
        if (typeof cleanup === "function") (cleanup as () => void)();
      };
    } else {
      // Browser dev mode: try to connect to a locally running sidecar
      let cancelled = false;
      const tryConnect = async () => {
        try {
          const res = await fetch(`http://127.0.0.1:${DEV_SIDECAR_PORT}/health`);
          if (res.ok && !cancelled) {
            setState({ status: "ready", port: DEV_SIDECAR_PORT, error: null });
            return true;
          }
        } catch {
          // Sidecar not running
        }
        return false;
      };

      // Initial check + polling
      tryConnect();
      const interval = setInterval(async () => {
        if (await tryConnect()) {
          clearInterval(interval);
        }
      }, 3000);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, []);

  return state;
}
