import { useState, useCallback, useRef } from "react";

export type ChatMode = "fast" | "deep";

export interface ThoughtChainToolEntry {
  type: "tool";
  name: string;
  args: Record<string, unknown>;
  status: "running" | "completed" | "error";
  startedAt: number;
  durationMs?: number;
  error?: string;
}

export interface ThoughtChainReasoningEntry {
  type: "reasoning";
  text: string;
  startedAt: number;
}

export type ThoughtChainEntry =
  | ThoughtChainToolEntry
  | ThoughtChainReasoningEntry;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  thoughtChain?: ThoughtChainEntry[];
  thoughtChainDurationMs?: number;
  isStreaming?: boolean;
}

export interface SourceCitation {
  title: string;
  path: string;
  url?: string;
}

interface UseChatOptions {
  baseUrl: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
};

export function useChat({ baseUrl }: UseChatOptions) {
  const [fastState, setFastState] = useState<ChatState>(initialState);
  const [deepState, setDeepState] = useState<ChatState>(initialState);
  const [mode, setMode] = useState<ChatMode>("fast");
  const abortRef = useRef<AbortController | null>(null);

  const currentState = mode === "fast" ? fastState : deepState;

  // Keep refs to latest messages for stable closure access in sendMessage
  const fastMessagesRef = useRef(fastState.messages);
  fastMessagesRef.current = fastState.messages;
  const deepMessagesRef = useRef(deepState.messages);
  deepMessagesRef.current = deepState.messages;

  const sendMessage = useCallback(
    async (content: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        isStreaming: true,
        sources: [],
      };

      const setState = mode === "fast" ? setFastState : setDeepState;
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        error: null,
      }));

      const endpoint = mode === "fast" ? "/api/search" : "/api/investigate";

      // Extract and sanitize recent history (up to 5 messages, content only)
      const currentMessages =
        mode === "fast" ? fastMessagesRef.current : deepMessagesRef.current;
      const recentHistory = currentMessages
        .filter(
          (m): m is ChatMessage & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant",
        )
        .slice(-5)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: content, messages: recentHistory }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedContent = "";
        const thoughtChain: ThoughtChainEntry[] = [];
        let currentReasoningIdx: number | null = null;
        let thoughtChainStartedAt: number | null = null;
        const sources: SourceCitation[] = [];

        let pendingRaf = false;
        function scheduleUpdate() {
          if (pendingRaf) return;
          pendingRaf = true;
          requestAnimationFrame(() => {
            pendingRaf = false;
            const chainSnapshot = thoughtChain.map((e) => ({ ...e }));
            setState((prev) => {
              const msgs = [...prev.messages];
              const last = msgs[msgs.length - 1];
              if (last?.role === "assistant") {
                msgs[msgs.length - 1] = {
                  ...last,
                  content: accumulatedContent,
                  thoughtChain:
                    chainSnapshot.length > 0 ? chainSnapshot : undefined,
                };
              }
              return { ...prev, messages: msgs };
            });
          });
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const block of lines) {
            if (!block.trim()) continue;
            let eventType = "message";
            let data = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event: "))
                eventType = line.slice(7).trim();
              else if (line.startsWith("data: ")) data = line.slice(6);
            }
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              if (eventType === "reasoning") {
                const text = parsed.text ?? "";
                if (
                  currentReasoningIdx !== null &&
                  thoughtChain[currentReasoningIdx]?.type === "reasoning"
                ) {
                  (
                    thoughtChain[
                      currentReasoningIdx
                    ] as ThoughtChainReasoningEntry
                  ).text += text;
                } else {
                  const now = Date.now();
                  if (thoughtChainStartedAt === null)
                    thoughtChainStartedAt = now;
                  thoughtChain.push({
                    type: "reasoning",
                    text,
                    startedAt: now,
                  });
                  currentReasoningIdx = thoughtChain.length - 1;
                }
                scheduleUpdate();
              } else if (eventType === "text-delta") {
                accumulatedContent += parsed.text ?? parsed.content ?? "";
                scheduleUpdate();
              } else if (eventType === "tool_start") {
                currentReasoningIdx = null;
                const now = Date.now();
                if (thoughtChainStartedAt === null)
                  thoughtChainStartedAt = now;
                thoughtChain.push({
                  type: "tool",
                  name: parsed.tool ?? parsed.toolName ?? "unknown",
                  args: parsed.args ?? parsed.input ?? {},
                  status: "running",
                  startedAt: now,
                });
                scheduleUpdate();
              } else if (eventType === "tool_end" || eventType === "tool_error") {
                const toolName =
                  parsed.tool ?? parsed.toolName ?? "unknown";
                for (let i = thoughtChain.length - 1; i >= 0; i--) {
                  const entry = thoughtChain[i];
                  if (
                    entry.type === "tool" &&
                    entry.name === toolName &&
                    entry.status === "running"
                  ) {
                    entry.status = eventType === "tool_error" ? "error" : "completed";
                    entry.durationMs = Date.now() - entry.startedAt;
                    if (eventType === "tool_error" && parsed.error) {
                      entry.error = String(parsed.error);
                    }
                    break;
                  }
                }
                scheduleUpdate();
              } else if (eventType === "done") {
                if (parsed.sources) {
                  sources.push(...parsed.sources);
                }
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        // Finalize
        const thoughtChainDurationMs = thoughtChainStartedAt
          ? Date.now() - thoughtChainStartedAt
          : undefined;

        setState((prev) => {
          const msgs = [...prev.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              content: accumulatedContent,
              isStreaming: false,
              sources: sources.length > 0 ? sources : undefined,
              thoughtChain:
                thoughtChain.length > 0
                  ? thoughtChain.map((e) => ({ ...e }))
                  : undefined,
              thoughtChainDurationMs,
            };
          }
          return { ...prev, messages: msgs, isLoading: false };
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: (err as Error).message,
          }));
        }
      }
    },
    [baseUrl, mode],
  );

  const clearHistory = useCallback(() => {
    const setState = mode === "fast" ? setFastState : setDeepState;
    setState(initialState);
  }, [mode]);

  return {
    mode,
    setMode,
    messages: currentState.messages,
    isLoading: currentState.isLoading,
    error: currentState.error,
    sendMessage,
    clearHistory,
  };
}
