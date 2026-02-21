import { FileText } from "lucide-react";

/**
 * Summary label — pinned at the bottom of the outline editor.
 * Non-editable; the summary (summary.md) is synthesized by a dedicated
 * generator agent after the overview is complete.
 */
export function SummarySection() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/30 px-3 py-2">
      <FileText className="size-4 text-neutral-600" />
      <span className="flex-1 text-sm font-semibold text-neutral-800">
        Summary
      </span>
      <span className="text-[10px] text-neutral-400">
        Auto-generated after overview
      </span>
    </div>
  );
}
