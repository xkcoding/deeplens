import { useState, useEffect, useCallback } from "react";

const isTauri =
  typeof window !== "undefined" &&
  !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

const CONFIG_STORAGE_KEY = "deeplens-config";

// ── localStorage fallback for browser dev mode ──

function loadFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function persistToStorage(config: Record<string, string>) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

// ── Tauri invoke wrapper (dynamic import) ──

async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export function useConfig() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTauri) {
      tauriInvoke<Record<string, string>>("load_all_config")
        .then(setConfig)
        .catch(() => {
          // Tauri store not ready, try localStorage
          setConfig(loadFromStorage());
        })
        .finally(() => setLoading(false));
    } else {
      // Browser mode: use localStorage
      setConfig(loadFromStorage());
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async (key: string, value: string) => {
    if (isTauri) {
      try {
        await tauriInvoke("save_config", { key, value });
      } catch {
        // Fallback to localStorage
      }
    }
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      persistToStorage(next);
      return next;
    });
  }, []);

  const saveMultiple = useCallback(
    async (entries: Record<string, string>) => {
      if (isTauri) {
        for (const [key, value] of Object.entries(entries)) {
          try {
            await tauriInvoke("save_config", { key, value });
          } catch {
            // Fallback handled below
          }
        }
      }
      setConfig((prev) => {
        const next = { ...prev, ...entries };
        persistToStorage(next);
        return next;
      });
    },
    [],
  );

  const exportConfig = useCallback(() => {
    // Exclude sensitive keys
    const safe = Object.fromEntries(
      Object.entries(config).filter(
        ([k]) => !k.toLowerCase().includes("api_key") && !k.toLowerCase().includes("apikey"),
      ),
    );
    const blob = new Blob([JSON.stringify(safe, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deeplens-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const importConfig = useCallback(
    async (file: File) => {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, string>;
      // Never import api_key values
      const safe = Object.fromEntries(
        Object.entries(parsed).filter(
          ([k]) => !k.toLowerCase().includes("api_key") && !k.toLowerCase().includes("apikey"),
        ),
      );
      await saveMultiple(safe);
    },
    [saveMultiple],
  );

  return { config, loading, saveConfig, saveMultiple, exportConfig, importConfig };
}
