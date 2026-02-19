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
      import("@tauri-apps/api/event").then(({ listen }) => {
        if (cancelled) return;
        const unlistenReady = listen<{ port: number }>("sidecar-ready", (event) => {
          setState({ status: "ready", port: event.payload.port, error: null });
        });
        const unlistenFatal = listen<{ error: string }>("sidecar-fatal", (event) => {
          setState({ status: "error", port: null, error: event.payload.error });
        });
        // Store cleanup
        (window as unknown as Record<string, unknown>).__deeplens_sidecar_cleanup = async () => {
          (await unlistenReady)();
          (await unlistenFatal)();
        };
      });
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
          const res = await fetch(`http://127.0.0.1:${DEV_SIDECAR_PORT}/api/status`);
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
