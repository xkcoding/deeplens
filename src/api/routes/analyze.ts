/**
 * POST /api/analyze — Full pipeline: explore -> outline_ready -> wait for confirm -> generate.
 * Uses SSE streaming for real-time progress updates.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { runExplorer } from "../../agent/explorer.js";
import { runGenerator, runOverviewGenerator, runSummaryGenerator } from "../../agent/generator.js";
import { sanitizeMermaidBlocks } from "../../vitepress/sanitize-mermaid.js";
import { registerProject, updateProject } from "../../projects/registry.js";
import type { Outline } from "../../outline/types.js";

async function appendSession(sessionPath: string, event: string, data: unknown): Promise<void> {
  const line = JSON.stringify({ ts: Date.now(), event, data }) + "\n";
  await fs.appendFile(sessionPath, line, "utf-8");
}

export interface AnalyzeContext {
  app: Hono;
  /** Get the resolve function for the pending outline confirmation. */
  getResolveOutline: () => ((outline: Outline) => void) | null;
  /** Get the current outline produced by the explorer. */
  getCurrentOutline: () => Outline | null;
}

export function createAnalyzeRoute(
  defaultProjectPath: string,
  options?: { onStart?: () => void | Promise<void> },
): AnalyzeContext {
  const app = new Hono();

  // Shared state for outline confirmation handshake
  let resolveOutline: ((outline: Outline) => void) | null = null;
  let currentOutline: Outline | null = null;

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const raw = body as Record<string, unknown>;
    const targetPath = raw.projectPath as string | undefined || defaultProjectPath;

    console.log(`[analyze] POST received, projectPath=${targetPath}`);

    if (!targetPath) {
      return c.json({ error: "projectPath is required" }, 400);
    }

    // Reset shared state
    resolveOutline = null;
    currentOutline = null;

    // Notify caller to clean up resources (e.g. kill VitePress preview)
    await options?.onStart?.();

    return streamSSE(c, async (stream) => {
      // Clean up previous analysis artifacts
      const outputDir = path.join(targetPath, ".deeplens");
      await fs.mkdir(outputDir, { recursive: true });

      // Remove old docs directory (generated markdown files)
      const docsDir = path.join(outputDir, "docs");
      if (existsSync(docsDir)) {
        await fs.rm(docsDir, { recursive: true, force: true });
      }
      // Remove old outline.json
      const oldOutlinePath = path.join(outputDir, "outline.json");
      if (existsSync(oldOutlinePath)) {
        await fs.rm(oldOutlinePath);
      }

      // Session persistence — write events to JSONL file
      const sessionPath = path.join(outputDir, "session.jsonl");
      await fs.writeFile(sessionPath, "", "utf-8"); // truncate old session

      // Global keepalive — prevents Tauri webview / browser from timing out
      // the SSE connection during long-running agent operations.
      const keepalive = setInterval(() => {
        stream.writeSSE({ event: "keepalive", data: "{}" }).catch(() => {
          clearInterval(keepalive);
        });
      }, 10_000);

      try {
        // Register project in ~/.deeplens/projects.json (status: "analyzing")
        await registerProject(targetPath).catch((err) =>
          console.warn("[analyze] Failed to register project:", err),
        );

        // Phase 1: Explore
        console.log("[analyze] SSE stream opened, sending explore phase start");
        const exploreStartData = { phase: "explore", status: "started" };
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify(exploreStartData),
        });
        await appendSession(sessionPath, "progress", exploreStartData);

        console.log("[analyze] Starting explorer...");
        const outline = await runExplorer(targetPath, {
          onEvent: (event) => {
            stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event.data),
            });
            appendSession(sessionPath, event.type, event.data);
          },
        });

        currentOutline = outline;

        const outlineReadyData = { outline };
        await stream.writeSSE({
          event: "outline_ready",
          data: JSON.stringify(outlineReadyData),
        });
        await appendSession(sessionPath, "outline_ready", outlineReadyData);

        // Wait for confirmation via POST /api/outline/confirm
        const waitingData = { for: "outline_confirm" };
        await stream.writeSSE({
          event: "waiting",
          data: JSON.stringify(waitingData),
        });
        await appendSession(sessionPath, "waiting", waitingData);

        const confirmedOutline = await new Promise<Outline>((resolve) => {
          resolveOutline = resolve;
        });

        // Persist outline_confirmed event + outline.json
        await appendSession(sessionPath, "outline_confirmed", { outline: confirmedOutline });
        await fs.writeFile(
          path.join(outputDir, "outline.json"),
          JSON.stringify(confirmedOutline, null, 2),
          "utf-8",
        );

        // Phase 2: Generate
        const genStartData = { phase: "generate", status: "started" };
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify(genStartData),
        });
        await appendSession(sessionPath, "progress", genStartData);

        const sseEventHandler = (event: { type: string; data: unknown }) => {
          stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event.data),
          });
          // doc_written: persist path only, strip content
          if (event.type === "doc_written") {
            appendSession(sessionPath, event.type, { path: (event.data as { path: string }).path });
          } else {
            appendSession(sessionPath, event.type, event.data);
          }
        };

        await runGenerator(confirmedOutline, targetPath, {
          onEvent: sseEventHandler,
        });

        // Phase 3: Generate Overview (index.md) — synthesized from domain docs
        const overviewStartData = { phase: "overview", status: "started" };
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify(overviewStartData),
        });
        await appendSession(sessionPath, "progress", overviewStartData);

        await runOverviewGenerator(confirmedOutline, targetPath, {
          onEvent: sseEventHandler,
        });

        // Phase 4: Generate Summary (summary.md) — project wrap-up page
        const summaryStartData = { phase: "summary", status: "started" };
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify(summaryStartData),
        });
        await appendSession(sessionPath, "progress", summaryStartData);

        await runSummaryGenerator(confirmedOutline, targetPath, {
          onEvent: sseEventHandler,
        });

        // Post-generation Mermaid syntax fix
        await sanitizeMermaidBlocks(docsDir);

        // Update project registry (status: "ready", lastAnalyzed, lastCommit)
        let headCommit: string | undefined;
        try {
          const { getHeadCommit } = await import("../../update/diff.js");
          headCommit = await getHeadCommit(targetPath);
        } catch {
          // Not a git repo or git unavailable — skip commit tracking
        }
        await updateProject(targetPath, {
          status: "ready",
          lastAnalyzed: new Date().toISOString(),
          ...(headCommit ? { lastCommit: headCommit } : {}),
        }).catch((err) =>
          console.warn("[analyze] Failed to update project registry:", err),
        );

        const doneData = { phase: "analyze" };
        await stream.writeSSE({
          event: "done",
          data: JSON.stringify(doneData),
        });
        await appendSession(sessionPath, "done", doneData);
      } catch (error) {
        // Update project registry with error status
        await updateProject(targetPath, { status: "error" }).catch(() => {});

        const errorData = { message: String(error), phase: "analyze" };
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify(errorData),
        });
        await appendSession(sessionPath, "error", errorData);
      } finally {
        clearInterval(keepalive);
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
