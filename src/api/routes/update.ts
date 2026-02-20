/**
 * POST /api/update — Incremental update endpoint with SSE streaming.
 * Emits: diff_start, diff_result, impact_summary, progress, section_ready, index_update, done, error
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { runIncrementalUpdate } from "../../update/index.js";

/**
 * Create the /api/update SSE route.
 *
 * @param defaultProjectPath - Default project path from sidecar config
 * @returns Hono app with POST / handler
 */
export function createUpdateRoute(defaultProjectPath: string): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const raw = body as Record<string, unknown>;
    const targetPath =
      (raw.projectPath as string | undefined) || defaultProjectPath;
    const full = raw.full === true;

    if (!targetPath) {
      return c.json({ error: "projectPath is required" }, 400);
    }

    return streamSSE(c, async (stream) => {
      // Keepalive to prevent connection timeout during long operations
      const keepalive = setInterval(() => {
        stream.writeSSE({ event: "keepalive", data: "{}" }).catch(() => {
          clearInterval(keepalive);
        });
      }, 10_000);

      try {
        await runIncrementalUpdate(targetPath, {
          full,
          onEvent: (event) => {
            stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event.data),
            });
          },
        });
      } catch (error) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            message: String(error),
            phase: "update",
          }),
        });
      } finally {
        clearInterval(keepalive);
      }
    });
  });

  return app;
}
