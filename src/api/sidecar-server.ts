/**
 * Sidecar HTTP server — registers pipeline routes (explore, generate, analyze)
 * in addition to existing Q&A routes when a vector DB is available.
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { existsSync } from "node:fs";
import path from "node:path";
import { applyMiddleware } from "./middleware.js";
import { createExploreRoute } from "./routes/explore.js";
import { createGenerateRoute } from "./routes/generate.js";
import { createAnalyzeRoute } from "./routes/analyze.js";
import { createOutlineRoute } from "./routes/outline.js";
import { createSearchRoute } from "./routes/search.js";
import { createInvestigateRoute } from "./routes/investigate.js";
import { createStatusRoute } from "./routes/status.js";
import { loadConfig } from "../config/env.js";
import type { DeepLensConfig } from "../config/env.js";

export interface SidecarServerOptions {
  config: DeepLensConfig;
  projectPath?: string;
  port: number;
}

export async function startSidecarServer(
  options: SidecarServerOptions,
): Promise<{ port: number; close: () => void }> {
  const { config, port } = options;
  const projectPath = options.projectPath ?? process.cwd();

  const app = new Hono();
  applyMiddleware(app);

  // Health check
  app.get("/health", (c) => c.json({ status: "ok", mode: "sidecar" }));

  // ── Pipeline routes (sidecar-only) ─────────────────
  app.route("/api/explore", createExploreRoute(projectPath));
  app.route("/api/generate", createGenerateRoute(projectPath));

  // Analyze route with shared outline state
  const analyzeCtx = createAnalyzeRoute(projectPath);
  app.route("/api/analyze", analyzeCtx.app);
  app.route("/api/outline", createOutlineRoute(analyzeCtx));

  // ── Q&A routes (if vector DB exists) ───────────────
  const dbPath = path.join(projectPath, ".deeplens", "deeplens.db");
  let vectorStore: { close: () => void } | null = null;

  if (existsSync(dbPath) && config.siliconflowApiKey) {
    // Lazy-import to avoid requiring these modules when DB doesn't exist
    const { VectorStore } = await import("../vector/store.js");
    const { EmbeddingClient } = await import("../embedding/client.js");

    const store = new VectorStore(dbPath);
    vectorStore = store;
    const embeddingClient = new EmbeddingClient(config);

    app.route("/api/search", createSearchRoute(store, embeddingClient, config));
    app.route(
      "/api/investigate",
      createInvestigateRoute(store, embeddingClient, config, projectPath),
    );
    app.route("/api/status", createStatusRoute(store, config));

    // Store cleanup on process exit
    process.on("beforeExit", () => {
      store.close();
    });
  }

  // ── Reload config ──────────────────────────────────
  app.post("/api/reload-config", (c) => {
    const newConfig = loadConfig();
    Object.assign(config, newConfig);
    return c.json({ status: "reloaded" });
  });

  // ── Shutdown ───────────────────────────────────────
  app.post("/api/shutdown", (c) => {
    // Schedule cleanup and exit after response is sent
    setTimeout(() => {
      try {
        vectorStore?.close();
      } catch {
        // Best-effort cleanup
      }
      process.exit(0);
    }, 500);
    return c.json({ status: "shutting_down" });
  });

  const server = serve({ fetch: app.fetch, port });

  return {
    port,
    close: () => {
      server.close();
    },
  };
}
