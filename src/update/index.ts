/**
 * Incremental update orchestrator — detect changes, trace impact,
 * selectively regenerate affected domains, and update the vector index.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { getChangedFiles, getHeadCommit } from "./diff.js";
import { traceImpact, type ImpactResult } from "./impact.js";
import { runGenerator, runOverviewGenerator, runSummaryGenerator } from "../agent/generator.js";
import { sanitizeMermaidBlocks } from "../vitepress/sanitize-mermaid.js";
import { outlineSchema, type Outline } from "../outline/types.js";
import { Indexer } from "../embedding/indexer.js";
import { loadConfig, validateOpenRouterConfig } from "../config/env.js";
import type { AgentEventCallback } from "../agent/events.js";

// ── Types ──────────────────────────────────────────

export interface UpdateEvent {
  type:
    | "diff_start"
    | "diff_result"
    | "impact_summary"
    | "progress"
    | "section_ready"
    | "index_update"
    | "done"
    | "error"
    | "thought"
    | "tool_start"
    | "doc_written";
  data: Record<string, unknown>;
}

export interface UpdateEventCallback {
  (event: UpdateEvent): void;
}

export interface UpdateOptions {
  /** Force a full re-analysis instead of incremental. */
  full?: boolean;
  /** Event callback for streaming progress. */
  onEvent?: UpdateEventCallback;
}

export interface UpdateResult {
  /** Whether the update was incremental or full. */
  mode: "incremental" | "full" | "skipped";
  /** Impact analysis result (only for incremental mode). */
  impact?: ImpactResult;
  /** Message describing the outcome. */
  message: string;
}

// ── Constants ──────────────────────────────────────

const LAST_COMMIT_FILE = "last_analyzed_commit";
const OUTLINE_FILE = "outline.json";

// ── Orchestrator ───────────────────────────────────

/**
 * Run an incremental update on the project.
 *
 * Flow:
 * 1. Read last_analyzed_commit
 * 2. git diff → changed files
 * 3. Trace impact against outline domains
 * 4. Selectively regenerate affected domains
 * 5. Delete old vector chunks & re-index new docs
 * 6. Update last_analyzed_commit to HEAD
 *
 * @param projectRoot - Absolute path to the project root
 * @param opts - Update options
 * @returns Update result summary
 */
