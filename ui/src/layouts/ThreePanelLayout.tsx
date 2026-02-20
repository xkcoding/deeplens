import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TwoPanelLayoutProps {
  main: React.ReactNode;
  sidebar: React.ReactNode;
}

const MIN_MAIN = 400;
const MIN_SIDEBAR = 280;
const STORAGE_KEY = "deeplens-sidebar-width";

function loadSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return Math.max(parseInt(raw, 10), MIN_SIDEBAR);
    }
  } catch {
    // ignore
  }
  return 340;
}

function saveSidebarWidth(width: number) {
  localStorage.setItem(STORAGE_KEY, String(width));
}

export function ThreePanelLayout({ main, sidebar }: TwoPanelLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newSidebar = Math.max(MIN_SIDEBAR, rect.right - e.clientX);
      const mainWidth = rect.width - newSidebar - 4; // divider
      if (mainWidth >= MIN_MAIN) {
        setSidebarWidth(newSidebar);
        saveSidebarWidth(newSidebar);
      }
    };

    const handleMouseUp = () => setDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-1 overflow-hidden",
        dragging && "select-none",
      )}
      style={{ cursor: dragging ? "col-resize" : undefined }}
    >
      {/* Main Preview Panel (flex-1, takes most space) */}
      <div className="min-w-0 flex-1 overflow-hidden" style={{ minWidth: MIN_MAIN }}>
        {main}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "w-1 shrink-0 cursor-col-resize transition-colors duration-150",
          dragging
            ? "bg-primary-400"
            : "bg-neutral-200 hover:bg-primary-400",
        )}
      />

      {/* Sidebar Panel */}
      <div
        className="shrink-0 overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </div>
    </div>
  );
}
