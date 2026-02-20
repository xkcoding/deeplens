import { Input } from "@/components/ui/input";
import { AlertCircle, FolderOpen } from "lucide-react";

interface GeneralSettingsProps {
  config: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
  currentProject?: string | null;
}

export function GeneralSettings({ config, onSave, currentProject }: GeneralSettingsProps) {
  const outputDir = currentProject ? `${currentProject}/.deeplens/` : ".deeplens/";
  const apiPort = config.api_port ?? "3100";
  const vitepressPort = config.vitepress_port ?? "4173";

  return (
    <div className="space-y-4">
      {/* Output Directory (read-only) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">Output directory (read-only)</label>
        <div className="flex items-center gap-2">
          <div className="flex h-8 flex-1 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
            <FolderOpen className="mr-1.5 size-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{outputDir}</span>
          </div>
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
