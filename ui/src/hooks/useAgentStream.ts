import { useState, useCallback, useRef } from "react";
import type { AgentEvent, NavItem, Outline } from "@/types/events";

interface UseAgentStreamOptions {
  baseUrl: string;
}

export interface AgentStreamState {
  events: AgentEvent[];
  phase: string | null;
  outline: Outline | null;
  isWaiting: boolean;
  isRunning: boolean;
  error: string | null;
  documents: Map<string, string>;
  navItems: NavItem[];
  generateProgress: { phase: string; current: number; total: number } | null;
  activeDocPath: string | null;
}

const initialState: AgentStreamState = {
  events: [],
  phase: null,
  outline: null,
  isWaiting: false,
  isRunning: false,
  error: null,
  documents: new Map(),
  navItems: [],
  generateProgress: null,
  activeDocPath: null,
};

function parseSSE(chunk: string): Array<{ event: string; data: string }> {
  const messages: Array<{ event: string; data: string }> = [];
  const blocks = chunk.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    let event = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) {
        event = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        data = line.slice(6);
      }
    }
    if (data) {
      messages.push({ event, data });
    }
  }
  return messages;
}

/**
 * Convert a file slug like "explorer-agent" to readable title "Explorer Agent".
 * Same logic as VitePress sidebar.ts — keeps both sidebars consistent.
 */
function fileNameToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Sentinel id for the Overview nav item (index.md). */
export const OVERVIEW_NAV_ID = "__overview__";

/** Sentinel id for the Summary nav item (summary.md). */
export const SUMMARY_NAV_ID = "__summary__";

/**
 * Build NavItem tree from outline's knowledge_graph.
 * Prepends an "Overview" entry for the top-level index.md.
 * Children are NOT pre-populated from sub_concepts — they are built dynamically
 * from actual doc_written events, keeping the sidebar consistent with VitePress.
 */
function outlineToNavItems(outline: Outline): NavItem[] {
  const overview: NavItem = {
    id: OVERVIEW_NAV_ID,
    title: "Overview",
    type: "domain" as const,
    status: "pending" as const,
    children: [],
  };

  const domains = outline.knowledge_graph.map((d) => ({
    id: d.id,
    title: d.title,
    type: "domain" as const,
    status: "pending" as const,
    children: [],
  }));

  const summary: NavItem = {
    id: SUMMARY_NAV_ID,
    title: "Summary",
    type: "domain" as const,
    status: "pending" as const,
    children: [],
  };

  return [overview, ...domains, summary];
}

/**
 * Update a specific domain's status in the navItems tree (immutable).
 * Also propagates status to all children (sub_concepts).
 */
function updateNavItemStatus(
  items: NavItem[],
  domainId: string,
  status: NavItem["status"],
): NavItem[] {
  return items.map((item) =>
    item.id === domainId
      ? {
          ...item,
          status,
          children: item.children?.map((c) => ({ ...c, status })),
        }
      : item,
  );
}

/**
 * Find which domain a file path belongs to.
 * Paths look like: domains/<domain-id>/index.md or domains/<domain-id>/<component>.md
 */
