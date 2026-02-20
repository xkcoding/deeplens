import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Clock, Telescope, Plus, AlertCircle, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/types/events";

const isTauri =
  typeof window !== "undefined" &&
  !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

/** Format an ISO timestamp as a relative time string (e.g., "3 days ago"). */
function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

interface ProjectSelectionPageProps {
  onProjectSelect: (path: string) => void;
  sidecarPort?: number | null;
}

export function ProjectSelectionPage({
  onProjectSelect,
  sidecarPort,
}: ProjectSelectionPageProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState("");

  const baseUrl = sidecarPort ? `http://127.0.0.1:${sidecarPort}` : null;

  // Load projects from backend on mount
  const fetchProjects = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      // Sidecar not ready — silently ignore
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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

  const handleRemoveProject = async (projectPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!baseUrl) return;
    try {
      await fetch(`${baseUrl}/api/projects`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: projectPath }),
      });
      setProjects((prev) => prev.filter((p) => p.path !== projectPath));
    } catch {
      setError("Failed to remove project");
    }
  };

  const hasProjects = projects.length > 0;

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

          {/* Empty state welcome message */}
          {!hasProjects && (
            <p className="text-center text-sm text-neutral-400">
              No projects yet. Open a project folder to get started.
            </p>
          )}

          {/* Recent Projects */}
          {hasProjects && (
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
                      "group flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all",
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
                        {formatRelativeTime(project.lastAnalyzed)}
                      </div>
                    )}
                    {project.status && (
                      <StatusBadge status={project.status} />
                    )}
                    <button
                      onClick={(e) => handleRemoveProject(project.path, e)}
                      className="shrink-0 rounded p-1 text-neutral-300 opacity-0 transition-all hover:bg-neutral-100 hover:text-error group-hover:opacity-100"
                      title="Remove from list"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
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
