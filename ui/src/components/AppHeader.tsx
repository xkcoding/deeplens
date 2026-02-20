import { Settings, ChevronDown, Telescope, Play, Loader2, Eye, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ProgressInfo {
  phase: string;
  current?: number;
  total?: number;
}

interface AppHeaderProps {
  projectName: string;
  recentProjects?: string[];
  sidecarStatus?: "connecting" | "ready" | "error";
  isAnalyzing?: boolean;
  progress?: ProgressInfo | null;
  analysisComplete?: boolean;
  vectorizeStatus?: "idle" | "running" | "done";
  vectorizeProgress?: { current: number; total: number } | null;
  previewLoading?: boolean;
  openrouterConfigured?: boolean;
  onProjectSwitch?: (name: string) => void;
  onSettingsClick?: () => void;
  onBackToHome?: () => void;
  onStartAnalyze?: () => void;
  onPreview?: () => void;
  onVectorize?: () => void;
}

export function AppHeader({
  projectName,
  recentProjects = [],
  sidecarStatus = "connecting",
  isAnalyzing = false,
  progress,
  analysisComplete = false,
  vectorizeStatus = "idle",
  vectorizeProgress,
  previewLoading = false,
  openrouterConfigured = false,
  onProjectSwitch,
  onSettingsClick,
  onBackToHome,
  onStartAnalyze,
  onPreview,
  onVectorize,
}: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-neutral-200 bg-white">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left: Logo + Project Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Telescope className="size-5" />
            <span className="text-sm font-semibold tracking-tight">DeepLens</span>
          </button>

          <span className="text-neutral-300">/</span>

          {recentProjects.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors">
                  {projectName}
                  <ChevronDown className="size-3.5 text-neutral-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {recentProjects.map((name) => (
                  <DropdownMenuItem
                    key={name}
                    onClick={() => onProjectSwitch?.(name)}
                  >
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-sm font-medium text-neutral-700">
              {projectName}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Sidecar status dot */}
          <span
            className={`inline-block size-2 rounded-full ${
              sidecarStatus === "ready"
                ? "bg-success"
                : sidecarStatus === "error"
                  ? "bg-error"
                  : "animate-pulse bg-neutral-300"
            }`}
            title={`Sidecar: ${sidecarStatus}`}
          />

          {/* Start Analysis button */}
          <Button
            variant="default"
            size="sm"
            onClick={onStartAnalyze}
            disabled={sidecarStatus !== "ready" || isAnalyzing}
            className="gap-1.5 bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </Button>

          {/* Preview — available after analysis completes */}
          {analysisComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              disabled={previewLoading}
              className="gap-1.5"
            >
              {previewLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Eye className="size-3.5" />
              )}
              {previewLoading ? "Starting..." : "Preview"}
            </Button>
          )}

          {/* Vectorize — available after analysis completes */}
          {analysisComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onVectorize}
              disabled={!openrouterConfigured || vectorizeStatus === "running"}
              title={!openrouterConfigured ? "Configure OpenRouter API Key first" : undefined}
              className="gap-1.5"
            >
              {vectorizeStatus === "running" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : vectorizeStatus === "done" ? (
                <Check className="size-3.5 text-green-600" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {vectorizeStatus === "running"
                ? vectorizeProgress
                  ? `Vectorizing ${vectorizeProgress.current}/${vectorizeProgress.total}`
                  : "Vectorizing..."
                : vectorizeStatus === "done"
                  ? "Vectorized"
                  : "Vectorize"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSettingsClick}
            aria-label="Settings"
          >
            <Settings className="size-4 text-neutral-500" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {progress && <HeaderProgressBar progress={progress} />}
    </header>
  );
}

function HeaderProgressBar({ progress }: { progress: ProgressInfo }) {
  const { current, total } = progress;
  const isIndeterminate = !current || !total;
  const percentage = total && current ? Math.round((current / total) * 100) : 0;

  return (
    <div className="h-0.5 w-full overflow-hidden bg-neutral-100">
      {isIndeterminate ? (
        <div
          className="h-full w-1/3 rounded-full bg-primary-400 animate-flow-gradient"
          style={{
            background: "linear-gradient(90deg, transparent, var(--color-primary-400), transparent)",
            backgroundSize: "200% 100%",
            animation: "flow-gradient 1.5s linear infinite",
          }}
        />
      ) : (
        <div
          className={cn(
            "h-full rounded-full bg-primary-500 transition-all duration-500 ease-out",
            percentage >= 100 && "bg-success",
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      )}
    </div>
  );
}
