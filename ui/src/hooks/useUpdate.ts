/**
 * useUpdate hook — handles incremental update SSE stream consumption.
 * Prepared for integration into AppHeader "Update" button by the Lead.
 */

import { useState, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────

export interface UpdateState {
  isRunning: boolean;
  phase: string | null;
  error: string | null;
  result: UpdateResult | null;
  impactSummary: ImpactSummary | null;
}

export interface ImpactSummary {
  affectedDomains: string[];
  unchangedDomains: string[];
  untrackedFiles: string[];
  affectedCount: number;
  totalDomains: number;
}

export interface UpdateResult {
  mode: "incremental" | "full" | "skipped";
  message: string;
}

interface UseUpdateOptions {
  baseUrl: string;
}

// ── SSE Parser ────────────────────────────────────

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

// ── Hook ──────────────────────────────────────────

export function useUpdate(options: UseUpdateOptions) {
  const [state, setState] = useState<UpdateState>({
    isRunning: false,
    phase: null,
    error: null,
    result: null,
    impactSummary: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const startUpdate = useCallback(
    async (projectPath: string, full?: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        isRunning: true,
        phase: "starting",
        error: null,
        result: null,
        impactSummary: null,
      });

      try {
        const response = await fetch(`${options.baseUrl}/api/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectPath, full }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
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
              const raw = JSON.parse(msg.data) as Record<string, unknown>;

              switch (msg.event) {
                case "diff_start":
                  setState((prev) => ({ ...prev, phase: "diff" }));
                  break;
                case "diff_result":
                  setState((prev) => ({
                    ...prev,
                    phase: "impact",
                  }));
                  break;
                case "impact_summary":
                  setState((prev) => ({
                    ...prev,
                    phase: "generate",
                    impactSummary: raw as unknown as ImpactSummary,
                  }));
                  break;
                case "progress":
                  setState((prev) => ({
                    ...prev,
                    phase: (raw.phase as string) ?? prev.phase,
                  }));
                  break;
                case "index_update":
                  setState((prev) => ({ ...prev, phase: "indexing" }));
                  break;
                case "done":
                  setState((prev) => ({
                    ...prev,
                    isRunning: false,
                    phase: "done",
                    result: {
                      mode: (raw.mode as UpdateResult["mode"]) ?? "incremental",
                      message: (raw.message as string) ?? "Update complete",
                    },
                  }));
                  break;
                case "error":
                  setState((prev) => ({
                    ...prev,
                    isRunning: false,
                    phase: "error",
                    error: (raw.message as string) ?? "Unknown error",
                  }));
                  break;
                case "keepalive":
                  break;
                default:
                  break;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        // If stream ends without explicit done/error
        setState((prev) =>
          prev.isRunning ? { ...prev, isRunning: false } : prev,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            isRunning: false,
            phase: "error",
            error: (err as Error).message,
          }));
        }
      }
    },
    [options.baseUrl],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      isRunning: false,
      phase: null,
      error: null,
      result: null,
      impactSummary: null,
    });
  }, []);

  return {
    state,
    startUpdate,
    reset,
  };
}
