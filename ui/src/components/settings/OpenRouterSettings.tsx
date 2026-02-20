import { useState } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMBEDDING_MODELS = [
  { value: "qwen/qwen3-embedding-8b", label: "Qwen3-Embedding-8B (default)" },
  { value: "baai/bge-m3", label: "BGE-M3" },
  { value: "baai/bge-large-zh-v1.5", label: "BGE-Large-ZH v1.5" },
];

const LLM_MODELS = [
  { value: "qwen/qwen3-32b", label: "Qwen3-32B (default)" },
  { value: "qwen/qwen3-14b", label: "Qwen3-14B" },
  { value: "qwen/qwen3-8b", label: "Qwen3-8B" },
];

interface OpenRouterSettingsProps {
  config: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
  sidecarPort: number | null;
}

export function OpenRouterSettings({ config, onSave, sidecarPort }: OpenRouterSettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");

  const baseUrl = config.openrouter_base_url ?? "https://openrouter.ai/api/v1";
  const apiKey = config.openrouter_api_key ?? "";
  const embeddingModel = config.openrouter_embedding_model ?? "qwen/qwen3-embedding-8b";
  const llmModel = config.openrouter_llm_model ?? "qwen/qwen3-32b";

  const handleTestConnection = async () => {
    if (!sidecarPort) {
      setTestResult("error");
      setTestError("Sidecar not running. Start the app or run the sidecar first.");
      return;
    }
    setTestResult("loading");
    setTestError("");
    try {
      const res = await fetch(`http://127.0.0.1:${sidecarPort}/api/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openrouter",
          api_key: apiKey,
          base_url: baseUrl,
          model: embeddingModel,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult("success");
      } else {
        setTestResult("error");
        setTestError(data.error || "Unknown error");
      }
    } catch (err) {
      setTestResult("error");
      setTestError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Base URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">Base URL</label>
        <Input
          value={baseUrl}
          onChange={(e) => onSave("openrouter_base_url", e.target.value)}
          placeholder="https://openrouter.ai/api/v1"
          className="h-8 text-xs"
        />
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">API Key</label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onSave("openrouter_api_key", e.target.value)}
            placeholder="sk-or-..."
            className="h-8 pr-9 text-xs"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Embedding Model */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">Embedding Model</label>
        <Select
          value={embeddingModel}
          onValueChange={(v) => onSave("openrouter_embedding_model", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMBEDDING_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* LLM Model */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">LLM Model</label>
        <Select
          value={llmModel}
          onValueChange={(v) => onSave("openrouter_llm_model", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LLM_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={!apiKey || testResult === "loading"}
        >
          {testResult === "loading" && <Loader2 className="size-3.5 animate-spin" />}
          Test Connection
        </Button>
        {testResult === "success" && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="size-3.5" /> Connected
          </span>
        )}
        {testResult === "error" && (
          <span className="flex items-center gap-1 text-xs text-error" title={testError}>
            <XCircle className="size-3.5" /> Failed
          </span>
        )}
      </div>
    </div>
  );
}
