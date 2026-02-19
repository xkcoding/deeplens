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
  // Pair tool_start with tool_end events
  const toolDurations = new Map<string, number>();
  for (const e of events) {
    if (e.type === "tool_end") {
      toolDurations.set(e.toolName + "-" + findToolStartId(events, e), e.durationMs);
    }
  }

  const filtered = events.filter((event) => {
    if (event.type === "thought" && !filters.thoughts) return false;
    if ((event.type === "tool_start" || event.type === "tool_end") && !filters.tools)
      return false;
    if (event.type === "error" && !filters.errors) return false;
    return true;
  });

  // Track which tool_starts have been ended to show duration
  const endedTools = new Set<string>();
  for (const e of events) {
    if (e.type === "tool_end") {
      endedTools.add(e.id);
    }
  }

  // Build a map of tool_start id -> tool_end for matching
  const toolEndMap = new Map<string, AgentEvent>();
  for (const e of events) {
    if (e.type === "tool_end") {
      // Find matching start by toolName + closest preceding start
      for (let i = events.indexOf(e) - 1; i >= 0; i--) {
        const candidate = events[i];
        if (candidate.type === "tool_start" && candidate.toolName === e.toolName) {
          toolEndMap.set(candidate.id, e);
          break;
        }
      }
    }
  }

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
      // We'll render the latest one
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
            const end = toolEndMap.get(event.id);
            return (
              <ToolCallBlock
                key={event.id}
                toolName={event.toolName}
                args={event.args}
                durationMs={
                  end?.type === "tool_end" ? end.durationMs : undefined
                }
                isRunning={!end}
              />
            );
          }
          case "tool_end":
            // Rendered as part of tool_start
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

function findToolStartId(events: AgentEvent[], endEvent: AgentEvent): string {
  if (endEvent.type !== "tool_end") return "";
  for (let i = events.indexOf(endEvent) - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "tool_start" && e.toolName === endEvent.toolName) {
      return e.id;
    }
  }
  return "";
}
