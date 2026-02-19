/**
 * Shared event types for Agent dual-mode output (CLI + Sidecar SSE).
 */

export interface AgentEvent {
  type:
    | "thought"
    | "tool_start"
    | "tool_end"
    | "progress"
    | "error"
    | "section_ready";
  data: Record<string, unknown>;
}

export interface AgentEventCallback {
  (event: AgentEvent): void;
}
