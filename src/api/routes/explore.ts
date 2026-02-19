/**
 * POST /api/explore — Run exploration agent with SSE streaming.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { runExplorer } from "../../agent/explorer.js";

export function createExploreRoute(defaultProjectPath: string): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const targetPath = (body as Record<string, unknown>).projectPath as string | undefined || defaultProjectPath;

    if (!targetPath) {
      return c.json({ error: "projectPath is required" }, 400);
    }

    return streamSSE(c, async (stream) => {
      try {
        const outline = await runExplorer(targetPath, {
          onEvent: (event) => {
            stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event.data),
            });
          },
        });

        await stream.writeSSE({
          event: "outline_ready",
          data: JSON.stringify({ outline }),
        });
      } catch (error) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            message: String(error),
            phase: "explore",
          }),
        });
      }
    });
  });

  return app;
}
