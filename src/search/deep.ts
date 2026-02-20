/**
 * Deep Search — RAG pre-search + Agent Loop with tool calling via streamText + maxSteps.
 * 1. Embeds the query and retrieves initial context from both docs and code.
 * 2. Injects the initial context into the system prompt.
 * 3. Runs an agent loop with tool calling for deeper investigation.
 *
 * Uses OpenRouter as LLM provider for streaming + tool calling.
 * OpenRouter correctly handles streaming after tool results (unlike SiliconFlow).
 */

import {
  streamText,
  stepCountIs,
  type StreamTextResult,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createDeepSearchTools } from "./tools.js";
import type { VectorStore, SearchResult } from "../vector/store.js";
import type { EmbeddingClient } from "../embedding/client.js";
import type { DeepLensConfig } from "../config/env.js";

// ── Constants ─────────────────────────────────────

/** Max chars for initial RAG context injected into the system prompt. */
const MAX_INITIAL_CONTEXT_CHARS = 16_000;

// ── System Prompt ─────────────────────────────────

function buildSystemPrompt(projectPath: string, initialContext: string): string {
  return `You are a code investigator analyzing the project at: ${projectPath}

You have 4 tools available. Before calling each tool, briefly state what you're looking for and why.
After gathering enough information, provide a comprehensive answer.

## Initial Context

Below are relevant snippets retrieved from the project's indexed documents and code.
Use this as a starting point — if you need more detail, use the tools to dig deeper.

${initialContext}

## Tools

| Tool | Type | Best for |
|------|------|----------|
| search_docs | Semantic search on indexed docs | Finding concepts, features, architecture |
| search_code | Semantic search on indexed code | Finding implementations, patterns, functions |
| read_file | Read a file by path | Examining a specific file you already know about |
| grep_search | Regex/text pattern matching on source files | Finding exact strings, identifiers, definitions |

## Key distinctions
- **search_docs / search_code**: Use natural language queries (e.g. "authentication middleware"). These search a pre-built vector index — NOT a keyword match.
- **grep_search**: Use exact text patterns or regex (e.g. "createDeepSearchTools", "export function"). This runs grep on actual files.
- **read_file**: Use when you already know the file path from a prior search result.

## Strategy
1. Review the Initial Context above — it may already contain useful information.
2. Use search_code or grep_search to locate additional relevant code.
3. Use read_file to examine specific files found in searches.
4. If needed, use search_docs for high-level documentation context.
5. Synthesize findings into a clear, well-cited answer.

## Rules
- Cite file paths and line numbers.
- If a search yields no results, rephrase or try a different tool.
- Only state facts you have verified through tools or the initial context.
- Format your final answer in Markdown.
- Be thorough but concise.`;
}

// ── Deep Search ───────────────────────────────────

export async function deepSearch(
  query: string,
  store: VectorStore,
  embeddingClient: EmbeddingClient,
  config: DeepLensConfig,
  projectPath: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<StreamTextResult<any, any>> {
  // 1. RAG pre-search: embed query → search both docs and code
  const queryVector = await embeddingClient.embedSingle(query, "query");
  const docResults = store.search(queryVector, 3, "doc");
  const codeResults = store.search(queryVector, 5, "code");

  // 2. Assemble initial context (code gets more slots since this is deep code analysis)
  let initialContext = assembleContext([...docResults, ...codeResults]);
  if (initialContext.length > MAX_INITIAL_CONTEXT_CHARS) {
    // Trim: keep top-3 code + top-2 docs
    const trimmed = [...docResults.slice(0, 2), ...codeResults.slice(0, 3)];
    initialContext = assembleContext(trimmed);
  }

  // 3. Set up tools and model
  const tools = createDeepSearchTools(store, embeddingClient, projectPath);

  const openrouter = createOpenAICompatible({
    name: "openrouter",
    apiKey: config.openrouterApiKey!,
    baseURL: config.openrouterBaseUrl ?? "https://openrouter.ai/api/v1",
  });

  const model = openrouter.chatModel(
    config.openrouterLlmModel ?? "qwen/qwen3-32b",
  );

  // 4. Agent loop with initial RAG context injected
  const result = streamText({
    model,
    system: buildSystemPrompt(projectPath, initialContext),
    messages: [...(history ?? []), { role: "user" as const, content: query }],
    tools,
    maxOutputTokens: 16384,
    stopWhen: stepCountIs(10),
    providerOptions: {
      openrouter: { enable_thinking: true, thinking_budget: 4096 },
    },
  });

  return result;
}

// ── Helpers ────────────────────────────────────────

function assembleContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return "(No initial results found — use the tools to search.)";
  }

  return results
    .map((r, i) => {
      const typeLabel = r.sourceType === "doc" ? "Doc" : "Code";
      const header = r.headerPath ? ` | ${r.headerPath}` : "";
      const lines =
        r.startLine != null && r.endLine != null
          ? ` (lines ${r.startLine}-${r.endLine})`
          : "";
      return `[${typeLabel} ${i + 1}] ${r.sourcePath}${header}${lines}\n${r.content}`;
    })
    .join("\n\n---\n\n");
}
