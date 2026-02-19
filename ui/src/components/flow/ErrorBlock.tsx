import { AlertCircle } from "lucide-react";

interface ErrorBlockProps {
  message: string;
  phase?: string;
}

export function ErrorBlock({ message, phase }: ErrorBlockProps) {
  return (
    <div className="animate-slide-up border-l-error rounded-r-md bg-error-bg px-3 py-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-error" />
        <div className="min-w-0 flex-1">
          {phase && (
            <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-error/70">
              {phase}
            </span>
          )}
          <p className="text-sm text-error">{message}</p>
        </div>
      </div>
    </div>
  );
}
