/**
 * MCP Server — exposes DeepLens tools via stdio transport for IDE Agents.
 *
 * Architecture:
 *   IDE (Cursor/Windsurf) ──stdio──▶ MCP Server ──HTTP──▶ Sidecar (Hono)
 *
 * All tool implementations delegate to Sidecar HTTP API endpoints.
 * stdout is reserved for MCP protocol; logs go to stderr.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Outline } from "../outline/types.js";

// ── Configuration ─────────────────────────────────────────────────────

const DEFAULT_SIDECAR_PORT = 54321;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 2000, 4000];

const SIDECAR_UNREACHABLE_MSG =
  "DeepLens sidecar is not running. Please start the DeepLens application first.";

// ── HTTP helpers ──────────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS[attempt]));
      }
    }
  }

  // All retries exhausted — determine if it's a connectivity issue
  if (
    lastError &&
    (lastError.name === "AbortError" ||
      (lastError as NodeJS.ErrnoException).code === "ECONNREFUSED" ||
      lastError.message.includes("fetch failed"))
  ) {
    throw new Error(SIDECAR_UNREACHABLE_MSG);
  }
  throw lastError ?? new Error("Unknown fetch error");
}

/**
 * Consume an SSE stream from Sidecar, collecting all `text-delta` event payloads
 * into a single string. Also collects `done` event data for metadata (sources, etc).
 */
async function consumeSSE(
  url: string,
  body: object,
): Promise<{ text: string; doneData?: Record<string, unknown> }> {
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Sidecar returned HTTP ${response.status}: ${errText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let doneData: Record<string, unknown> | undefined;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        if (currentEvent === "text-delta") {
          try {
            const parsed = JSON.parse(data);
            result += parsed.text ?? "";
          } catch {
            // skip malformed data
          }
        } else if (currentEvent === "done") {
          try {
            doneData = JSON.parse(data);
          } catch {
            // skip
          }
        }
        currentEvent = "";
      } else if (line.trim() === "") {
        currentEvent = "";
      }
    }
  }

  return { text: result, doneData };
}

// ── Outline formatting ────────────────────────────────────────────────

