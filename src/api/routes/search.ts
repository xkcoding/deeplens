/**
 * POST /api/search — Fast Search endpoint with SSE streaming.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { fastSearch } from "../../search/fast.js";
import { resolveConfig } from "../../config/project-settings.js";
import type { VectorStore } from "../../vector/store.js";
import type { EmbeddingClient } from "../../embedding/client.js";
import type { DeepLensConfig } from "../../config/env.js";

/**
 * Extract a human-readable title from a source path.
 * - "domains/agent-core/index.md"       → "Agent Core"
 * - "domains/agent-core/explorer.md"    → "Explorer"
 * - ".deeplens/docs/domains/x/foo.md"   → "Foo"
 * - "src/api/server.ts"                 → "server.ts"
 */
function extractSourceTitle(sourcePath: string): string {
  const parts = sourcePath.split("/");
  const fileName = parts.pop() ?? sourcePath;
  const dirName = parts.pop();

  // For index.md, use the parent directory name
  if (fileName === "index.md" && dirName) {
    return dirName
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // For other files, use the file name without extension
  const name = fileName.replace(/\.\w+$/, "");
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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
      const history = Array.isArray(body.messages) ? body.messages : undefined;
      const effectiveConfig = resolveConfig(config, body.projectPath);

      const { stream: textStream, sources } = await fastSearch(
        body.query,
        store,
        embeddingClient,
        effectiveConfig,
        history,
      );

      for await (const chunk of textStream.textStream) {
        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify({ text: chunk }),
        });
      }

      const uniqueSources = [...new Set(sources)].map((s) => ({
        path: s,
        title: extractSourceTitle(s),
      }));
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ sources: uniqueSources }),
      });
    });
  });

  return app;
}
