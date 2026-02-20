import { useState, useEffect } from "react";
import { Brain, Wrench, Loader2, ChevronDown, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThoughtChainEntry } from "@/hooks/useChat";

const TOOL_META: Record<string, { label: string; argKey: string }> = {
  search_docs: { label: "Searching docs", argKey: "query" },
  search_code: { label: "Searching code", argKey: "query" },
  read_file: { label: "Reading file", argKey: "path" },
  grep_search: { label: "Grep search", argKey: "pattern" },
};

function formatDuration(ms?: number): string {
  if (ms == null || ms === 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getToolDescription(name: string, args: Record<string, unknown>): string {
  const meta = TOOL_META[name];
  if (!meta) return name;
  const argValue = args[meta.argKey];
  if (!argValue) return meta.label;
  const str = String(argValue);
  const truncated = str.length > 40 ? str.slice(0, 40) + "..." : str;
  return `${meta.label}: ${truncated}`;
}

interface ThoughtChainListProps {
  entries: ThoughtChainEntry[];
  durationMs?: number;
  isStreaming: boolean;
}

export function ThoughtChainList({
  entries,
  durationMs,
  isStreaming,
}: ThoughtChainListProps) {
  const [expanded, setExpanded] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }, [isStreaming]);

  const toolCount = entries.filter((e) => e.type === "tool").length;

  const headerLabel = isStreaming
    ? "Thinking..."
    : `Thought for ${formatDuration(durationMs) || "0s"}${toolCount > 0 ? ` \u00b7 ${toolCount} tool${toolCount > 1 ? "s" : ""}` : ""}`;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs hover:bg-neutral-100 transition-colors"
      >
        <Brain
          className={cn(
            "size-3.5 shrink-0",
            isStreaming
              ? "text-amber-500 animate-pulse-amber"
              : "text-neutral-500",
          )}
        />
        <span
          className={cn(
            "font-medium",
            isStreaming ? "text-amber-700" : "text-neutral-600",
          )}
        >
          {headerLabel}
        </span>
        {expanded ? (
          <ChevronDown className="ml-auto size-3 text-neutral-400" />
        ) : (
          <ChevronRight className="ml-auto size-3 text-neutral-400" />
        )}
      </button>

      {/* Chain entries */}
      {expanded && (
        <div className="space-y-0.5 px-2.5 pb-2">
          {entries.map((entry, i) =>
            entry.type === "tool" ? (
              <ToolRow key={i} entry={entry} />
            ) : (
              <ReasoningRow key={i} entry={entry} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function ToolRow({ entry }: { entry: ThoughtChainEntry & { type: "tool" } }) {
  const desc = getToolDescription(entry.name, entry.args);

  return (
    <div className="flex items-center gap-1.5 border-l-tool rounded-r bg-white/60 px-2 py-1">
      <Wrench className="size-3 shrink-0 text-info" />
      <span className="flex-1 min-w-0 truncate text-xs text-neutral-600">
        {desc}
      </span>
      {entry.status === "running" ? (
        <Loader2 className="size-3 shrink-0 animate-spin text-info" />
      ) : entry.durationMs != null ? (
        <span className="shrink-0 text-[10px] text-neutral-400">
          {formatDuration(entry.durationMs)}
        </span>
      ) : (
        <Check className="size-3 shrink-0 text-success" />
      )}
    </div>
  );
}

function ReasoningRow({
  entry,
}: {
  entry: ThoughtChainEntry & { type: "reasoning" };
}) {
  return (
    <div className="border-l-thought rounded-r px-2 py-1">
      <p className="text-xs leading-relaxed text-neutral-500 whitespace-pre-wrap">
        {entry.text}
      </p>
    </div>
  );
}
