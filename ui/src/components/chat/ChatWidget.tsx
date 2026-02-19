import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { SourceCitations } from "./SourceCitations";
import { ToolCallCard } from "./ToolCallCard";
import { useChat, type ChatMode } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface ChatWidgetProps {
  baseUrl: string;
  indexReady: boolean;
  onNavigate?: (path: string) => void;
}

export function ChatWidget({ baseUrl, indexReady, onNavigate }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    mode,
    setMode,
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
  } = useChat({ baseUrl });

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading || !indexReady) return;
    sendMessage(trimmed);
    setInputValue("");
  }, [inputValue, isLoading, indexReady, sendMessage]);

  // Toggle button (collapsed state)
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-4 z-20 flex size-10 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 transition-colors"
        aria-label="Open chat"
      >
        <MessageSquare className="size-5" />
      </button>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-[var(--height-chat-widget)] flex-col border-t border-neutral-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary-500" />
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as ChatMode)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="fast" className="px-2 py-0.5 text-xs">
                Fast
              </TabsTrigger>
              <TabsTrigger value="deep" className="px-2 py-0.5 text-xs">
                Deep
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={clearHistory} title="Clear history">
            <Trash2 className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => setOpen(false)} title="Close chat">
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {!indexReady && (
            <div className="flex items-center gap-2 rounded-lg bg-warning-bg p-3 text-xs text-warning">
              <AlertCircle className="size-4 shrink-0" />
              <span>Run analysis first to enable Q&A</span>
            </div>
          )}

          {messages.length === 0 && indexReady && (
            <div className="py-8 text-center text-xs text-neutral-400">
              Ask questions about the analyzed codebase
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage message={msg} />

              {/* Tool calls (deep mode only) */}
              {mode === "deep" &&
                msg.toolCalls &&
                msg.toolCalls.length > 0 && (
                  <div className="ml-0 mt-1 space-y-1">
                    {msg.toolCalls.map((tc, i) => (
                      <ToolCallCard key={i} toolCall={tc} />
                    ))}
                  </div>
                )}

              {/* Source citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="ml-0 mt-1">
                  <SourceCitations
                    sources={msg.sources}
                    onNavigate={onNavigate}
                  />
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="rounded bg-error-bg p-2 text-xs text-error">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t border-neutral-200 p-2">
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              indexReady
                ? `Ask a question (${mode === "fast" ? "Fast" : "Deep"} mode)...`
                : "Analysis required..."
            }
            disabled={!indexReady}
            className={cn("h-8 text-xs", !indexReady && "opacity-50")}
          />
          <Button
            size="icon-xs"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || !indexReady}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
