import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowDown, Brain, Wrench, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventTimeline } from "@/components/flow/EventTimeline";
import type { AgentEvent, EventFilters } from "@/types/events";

interface FlowPanelProps {
  events: AgentEvent[];
  filters: EventFilters;
  onFilterChange: (filters: EventFilters) => void;
  onClear: () => void;
}

const FILTER_SESSION_KEY = "deeplens-flow-filters";

function loadFilters(): EventFilters {
  try {
    const raw = sessionStorage.getItem(FILTER_SESSION_KEY);
    if (raw) return JSON.parse(raw) as EventFilters;
  } catch {
    // ignore
  }
  return { thoughts: true, tools: true, errors: true };
}

export function FlowPanel({
  events,
  filters,
  onFilterChange,
  onClear,
}: FlowPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const autoScrollRef = useRef(true);

  const isAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < 10;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      autoScrollRef.current = true;
      setShowJumpButton(false);
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();
    autoScrollRef.current = atBottom;
    setShowJumpButton(!atBottom);
  }, [isAtBottom]);

  // Auto-scroll when new events arrive
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const toggleFilter = useCallback(
    (key: keyof EventFilters) => {
      const next = { ...filters, [key]: !filters[key] };
      onFilterChange(next);
      sessionStorage.setItem(FILTER_SESSION_KEY, JSON.stringify(next));
    },
    [filters, onFilterChange],
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-neutral-200 px-3">
        <FilterToggle
          icon={<Brain className="size-3.5" />}
          label="Thoughts"
          active={filters.thoughts}
          onClick={() => toggleFilter("thoughts")}
        />
        <FilterToggle
          icon={<Wrench className="size-3.5" />}
          label="Tools"
          active={filters.tools}
          onClick={() => toggleFilter("tools")}
        />
        <FilterToggle
          icon={<AlertTriangle className="size-3.5" />}
          label="Errors"
          active={filters.errors}
          onClick={() => toggleFilter("errors")}
        />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClear}
          aria-label="Clear events"
        >
          <X className="size-3.5 text-neutral-400" />
        </Button>
      </div>

      {/* Scrollable event stream */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-3 py-2"
      >
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Waiting for agent events...
          </div>
        ) : (
          <EventTimeline events={events} filters={filters} />
        )}
      </div>

      {/* Jump to latest button */}
      {showJumpButton && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToBottom}
            className="shadow-md bg-white"
          >
            <ArrowDown className="size-3.5" />
            Jump to latest
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-neutral-100 text-neutral-700"
          : "text-neutral-400 hover:text-neutral-500",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export { loadFilters };
