import { useState } from "react";
import { Wrench, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCallBlockProps {
  toolName: string;
  args: Record<string, unknown>;
  durationMs?: number;
  isRunning: boolean;
}

export function ToolCallBlock({
  toolName,
  args,
  durationMs,
  isRunning,
}: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const argSummary = summarizeArgs(args);

  return (
    <div className="animate-slide-up border-l-tool rounded-r-md bg-neutral-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Wrench className="size-3.5 shrink-0 text-info" />
        <span className="text-sm font-medium text-neutral-700">{toolName}</span>

        {argSummary && (
          <>
            <span className="text-neutral-300">&mdash;</span>
            <span className="truncate text-xs text-neutral-500">{argSummary}</span>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {isRunning ? (
            <Loader2 className="size-3.5 animate-spin text-info" />
          ) : durationMs != null ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                durationMs < 100
                  ? "bg-success-bg text-success"
                  : durationMs < 1000
                    ? "bg-info-bg text-info"
                    : "bg-warning-bg text-warning",
              )}
            >
              {formatDuration(durationMs)}
            </span>
          ) : null}

          {Object.keys(args).length > 0 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              {expanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-neutral-100 p-2 text-xs text-neutral-600">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
    </div>
  );
}

function summarizeArgs(args: Record<string, unknown>): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return "";
  // Show first value if it's a short string
  const firstVal = args[keys[0]];
  if (typeof firstVal === "string" && firstVal.length < 60) {
    return firstVal;
  }
  return `${keys.length} arg${keys.length > 1 ? "s" : ""}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
