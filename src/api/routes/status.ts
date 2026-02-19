/**
 * GET /api/status — Index status endpoint.
 */

import { Hono } from "hono";
import type { VectorStore } from "../../vector/store.js";
import type { DeepLensConfig } from "../../config/env.js";

export function createStatusRoute(
  store: VectorStore,
  config: DeepLensConfig,
): Hono {
  const app = new Hono();

  app.get("/", (c) => {
    const stats = store.getAggregateStatus();

    return c.json({
      totalChunks: stats.totalChunks,
      totalFiles: stats.totalFiles,
      lastIndexed: stats.lastIndexed,
      embedModel: config.siliconflowEmbedModel ?? "Qwen/Qwen3-Embedding-8B",
    });
  });

  return app;
}
