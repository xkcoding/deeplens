/** Agent event types flowing through the SSE stream */

export type AgentEventType =
  | "thought"
  | "tool_start"
  | "tool_end"
  | "progress"
  | "error"
  | "phase"
  | "outline"
  | "done"
  | "doc_written"
  | "section_ready";

export interface BaseEvent {
  id: string;
  timestamp: number;
  type: AgentEventType;
}

export interface ThoughtEvent extends BaseEvent {
  type: "thought";
  content: string;
}

export interface ToolStartEvent extends BaseEvent {
  type: "tool_start";
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolEndEvent extends BaseEvent {
  type: "tool_end";
  toolName: string;
  durationMs: number;
  result?: unknown;
}

export interface ProgressEvent extends BaseEvent {
  type: "progress";
  phase: string;
  current: number;
  total: number;
}

export interface ErrorEvent extends BaseEvent {
  type: "error";
  message: string;
  phase?: string;
}

export interface PhaseEvent extends BaseEvent {
  type: "phase";
  phase: string;
}

export interface OutlineEvent extends BaseEvent {
  type: "outline";
  outline: Outline;
}

export interface DoneEvent extends BaseEvent {
  type: "done";
}

export interface DocWrittenEvent extends BaseEvent {
  type: "doc_written";
  path: string;
  content: string;
}

export interface SectionReadyEvent extends BaseEvent {
  type: "section_ready";
  domainId: string;
  domainTitle: string;
  targetFile: string;
}

export type AgentEvent =
  | ThoughtEvent
  | ToolStartEvent
  | ToolEndEvent
  | ProgressEvent
  | ErrorEvent
  | PhaseEvent
  | OutlineEvent
  | DoneEvent
  | DocWrittenEvent
  | SectionReadyEvent;

export interface EventFilters {
  thoughts: boolean;
  tools: boolean;
  errors: boolean;
}

/** Outline types — aligned with backend src/outline/types.ts */
export interface FileEntry {
  path: string;
  role: string;
  why_included: string;
}

export interface SubConcept {
  name: string;
  description: string;
  files: FileEntry[];
  sub_concepts?: SubConcept[];
}

export interface Domain {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  files: FileEntry[];
  sub_concepts?: SubConcept[];
}

export interface Outline {
  project_name: string;
  summary: string;
  detected_stack: string[];
  knowledge_graph: Domain[];
  ignored_files: Array<{ path: string; reason: string }>;
}

/** Navigation tree item */
export interface NavItem {
  id: string;
  title: string;
  type: "domain" | "concept" | "file";
  status: "pending" | "generating" | "completed";
  children?: NavItem[];
}

/** Project info from ~/.deeplens/projects.json */
export interface ProjectInfo {
  name: string;
  path: string;
  lastAnalyzed?: string;
  lastCommit?: string;
  status?: "ready" | "analyzing" | "error";
}
