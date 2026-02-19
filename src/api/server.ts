/**
 * Hono API server — initialization, routing, and port detection.
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createServer } from "node:net";
import chalk from "chalk";
import { applyMiddleware } from "./middleware.js";
import { createSearchRoute } from "./routes/search.js";
import { createInvestigateRoute } from "./routes/investigate.js";
import { createStatusRoute } from "./routes/status.js";
import type { VectorStore } from "../vector/store.js";
import type { EmbeddingClient } from "../embedding/client.js";
import type { DeepLensConfig } from "../config/env.js";

// ── Types ──────────────────────────────────────────

export interface ApiServerOptions {
  store: VectorStore;
  embeddingClient: EmbeddingClient;
  config: DeepLensConfig;
  projectPath: string;
  port?: number;
}

// ── Port Detection ────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

// ── Server Factory ────────────────────────────────

export function createApp(options: ApiServerOptions): Hono {
  const { store, embeddingClient, config, projectPath } = options;

  const app = new Hono();

  // Apply middleware
  applyMiddleware(app);

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Mount routes
  app.route("/api/search", createSearchRoute(store, embeddingClient, config));
  app.route(
    "/api/investigate",
    createInvestigateRoute(store, embeddingClient, config, projectPath),
  );
  app.route("/api/status", createStatusRoute(store, config));

  return app;
}

export async function startApiServer(
  options: ApiServerOptions,
): Promise<{ port: number; close: () => void }> {
  const app = createApp(options);
  const requestedPort = options.port ?? 3000;
  const port = await findAvailablePort(requestedPort);

  const server = serve({
    fetch: app.fetch,
    port,
  });

  console.log(
    chalk.green(`API server running at http://localhost:${port}`),
  );

  return {
    port,
    close: () => {
      server.close();
    },
  };
}
