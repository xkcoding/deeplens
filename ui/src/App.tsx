import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { ThreePanelLayout } from "@/layouts/ThreePanelLayout";
import { AppHeader } from "@/components/AppHeader";
import { ArtifactPanel } from "@/components/ArtifactPanel";
import { ActivitySidebar } from "@/components/ActivitySidebar";
import { ProjectSelectionPage } from "@/pages/ProjectSelectionPage";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { SetupWizard } from "@/components/settings/SetupWizard";
import { OutlineEditor } from "@/components/outline/OutlineEditor";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useSidecar } from "@/hooks/useSidecar";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useConfig } from "@/hooks/useConfig";
import { useUpdate } from "@/hooks/useUpdate";
import type { Outline } from "@/types/events";
import type { OutlineData } from "@/components/outline/OutlineValidation";

const isTauri =
  typeof window !== "undefined" &&
  !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

/** Open a URL in the system browser (Tauri) or new tab (browser). */
async function openExternal(url: string): Promise<void> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("plugin:shell|open", { path: url });
  } else {
    window.open(url, "_blank");
  }
}

function App() {
  const sidecar = useSidecar();
  const { config, loading: configLoading, saveMultiple, saveConfig, exportConfig, importConfig } = useConfig();
  const [currentProject, setCurrentProject] = useState<string | null>(
    () => localStorage.getItem("deeplens-current-project"),
  );
  const [selectedNavId, setSelectedNavId] = useState<string | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [outlineData, setOutlineData] = useState<OutlineData | null>(null);
  const [indexReady, setIndexReady] = useState(false);
  const [vectorizeStatus, setVectorizeStatus] = useState<"idle" | "running" | "done">("idle");
  const [vectorizeProgress, setVectorizeProgress] = useState<{ current: number; total: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportRunning, setExportRunning] = useState(false);

  // UI state cache for project switching (Task 10.6)
  interface UIState {
    selectedNavId?: string;
    outlineData: OutlineData | null;
    indexReady: boolean;
    vectorizeStatus: "idle" | "running" | "done";
  }
  const uiStateCache = useRef(new Map<string, UIState>());

  const baseUrl = sidecar.port ? `http://127.0.0.1:${sidecar.port}` : "";
  const { state: agentState, startAnalyze, confirmOutline, clearEvents, replaySession, loadFromDisk } = useAgentStream({ baseUrl });
  const { state: updateState, startUpdate } = useUpdate({ baseUrl });

  // Show setup wizard if no Claude API key configured
  useEffect(() => {
    if (!configLoading && !config.claude_api_key) {
      setShowWizard(true);
    }
  }, [configLoading, config.claude_api_key]);

  // When agent produces an outline, set it for editing
  useEffect(() => {
    if (agentState.outline && agentState.isWaiting) {
      const converted: OutlineData = {
        project_name: agentState.outline.project_name,
        summary: agentState.outline.summary,
        detected_stack: agentState.outline.detected_stack,
        knowledge_graph: agentState.outline.knowledge_graph.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          files: d.files.map((f) => ({ path: f.path, role: f.role })),
          sub_concepts: (d.sub_concepts ?? []).map((sc) => ({
            id: `sc-${sc.name.replace(/\s+/g, "-").toLowerCase()}`,
            name: sc.name,
            description: sc.description,
          })),
        })),
        ignored_files: agentState.outline.ignored_files,
      };
      setOutlineData(converted);
    }
  }, [agentState.outline, agentState.isWaiting]);

  // Check index readiness
  useEffect(() => {
    if (!baseUrl || !currentProject) return;
    const checkStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status?projectPath=${encodeURIComponent(currentProject)}`);
        if (res.ok) {
          const data = await res.json();
          const ready = (data.totalChunks ?? 0) > 0;
          setIndexReady(ready);
          if (ready && vectorizeStatus === "idle") {
            setVectorizeStatus("done");
          }
        }
      } catch {
        // Sidecar not ready
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [baseUrl, currentProject]);

  // Auto-load session on project open
  useEffect(() => {
    if (!currentProject || !baseUrl) return;

    fetch(`${baseUrl}/api/session?projectPath=${encodeURIComponent(currentProject)}`)
      .then((res) => res.json())
      .then((data: {
        exists: boolean;
        events: Array<{ ts: number; event: string; data: Record<string, unknown> }>;
        fallback?: { outline: Outline; docs: Record<string, string> };
      }) => {
        if (data.exists && data.events.length > 0) {
          replaySession(data.events, currentProject);
        } else if (data.fallback) {
          // No session.jsonl but outline.json + docs/ exist on disk
          loadFromDisk(data.fallback.outline, data.fallback.docs);
        }
      })
      .catch(() => {
        // Session loading failure — silently ignore
      });
  }, [currentProject, baseUrl, replaySession, loadFromDisk]);

  // Derived: analysis is complete when not running, has navItems, and has a "done" event
  const analysisComplete = !agentState.isRunning
    && agentState.navItems.length > 0
    && agentState.events.some((e) => e.type === "done");

  // Derive the content to preview: selected doc > active doc > nothing
  const previewContent = useMemo(() => {
    const findTitle = (items: typeof agentState.navItems, targetId: string): string | null => {
      for (const item of items) {
        if (item.id === targetId) return item.title;
        if (item.children) {
          const found = findTitle(item.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    if (selectedNavId && agentState.documents.size > 0) {
      // Compute expected document path from navItem ID:
      //   Domain (id: "data-access")        → "domains/data-access/index.md"
      //   Child  (id: "data-access/repo")   → "domains/data-access/repo.md"
      let expectedDocPath: string;
      if (selectedNavId.includes("/")) {
        const [domainId, conceptSlug] = selectedNavId.split("/", 2);
        expectedDocPath = `domains/${domainId}/${conceptSlug}.md`;
      } else {
        expectedDocPath = `domains/${selectedNavId}/index.md`;
      }

      // Direct lookup
      const directContent = agentState.documents.get(expectedDocPath);
      if (directContent) {
        const title = findTitle(agentState.navItems, selectedNavId) ?? selectedNavId;
        return { content: directContent, title };
      }

      // Fallback: search for any doc in the domain (handles slug mismatches)
      const domainId = selectedNavId.includes("/")
        ? selectedNavId.split("/")[0]
        : selectedNavId;
      for (const [docPath, content] of agentState.documents) {
        const domainMatch = docPath.match(/^domains\/([^/]+)\//);
        if (domainMatch && domainMatch[1] === domainId) {
          const title = findTitle(agentState.navItems, selectedNavId) ?? domainId;
          return { content, title };
        }
      }
    }
    // Fallback: show the most recently written doc
    if (agentState.activeDocPath && agentState.documents.has(agentState.activeDocPath)) {
      const pathParts = agentState.activeDocPath.split("/");
      const title = pathParts.length > 1 ? pathParts[pathParts.length - 2] : pathParts[0];
      return {
        content: agentState.documents.get(agentState.activeDocPath)!,
        title,
      };
    }
    return null;
  }, [selectedNavId, agentState.documents, agentState.activeDocPath, agentState.navItems]);

  // Derive progress info for header
  const progressInfo = useMemo(() => {
    if (!agentState.isRunning) return null;
    if (agentState.generateProgress) {
      return {
        phase: "generate",
        current: agentState.generateProgress.current,
        total: agentState.generateProgress.total,
      };
    }
    if (agentState.isWaiting) {
      return { phase: "outline_review" };
    }
    if (agentState.phase === "explore" || agentState.isRunning) {
      return { phase: "explore" };
    }
    return null;
  }, [agentState.isRunning, agentState.generateProgress, agentState.isWaiting, agentState.phase]);

  const handleConfirmOutline = useCallback(
    (data: OutlineData) => {
      if (!currentProject) return;
      const backendOutline = {
        project_name: data.project_name,
        summary: data.summary,
        detected_stack: data.detected_stack,
        knowledge_graph: data.knowledge_graph.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          reasoning: "",
          files: (d.files ?? []).map((f) => ({
            path: f.path,
            role: f.role,
            why_included: "",
          })),
          sub_concepts: (d.sub_concepts ?? []).map((sc) => ({
            name: sc.name,
            description: sc.description ?? "",
            files: [],
          })),
        })),
        ignored_files: data.ignored_files ?? [],
      };
      confirmOutline(currentProject, backendOutline as Outline);
      setOutlineData(null);
    },
    [currentProject, confirmOutline],
  );

  const handleStartAnalyze = useCallback(() => {
    if (!currentProject || !baseUrl) return;
    clearEvents();
    setOutlineData(null);
    setSelectedNavId(undefined);
    startAnalyze(currentProject);
  }, [currentProject, baseUrl, clearEvents, startAnalyze]);

  const handlePreview = useCallback(async () => {
    if (!baseUrl || !currentProject) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath: currentProject,
          port: config.vitepress_port ? Number(config.vitepress_port) : undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; url?: string; error?: string };
      if (data.ok && data.url) {
        await openExternal(data.url);
      }
    } catch {
      // Preview failed silently
    } finally {
      setPreviewLoading(false);
    }
  }, [baseUrl, currentProject]);

  const handleVectorize = useCallback(async () => {
    if (!baseUrl || !currentProject) return;
    setVectorizeStatus("running");
    setVectorizeProgress(null);
    try {
      const response = await fetch(`${baseUrl}/api/vectorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: currentProject }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Parse SSE messages from buffer
        const lastNewline = buffer.lastIndexOf("\n\n");
        if (lastNewline < 0) continue;
        const complete = buffer.slice(0, lastNewline + 2);
        buffer = buffer.slice(lastNewline + 2);

        for (const block of complete.split("\n\n").filter(Boolean)) {
          let event = "message";
          let data = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) data = line.slice(6);
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (event === "progress") {
              setVectorizeProgress({ current: parsed.current, total: parsed.total });
            } else if (event === "done") {
              setVectorizeStatus("done");
              setIndexReady(true);
            } else if (event === "error") {
              setVectorizeStatus("idle");
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // If stream ended without explicit done/error, treat as success
      setVectorizeStatus((prev) => (prev === "running" ? "done" : prev));
      setIndexReady(true);
    } catch {
      setVectorizeStatus("idle");
    } finally {
      setVectorizeProgress(null);
    }
  }, [baseUrl, currentProject]);

  const handleUpdate = useCallback(() => {
    if (!currentProject) return;
    startUpdate(currentProject);
  }, [currentProject, startUpdate]);

  const handleExport = useCallback(async () => {
    if (!baseUrl || !currentProject) return;
    setExportRunning(true);
    try {
      // Try Tauri directory picker first
      let outputDir: string | undefined;
      if (isTauri) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const picked = await invoke<string | null>("pick_directory");
          if (!picked) {
            setExportRunning(false);
            return; // User cancelled
          }
          outputDir = picked;
        } catch {
          // Fallback: export to default location
        }
      }

      const response = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: currentProject, outputDir }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Drain completed SSE blocks
        const lastNewline = buffer.lastIndexOf("\n\n");
        if (lastNewline >= 0) buffer = buffer.slice(lastNewline + 2);
      }
    } catch {
      // Export failed
    } finally {
      setExportRunning(false);
    }
  }, [baseUrl, currentProject]);

  const handleReExplore = useCallback(() => {
    setOutlineData(null);
    handleStartAnalyze();
  }, [handleStartAnalyze]);

  // Project switch handler (Task 10.6)
  const handleProjectSwitch = useCallback((targetPath: string) => {
    if (targetPath === currentProject) return;

    // Save current project UI state
    if (currentProject) {
      uiStateCache.current.set(currentProject, {
        selectedNavId,
        outlineData,
        indexReady,
        vectorizeStatus,
      });
    }

    // Clear current state
    clearEvents();

    // Restore cached UI state for target project (if available)
    const cached = uiStateCache.current.get(targetPath);
    if (cached) {
      setSelectedNavId(cached.selectedNavId);
      setOutlineData(cached.outlineData);
      setIndexReady(cached.indexReady);
      setVectorizeStatus(cached.vectorizeStatus);
    } else {
      setSelectedNavId(undefined);
      setOutlineData(null);
      setIndexReady(false);
      setVectorizeStatus("idle");
    }
    setVectorizeProgress(null);
    setPreviewLoading(false);

    // Switch project
    localStorage.setItem("deeplens-current-project", targetPath);
    setCurrentProject(targetPath);
  }, [currentProject, selectedNavId, outlineData, indexReady, vectorizeStatus, clearEvents]);

  const handleWizardComplete = useCallback(
    async (wizardConfig: Record<string, string>) => {
      await saveMultiple(wizardConfig);
      setShowWizard(false);
    },
    [saveMultiple],
  );

  // Setup wizard
  if (showWizard) {
    return (
      <SetupWizard open={showWizard} onComplete={handleWizardComplete} />
    );
  }

  if (!currentProject) {
    return <ProjectSelectionPage
      sidecarPort={sidecar.port}
      onProjectSelect={(path) => {
        localStorage.setItem("deeplens-current-project", path);
        setCurrentProject(path);
      }}
    />;
  }

  const projectName = currentProject.split("/").pop() || currentProject;

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <AppHeader
        projectName={projectName}
        projectPath={currentProject}
        sidecarPort={sidecar.port}
        sidecarStatus={sidecar.status}
        isAnalyzing={agentState.isRunning}
        progress={progressInfo}
        analysisComplete={analysisComplete}
        vectorizeStatus={vectorizeStatus}
        vectorizeProgress={vectorizeProgress}
        previewLoading={previewLoading}
        openrouterConfigured={!!config.openrouter_api_key}
        onProjectSwitch={handleProjectSwitch}
        onBackToHome={() => {
          localStorage.removeItem("deeplens-current-project");
          setCurrentProject(null);
        }}
        onSettingsClick={() => setSettingsOpen(true)}
        onStartAnalyze={handleStartAnalyze}
        onPreview={handlePreview}
        onVectorize={handleVectorize}
        onUpdate={handleUpdate}
        updateRunning={updateState.isRunning}
        onExport={handleExport}
        exportRunning={exportRunning}
      />
      <ThreePanelLayout
        main={
          <div className="relative h-full">
            <ArtifactPanel
              content={previewContent?.content}
              title={previewContent?.title}
            >
              {outlineData ? (
                <OutlineEditor
                  outline={outlineData}
                  onConfirm={handleConfirmOutline}
                  onReExplore={handleReExplore}
                  onExportJson={() => {}}
                />
              ) : undefined}
            </ArtifactPanel>
            {/* Chat widget overlays on the main panel */}
            {baseUrl && (
              <ChatWidget
                baseUrl={baseUrl}
                indexReady={indexReady}
              />
            )}
          </div>
        }
        sidebar={
          <ActivitySidebar
            phase={agentState.phase}
            isRunning={agentState.isRunning}
            isWaiting={agentState.isWaiting}
            navItems={agentState.navItems}
            generateProgress={agentState.generateProgress}
            events={agentState.events}
            selectedDocId={selectedNavId}
            onSelectDoc={setSelectedNavId}
          />
        }
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sidecarPort={sidecar.port}
        currentProject={currentProject}
        config={config}
        saveConfig={saveConfig}
        exportConfig={exportConfig}
        importConfig={importConfig}
      />
    </div>
  );
}

export default App;
