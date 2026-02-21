import { Globe } from "lucide-react";

/**
 * Overview label — pinned at the top of the outline editor.
 * Non-editable; the overview (index.md) is synthesized by a dedicated
 * generator agent after all domain docs are complete.
 */
export function OverviewSection() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50/30 px-3 py-2">
      <Globe className="size-4 text-primary-600" />
      <span className="flex-1 text-sm font-semibold text-primary-800">
        Overview
      </span>
      <span className="text-[10px] text-neutral-400">
        Auto-generated after all domains
      </span>
    </div>
  );
}
