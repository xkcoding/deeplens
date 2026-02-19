/**
 * Deep Search — Agent Loop with tool calling via streamText + maxSteps.
 */

import { streamText, stepCountIs, type StreamTextResult } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createDeepSearchTools } from "./tools.js";
import type { VectorStore } from "../vector/store.js";
import type { EmbeddingClient } from "../embedding/client.js";
import type { DeepLensConfig } from "../config/env.js";

// ── Constants ──────────────────────────────────────

const DEEP_SEARCH_SYSTEM_PROMPT = `You are a senior software engineer investigating a codebase.
You have access to tools that let you search documentation, search source code, read files, and grep for patterns.

Investigation strategy:
1. Start by using search_docs or search_code to find relevant information related to the question.
2. If you need more details about a specific file, use read_file to examine it.
3. If you need to locate where something is defined or used, use grep_search.
4. Combine information from multiple sources to build a comprehensive understanding.
5. Once you have gathered enough evidence, produce a thorough answer.

Rules:
- Always cite specific file paths and line numbers when referencing code or documentation.
- If the first search does not yield good results, try rephrasing the query or using a different tool.
- Do NOT guess. Only state facts you can verify through the tools.
- Format your final answer in Markdown with code blocks where appropriate.
- Be thorough but concise.`;

// ── Deep Search ───────────────────────────────────

export function deepSearch(
  query: string,
  store: VectorStore,
  embeddingClient: EmbeddingClient,
  config: DeepLensConfig,
  projectPath: string,
): StreamTextResult<any, any> {
  const tools = createDeepSearchTools(store, embeddingClient, projectPath);

  const siliconflow = createOpenAICompatible({
    name: "siliconflow",
    apiKey: config.siliconflowApiKey!,
    baseURL: config.siliconflowBaseUrl ?? "https://api.siliconflow.cn/v1",
  });

  const result = streamText({
    model: siliconflow.chatModel(
      config.siliconflowLlmModel ?? "deepseek-ai/DeepSeek-V3",
    ),
    system: DEEP_SEARCH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: query }],
    tools,
    stopWhen: stepCountIs(10),
  });

  return result;
}
