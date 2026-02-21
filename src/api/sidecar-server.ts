/**
 * Sidecar HTTP server — registers pipeline routes (explore, generate, analyze)
 * in addition to existing Q&A routes when a vector DB is available.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerMcpTools } from "../mcp/server.js";
import { loadProjects } from "../projects/registry.js";
import { applyMiddleware } from "./middleware.js";
import { createExploreRoute } from "./routes/explore.js";
import { createGenerateRoute } from "./routes/generate.js";
import { createAnalyzeRoute } from "./routes/analyze.js";
import { createOutlineRoute } from "./routes/outline.js";
import { createSearchRoute } from "./routes/search.js";
import { createInvestigateRoute } from "./routes/investigate.js";
import { createStatusRoute } from "./routes/status.js";
import { createUpdateRoute } from "./routes/update.js";
import { createExportRoute } from "./routes/export.js";
import { createVisualizeRoute } from "./routes/visualize.js";
import { createProjectConfigRoute } from "./routes/project-config.js";
import { createProjectsRoute } from "./routes/projects.js";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { loadConfig } from "../config/env.js";
import type { DeepLensConfig } from "../config/env.js";
import type { ChildProcess } from "node:child_process";

export interface SidecarServerOptions {
  config: DeepLensConfig;
  projectPath?: string;
  port: number;
}

/** Recursively scan a docs directory, collecting relative paths → file contents. */
async function scanDocsDir(
  dir: string,
  baseDir: string,
  result: Record<string, string>,
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanDocsDir(fullPath, baseDir, result);
    } else if (entry.name.endsWith(".md")) {
      const relPath = "domains/" + path.relative(baseDir, fullPath);
      result[relPath] = await fs.readFile(fullPath, "utf-8");
    }
  }
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

  // ── VitePress preview state (declared early so analyze can kill it) ─
  let vitepressChild: ChildProcess | null = null;
  let vitepressPort: number | null = null;
  let vitepressProjectPath: string | null = null;

  /** Check if the VitePress child process is still alive. */
  function isVitepressAlive(): boolean {
    return vitepressChild !== null && vitepressChild.exitCode === null && !vitepressChild.killed;
  }

  /** Kill the VitePress preview process if running. */
  function killVitepress(): void {
    if (isVitepressAlive() && vitepressChild) {
      vitepressChild.kill();
      vitepressChild = null;
      vitepressPort = null;
      vitepressProjectPath = null;
    }
  }

  // ── Pipeline routes (sidecar-only) ─────────────────
  app.route("/api/explore", createExploreRoute(projectPath));
  app.route("/api/generate", createGenerateRoute(projectPath));

  // Analyze route with shared outline state — kill VitePress on re-analyze
  const analyzeCtx = createAnalyzeRoute(projectPath, {
    onStart: () => killVitepress(),
  });
  app.route("/api/analyze", analyzeCtx.app);
  app.route("/api/outline", createOutlineRoute(analyzeCtx));

  // ── Incremental update, export, projects, project-config ─
  app.route("/api/update", createUpdateRoute(projectPath));
  app.route("/api/export", createExportRoute(projectPath));
  app.route("/api/projects", createProjectsRoute());
  app.route("/api/project-config", createProjectConfigRoute());

  // ── Session & Docs read APIs ──────────────────────
  app.get("/api/session", async (c) => {
    const reqProjectPath = c.req.query("projectPath") || projectPath;
    const sessionPath = path.join(reqProjectPath, ".deeplens", "session.jsonl");

    if (!existsSync(sessionPath)) {
      // Fallback: check if outline.json + docs/ exist (e.g. CLI-generated or session deleted)
      const outlinePath = path.join(reqProjectPath, ".deeplens", "outline.json");
      const docsDir = path.join(reqProjectPath, ".deeplens", "docs", "domains");

      if (existsSync(outlinePath) && existsSync(docsDir)) {
        try {
          const outline = JSON.parse(await fs.readFile(outlinePath, "utf-8"));
          const docs: Record<string, string> = {};
          await scanDocsDir(docsDir, docsDir, docs);
          return c.json({ exists: false, events: [], fallback: { outline, docs } });
        } catch {
          // Fallback scan failed — return empty
        }
      }

      return c.json({ exists: false, events: [] });
    }

    const content = await fs.readFile(sessionPath, "utf-8");
    const events = content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    return c.json({ exists: true, events });
  });

  app.post("/api/docs/read", async (c) => {
    const body = await c.req.json<{ projectPath?: string; paths: string[] }>();
    const docsBase = path.join(
      body.projectPath || projectPath,
      ".deeplens",
      "docs",
    );

    const files: Record<string, string> = {};
    for (const relPath of body.paths) {
      const absPath = path.join(docsBase, relPath);
      try {
        files[relPath] = await fs.readFile(absPath, "utf-8");
      } catch {
        // File missing — skip silently
      }
    }

    return c.json({ files });
  });

  // ── Preview route ────────────────────────────────
  app.post("/api/preview", async (c) => {
    const body = await c.req.json<{ projectPath?: string; port?: number }>();
    const reqProjectPath = body.projectPath || projectPath;
    const docsDir = path.join(reqProjectPath, ".deeplens", "docs");

    if (!existsSync(docsDir)) {
      return c.json({ ok: false, error: "No docs found" }, 400);
    }

    // If VitePress is already running for a different project, kill it first
    if (isVitepressAlive() && vitepressProjectPath && vitepressProjectPath !== reqProjectPath) {
      killVitepress();
    }

    // If VitePress is already running for the same project, just return existing URL
    if (isVitepressAlive() && vitepressPort && vitepressProjectPath === reqProjectPath) {
      return c.json({ ok: true, url: `http://localhost:${vitepressPort}` });
    }

    // Read outline for project name + sidebar generation
    const outlinePath = path.join(reqProjectPath, ".deeplens", "outline.json");
    let projectName = path.basename(reqProjectPath);
    let outline: import("../outline/types.js").Outline | null = null;
    if (existsSync(outlinePath)) {
      try {
        outline = JSON.parse(await fs.readFile(outlinePath, "utf-8"));
        if (outline?.project_name) projectName = outline.project_name;
      } catch {
        // Use fallback name
      }
    }

    // Scaffold VitePress config
    const { scaffoldVitePress, SIDEBAR_PLACEHOLDER } = await import("../vitepress/scaffold.js");
    await scaffoldVitePress(docsDir, projectName);

    // Inject sidebar from outline (replace placeholder with real data)
    if (outline) {
      const { generateSidebar } = await import("../vitepress/sidebar.js");
      const sidebar = generateSidebar(outline, docsDir);
      const configPath = path.join(docsDir, ".vitepress", "config.mts");
      const configContent = await fs.readFile(configPath, "utf-8");
      await fs.writeFile(
        configPath,
        configContent.replace(SIDEBAR_PLACEHOLDER, JSON.stringify(sidebar, null, 6)),
        "utf-8",
      );
    }

    // Clean up dead process reference
    if (vitepressChild && !isVitepressAlive()) {
      vitepressChild = null;
      vitepressPort = null;
    }

    // Start VitePress dev server (non-blocking), use configured port if provided
    const { startPreviewBackground } = await import("../vitepress/server.js");
    const { port: vpPort, child } = await startPreviewBackground(docsDir, {
      port: body.port || undefined,
    });
    vitepressChild = child;
    vitepressPort = vpPort;
    vitepressProjectPath = reqProjectPath;

    // Auto-cleanup when VitePress exits
    child.on("close", () => {
      if (vitepressChild === child) {
        vitepressChild = null;
        vitepressPort = null;
        vitepressProjectPath = null;
      }
    });

    return c.json({ ok: true, url: `http://localhost:${vpPort}` });
  });

  // ── Q&A state (declared before vectorize route so closures can access) ─
  const dbPath = path.join(projectPath, ".deeplens", "deeplens.db");
  let qaApp: Hono | null = null;
  let vectorStore: { close: () => void } | null = null;
  let qaProjectPath: string | null = null; // track which project qaApp is bound to

  /** Re-initialize Q&A routes if the requested project differs from the current one. */
  async function ensureQAForProject(reqProjectPath: string): Promise<void> {
    const reqDbPath = path.join(reqProjectPath, ".deeplens", "deeplens.db");
    if (qaApp && qaProjectPath && qaProjectPath !== reqProjectPath) {
      vectorStore?.close();
      qaApp = null;
      vectorStore = null;
      qaProjectPath = null;
    }
    if (!qaApp && existsSync(reqDbPath) && config.openrouterApiKey) {
      qaApp = await initQARoutes(reqDbPath, config, reqProjectPath);
      qaProjectPath = reqProjectPath;
    }
  }

  // ── Vectorize route (SSE streaming with progress) ─
  app.post("/api/vectorize", async (c) => {
    const body = await c.req.json<{ projectPath?: string }>();
    const reqProjectPath = body.projectPath || projectPath;

    if (!config.openrouterApiKey) {
      return c.json({ ok: false, error: "OpenRouter API Key is required" }, 400);
    }

    const dbFilePath = path.join(reqProjectPath, ".deeplens", "deeplens.db");

    // Clean old DB before re-vectorizing to avoid orphan chunks from deleted docs
    if (existsSync(dbFilePath)) {
      // Close existing Q&A routes that hold the DB connection
      if (qaApp && vectorStore) {
        vectorStore.close();
        qaApp = null;
        vectorStore = null;
      }
      await fs.rm(dbFilePath, { force: true });
    }

    return streamSSE(c, async (stream) => {
      const { Indexer } = await import("../embedding/indexer.js");
      const indexer = new Indexer(config, dbFilePath);

      try {
        await indexer.index({
          projectRoot: reqProjectPath,
          indexCode: true,
          onProgress: async (current, total) => {
            await stream.writeSSE({
              event: "progress",
              data: JSON.stringify({ current, total }),
            });
          },
        });

        // After vectorization, initialize Q&A routes for this project
        await ensureQAForProject(reqProjectPath);

        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ ok: true }),
        });
      } catch (err) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ message: (err as Error).message }),
        });
      } finally {
        indexer.close();
      }
    });
  });

  // ── Q&A routes (late-binding proxy pattern) ────────
  async function initQARoutes(
    dbFilePath: string,
    cfg: DeepLensConfig,
    projPath: string,
  ): Promise<Hono> {
    const { VectorStore } = await import("../vector/store.js");
    const { EmbeddingClient } = await import("../embedding/client.js");

    const store = new VectorStore(dbFilePath);
    vectorStore = store;
    const embeddingClient = new EmbeddingClient(cfg);

    const router = new Hono();
    router.route("/api/search", createSearchRoute(store, embeddingClient, cfg));
    router.route(
      "/api/investigate",
      createInvestigateRoute(store, embeddingClient, cfg, projPath),
    );
    router.route("/api/status", createStatusRoute(store, cfg));
    router.route(
      "/api/visualize",
      createVisualizeRoute(store, embeddingClient, cfg, projPath),
    );

    process.on("beforeExit", () => {
      store.close();
    });

    return router;
  }

  // Catch-all proxy routes — delegate to qaApp when available
  app.all("/api/search/*", async (c) => {
    if (!qaApp) return c.json({ error: "Not vectorized yet" }, 503);
    return qaApp.fetch(c.req.raw);
  });
  app.post("/api/search", async (c) => {
    if (!qaApp) return c.json({ error: "Not vectorized yet" }, 503);
    return qaApp.fetch(c.req.raw);
  });
  app.all("/api/investigate/*", async (c) => {
    if (!qaApp) return c.json({ error: "Not vectorized yet" }, 503);
    return qaApp.fetch(c.req.raw);
  });
  app.post("/api/investigate", async (c) => {
    if (!qaApp) return c.json({ error: "Not vectorized yet" }, 503);
    return qaApp.fetch(c.req.raw);
  });
  app.post("/api/visualize", async (c) => {
    if (!qaApp) return c.json({ error: "Not vectorized yet" }, 503);
    return qaApp.fetch(c.req.raw);
  });
  app.get("/api/status", async (c) => {
    const reqProjectPath = c.req.query("projectPath") || projectPath;
    await ensureQAForProject(reqProjectPath);

    if (!qaApp) {
      return c.json({ indexed: false, totalChunks: 0, totalFiles: 0 });
    }
    return qaApp.fetch(c.req.raw);
  });

  // Initialize Q&A immediately if DB already exists
  if (existsSync(dbPath) && config.openrouterApiKey) {
    qaApp = await initQARoutes(dbPath, config, projectPath);
    qaProjectPath = projectPath;
  }

  // ── Test Connection ───────────────────────────────
  app.post("/api/test-connection", async (c) => {
    const body = await c.req.json<{
      provider: "claude" | "openrouter";
      api_key: string;
      base_url?: string;
      model?: string;
    }>();

    const { provider, api_key, base_url, model } = body;
    if (!api_key) {
      return c.json({ ok: false, error: "API key is required" }, 400);
    }

    try {
      if (provider === "claude") {
        // Use Agent SDK query() to validate the full pipeline:
        // API key → Agent SDK → Claude Code CLI subprocess → Anthropic API
        // This ensures the test matches actual analyze/explore/generate behavior.
        const cleanEnv: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) {
          if (v !== undefined && k !== "CLAUDECODE") cleanEnv[k] = v;
        }
        cleanEnv.ANTHROPIC_API_KEY = api_key;
        if (base_url) {
          cleanEnv.ANTHROPIC_BASE_URL = base_url;
        } else {
          delete cleanEnv.ANTHROPIC_BASE_URL;
        }

        let success = false;
        let errorMsg = "";

        const testQuery = async () => {
          for await (const message of query({
            prompt: "Reply with exactly: ok",
            options: {
              maxTurns: 1,
              tools: [],
              permissionMode: "bypassPermissions",
              allowDangerouslySkipPermissions: true,
              persistSession: false,
              env: cleanEnv,
            },
          })) {
            if (message.type === "result") {
              if (message.subtype === "success") {
                success = true;
              } else {
                const errors =
                  "errors" in message ? (message.errors as string[]) : [];
                errorMsg =
                  errors.length > 0
                    ? errors.join("; ")
                    : `Agent returned: ${message.subtype}`;
              }
            }
          }
        };

        // 30s timeout — query() spawns a subprocess which may hang
        await Promise.race([
          testQuery(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Connection test timed out (30s)")),
              30_000,
            ),
          ),
        ]);

        if (success) {
          return c.json({ ok: true });
        }
        return c.json({
          ok: false,
          error: errorMsg || "Agent SDK query failed",
        });
      }

      if (provider === "openrouter") {
        const url = `${base_url || "https://openrouter.ai/api/v1"}/embeddings`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_key}`,
          },
          body: JSON.stringify({
            model: model || "Qwen/Qwen3-Embedding-8B",
            input: "test",
          }),
        });
        if (res.ok) {
          return c.json({ ok: true });
        }
        const text = await res.text();
        return c.json({ ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` });
      }

      return c.json({ ok: false, error: `Unknown provider: ${provider}` }, 400);
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message });
    }
  });

  // ── Reload config ──────────────────────────────────
  app.post("/api/reload-config", async (c) => {
    // UI sends { key, value } — map UI config keys to env vars
    const ENV_KEY_MAP: Record<string, string> = {
      claude_api_key: "ANTHROPIC_API_KEY",
      claude_base_url: "ANTHROPIC_BASE_URL",
      claude_model: "ANTHROPIC_MODEL",
      openrouter_api_key: "OPENROUTER_API_KEY",
      openrouter_base_url: "OPENROUTER_BASE_URL",
      openrouter_embedding_model: "OPENROUTER_EMBED_MODEL",
      openrouter_llm_model: "OPENROUTER_LLM_MODEL",
    };

    try {
      const body = await c.req.json<{ key?: string; value?: string }>();
      if (body.key && body.value !== undefined) {
        const envVar = ENV_KEY_MAP[body.key];
        if (envVar) {
          process.env[envVar] = body.value;
        }
      }
    } catch {
      // No body or invalid JSON — just reload from current env
    }

    const newConfig = loadConfig({ requireApiKey: false });
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

  // ── Streamable HTTP MCP (stateless — new server+transport per request)
  const sidecarUrl = `http://localhost:${port}`;
  app.all("/mcp", async (c) => {
    // Resolve project path: ?project=name looks up registry, ?project_path= uses as-is
    let mcpProjectPath = projectPath;
    const projectName = c.req.query("project");
    const explicitPath = c.req.query("project_path");
    if (projectName) {
      const projects = await loadProjects();
      const entry = projects.find(
        (p) => p.name === projectName || p.path.endsWith(`/${projectName}`),
      );
      if (entry) mcpProjectPath = entry.path;
    } else if (explicitPath) {
      mcpProjectPath = explicitPath;
    }

    const mcpServer = new McpServer({ name: "deeplens", version: "0.1.0" });
    registerMcpTools(mcpServer, sidecarUrl, mcpProjectPath);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await mcpServer.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  const server = serve({ fetch: app.fetch, port });

  return {
    port,
    close: () => {
      server.close();
    },
  };
}
