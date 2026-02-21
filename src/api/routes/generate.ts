/**
 * POST /api/generate — Run generation agent with SSE streaming.
 * Expects { outline, projectPath? } in the request body.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import path from "node:path";
import { runGenerator, runOverviewGenerator, runSummaryGenerator } from "../../agent/generator.js";
import { sanitizeMermaidBlocks } from "../../vitepress/sanitize-mermaid.js";
import { outlineSchema } from "../../outline/types.js";

export function createGenerateRoute(defaultProjectPath: string): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const raw = body as Record<string, unknown>;
    const targetPath = raw.projectPath as string | undefined || defaultProjectPath;

    if (!targetPath) {
      return c.json({ error: "projectPath is required" }, 400);
    }

    // Validate outline from request body
    const result = outlineSchema.safeParse(raw.outline);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return c.json({ error: `Invalid outline: ${issues}` }, 400);
    }

    const outline = result.data;

    return streamSSE(c, async (stream) => {
      try {
        const sseEventHandler = (event: { type: string; data: unknown }) => {
          stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event.data),
          });
        };

        await runGenerator(outline, targetPath, {
          onEvent: sseEventHandler,
        });

        // Overview generation (index.md) — synthesized from domain docs
        await runOverviewGenerator(outline, targetPath, {
          onEvent: sseEventHandler,
        });

        // Summary generation (summary.md) — project wrap-up page
        await runSummaryGenerator(outline, targetPath, {
          onEvent: sseEventHandler,
        });

        // Post-generation Mermaid syntax fix
        const docsDir = path.join(targetPath, ".deeplens", "docs");
        await sanitizeMermaidBlocks(docsDir);

        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ phase: "generate" }),
        });
      } catch (error) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            message: String(error),
            phase: "generate",
          }),
        });
      }
    });
  });

  return app;
}
