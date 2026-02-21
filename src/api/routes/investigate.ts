/**
 * POST /api/investigate — Deep Search endpoint with SSE streaming.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { deepSearch } from "../../search/deep.js";
import { resolveConfig } from "../../config/project-settings.js";
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
      const history = Array.isArray(body.messages) ? body.messages : undefined;
      const effectiveConfig = resolveConfig(config, body.projectPath ?? projectPath);

      const result = await deepSearch(
        body.query,
        store,
        embeddingClient,
        effectiveConfig,
        body.projectPath ?? projectPath,
        history,
      );

      const toolsUsed: string[] = [];
      let totalSteps = 0;
      // Buffer text-delta per step: text before a tool-call is "thinking",
      // text in a step without tools is the final answer.
      let pendingText = "";

      for await (const part of result.fullStream) {
        switch (part.type) {
          case "tool-call":
            // Flush pending text as reasoning (thinking before tool call)
            if (pendingText.trim()) {
              await stream.writeSSE({
                event: "reasoning",
                data: JSON.stringify({ text: pendingText }),
              });
            }
            pendingText = "";

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

          case "tool-error":
            await stream.writeSSE({
              event: "tool_error",
              data: JSON.stringify({
                tool: part.toolName,
                error: String(part.error),
              }),
            });
            break;

          case "reasoning-delta":
            await stream.writeSSE({
              event: "reasoning",
              data: JSON.stringify({ text: part.text }),
            });
            break;

          case "text-delta":
            pendingText += part.text;
            break;

          case "finish-step": {
            totalSteps++;
            // Flush pending text: emit as text-delta (answer content)
            if (pendingText) {
              await stream.writeSSE({
                event: "text-delta",
                data: JSON.stringify({ text: pendingText }),
              });
            }
            pendingText = "";
            break;
          }

          default:
            break;
        }
      }

      // Flush any remaining text after the last step
      if (pendingText) {
        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify({ text: pendingText }),
        });
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
