import { Check, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OutlineActionBarProps {
  onConfirm: () => void;
  onReExplore: () => void;
  onExportJson: () => void;
  hasErrors: boolean;
}

export function OutlineActionBar({
  onConfirm,
  onReExplore,
  onExportJson,
  hasErrors,
}: OutlineActionBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3">
      <Button variant="ghost" size="sm" onClick={onExportJson}>
        <Download className="size-3.5" />
        Export JSON
      </Button>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onReExplore}>
          <RefreshCw className="size-3.5" />
          Re-explore
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={hasErrors}
          title={hasErrors ? "Fix validation errors before confirming" : undefined}
        >
          <Check className="size-3.5" />
          Confirm Outline
        </Button>
      </div>
    </div>
  );
}
