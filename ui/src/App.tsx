import { useState, useCallback, useEffect } from "react";
import { ThreePanelLayout } from "@/layouts/ThreePanelLayout";
import { AppHeader } from "@/components/AppHeader";
import { NavigationPanel } from "@/components/NavigationPanel";
import { FlowPanel, loadFilters } from "@/components/FlowPanel";
import { ArtifactPanel } from "@/components/ArtifactPanel";
import { ProjectSelectionPage } from "@/pages/ProjectSelectionPage";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { SetupWizard } from "@/components/settings/SetupWizard";
import { OutlineEditor } from "@/components/outline/OutlineEditor";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useSidecar } from "@/hooks/useSidecar";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useConfig } from "@/hooks/useConfig";
import type { EventFilters, NavItem, Outline } from "@/types/events";
import type { OutlineData } from "@/components/outline/OutlineValidation";

const EMPTY_NAV: NavItem[] = [];

function App() {
  const sidecar = useSidecar();
  const { config, loading: configLoading, saveMultiple } = useConfig();
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>(loadFilters);
  const [selectedNavId, setSelectedNavId] = useState<string | undefined>();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [outlineData, setOutlineData] = useState<OutlineData | null>(null);
  const [indexReady, setIndexReady] = useState(false);

  const baseUrl = sidecar.port ? `http://127.0.0.1:${sidecar.port}` : "";
  const { state: agentState, startAnalyze, confirmOutline, clearEvents } = useAgentStream({ baseUrl });

  // Show setup wizard if no Claude API key configured
  useEffect(() => {
    if (!configLoading && !config.claude_api_key) {
      setShowWizard(true);
    }
  }, [configLoading, config.claude_api_key]);

  // When agent produces an outline, set it for editing
  useEffect(() => {
    if (agentState.outline && agentState.isWaiting) {
      // Convert backend Outline to editable OutlineData format
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
    if (!baseUrl) return;
    const checkStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status`);
        if (res.ok) {
          const data = await res.json();
          setIndexReady((data.totalChunks ?? 0) > 0);
        }
      } catch {
        // Sidecar not ready
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  const handleClearEvents = useCallback(() => {
    clearEvents();
  }, [clearEvents]);

  const handleConfirmOutline = useCallback(
    (data: OutlineData) => {
      if (!currentProject) return;
      // Convert OutlineData back to backend Outline format
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
    startAnalyze(currentProject);
  }, [currentProject, baseUrl, clearEvents, startAnalyze]);

  const handleReExplore = useCallback(() => {
    setOutlineData(null);
    handleStartAnalyze();
  }, [handleStartAnalyze]);

  const handleWizardComplete = useCallback(
    async (wizardConfig: Record<string, string>) => {
      await saveMultiple(wizardConfig);
      setShowWizard(false);
    },
    [saveMultiple],
  );

  // Responsive collapse detection
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1200px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsCollapsed(e.matches);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Setup wizard
  if (showWizard) {
    return (
      <SetupWizard open={showWizard} onComplete={handleWizardComplete} />
    );
  }

  if (!currentProject) {
    return <ProjectSelectionPage onProjectSelect={setCurrentProject} />;
  }

  const projectName = currentProject.split("/").pop() || currentProject;

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <AppHeader
        projectName={projectName}
        sidecarStatus={sidecar.status}
        isAnalyzing={agentState.isRunning}
        onBackToHome={() => setCurrentProject(null)}
        onSettingsClick={() => setSettingsOpen(true)}
        onStartAnalyze={handleStartAnalyze}
      />
      <ThreePanelLayout
        navigation={
          <NavigationPanel
            items={EMPTY_NAV}
            selectedId={selectedNavId}
            onSelect={setSelectedNavId}
            collapsed={isCollapsed}
          />
        }
        flow={
          <FlowPanel
            events={agentState.events}
            filters={filters}
            onFilterChange={setFilters}
            onClear={handleClearEvents}
          />
        }
        artifact={
          <ArtifactPanel>
            {outlineData ? (
              <OutlineEditor
                outline={outlineData}
                onConfirm={handleConfirmOutline}
                onReExplore={handleReExplore}
                onExportJson={() => {}}
              />
            ) : undefined}
            {/* Chat widget overlays on the artifact panel */}
            {baseUrl && (
              <ChatWidget
                baseUrl={baseUrl}
                indexReady={indexReady}
              />
            )}
          </ArtifactPanel>
        }
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sidecarPort={sidecar.port}
      />
    </div>
  );
}

export default App;
