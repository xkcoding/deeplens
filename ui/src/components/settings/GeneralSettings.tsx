import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, FolderOpen, Globe, RotateCcw } from "lucide-react";

const EMBEDDING_MODELS = [
  { value: "qwen/qwen3-embedding-8b", label: "Qwen3-Embedding-8B" },
  { value: "baai/bge-m3", label: "BGE-M3" },
  { value: "baai/bge-large-zh-v1.5", label: "BGE-Large-ZH v1.5" },
];

const LLM_MODELS = [
  { value: "qwen/qwen3-32b", label: "Qwen3-32B" },
  { value: "qwen/qwen3-14b", label: "Qwen3-14B" },
  { value: "qwen/qwen3-8b", label: "Qwen3-8B" },
];

interface ProjectSettings {
  openrouter_llm_model?: string;
  openrouter_embedding_model?: string;
}

interface GeneralSettingsProps {
  config: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
  currentProject?: string | null;
  sidecarPort?: number | null;
}

export function GeneralSettings({ config, onSave, currentProject, sidecarPort }: GeneralSettingsProps) {
  const outputDir = currentProject ? `${currentProject}/.deeplens/` : ".deeplens/";
  const apiPort = config.api_port ?? "3100";
  const vitepressPort = config.vitepress_port ?? "4173";
  const mcpPort = config["general.mcp_port"] ?? "3100";

  // Project-level overrides
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({});

  const loadProjectSettings = useCallback(async () => {
    if (!currentProject || !sidecarPort) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:${sidecarPort}/api/project-config?projectPath=${encodeURIComponent(currentProject)}`,
      );
      const data = await res.json();
      setProjectSettings(data.settings ?? {});
    } catch {
      setProjectSettings({});
    }
  }, [currentProject, sidecarPort]);

  useEffect(() => {
    loadProjectSettings();
  }, [loadProjectSettings]);

  const saveProjectSetting = async (key: string, value: string | null) => {
    if (!currentProject || !sidecarPort) return;
    try {
      await fetch(`http://127.0.0.1:${sidecarPort}/api/project-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: currentProject, key, value }),
      });
      if (value === null) {
        setProjectSettings((prev) => {
          const next = { ...prev };
          delete next[key as keyof ProjectSettings];
          return next;
        });
      } else {
        setProjectSettings((prev) => ({ ...prev, [key]: value }));
      }
    } catch {
      // Save failed silently
    }
  };

  // Effective values (project override > global)
  const globalLlm = config.openrouter_llm_model ?? "qwen/qwen3-32b";
  const globalEmbed = config.openrouter_embedding_model ?? "qwen/qwen3-embedding-8b";
  const effectiveLlm = projectSettings.openrouter_llm_model ?? globalLlm;
  const effectiveEmbed = projectSettings.openrouter_embedding_model ?? globalEmbed;
  const hasLlmOverride = !!projectSettings.openrouter_llm_model;
  const hasEmbedOverride = !!projectSettings.openrouter_embedding_model;

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
        <label className="text-xs font-medium text-neutral-600">
          <Globe className="mr-1 inline size-3 text-neutral-400" />
          Ports
          <span className="ml-1 text-[10px] text-neutral-400">(global)</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
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
          <div className="space-y-1">
            <span className="text-[10px] text-neutral-400">MCP Server Port</span>
            <Input
              type="number"
              value={mcpPort}
              onChange={(e) => onSave("general.mcp_port", e.target.value)}
              placeholder="3100"
              className="h-8 text-xs"
              min={1024}
              max={65535}
            />
          </div>
        </div>
        <p className="text-[10px] text-neutral-400">
          MCP Server port is used by external IDE agents (Cursor, Windsurf) to reach the Sidecar API.
        </p>
        <p className="flex items-center gap-1 text-[10px] text-warning">
          <AlertCircle className="size-3" />
          Port changes require application restart
        </p>
      </div>

      {/* Project Model Overrides */}
      {currentProject && (
        <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
          <label className="text-xs font-medium text-neutral-600">
            Project Model Overrides
          </label>
          <p className="text-[10px] text-neutral-400">
            Override LLM / embedding model for this project only. Leave as &quot;Use global&quot; to inherit from OpenRouter settings.
          </p>

          {/* LLM Model */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">
                LLM Model
                {hasLlmOverride && (
                  <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-[9px] text-orange-600">
                    override
                  </span>
                )}
              </span>
              {hasLlmOverride && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-neutral-400"
                  onClick={() => saveProjectSetting("openrouter_llm_model", null)}
                >
                  <RotateCcw className="mr-0.5 size-2.5" />
                  Reset
                </Button>
              )}
            </div>
            <Select
              value={effectiveLlm}
              onValueChange={(v) => {
                if (v === globalLlm) {
                  saveProjectSetting("openrouter_llm_model", null);
                } else {
                  saveProjectSetting("openrouter_llm_model", v);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLM_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                    {m.value === globalLlm && !hasLlmOverride ? " (global default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Embedding Model */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">
                Embedding Model
                {hasEmbedOverride && (
                  <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-[9px] text-orange-600">
                    override
                  </span>
                )}
              </span>
              {hasEmbedOverride && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-neutral-400"
                  onClick={() => saveProjectSetting("openrouter_embedding_model", null)}
                >
                  <RotateCcw className="mr-0.5 size-2.5" />
                  Reset
                </Button>
              )}
            </div>
            <Select
              value={effectiveEmbed}
              onValueChange={(v) => {
                if (v === globalEmbed) {
                  saveProjectSetting("openrouter_embedding_model", null);
                } else {
                  saveProjectSetting("openrouter_embedding_model", v);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                    {m.value === globalEmbed && !hasEmbedOverride ? " (global default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
