/**
 * POST /api/analyze — Full pipeline: explore -> outline_ready -> wait for confirm -> generate.
 * Uses SSE streaming for real-time progress updates.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { runExplorer } from "../../agent/explorer.js";
import { runGenerator } from "../../agent/generator.js";
import type { Outline } from "../../outline/types.js";

export interface AnalyzeContext {
  app: Hono;
  /** Get the resolve function for the pending outline confirmation. */
  getResolveOutline: () => ((outline: Outline) => void) | null;
  /** Get the current outline produced by the explorer. */
  getCurrentOutline: () => Outline | null;
}

export function createAnalyzeRoute(defaultProjectPath: string): AnalyzeContext {
  const app = new Hono();

  // Shared state for outline confirmation handshake
  let resolveOutline: ((outline: Outline) => void) | null = null;
  let currentOutline: Outline | null = null;

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const raw = body as Record<string, unknown>;
    const targetPath = raw.projectPath as string | undefined || defaultProjectPath;

    if (!targetPath) {
      return c.json({ error: "projectPath is required" }, 400);
    }

    // Reset shared state
    resolveOutline = null;
    currentOutline = null;

    return streamSSE(c, async (stream) => {
      try {
        // Phase 1: Explore
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify({ phase: "explore", status: "started" }),
        });

        const outline = await runExplorer(targetPath, {
          onEvent: (event) => {
            stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event.data),
            });
          },
        });

        currentOutline = outline;

        await stream.writeSSE({
          event: "outline_ready",
          data: JSON.stringify({ outline }),
        });

        // Wait for confirmation via POST /api/outline/confirm
        await stream.writeSSE({
          event: "waiting",
          data: JSON.stringify({ for: "outline_confirm" }),
        });

        const confirmedOutline = await new Promise<Outline>((resolve) => {
          resolveOutline = resolve;
          // Send keepalive comments every 15s to prevent connection timeout
          const keepalive = setInterval(() => {
            stream.writeSSE({ event: "keepalive", data: "{}" }).catch(() => {
              clearInterval(keepalive);
            });
          }, 15_000);
          // Clear keepalive once resolved
          const origResolve = resolveOutline;
          resolveOutline = (o: Outline) => {
            clearInterval(keepalive);
            origResolve(o);
          };
        });

        // Phase 2: Generate
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify({ phase: "generate", status: "started" }),
        });

        await runGenerator(confirmedOutline, targetPath, {
          onEvent: (event) => {
            stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event.data),
            });
          },
        });

        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ phase: "analyze" }),
        });
      } catch (error) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            message: String(error),
            phase: "analyze",
          }),
        });
      } finally {
        resolveOutline = null;
      }
    });
  });

  return {
    app,
    getResolveOutline: () => resolveOutline,
    getCurrentOutline: () => currentOutline,
  };
}
