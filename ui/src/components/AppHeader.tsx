import { Settings, ChevronDown, Telescope, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  projectName: string;
  recentProjects?: string[];
  sidecarStatus?: "connecting" | "ready" | "error";
  isAnalyzing?: boolean;
  onProjectSwitch?: (name: string) => void;
  onSettingsClick?: () => void;
  onBackToHome?: () => void;
  onStartAnalyze?: () => void;
}

export function AppHeader({
  projectName,
  recentProjects = [],
  sidecarStatus = "connecting",
  isAnalyzing = false,
  onProjectSwitch,
  onSettingsClick,
  onBackToHome,
  onStartAnalyze,
}: AppHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
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

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          <Settings className="size-4 text-neutral-500" />
        </Button>
      </div>
    </header>
  );
}