function domainIdFromPath(path: string): string | null {
  const match = path.match(/^domains\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Transform backend SSE event into frontend AgentEvent.
 */
let _eventId = 0;
function toAgentEvent(
  sseEvent: string,
  raw: Record<string, unknown>,
): AgentEvent | null {
  const base = { id: `evt-${++_eventId}`, timestamp: Date.now() };

  switch (sseEvent) {
    case "thought":
      return { ...base, type: "thought", content: (raw.content as string) ?? "" };

    case "tool_start":
      return {
        ...base,
        type: "tool_start",
        toolName: (raw.tool as string) ?? "unknown",
        args: (raw.args as Record<string, unknown>) ?? {},
      };

    case "tool_end":
      return {
        ...base,
        type: "tool_end",
        toolName: (raw.tool as string) ?? "unknown",
        durationMs: (raw.durationMs as number) ?? 0,
      };

    case "progress":
      if (typeof raw.current === "number" && typeof raw.total === "number") {
        return {
          ...base,
          type: "progress",
          phase: (raw.phase as string) ?? "",
          current: raw.current,
          total: raw.total,
        };
      }
      // Also handle "completed" field from generator (uses completed instead of current)
      if (typeof raw.completed === "number" && typeof raw.total === "number") {
        return {
          ...base,
          type: "progress",
          phase: (raw.phase as string) ?? "",
          current: raw.completed,
          total: raw.total,
        };
      }
      return {
        ...base,
        type: "phase",
        phase: (raw.phase as string) ?? "",
      };

    case "outline_ready":
      return {
        ...base,
        type: "outline",
        outline: raw.outline as Outline,
      };

    case "doc_written":
      return {
        ...base,
        type: "doc_written",
        path: (raw.path as string) ?? "",
        content: (raw.content as string) ?? "",
      };

    case "section_ready":
      return {
        ...base,
        type: "section_ready",
        domainId: (raw.domain_id as string) ?? "",
        domainTitle: (raw.domain_title as string) ?? "",
        targetFile: (raw.target_file as string) ?? "",
      };

    case "error":
      return {
        ...base,
        type: "error",
        message: (raw.message as string) ?? String(raw),
        phase: raw.phase as string | undefined,
      };

    case "done":
      return { ...base, type: "done" };

    case "waiting":
    case "keepalive":
      return null;

    default:
      return null;
  }
}

/**
 * Pure function: apply a single event to produce the next state.
 * Used by both live SSE consumption and session replay.
 */
function applyEvent(prev: AgentStreamState, event: AgentEvent): AgentStreamState {
  const newEvents = [...prev.events, event];
  let nextDocuments = prev.documents;
  let nextNavItems = prev.navItems;
  let nextActiveDocPath = prev.activeDocPath;
  let nextGenerateProgress = prev.generateProgress;

  // Handle doc_written: update documents map + navItem status
  if (event.type === "doc_written") {
    nextActiveDocPath = event.path;
    // During live SSE, content is present; during replay it may be empty (filled later)
    if (event.content) {
      nextDocuments = new Map(prev.documents);
      nextDocuments.set(event.path, event.content);
    }

    const dId = domainIdFromPath(event.path);
    if (dId) {
      const spokeMatch = event.path.match(/^domains\/[^/]+\/(.+)\.md$/);
      const isHub = spokeMatch && spokeMatch[1] === "index";

      if (spokeMatch && !isHub) {
        // Spoke file: dynamically add/update child in the domain
        const slug = spokeMatch[1];
        const childId = `${dId}/${slug}`;
        const source = nextNavItems === prev.navItems ? prev.navItems : nextNavItems;
        nextNavItems = source.map((item) => {
          if (item.id !== dId) return item;
          const children = [...(item.children ?? [])];
          const existingIdx = children.findIndex((c) => c.id === childId);
          if (existingIdx >= 0) {
            children[existingIdx] = { ...children[existingIdx], status: "generating" };
          } else {
            children.push({
              id: childId,
              title: fileNameToTitle(slug),
              type: "concept" as const,
              status: "generating" as const,
            });
          }
          return {
            ...item,
            status: item.status === "completed" ? item.status : "generating",
            children,
          };
        });
      } else {
        // Hub (index.md): mark domain as generating
        const source = nextNavItems === prev.navItems ? prev.navItems : nextNavItems;
        const existing = source.find((n) => n.id === dId);
        if (existing && existing.status !== "completed") {
          nextNavItems = updateNavItemStatus(source, dId, "generating");
        }
      }
    } else if (event.path === "index.md") {
      // Top-level index.md: mark Overview as completed (single-file, one write = done)
      nextNavItems = updateNavItemStatus(
        nextNavItems === prev.navItems ? prev.navItems : nextNavItems,
        OVERVIEW_NAV_ID,
        "completed",
      );
    } else if (event.path === "summary.md") {
      // Top-level summary.md: mark Summary as completed
      nextNavItems = updateNavItemStatus(
        nextNavItems === prev.navItems ? prev.navItems : nextNavItems,
        SUMMARY_NAV_ID,
        "completed",
      );
    }
  }

  // Handle section_ready: mark domain as completed
  if (event.type === "section_ready") {
    nextNavItems = updateNavItemStatus(
      nextNavItems === prev.navItems ? prev.navItems : nextNavItems,
      event.domainId,
      "completed",
    );
  }

  // Handle outline: build navItems from outline
  if (event.type === "outline") {
    nextNavItems = outlineToNavItems(event.outline);
  }

  // Handle progress with generate/overview/summary phase: update generateProgress
  if (event.type === "progress" && (event.phase === "generate" || event.phase === "overview" || event.phase === "summary")) {
    nextGenerateProgress = {
      phase: event.phase,
      current: event.current,
      total: event.total,
    };
  }

  // Reset generateProgress when entering a new phase so the header
  // doesn't show stale progress from the previous phase.
  if (event.type === "phase") {
    nextGenerateProgress = null;
  }

  return {
    ...prev,
    events: newEvents,
    phase: event.type === "phase" ? event.phase : prev.phase,
    outline: event.type === "outline" ? event.outline : prev.outline,
    isWaiting: event.type === "outline" && !prev.outline,
    error: event.type === "error" ? event.message : prev.error,
    documents: nextDocuments,
    navItems: nextNavItems,
    activeDocPath: nextActiveDocPath,
    generateProgress: nextGenerateProgress,
  };
}

export function useAgentStream(options: UseAgentStreamOptions) {
  const [state, setState] = useState<AgentStreamState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const consumeStream = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        ...initialState,
        isRunning: true,
        documents: new Map(),
      });

      try {
        console.log(`[useAgentStream] POST ${options.baseUrl}${url}`, body);
        const response = await fetch(`${options.baseUrl}${url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        console.log(`[useAgentStream] Response: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null — streaming not supported");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = parseSSE(buffer);

          const lastNewline = buffer.lastIndexOf("\n\n");
          buffer = lastNewline >= 0 ? buffer.slice(lastNewline + 2) : buffer;

          for (const msg of messages) {
            try {
              console.log(`[useAgentStream] SSE event=${msg.event}`, msg.data.slice(0, 200));
              const raw = JSON.parse(msg.data) as Record<string, unknown>;
              const event = toAgentEvent(msg.event, raw);
              if (!event) continue;

              setState((prev) => applyEvent(prev, event));
            } catch {
              // skip malformed JSON
            }
          }
        }

        setState((prev) => ({
          ...prev,
          isRunning: false,
          isWaiting: false,
        }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            isRunning: false,
            isWaiting: false,
            error: (err as Error).message,
          }));
        }
      }
    },
    [options.baseUrl],
  );

  const replaySession = useCallback(
    async (
      rawEvents: Array<{ ts: number; event: string; data: Record<string, unknown> }>,
      projectPath?: string,
    ) => {
      // 1. Batch-process all events through applyEvent
      let replayState: AgentStreamState = {
        ...initialState,
        documents: new Map(),
      };
      const docPaths: string[] = [];

      for (const raw of rawEvents) {
        const event = toAgentEvent(raw.event, raw.data);
        if (!event) continue;
        replayState = applyEvent(replayState, event);
        if (event.type === "doc_written") {
          docPaths.push(event.path);
        }
      }

      // 2. Batch-fetch doc file contents (pass projectPath so sidecar reads from correct dir)
      if (docPaths.length > 0) {
        try {
          const res = await fetch(`${options.baseUrl}/api/docs/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectPath, paths: docPaths }),
          });
          const { files } = (await res.json()) as { files: Record<string, string> };
          const docsMap = new Map(replayState.documents);
          for (const [p, content] of Object.entries(files)) {
            docsMap.set(p, content);
          }
          replayState = { ...replayState, documents: docsMap };
        } catch {
          // docs fetch failed — documents may show empty preview
        }
      }

      // 3. Set final state — preserve isWaiting from replay (e.g. HITL paused sessions)
      setState({
        ...replayState,
        isRunning: false,
      });
    },
    [options.baseUrl],
  );

  const startAnalyze = useCallback(
    (projectPath: string) =>
      consumeStream("/api/analyze", { projectPath }),
    [consumeStream],
  );

  const startExplore = useCallback(
    (projectPath: string) =>
      consumeStream("/api/explore", { projectPath }),
    [consumeStream],
  );

  const startGenerate = useCallback(
    (projectPath: string) =>
      consumeStream("/api/generate", { projectPath }),
    [consumeStream],
  );

  const confirmOutline = useCallback(
    async (projectPath: string, outline: Outline) => {
      try {
        const response = await fetch(`${options.baseUrl}/api/outline/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectPath, outline }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // Rebuild navItems from confirmed outline (reflects HITL edits: reorder, rename, add/remove)
        setState((prev) => ({
          ...prev,
          outline,
          navItems: outlineToNavItems(outline),
          isWaiting: false,
        }));
        return await response.json();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: (err as Error).message,
        }));
      }
    },
    [options.baseUrl],
  );

  /**
   * Fallback: reconstruct state directly from outline + docs on disk
   * (when session.jsonl doesn't exist but .deeplens/ has data).
   * Builds children from actual doc paths (same as VitePress sidebar).
   */
  const loadFromDisk = useCallback(
    (outline: Outline, docs: Record<string, string>) => {
      const docPaths = Object.keys(docs);
      const navItems = outlineToNavItems(outline).map((item) => {
        // Build children from actual spoke files for this domain
        const children: NavItem[] = [];
        for (const p of docPaths) {
          const match = p.match(/^domains\/([^/]+)\/(.+)\.md$/);
          if (match && match[1] === item.id && match[2] !== "index") {
            children.push({
              id: `${item.id}/${match[2]}`,
              title: fileNameToTitle(match[2]),
              type: "concept" as const,
              status: "completed" as const,
            });
          }
        }
        return {
          ...item,
          status: "completed" as const,
          children,
        };
      });

      const documents = new Map<string, string>();
      let lastDocPath: string | null = null;
      for (const [p, content] of Object.entries(docs)) {
        documents.set(p, content);
        lastDocPath = p;
      }

      setState({
        ...initialState,
        phase: "generate",
        outline,
        navItems,
        documents,
        activeDocPath: lastDocPath,
        isRunning: false,
        isWaiting: false,
        events: [{ id: "evt-disk-0", timestamp: Date.now(), type: "done" } as AgentEvent],
      });
    },
    [],
  );

  const clearEvents = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return {
    state,
    startAnalyze,
    startExplore,
    startGenerate,
    confirmOutline,
    clearEvents,
    replaySession,
    loadFromDisk,
  };
}