function formatOutlineAsText(outline: Outline): string {
  const lines: string[] = [];
  lines.push(`# ${outline.project_name}`);
  lines.push("");
  lines.push(outline.summary);
  lines.push("");
  lines.push(`**Tech Stack**: ${outline.detected_stack.join(", ")}`);
  lines.push("");
  lines.push("## Domains");
  lines.push("");

  for (const domain of outline.knowledge_graph) {
    lines.push(`### ${domain.title}`);
    lines.push(domain.description);
    lines.push("");

    if (domain.sub_concepts?.length) {
      for (const concept of domain.sub_concepts) {
        lines.push(`- **${concept.name}**: ${concept.description}`);
      }
      lines.push("");
    }

    const topFiles = domain.files.slice(0, 5);
    if (topFiles.length) {
      lines.push("Key files:");
      for (const f of topFiles) {
        lines.push(`- \`${f.path}\` — ${f.role}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ── MCP Server bootstrap ─────────────────────────────────────────────

export async function startMcpServer(options?: {
  sidecarPort?: number;
  projectPath?: string;
}): Promise<void> {
  const port = options?.sidecarPort
    ?? (Number(process.env.DEEPLENS_SIDECAR_PORT) || DEFAULT_SIDECAR_PORT);
  const projectPath = options?.projectPath ?? process.env.DEEPLENS_PROJECT_PATH ?? "";
  const sidecarUrl = `http://localhost:${port}`;

  const server = new McpServer({
    name: "deeplens",
    version: "0.1.0",
  });

  // ── Tool: get_architecture_map ────────────────────────────────────

  server.tool(
    "get_architecture_map",
    "Get the project's knowledge architecture map including domains, tech stack, and structure. Returns a formatted overview of the entire codebase organization.",
    {},
    async () => {
      try {
        // Try Sidecar API first
        const response = await fetchWithRetry(
          `${sidecarUrl}/api/outline?projectPath=${encodeURIComponent(projectPath)}`,
        );

        if (response.ok) {
          const data = await response.json() as { outline?: Outline };
          if (data.outline) {
            return {
              content: [{ type: "text" as const, text: formatOutlineAsText(data.outline) }],
            };
          }
        }

        // Fallback: read outline.json from disk
        if (projectPath) {
          const outlinePath = path.join(projectPath, ".deeplens", "outline.json");
          if (existsSync(outlinePath)) {
            const raw = await readFile(outlinePath, "utf-8");
            const outline = JSON.parse(raw) as Outline;
            return {
              content: [{ type: "text" as const, text: formatOutlineAsText(outline) }],
            };
          }
        }

        return {
          content: [{ type: "text" as const, text: "No architecture map available. Run analysis in DeepLens first." }],
          isError: true,
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: (err as Error).message }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: consult_knowledge_base ──────────────────────────────────

  server.tool(
    "consult_knowledge_base",
    "Search the project's indexed documentation using natural language. Returns an AI-generated answer based on the project's knowledge base with source citations.",
    {
      query: z.string().describe("Natural language question about the project"),
      domain_filter: z.string().optional().describe("Optional domain ID to restrict search scope"),
    },
    async ({ query, domain_filter }) => {
      try {
        const { text, doneData } = await consumeSSE(
          `${sidecarUrl}/api/search`,
          { query, projectPath, domain_filter },
        );

        let result = text;
        if (doneData && Array.isArray(doneData.sources)) {
          const sources = doneData.sources as Array<{ path: string; title: string }>;
          if (sources.length > 0) {
            result += "\n\n---\n**Sources**: " + sources.map((s) => `\`${s.path}\``).join(", ");
          }
        }

        return {
          content: [{ type: "text" as const, text: result }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: (err as Error).message }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: investigate_implementation ──────────────────────────────

  server.tool(
    "investigate_implementation",
    "Deep investigation of code implementation using an AI agent with tool calling. The agent reads source files, searches code, and provides comprehensive analysis with code references.",
    {
      question: z.string().describe("Question about implementation details, e.g. 'How does the rate limiter handle burst traffic?'"),
      target_files: z.array(z.string()).optional().describe("Optional list of file paths to focus the investigation on"),
    },
    async ({ question, target_files }) => {
      try {
        const { text } = await consumeSSE(
          `${sidecarUrl}/api/investigate`,
          { query: question, projectPath, target_files },
        );

        return {
          content: [{ type: "text" as const, text: text || "Investigation completed but returned no text." }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: (err as Error).message }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: visualize_data_flow ─────────────────────────────────────

  server.tool(
    "visualize_data_flow",
    "Generate a Mermaid diagram visualizing data flow for a described scenario. Returns Mermaid source code that can be rendered as a diagram.",
    {
      scenario: z.string().describe("Description of the data flow scenario, e.g. 'user login flow'"),
      detailLevel: z
        .enum(["high-level", "detailed"])
        .optional()
        .default("high-level")
        .describe("Level of detail: 'high-level' for overview, 'detailed' for internal function calls"),
    },
    async ({ scenario, detailLevel }) => {
      try {
        const response = await fetchWithRetry(
          `${sidecarUrl}/api/visualize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectPath, scenario, detailLevel }),
          },
        );

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`Sidecar returned HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json() as { mermaid?: string; error?: string };
        if (data.error) {
          throw new Error(data.error);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: data.mermaid
                ? `\`\`\`mermaid\n${data.mermaid}\n\`\`\``
                : "No diagram generated.",
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: (err as Error).message }],
          isError: true,
        };
      }
    },
  );

  // ── Connect via stdio ─────────────────────────────────────────────

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (stdout is reserved for MCP protocol)
  process.stderr.write(`[deeplens-mcp] Server started, sidecar=${sidecarUrl}, project=${projectPath}\n`);
}
