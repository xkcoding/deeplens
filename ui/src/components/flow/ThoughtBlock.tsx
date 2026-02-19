import { useState } from "react";
import { cn } from "@/lib/utils";

interface ThoughtBlockProps {
  content: string;
  timestamp: number;
}

const TRUNCATE_LENGTH = 200;

export function ThoughtBlock({ content, timestamp }: ThoughtBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > TRUNCATE_LENGTH;
  const displayContent =
    shouldTruncate && !expanded
      ? content.slice(0, TRUNCATE_LENGTH) + "..."
      : content;

  return (
    <div className="animate-slide-up border-l-thought rounded-r-md bg-neutral-50 px-3 py-2">
      <div className="mb-1 text-[10px] text-neutral-400">
        {formatRelativeTime(timestamp)}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
        {displayContent}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            "mt-1 text-xs font-medium transition-colors",
            "text-primary-500 hover:text-primary-600",
          )}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor(timestamp / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
