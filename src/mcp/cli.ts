/**
 * CLI handler for `deeplens mcp-server` command.
 * Exports a Commander command factory — Lead registers it in src/cli/index.ts.
 */

import { Command } from "commander";

export function mcpServerCommand(): Command {
  return new Command("mcp-server")
    .description("Start MCP Server for IDE Agent integration (stdio transport)")
    .option("--sidecar-port <number>", "Sidecar HTTP port to connect to", parseInt)
    .option("--project <path>", "Project path for the active project")
    .action(async (options: { sidecarPort?: number; project?: string }) => {
      const { startMcpServer } = await import("./server.js");
      await startMcpServer({
        sidecarPort: options.sidecarPort,
        projectPath: options.project,
      });
    });
}
