#!/usr/bin/env node

/**
 * Sidecar entry point — starts the HTTP server for Tauri desktop app communication.
 * Handles port conflicts gracefully (e.g., during Tauri hot-reload).
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

/**
 * Try to shut down an existing sidecar on the target port.
 * This handles Tauri hot-reload: old sidecar may still hold the port.
 */
async function shutdownExisting(targetPort: number): Promise<void> {
  try {
    const res = await fetch(`http://127.0.0.1:${targetPort}/api/shutdown`, {
      method: "POST",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      console.log(`[sidecar] Sent shutdown to existing sidecar on port ${targetPort}`);
      // Wait for the old process to release the port
      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch {
    // No existing sidecar — good
  }
}

async function main(): Promise<void> {
  const config = loadConfig({ requireApiKey: false });
  const targetPort = port ?? 54321;

  // Shut down any leftover sidecar on this port (hot-reload safety)
  await shutdownExisting(targetPort);

  const server = await startSidecarServer({
    config,
    projectPath: projectPath ? path.resolve(projectPath) : undefined,
    port: targetPort,
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
