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

const CLAUDE_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
];

interface ClaudeApiSettingsProps {
  config: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
}

export function ClaudeApiSettings({ config, onSave }: ClaudeApiSettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");

  const baseUrl = config.claude_base_url ?? "https://api.anthropic.com";
  const apiKey = config.claude_api_key ?? "";
  const model = config.claude_model ?? "claude-sonnet-4-20250514";

  const handleTestConnection = async () => {
    setTestResult("loading");
    setTestError("");
    try {
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (res.ok || res.status === 200) {
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
          onChange={(e) => onSave("claude_base_url", e.target.value)}
          placeholder="https://api.anthropic.com"
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
            onChange={(e) => onSave("claude_api_key", e.target.value)}
            placeholder="sk-ant-..."
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

      {/* Model */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">Model</label>
        <Select value={model} onValueChange={(v) => onSave("claude_model", v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLAUDE_MODELS.map((m) => (
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
