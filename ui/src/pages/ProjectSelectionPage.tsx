import { useState } from "react";
import { FolderOpen, Clock, Telescope, Plus, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/types/events";

const isTauri =
  typeof window !== "undefined" &&
  !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

interface ProjectSelectionPageProps {
  onProjectSelect: (path: string) => void;
}

export function ProjectSelectionPage({
  onProjectSelect,
}: ProjectSelectionPageProps) {
  const [projects] = useState<ProjectInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState("");

  const handlePickDirectory = async () => {
    if (!isTauri) {
      setError("Directory picker is only available in the desktop app. Enter a path below.");
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await invoke<string | null>("pick_directory");
      if (path) {
        onProjectSelect(path);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to open directory picker");
    }
  };

  const handleManualOpen = () => {
    const trimmed = manualPath.trim();
    if (trimmed) {
      onProjectSelect(trimmed);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="flex items-center gap-3 text-primary-600">
              <Telescope className="size-10" />
              <h1 className="text-4xl font-bold tracking-tight">DeepLens</h1>
            </div>
            <p className="mt-3 text-center text-neutral-500">
              Deep code analysis & documentation generation
            </p>
          </div>

          {/* Open Project Button */}
          <div className="mb-4 flex justify-center">
            <Button
              onClick={handlePickDirectory}
              className="gap-2 bg-primary-500 text-white hover:bg-primary-600"
              size="lg"
            >
              <Plus className="size-4" />
              Open Project
            </Button>
          </div>

          {/* Manual path input (always shown in browser, shown after error in Tauri) */}
          {(!isTauri || error) && (
            <div className="mx-auto mb-8 flex max-w-md items-center gap-2">
              <Input
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualOpen();
                }}
                placeholder="/path/to/your/project"
                className="h-10 flex-1 text-sm"
              />
              <Button
                onClick={handleManualOpen}
                disabled={!manualPath.trim()}
                size="sm"
                className="gap-1"
              >
                Go
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/20 bg-error-bg px-4 py-3 text-sm text-error">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Recent Projects */}
          {projects.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                Recent Projects
              </h2>
              <div className="space-y-2">
                {projects.map((project) => (
                  <button
                    key={project.path}
                    onClick={() => onProjectSelect(project.path)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all",
                      "hover:border-primary-200 hover:shadow-sm",
                    )}
                  >
                    <FolderOpen className="size-5 shrink-0 text-primary-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {project.name}
                      </p>
                      <p className="truncate text-xs text-neutral-400">
                        {project.path}
                      </p>
                    </div>
                    {project.lastAnalyzed && (
                      <div className="flex shrink-0 items-center gap-1 text-xs text-neutral-400">
                        <Clock className="size-3" />
                        {project.lastAnalyzed}
                      </div>
                    )}
                    {project.status && (
                      <StatusBadge status={project.status} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: NonNullable<ProjectInfo["status"]> }) {
  const styles = {
    ready: "bg-success-bg text-success",
    analyzing: "bg-primary-50 text-primary-600",
    error: "bg-error-bg text-error",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}
