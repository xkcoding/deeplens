import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

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
    const unlistenReady = listen<{ port: number }>("sidecar-ready", (event) => {
      setState({ status: "ready", port: event.payload.port, error: null });
    });
    const unlistenFatal = listen<{ error: string }>("sidecar-fatal", (event) => {
      setState({ status: "error", port: null, error: event.payload.error });
    });

    return () => {
      unlistenReady.then((fn) => fn());
      unlistenFatal.then((fn) => fn());
    };
  }, []);

  return state;
}
