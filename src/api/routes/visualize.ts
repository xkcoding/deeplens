/**
 * POST /api/visualize — Generate Mermaid data-flow diagrams via LLM.
 *
 * Loads the project outline, retrieves relevant context via RAG,
 * and calls the LLM to produce a Mermaid diagram for the described scenario.
 */

import { Hono } from "hono";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { VectorStore } from "../../vector/store.js";
import type { EmbeddingClient } from "../../embedding/client.js";
import type { DeepLensConfig } from "../../config/env.js";
import type { Outline } from "../../outline/types.js";

// ── Constants ────────────────────────────────────────

const MAX_CONTEXT_CHARS = 16_000;

const SYSTEM_PROMPT = `You are a software architecture visualization expert.
Your task is to generate Mermaid diagrams that accurately represent data flows in a software project.

Rules:
- Output ONLY the Mermaid diagram source code, no markdown fences, no explanation.
- Use the provided project context (outline + code snippets) to create accurate diagrams.
- For "high-level" detail: show major components, services, and data flow between them.
- For "detailed" detail: include internal function calls, data transformations, and intermediate steps.
- Use appropriate Mermaid diagram types (sequenceDiagram, flowchart, graph) based on the scenario.
- Label all edges with data descriptions.
- Keep the diagram readable — avoid excessive nodes.`;

// ── Route ────────────────────────────────────────────

export function createVisualizeRoute(
  store: VectorStore,
  embeddingClient: EmbeddingClient,
  config: DeepLensConfig,
  defaultProjectPath: string,
): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.scenario || typeof body.scenario !== "string") {
      return c.json({ error: "scenario is required" }, 400);
    }

    const projectPath = (body.projectPath as string) || defaultProjectPath;
    const scenario = body.scenario as string;
    const detailLevel = (body.detailLevel as string) || "high-level";

    // 1. Load outline for project context
    let outlineContext = "";
    const outlinePath = path.join(projectPath, ".deeplens", "outline.json");
    if (existsSync(outlinePath)) {
      try {
        const outline: Outline = JSON.parse(await fs.readFile(outlinePath, "utf-8"));
        outlineContext = formatOutlineContext(outline);
      } catch {
        // proceed without outline
      }
    }

    // 2. RAG: retrieve relevant code/doc snippets
    let ragContext = "";
    try {
      const stats = store.getAggregateStatus();
      if (stats.totalChunks > 0) {
        const queryVector = await embeddingClient.embedSingle(scenario, "query");
        const codeResults = store.search(queryVector, 5, "code");
        const docResults = store.search(queryVector, 3, "doc");
        ragContext = assembleContext([...docResults, ...codeResults]);
        if (ragContext.length > MAX_CONTEXT_CHARS) {
          ragContext = ragContext.slice(0, MAX_CONTEXT_CHARS);
        }
      }
    } catch {
      // proceed without RAG context
    }

    // 3. Build prompt and call LLM
    const userPrompt = buildUserPrompt(scenario, detailLevel, outlineContext, ragContext);

    const openrouter = createOpenAICompatible({
      name: "openrouter",
      apiKey: config.openrouterApiKey!,
      baseURL: config.openrouterBaseUrl ?? "https://openrouter.ai/api/v1",
    });

    try {
      const result = await generateText({
        model: openrouter.chatModel(config.openrouterLlmModel ?? "qwen/qwen3-32b"),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        maxOutputTokens: 4096,
        providerOptions: {
          openrouter: { enable_thinking: false },
        },
      });

      // Extract Mermaid content — strip markdown fences if LLM included them
      let mermaid = result.text.trim();
      if (mermaid.startsWith("```mermaid")) {
        mermaid = mermaid.slice("```mermaid".length);
      } else if (mermaid.startsWith("```")) {
        mermaid = mermaid.slice(3);
      }
      if (mermaid.endsWith("```")) {
        mermaid = mermaid.slice(0, -3);
      }
      mermaid = mermaid.trim();

      return c.json({ mermaid });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 500);
    }
  });

  return app;
}

// ── Helpers ──────────────────────────────────────────

function formatOutlineContext(outline: Outline): string {
  const lines: string[] = [];
  lines.push(`Project: ${outline.project_name}`);
  lines.push(`Summary: ${outline.summary}`);
  lines.push(`Stack: ${outline.detected_stack.join(", ")}`);
  lines.push("");
  lines.push("Domains:");
  for (const domain of outline.knowledge_graph) {
    lines.push(`- ${domain.title}: ${domain.description}`);
    const topFiles = domain.files.slice(0, 3);
    for (const f of topFiles) {
      lines.push(`  - ${f.path} (${f.role})`);
    }
  }
  return lines.join("\n");
}

function assembleContext(
  results: Array<{ sourcePath: string; headerPath?: string | null; content: string; sourceType?: string }>,
): string {
  if (results.length === 0) return "";
  return results
    .map((r, i) => {
      const typeLabel = r.sourceType === "doc" ? "Doc" : "Code";
      const header = r.headerPath ? ` | ${r.headerPath}` : "";
      return `[${typeLabel} ${i + 1}] ${r.sourcePath}${header}\n${r.content}`;
    })
    .join("\n\n---\n\n");
}

function buildUserPrompt(
  scenario: string,
  detailLevel: string,
  outlineContext: string,
  ragContext: string,
): string {
  const parts: string[] = [];
  parts.push(`Generate a Mermaid diagram for the following scenario:`);
  parts.push(`**Scenario**: ${scenario}`);
  parts.push(`**Detail Level**: ${detailLevel}`);

  if (outlineContext) {
    parts.push("");
    parts.push("## Project Overview");
    parts.push(outlineContext);
  }

  if (ragContext) {
    parts.push("");
    parts.push("## Relevant Code Context");
    parts.push(ragContext);
  }

  return parts.join("\n");
}
