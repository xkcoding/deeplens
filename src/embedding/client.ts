/**
 * Embedding client — OpenRouter Embedding API via Vercel AI SDK.
 */

import { embed, embedMany } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { DeepLensConfig } from "../config/env.js";

// ── Types ──────────────────────────────────────────

export type EmbedMode = "document" | "query";

// ── Constants ──────────────────────────────────────

const QUERY_INSTRUCTION_PREFIX =
  "Instruct: Given a user question about a software project, retrieve the relevant documentation or code.\nQuery: ";

const BATCH_SIZE = 20;

// ── EmbeddingClient ────────────────────────────────

export class EmbeddingClient {
  private provider;
  private modelId: string;

  constructor(config: DeepLensConfig) {
    if (!config.openrouterApiKey) {
      throw new Error(
        "OPENROUTER_API_KEY is required for embedding operations. " +
          "Set it in .env or as an environment variable.",
      );
    }

    this.provider = createOpenAICompatible({
      name: "openrouter",
      apiKey: config.openrouterApiKey,
      baseURL: config.openrouterBaseUrl ?? "https://openrouter.ai/api/v1",
    });

    this.modelId =
      config.openrouterEmbedModel ?? "qwen/qwen3-embedding-8b";
  }

  /**
   * Embed a single text value.
   * In "query" mode, prepends the instruction prefix for better retrieval.
   */
  async embedSingle(
    text: string,
    mode: EmbedMode = "document",
  ): Promise<Float32Array> {
    const input = mode === "query" ? QUERY_INSTRUCTION_PREFIX + text : text;

    const result = await embed({
      model: this.provider.embeddingModel(this.modelId),
      value: input,
      maxRetries: 3,
    });

    return new Float32Array(result.embedding);
  }

  /**
   * Embed multiple text values in batches.
   * Returns Float32Array vectors in the same order as input.
   */
  async embedBatch(
    texts: string[],
    mode: EmbedMode = "document",
  ): Promise<Float32Array[]> {
    if (texts.length === 0) return [];

    const inputs =
      mode === "query"
        ? texts.map((t) => QUERY_INSTRUCTION_PREFIX + t)
        : texts;

    const allEmbeddings: Float32Array[] = [];

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);

      const result = await embedMany({
        model: this.provider.embeddingModel(this.modelId),
        values: batch,
        maxRetries: 3,
      });

      for (const emb of result.embeddings) {
        allEmbeddings.push(new Float32Array(emb));
      }
    }

    return allEmbeddings;
  }
}
