import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useConfig() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<Record<string, string>>("load_all_config")
      .then(setConfig)
      .catch(() => {
        // Fallback: config not available yet
        setConfig({});
      })
      .finally(() => setLoading(false));
  }, []);

  const saveConfig = useCallback(async (key: string, value: string) => {
    await invoke("save_config", { key, value });
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveMultiple = useCallback(
    async (entries: Record<string, string>) => {
      for (const [key, value] of Object.entries(entries)) {
        await invoke("save_config", { key, value });
      }
      setConfig((prev) => ({ ...prev, ...entries }));
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
