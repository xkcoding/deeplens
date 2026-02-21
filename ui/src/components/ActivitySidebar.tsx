import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentEvent, NavItem } from "@/types/events";

interface ActivitySidebarProps {
  phase: string | null;
  isRunning: boolean;
  isWaiting: boolean;
  navItems: NavItem[];
  generateProgress: { phase: string; current: number; total: number } | null;
  events: AgentEvent[];
  selectedDocId?: string;
  onSelectDoc?: (id: string) => void;
}

export function ActivitySidebar({
  phase,
  isRunning,
  isWaiting,
  navItems,
  generateProgress,
  events,
  selectedDocId,
  onSelectDoc,
}: ActivitySidebarProps) {
  return (
    <div className="flex h-full flex-col border-l border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b border-neutral-200 px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Activity
        </span>
      </div>

      {/* Phase — fixed, never scrolls */}
      <PhaseSection phase={phase} isRunning={isRunning} isWaiting={isWaiting} generateProgress={generateProgress} />

      {/* Documents — scrollable, fills available space */}
      {navItems.length > 0 && (
        <DocumentsSection
          items={navItems}
          selectedId={selectedDocId}
          onSelect={onSelectDoc}
        />
      )}

      {/* Thinking — fixed height, scrolls independently */}
      <ThinkingSection events={events} isRunning={isRunning} />
    </div>
  );
}

/* ─── Phase Stepper ─── */

interface PhaseSectionProps {
  phase: string | null;
  isRunning: boolean;
  isWaiting: boolean;
  generateProgress: { phase: string; current: number; total: number } | null;
}

type StepStatus = "completed" | "active" | "pending";

