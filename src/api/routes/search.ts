/**
 * POST /api/search — Fast Search endpoint with SSE streaming.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { fastSearch } from "../../search/fast.js";
import type { VectorStore } from "../../vector/store.js";
import type { EmbeddingClient } from "../../embedding/client.js";
import type { DeepLensConfig } from "../../config/env.js";

export function createSearchRoute(
  store: VectorStore,
  embeddingClient: EmbeddingClient,
  config: DeepLensConfig,
): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.query || typeof body.query !== "string") {
      return c.json({ error: "query is required" }, 400);
    }

    // Check if index has data
    const stats = store.getAggregateStatus();
    if (stats.totalChunks === 0) {
      return c.json(
        { error: "Index not found. Run 'deeplens index' first." },
        400,
      );
    }

    return streamSSE(c, async (stream) => {
      const { stream: textStream, sources } = await fastSearch(
        body.query,
        store,
        embeddingClient,
        config,
      );

      for await (const chunk of textStream.textStream) {
        await stream.writeSSE({
          event: "text-delta",
          data: chunk,
        });
      }

      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ sources: [...new Set(sources)] }),
      });
    });
  });

  return app;
}
