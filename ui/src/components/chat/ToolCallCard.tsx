import { Wrench, Clock } from "lucide-react";
import type { ToolCallInfo } from "@/hooks/useChat";

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const argSummary = Object.entries(toolCall.args)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
    .join(", ");

  return (
    <div className="flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5">
      <Wrench className="size-3.5 shrink-0 text-info" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-neutral-700">
          {toolCall.name}
        </span>
        {argSummary && (
          <span className="ml-1 text-[10px] text-neutral-400 truncate">
            ({argSummary})
          </span>
        )}
      </div>
      {toolCall.durationMs != null && (
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-600">
          <Clock className="size-2.5" />
          {toolCall.durationMs < 1000
            ? `${toolCall.durationMs}ms`
            : `${(toolCall.durationMs / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  );
}
