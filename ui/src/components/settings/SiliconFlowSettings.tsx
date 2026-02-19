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
  { value: "Qwen/Qwen3-Embedding-8B", label: "Qwen3-Embedding-8B" },
  { value: "BAAI/bge-m3", label: "BGE-M3" },
  { value: "BAAI/bge-large-zh-v1.5", label: "BGE-Large-ZH v1.5" },
];

const LLM_MODELS = [
  { value: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
  { value: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5-72B-Instruct" },
];

interface SiliconFlowSettingsProps {
  config: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
}

export function SiliconFlowSettings({ config, onSave }: SiliconFlowSettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");

  const baseUrl = config.siliconflow_base_url ?? "https://api.siliconflow.cn/v1";
  const apiKey = config.siliconflow_api_key ?? "";
  const embeddingModel = config.siliconflow_embedding_model ?? "BAAI/bge-m3";
  const llmModel = config.siliconflow_llm_model ?? "deepseek-ai/DeepSeek-V3";

  const handleTestConnection = async () => {
    setTestResult("loading");
    setTestError("");
    try {
      const res = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: "test",
        }),
      });
      if (res.ok) {
        setTestResult("success");
      } else {
        const body = await res.text();
        setTestResult("error");
        setTestError(`HTTP ${res.status}: ${body.slice(0, 100)}`);
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
          onChange={(e) => onSave("siliconflow_base_url", e.target.value)}
          placeholder="https://api.siliconflow.cn/v1"
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
            onChange={(e) => onSave("siliconflow_api_key", e.target.value)}
            placeholder="sk-..."
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
          onValueChange={(v) => onSave("siliconflow_embedding_model", v)}
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
          onValueChange={(v) => onSave("siliconflow_llm_model", v)}
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
