import { useState, useCallback, useRef } from "react";

export type ChatMode = "fast" | "deep";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}

export interface SourceCitation {
  title: string;
  path: string;
  url?: string;
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  durationMs?: number;
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
        toolCalls: [],
      };

      const setState = mode === "fast" ? setFastState : setDeepState;
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        error: null,
      }));

      const endpoint = mode === "fast" ? "/api/search" : "/api/investigate";

      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: content }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedContent = "";
        const sources: SourceCitation[] = [];
        const toolCalls: ToolCallInfo[] = [];

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
              if (line.startsWith("event: ")) eventType = line.slice(7).trim();
              else if (line.startsWith("data: ")) data = line.slice(6);
            }
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              if (eventType === "text-delta" || parsed.type === "text-delta") {
                accumulatedContent += parsed.content ?? parsed.text ?? "";
                // Use requestAnimationFrame for batched updates
                requestAnimationFrame(() => {
                  setState((prev) => {
                    const msgs = [...prev.messages];
                    const last = msgs[msgs.length - 1];
                    if (last?.role === "assistant") {
                      msgs[msgs.length - 1] = {
                        ...last,
                        content: accumulatedContent,
                      };
                    }
                    return { ...prev, messages: msgs };
                  });
                });
              } else if (
                eventType === "tool_start" ||
                parsed.type === "tool_start"
              ) {
                toolCalls.push({
                  name: parsed.toolName ?? parsed.name ?? "unknown",
                  args: parsed.args ?? {},
                });
              } else if (
                eventType === "tool_end" ||
                parsed.type === "tool_end"
              ) {
                const last = toolCalls[toolCalls.length - 1];
                if (last) {
                  last.durationMs = parsed.durationMs ?? parsed.duration;
                }
              } else if (eventType === "done" || parsed.type === "done") {
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
        setState((prev) => {
          const msgs = [...prev.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              content: accumulatedContent,
              isStreaming: false,
              sources: sources.length > 0 ? sources : undefined,
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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
