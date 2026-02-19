import { FileText } from "lucide-react";
import type { SourceCitation } from "@/hooks/useChat";

interface SourceCitationsProps {
  sources: SourceCitation[];
  onNavigate?: (path: string) => void;
}

export function SourceCitations({ sources, onNavigate }: SourceCitationsProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
        Sources
      </p>
      <div className="flex flex-wrap gap-1">
        {sources.map((source, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(source.url ?? source.path)}
            className="inline-flex items-center gap-1 rounded bg-neutral-50 px-1.5 py-0.5 text-[11px] text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
          >
            <FileText className="size-3 shrink-0" />
            <span className="truncate max-w-[150px]">{source.title || source.path}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
