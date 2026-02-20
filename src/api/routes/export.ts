/**
 * POST /api/export — Static site export with SSE streaming progress.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import path from "node:path";
import { existsSync } from "node:fs";
import { buildStaticSite } from "../../export/index.js";

/**
 * Create the export route handler.
 * Emits SSE events: build_start, build_log, build_complete, copy_start, done.
 */
export function createExportRoute(defaultProjectPath: string): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = await c.req.json<{
      projectPath?: string;
      outputDir?: string;
    }>().catch(() => null);

    const projectPath = body?.projectPath || defaultProjectPath;
    const docsDir = path.join(projectPath, ".deeplens", "docs");

    if (!existsSync(docsDir)) {
      return c.json(
        { error: "Documentation not found. Run analysis first." },
        400,
      );
    }

    const outputDir = body?.outputDir;

    return streamSSE(c, async (stream) => {
      try {
        await stream.writeSSE({
          event: "build_start",
          data: JSON.stringify({ docsDir }),
        });

        const result = await buildStaticSite(docsDir, outputDir, async (line) => {
          await stream.writeSSE({
            event: "build_log",
            data: JSON.stringify({ line }),
          });
        });

        await stream.writeSSE({
          event: "build_complete",
          data: JSON.stringify({ distDir: result.distDir }),
        });

        if (result.copied && outputDir) {
          await stream.writeSSE({
            event: "copy_start",
            data: JSON.stringify({ from: result.distDir, to: outputDir }),
          });
        }

        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ outputDir: result.outputPath }),
        });
      } catch (err) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ message: (err as Error).message, phase: "export" }),
        });
      }
    });
  });

  return app;
}
