/**
 * Fast Search — query embedding → KNN top-5 → context assembly → streamText.
 */

import { streamText, type StreamTextResult } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { VectorStore, SearchResult } from "../vector/store.js";
import type { EmbeddingClient } from "../embedding/client.js";
import type { DeepLensConfig } from "../config/env.js";

// ── Types ──────────────────────────────────────────

export interface FastSearchResult {
  stream: StreamTextResult<any, any>;
  sources: string[];
}

// ── Constants ──────────────────────────────────────

/** Approximate token limit for assembled context. ~6000 tokens ≈ 24000 chars. */
const MAX_CONTEXT_CHARS = 24_000;

const FAST_SEARCH_SYSTEM_PROMPT = `You are a documentation assistant for a software project.
Answer the user's question based ONLY on the provided context snippets.
Each snippet is labeled with a source file path and an optional header path.

Rules:
- Ground every claim in the provided context. Cite the source path when referencing information.
- If the context does not contain enough information to answer, say so honestly and suggest running a deep search for more thorough investigation.
- Be concise and direct. Use code examples from the context when relevant.
- Format your answer in Markdown.`;

// ── Fast Search ───────────────────────────────────

export async function fastSearch(
  query: string,
  store: VectorStore,
  embeddingClient: EmbeddingClient,
  config: DeepLensConfig,
): Promise<FastSearchResult> {
  // 1. Embed the query with "query" mode (Instruct prefix)
  const queryVector = await embeddingClient.embedSingle(query, "query");

  // 2. KNN top-5
  let results = store.search(queryVector, 5);

  // 3. Context assembly with token budget
  let context = assembleContext(results);
  if (context.length > MAX_CONTEXT_CHARS && results.length > 3) {
    results = results.slice(0, 3);
    context = assembleContext(results);
  }

  // 4. Stream LLM response
  const siliconflow = createOpenAICompatible({
    name: "siliconflow",
    apiKey: config.siliconflowApiKey!,
    baseURL: config.siliconflowBaseUrl ?? "https://api.siliconflow.cn/v1",
  });

  const result = streamText({
    model: siliconflow.chatModel(
      config.siliconflowLlmModel ?? "deepseek-ai/DeepSeek-V3",
    ),
    system: `${FAST_SEARCH_SYSTEM_PROMPT}\n\n<context>\n${context}\n</context>`,
    messages: [{ role: "user", content: query }],
  });

  return {
    stream: result,
    sources: results.map((r) => r.sourcePath),
  };
}

// ── Helpers ────────────────────────────────────────

function assembleContext(results: SearchResult[]): string {
  return results
    .map((r, i) => {
      const header = r.headerPath ? ` | ${r.headerPath}` : "";
      const lines =
        r.startLine != null && r.endLine != null
          ? ` (lines ${r.startLine}-${r.endLine})`
          : "";
      return `[Snippet ${i + 1}] ${r.sourcePath}${header}${lines}\n${r.content}`;
    })
    .join("\n\n---\n\n");
}