function PhaseSection({ phase, isRunning, isWaiting, generateProgress }: PhaseSectionProps) {
  const steps = getPhaseSteps(phase, isRunning, isWaiting, generateProgress);

  return (
    <div className="shrink-0 border-b border-neutral-100 px-4 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Phase
      </div>
      <div className="space-y-1">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2">
            <StepIcon status={step.status} />
            <span
              className={cn(
                "text-xs",
                step.status === "active"
                  ? "font-medium text-neutral-800"
                  : step.status === "completed"
                    ? "text-neutral-500"
                    : "text-neutral-400",
              )}
            >
              {step.label}
              {step.detail && (
                <span className="ml-1 text-neutral-400">({step.detail})</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-3.5 shrink-0 text-success" />;
    case "active":
      return <Loader2 className="size-3.5 shrink-0 animate-spin text-primary-500" />;
    case "pending":
      return <Circle className="size-3.5 shrink-0 text-neutral-300" />;
  }
}

function getPhaseSteps(
  phase: string | null,
  isRunning: boolean,
  isWaiting: boolean,
  generateProgress: { phase: string; current: number; total: number } | null,
): Array<{ label: string; status: StepStatus; detail?: string }> {
  // Phase index: explore=0, outline_review=1, generate=2, overview=3, summary=4
  let currentPhaseIdx = -1;
  if (phase === "explore" || (!phase && isRunning)) {
    currentPhaseIdx = 0;
  } else if (isWaiting || phase === "outline_review") {
    currentPhaseIdx = 1;
  } else if (phase === "generate") {
    currentPhaseIdx = 2;
  } else if (phase === "overview") {
    currentPhaseIdx = 3;
  } else if (phase === "summary") {
    currentPhaseIdx = 4;
  }

  // If not running and no phase, everything is pending
  if (!isRunning && !phase) {
    return [
      { label: "Explore", status: "pending" },
      { label: "Outline Review", status: "pending" },
      { label: "Generate", status: "pending" },
      { label: "Overview", status: "pending" },
      { label: "Summary", status: "pending" },
    ];
  }

  function stepStatus(idx: number, activeDetail?: string): { status: StepStatus; detail?: string } {
    if (currentPhaseIdx > idx) return { status: "completed" };
    if (currentPhaseIdx === idx) return { status: "active", detail: activeDetail };
    return { status: "pending" };
  }

  const steps: Array<{ label: string; status: StepStatus; detail?: string }> = [];

  // Explore
  steps.push({ label: "Explore", ...stepStatus(0) });

  // Outline Review
  steps.push({
    label: "Outline Review",
    ...stepStatus(1, "waiting for confirmation"),
  });

  // Generate — use generateProgress (domain-level, consistent with header button)
  if (!isRunning && currentPhaseIdx >= 2) {
    steps.push({ label: "Generate", status: "completed" });
  } else {
    let detail: string | undefined;
    if (currentPhaseIdx === 2 && generateProgress) {
      detail = `${generateProgress.current}/${generateProgress.total}`;
    }
    steps.push({ label: "Generate", ...stepStatus(2, detail) });
  }

  // Overview
  if (!isRunning && currentPhaseIdx >= 3) {
    steps.push({ label: "Overview", status: "completed" });
  } else {
    steps.push({ label: "Overview", ...stepStatus(3) });
  }

  // Summary
  if (!isRunning && currentPhaseIdx >= 4) {
    steps.push({ label: "Summary", status: "completed" });
  } else {
    steps.push({ label: "Summary", ...stepStatus(4) });
  }

  return steps;
}

/* ─── Documents Section ─── */

interface DocumentsSectionProps {
  items: NavItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

function DocumentsSection({ items, selectedId, onSelect }: DocumentsSectionProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-b border-neutral-100">
      <div className="shrink-0 px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Documents
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        <div className="space-y-0.5">
          {items.map((item) => (
            <DocTreeNode
              key={item.id}
              item={item}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DocTreeNode({
  item,
  depth,
  selectedId,
  onSelect,
}: {
  item: NavItem;
  depth: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = item.id === selectedId;

  return (
    <div>
      <div
        className={cn(
          "flex w-full items-center gap-1 rounded px-1.5 py-1 text-xs transition-colors",
          isSelected
            ? "bg-primary-50 text-primary-700"
            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800",
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {/* Chevron: toggle expand only */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
            className="flex shrink-0 items-center justify-center rounded p-0.5 hover:bg-neutral-200/60"
          >
            {expanded ? (
              <ChevronDown className="size-3 text-neutral-400" />
            ) : (
              <ChevronRight className="size-3 text-neutral-400" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Clickable row: select this item */}
        <button
          onClick={() => onSelect?.(item.id)}
          className="flex flex-1 items-center gap-1.5 truncate text-left"
        >
          <span className="flex-1 truncate">{item.title}</span>
          <DocStatusIndicator status={item.status} />
        </button>
      </div>

      {hasChildren && expanded && (
        <div>
          {item.children!.map((child) => (
            <DocTreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocStatusIndicator({ status }: { status: NavItem["status"] }) {
  switch (status) {
    case "pending":
      return <Circle className="size-2 shrink-0 text-neutral-300" />;
    case "generating":
      return (
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary-500" />
        </span>
      );
    case "completed":
      return <CheckCircle2 className="size-3 shrink-0 text-success" />;
    default:
      return null;
  }
}

/* ─── Thinking Section ─── */

interface ThinkingSectionProps {
  events: AgentEvent[];
  isRunning: boolean;
}

const MAX_COLLAPSED_EVENTS = 5;

function ThinkingSection({ events, isRunning }: ThinkingSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter to displayable events
  const displayEvents = events.filter(
    (e) => e.type === "thought" || e.type === "tool_start" || e.type === "error" || e.type === "section_ready",
  );

  const visibleEvents = expanded
    ? displayEvents
    : displayEvents.slice(-MAX_COLLAPSED_EVENTS);

  // Auto-scroll when new events arrive
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayEvents.length, expanded]);

  return (
    <div className="flex shrink-0 flex-col border-t border-neutral-100">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex shrink-0 items-center gap-1 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        Thinking
        {displayEvents.length > 0 && (
          <span className="ml-1 rounded-full bg-neutral-100 px-1.5 text-[9px] font-normal">
            {displayEvents.length}
          </span>
        )}
        {isRunning && (
          <Loader2 className="ml-auto size-3 animate-spin text-primary-400" />
        )}
      </button>

      <div
        ref={scrollRef}
        className={cn(
          "overflow-y-auto px-4 pb-3 space-y-1 transition-all",
          expanded ? "max-h-80" : "max-h-28",
        )}
      >
        {visibleEvents.length === 0 && !isRunning && (
          <p className="text-[10px] text-neutral-400">No events yet</p>
        )}
        {visibleEvents.map((event) => (
          <CompactEvent key={event.id} event={event} />
        ))}
      </div>

      {!expanded && displayEvents.length > MAX_COLLAPSED_EVENTS && (
        <button
          onClick={() => setExpanded(true)}
          className="px-4 pb-2 text-left text-[10px] text-primary-500 hover:text-primary-600"
        >
          Show {displayEvents.length - MAX_COLLAPSED_EVENTS} more...
        </button>
      )}
    </div>
  );
}

function CompactEvent({ event }: { event: AgentEvent }) {
  switch (event.type) {
    case "thought":
      return (
        <div className="flex items-start gap-1.5 text-[11px] text-neutral-600">
          <Brain className="mt-0.5 size-3 shrink-0 text-violet-400" />
          <span className="line-clamp-2">{event.content}</span>
        </div>
      );
    case "tool_start":
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <Wrench className="size-3 shrink-0 text-blue-400" />
          <span className="truncate font-mono">
            {event.toolName.replace("mcp__deeplens__", "")}
            {event.args && typeof event.args === "object" && "path" in event.args
              ? `(${String(event.args.path).split("/").pop()})`
              : ""}
          </span>
        </div>
      );
    case "error":
      return (
        <div className="flex items-start gap-1.5 text-[11px] text-red-600">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span className="line-clamp-2">{event.message}</span>
        </div>
      );
    case "section_ready":
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-green-600">
          <CheckCircle2 className="size-3 shrink-0" />
          <span>{event.domainTitle} completed</span>
        </div>
      );
    default:
      return null;
  }
}