export async function runIncrementalUpdate(
  projectRoot: string,
  opts?: UpdateOptions,
): Promise<UpdateResult> {
  const onEvent = opts?.onEvent;
  const deeplensDir = path.join(projectRoot, ".deeplens");
  const lastCommitPath = path.join(deeplensDir, LAST_COMMIT_FILE);
  const outlinePath = path.join(deeplensDir, OUTLINE_FILE);

  // Check if outline exists (required for both full and incremental)
  if (!existsSync(outlinePath)) {
    const msg = "No outline.json found. Run a full analysis first (deeplens analyze).";
    onEvent?.({ type: "error", data: { message: msg, recoverable: false } });
    throw new Error(msg);
  }

  // Load and validate outline
  const outlineRaw = await fs.readFile(outlinePath, "utf-8");
  const parsed = outlineSchema.safeParse(JSON.parse(outlineRaw));
  if (!parsed.success) {
    const msg = "Invalid outline.json. Run a full analysis first.";
    onEvent?.({ type: "error", data: { message: msg, recoverable: false } });
    throw new Error(msg);
  }
  const outline: Outline = parsed.data;

  // Edge case: no last_analyzed_commit → fall back to full analysis
  if (!existsSync(lastCommitPath) || opts?.full) {
    const reason = opts?.full
      ? "Full re-analysis requested"
      : "No last_analyzed_commit found, falling back to full analysis";

    onEvent?.({
      type: "progress",
      data: { phase: "update", status: "full_fallback", reason },
    });

    // Full regeneration: run generator for all domains
    await runGenerator(outline, projectRoot, {
      onEvent: onEvent as AgentEventCallback | undefined,
    });

    // Overview generation (index.md) — synthesized from domain docs
    await runOverviewGenerator(outline, projectRoot, {
      onEvent: onEvent as AgentEventCallback | undefined,
    });

    // Summary generation (summary.md) — project wrap-up page
    await runSummaryGenerator(outline, projectRoot, {
      onEvent: onEvent as AgentEventCallback | undefined,
    });

    // Post-generation Mermaid syntax fix
    const docsDir = path.join(deeplensDir, "docs");
    await sanitizeMermaidBlocks(docsDir);

    // Re-index everything
    await reindexDocs(projectRoot, onEvent);

    // Update last_analyzed_commit
    const headCommit = await getHeadCommit(projectRoot);
    await fs.writeFile(lastCommitPath, headCommit, "utf-8");

    onEvent?.({
      type: "done",
      data: { mode: "full", message: reason },
    });

    return { mode: "full", message: reason };
  }

  // Read last analyzed commit
  const lastCommit = (await fs.readFile(lastCommitPath, "utf-8")).trim();

  // Get HEAD commit early so we can include in diff_start
  const headCommit = await getHeadCommit(projectRoot);

  // Phase 1: Git diff
  onEvent?.({ type: "diff_start", data: { lastCommit, headCommit } });

  const changedFiles = await getChangedFiles(projectRoot, lastCommit);

  onEvent?.({
    type: "diff_result",
    data: { changedFiles, count: changedFiles.length },
  });

  // Edge case: no changes detected
  if (changedFiles.length === 0) {
    const msg = "No changes detected since last analysis.";
    onEvent?.({ type: "done", data: { phase: "update", affectedDomains: 0, newCommit: headCommit } });
    return { mode: "skipped", message: msg };
  }

  // Phase 2: Impact tracing
  const impact = traceImpact(changedFiles, outline);

  onEvent?.({
    type: "impact_summary",
    data: {
      affectedDomains: impact.affectedDomains,
      unchangedDomains: impact.unchangedDomains,
      untrackedFiles: impact.untrackedFiles,
      affectedCount: impact.affectedDomains.length,
      totalDomains: outline.knowledge_graph.length,
    },
  });

  // Edge case: all changes are untracked (no domain affected)
  if (impact.affectedDomains.length === 0) {
    const msg = `No domains affected. ${impact.untrackedFiles.length} untracked file(s) changed.`;

    // Still update last_analyzed_commit since we've processed the diff
    await fs.writeFile(lastCommitPath, headCommit, "utf-8");

    onEvent?.({ type: "done", data: { phase: "update", affectedDomains: 0, newCommit: headCommit } });
    return { mode: "incremental", impact, message: msg };
  }

  // Phase 3: Selective regeneration
  onEvent?.({
    type: "progress",
    data: {
      phase: "update",
      status: "started",
      domains: impact.affectedDomains,
    },
  });

  await runGenerator(outline, projectRoot, {
    domainFilter: impact.affectedDomains,
    onEvent: onEvent as AgentEventCallback | undefined,
  });

  // Phase 4: Delete old chunks for affected domains and re-index
  const config = loadConfig();
  validateOpenRouterConfig(config);
  const dbPath = path.join(deeplensDir, "deeplens.db");
  const indexer = new Indexer(config, dbPath);

  try {
    const store = indexer.getStore();

    // Delete old chunks for affected domain doc files (per-domain events)
    for (const domainId of impact.affectedDomains) {
      let deletedFiles = 0;
      const domainDocsDir = path.join(deeplensDir, "docs", "domains", domainId);
      if (existsSync(domainDocsDir)) {
        const docFiles = await fs.readdir(domainDocsDir);
        for (const docFile of docFiles) {
          if (docFile.endsWith(".md")) {
            const relativePath = path.join(
              ".deeplens",
              "docs",
              "domains",
              domainId,
              docFile,
            );
            store.deleteBySource(relativePath);
            deletedFiles++;
          }
        }
      }
      onEvent?.({
        type: "index_update",
        data: { domain_id: domainId, deletedChunks: deletedFiles, insertedChunks: 0 },
      });
    }

    // Re-index the affected domain docs
    await indexer.index({
      projectRoot,
      indexCode: false,
    });
  } finally {
    indexer.close();
  }

  // Phase 5: Update last_analyzed_commit to HEAD
  await fs.writeFile(lastCommitPath, headCommit, "utf-8");

  const affectedTitles = impact.affectedDomains
    .map((id) => outline.knowledge_graph.find((d) => d.id === id)?.title ?? id)
    .join(", ");
  const msg = `${impact.affectedDomains.length} domain(s) updated: ${affectedTitles}. ${impact.unchangedDomains.length} unchanged.`;

  onEvent?.({
    type: "done",
    data: { phase: "update", affectedDomains: impact.affectedDomains.length, newCommit: headCommit },
  });

  return { mode: "incremental", impact, message: msg };
}

// ── Helpers ────────────────────────────────────────

/**
 * Re-index all docs (used for full fallback mode).
 */
async function reindexDocs(
  projectRoot: string,
  onEvent?: UpdateEventCallback,
): Promise<void> {
  onEvent?.({
    type: "index_update",
    data: { phase: "reindex_all" },
  });

  const config = loadConfig();
  validateOpenRouterConfig(config);
  const dbPath = path.join(projectRoot, ".deeplens", "deeplens.db");

  // Remove old DB for clean full re-index
  if (existsSync(dbPath)) {
    await fs.rm(dbPath, { force: true });
  }

  const indexer = new Indexer(config, dbPath);
  try {
    await indexer.index({
      projectRoot,
      indexCode: false,
    });
  } finally {
    indexer.close();
  }
}
