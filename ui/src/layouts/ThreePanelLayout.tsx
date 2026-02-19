import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ThreePanelLayoutProps {
  navigation: React.ReactNode;
  flow: React.ReactNode;
  artifact: React.ReactNode;
}

const MIN_NAV = 200;
const MIN_FLOW = 360;
const MIN_ARTIFACT = 400;
const COLLAPSED_NAV = 48;
const STORAGE_KEY = "deeplens-panel-widths";

interface PanelWidths {
  nav: number;
  artifact: number;
}

function loadWidths(): PanelWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PanelWidths;
      return {
        nav: Math.max(parsed.nav, MIN_NAV),
        artifact: Math.max(parsed.artifact, MIN_ARTIFACT),
      };
    }
  } catch {
    // ignore
  }
  return { nav: 260, artifact: 480 };
}

function saveWidths(widths: PanelWidths) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
}

export function ThreePanelLayout({
  navigation,
  flow,
  artifact,
}: ThreePanelLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<PanelWidths>(loadWidths);
  const [dragging, setDragging] = useState<"nav" | "artifact" | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Responsive: collapse nav when window < 1200px
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1200px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsCollapsed(e.matches);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleMouseDown = useCallback(
    (divider: "nav" | "artifact") => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(divider);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;

      if (dragging === "nav") {
        const newNav = Math.max(MIN_NAV, e.clientX - rect.left);
        const remaining = totalWidth - newNav - 4 - 4; // two dividers
        if (remaining - widths.artifact >= MIN_FLOW) {
          setWidths((prev) => {
            const next = { ...prev, nav: newNav };
            saveWidths(next);
            return next;
          });
        }
      } else {
        const newArtifact = Math.max(MIN_ARTIFACT, rect.right - e.clientX);
        const effectiveNav = isCollapsed ? COLLAPSED_NAV : widths.nav;
        const remaining = totalWidth - effectiveNav - newArtifact - 4 - 4;
        if (remaining >= MIN_FLOW) {
          setWidths((prev) => {
            const next = { ...prev, artifact: newArtifact };
            saveWidths(next);
            return next;
          });
        }
      }
    };

    const handleMouseUp = () => setDragging(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, widths.nav, widths.artifact, isCollapsed]);

  const navWidth = isCollapsed ? COLLAPSED_NAV : widths.nav;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-1 overflow-hidden",
        dragging && "select-none",
      )}
      style={{ cursor: dragging ? "col-resize" : undefined }}
    >
      {/* Navigation Panel */}
      <div
        className="shrink-0 overflow-hidden"
        style={{ width: navWidth }}
      >
        {navigation}
      </div>

      {/* Divider: Nav | Flow */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown("nav")}
          className={cn(
            "w-1 shrink-0 cursor-col-resize transition-colors duration-150",
            dragging === "nav"
              ? "bg-primary-400"
              : "bg-neutral-200 hover:bg-primary-400",
          )}
        />
      )}

      {/* Flow Panel (flex-1 takes remaining space) */}
      <div className="min-w-0 flex-1 overflow-hidden" style={{ minWidth: MIN_FLOW }}>
        {flow}
      </div>

      {/* Divider: Flow | Artifact */}
      <div
        onMouseDown={handleMouseDown("artifact")}
        className={cn(
          "w-1 shrink-0 cursor-col-resize transition-colors duration-150",
          dragging === "artifact"
            ? "bg-primary-400"
            : "bg-neutral-200 hover:bg-primary-400",
        )}
      />

      {/* Artifact Panel */}
      <div
        className="shrink-0 overflow-hidden"
        style={{ width: widths.artifact }}
      >
        {artifact}
      </div>
    </div>
  );
}
