import { cn } from "@/lib/utils";

interface ArtifactPanelProps {
  vitepressUrl?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

export function ArtifactPanel({
  vitepressUrl,
  loading = false,
  children,
}: ArtifactPanelProps) {
  return (
    <div className="flex h-full flex-col border-l border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b border-neutral-200 px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Preview
        </span>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {loading && <SkeletonLoader />}

        {!loading && children && (
          <div className="size-full overflow-y-auto">{children}</div>
        )}

        {!loading && !children && vitepressUrl && (
          <iframe
            src={vitepressUrl}
            className="size-full border-0"
            title="VitePress Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        )}

        {!loading && !children && !vitepressUrl && (
          <div className="flex size-full items-center justify-center">
            <div className="text-center text-neutral-400">
              <p className="text-sm">No preview available</p>
              <p className="mt-1 text-xs">
                Start analysis to generate documentation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div
            className={cn(
              "h-4 rounded bg-skeleton animate-skeleton-shimmer",
              i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-full" : "w-1/2",
            )}
          />
          {i % 2 === 0 && (
            <div className="h-3 w-5/6 rounded bg-skeleton animate-skeleton-shimmer" />
          )}
        </div>
      ))}
    </div>
  );
}
