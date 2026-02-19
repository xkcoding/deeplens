import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderOpen, AlertCircle } from "lucide-react";

const isTauri =
  typeof window !== "undefined" &&
  !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

interface GeneralSettingsProps {
  config: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
}

export function GeneralSettings({ config, onSave }: GeneralSettingsProps) {
  const storagePath = config.storage_path ?? "";
  const apiPort = config.api_port ?? "3100";
  const vitepressPort = config.vitepress_port ?? "4173";

  const handlePickDirectory = async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await invoke<string>("pick_directory");
      if (path) {
        await onSave("storage_path", path);
      }
    } catch {
      // User cancelled or Tauri command not available
    }
  };

  return (
    <div className="space-y-4">
      {/* Storage Path */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">Storage Path</label>
        <div className="flex items-center gap-2">
          <Input
            value={storagePath}
            onChange={(e) => onSave("storage_path", e.target.value)}
            placeholder="~/.deeplens"
            className="h-8 flex-1 text-xs"
          />
          <Button variant="outline" size="icon-sm" onClick={handlePickDirectory} title="Browse">
            <FolderOpen className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Ports */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">Ports</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400">API Port</span>
            <Input
              type="number"
              value={apiPort}
              onChange={(e) => onSave("api_port", e.target.value)}
              placeholder="3100"
              className="h-8 text-xs"
              min={1024}
              max={65535}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400">VitePress Port</span>
            <Input
              type="number"
              value={vitepressPort}
              onChange={(e) => onSave("vitepress_port", e.target.value)}
              placeholder="4173"
              className="h-8 text-xs"
              min={1024}
              max={65535}
            />
          </div>
        </div>
        <p className="flex items-center gap-1 text-[10px] text-warning">
          <AlertCircle className="size-3" />
          Port changes require restart
        </p>
      </div>
    </div>
  );
}
