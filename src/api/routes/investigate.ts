/**
 * POST /api/investigate — Deep Search endpoint with SSE streaming.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { deepSearch } from "../../search/deep.js";
import type { VectorStore } from "../../vector/store.js";
import type { EmbeddingClient } from "../../embedding/client.js";
import type { DeepLensConfig } from "../../config/env.js";

export function createInvestigateRoute(
  store: VectorStore,
  embeddingClient: EmbeddingClient,
  config: DeepLensConfig,
  projectPath: string,
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
      const result = deepSearch(
        body.query,
        store,
        embeddingClient,
        config,
        projectPath,
      );

      const toolsUsed: string[] = [];
      let totalSteps = 0;

      for await (const part of result.fullStream) {
        switch (part.type) {
          case "tool-call":
            toolsUsed.push(part.toolName);
            await stream.writeSSE({
              event: "tool_start",
              data: JSON.stringify({
                tool: part.toolName,
                args: part.input,
              }),
            });
            break;

          case "tool-result":
            await stream.writeSSE({
              event: "tool_end",
              data: JSON.stringify({ tool: part.toolName }),
            });
            break;

          case "text-delta":
            await stream.writeSSE({
              event: "text-delta",
              data: part.text,
            });
            break;

          case "finish-step":
            totalSteps++;
            break;

          default:
            break;
        }
      }

      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({
          totalSteps,
          toolsUsed: [...new Set(toolsUsed)],
        }),
      });
    });
  });

  return app;
}
