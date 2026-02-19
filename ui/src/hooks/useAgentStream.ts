import { useState, useCallback, useRef } from "react";
import type { AgentEvent, Outline } from "@/types/events";

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
}

const initialState: AgentStreamState = {
  events: [],
  phase: null,
  outline: null,
  isWaiting: false,
  isRunning: false,
  error: null,
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
      });

      try {
        const response = await fetch(`${options.baseUrl}${url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = parseSSE(buffer);

          // Keep any incomplete block in buffer
          const lastNewline = buffer.lastIndexOf("\n\n");
          buffer = lastNewline >= 0 ? buffer.slice(lastNewline + 2) : buffer;

          for (const msg of messages) {
            try {
              const event = JSON.parse(msg.data) as AgentEvent;
              setState((prev) => {
                const newEvents = [...prev.events, event];
                return {
                  ...prev,
                  events: newEvents,
                  phase: event.type === "phase" ? event.phase : prev.phase,
                  outline:
                    event.type === "outline" ? event.outline : prev.outline,
                  isWaiting: event.type === "outline" && !prev.outline,
                  error:
                    event.type === "error"
                      ? event.message
                      : prev.error,
                };
              });
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
  };
}
