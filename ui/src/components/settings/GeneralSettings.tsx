import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderOpen, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface GeneralSettingsProps {
  config: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
}

export function GeneralSettings({ config, onSave }: GeneralSettingsProps) {
  const storagePath = config.storage_path ?? "";
  const apiPort = config.api_port ?? "3100";
  const vitepressPort = config.vitepress_port ?? "4173";

  const handlePickDirectory = async () => {
    try {
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

      {/* API Port */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">API Port</label>
        <Input
          type="number"
          value={apiPort}
          onChange={(e) => onSave("api_port", e.target.value)}
          placeholder="3100"
          className="h-8 w-32 text-xs"
          min={1024}
          max={65535}
        />
      </div>

      {/* VitePress Port */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">VitePress Port</label>
        <Input
          type="number"
          value={vitepressPort}
          onChange={(e) => onSave("vitepress_port", e.target.value)}
          placeholder="4173"
          className="h-8 w-32 text-xs"
          min={1024}
          max={65535}
        />
        <p className="flex items-center gap-1 text-[10px] text-warning">
          <AlertCircle className="size-3" />
          Port changes require restart
        </p>
      </div>
    </div>
  );
}
