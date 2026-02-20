import type { AgentEvent, EventFilters } from "@/types/events";
import { ThoughtBlock } from "./ThoughtBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { ProgressBar } from "./ProgressBar";
import { ErrorBlock } from "./ErrorBlock";
import { PhaseSeparator } from "./PhaseSeparator";

interface EventTimelineProps {
  events: AgentEvent[];
  filters: EventFilters;
}

export function EventTimeline({ events, filters }: EventTimelineProps) {
  const filtered = events.filter((event) => {
    if (event.type === "thought" && !filters.thoughts) return false;
    if ((event.type === "tool_start" || event.type === "tool_end") && !filters.tools)
      return false;
    if (event.type === "error" && !filters.errors) return false;
    return true;
  });

  // Track last progress per phase to do in-place updates
  const lastProgressByPhase = new Map<string, AgentEvent>();
  for (const e of filtered) {
    if (e.type === "progress") {
      lastProgressByPhase.set(e.phase, e);
    }
  }

  // Deduplicate: only render the last progress event per phase
  const seenProgressPhases = new Set<string>();
  const deduped = filtered.filter((e) => {
    if (e.type === "progress") {
      if (seenProgressPhases.has(e.phase)) return false;
      seenProgressPhases.add(e.phase);
      return true;
    }
    return true;
  });

  return (
    <div className="space-y-2">
      {deduped.map((event) => {
        switch (event.type) {
          case "thought":
            return (
              <ThoughtBlock
                key={event.id}
                content={event.content}
                timestamp={event.timestamp}
              />
            );
          case "tool_start": {
            return (
              <ToolCallBlock
                key={event.id}
                toolName={event.toolName}
                args={event.args}
                isRunning={false}
              />
            );
          }
          case "tool_end":
            return null;
          case "progress": {
            const latest = lastProgressByPhase.get(event.phase);
            if (!latest || latest.type !== "progress") return null;
            return (
              <ProgressBar
                key={"progress-" + event.phase}
                phase={latest.phase}
                current={latest.current}
                total={latest.total}
              />
            );
          }
          case "error":
            return (
              <ErrorBlock
                key={event.id}
                message={event.message}
                phase={event.phase}
              />
            );
          case "phase":
            return (
              <PhaseSeparator key={event.id} phase={event.phase} />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

