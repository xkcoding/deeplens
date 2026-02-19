#!/usr/bin/env node

/**
 * Sidecar entry point — compiled by @yao-pkg/pkg into a standalone binary.
 * Starts the HTTP server with pipeline routes for Tauri desktop app communication.
 */

import path from "node:path";
import { loadConfig } from "../config/env.js";
import { startSidecarServer } from "../api/sidecar-server.js";

// Parse CLI arguments
const args = process.argv.slice(2);

// Parse --port argument
const portIndex = args.indexOf("--port");
const port =
  portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : undefined;

// Parse project-path argument (first non-flag argument that isn't --port's value)
const projectPath = args.find(
  (a, i) =>
    !a.startsWith("--") && (portIndex === -1 || i !== portIndex + 1),
);

async function main(): Promise<void> {
  const config = loadConfig();

  const server = await startSidecarServer({
    config,
    projectPath: projectPath ? path.resolve(projectPath) : undefined,
    port: port ?? 54321,
  });

  console.log(`Sidecar ready on port ${server.port}`);

  // Graceful shutdown handlers
  const shutdown = async () => {
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Sidecar failed to start:", err);
  process.exit(1);
});
