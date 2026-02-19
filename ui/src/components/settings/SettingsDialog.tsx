import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClaudeApiSettings } from "./ClaudeApiSettings";
import { SiliconFlowSettings } from "./SiliconFlowSettings";
import { GeneralSettings } from "./GeneralSettings";
import { useConfig } from "@/hooks/useConfig";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidecarPort: number | null;
}

export function SettingsDialog({ open, onOpenChange, sidecarPort }: SettingsDialogProps) {
  const { config, loading, saveConfig, exportConfig, importConfig } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importConfig(file);
      e.target.value = "";
    }
  };

  const handleReloadSidecar = async () => {
    if (!sidecarPort) return;
    try {
      await fetch(`http://127.0.0.1:${sidecarPort}/api/reload-config`, {
        method: "POST",
      });
    } catch {
      // Sidecar might not be running
    }
  };

  const handleSave = async (key: string, value: string) => {
    await saveConfig(key, value);
    // Reload sidecar config after save
    await handleReloadSidecar();
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure API keys and application preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="claude" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="claude" className="flex-1 text-xs">
              Claude API
            </TabsTrigger>
            <TabsTrigger value="siliconflow" className="flex-1 text-xs">
              SiliconFlow
            </TabsTrigger>
            <TabsTrigger value="general" className="flex-1 text-xs">
              General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claude" className="mt-4">
            <ClaudeApiSettings config={config} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="siliconflow" className="mt-4">
            <SiliconFlowSettings config={config} onSave={handleSave} />
          </TabsContent>

          <TabsContent value="general" className="mt-4">
            <GeneralSettings config={config} onSave={handleSave} />
          </TabsContent>
        </Tabs>

        {/* Export / Import */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={exportConfig}>
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
