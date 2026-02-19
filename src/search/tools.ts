/**
 * Deep Search tool definitions — 4 tools for the Agent Loop.
 */

import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { VectorStore, SearchResult } from "../vector/store.js";
import type { EmbeddingClient } from "../embedding/client.js";

const execFileAsync = promisify(execFile);

// ── Constants ──────────────────────────────────────

const MAX_FILE_SIZE = 100_000; // 100KB limit for read_file
const MAX_GREP_RESULTS = 50;

// ── Tool Factory ──────────────────────────────────

export function createDeepSearchTools(
  store: VectorStore,
  embeddingClient: EmbeddingClient,
  projectPath: string,
) {
  return {
    search_docs: tool({
      description:
        "Search documentation by semantic similarity. Returns the most relevant document chunks for a given query.",
      inputSchema: z.object({
        query: z.string().describe("The search query"),
      }),
      execute: async ({ query }) => {
        const vector = await embeddingClient.embedSingle(query, "query");
        const results = store.search(vector, 5, "doc");
        return formatSearchResults(results);
      },
    }),

    search_code: tool({
      description:
        "Search source code by semantic similarity. Returns the most relevant code chunks for a given query.",
      inputSchema: z.object({
        query: z.string().describe("The search query"),
      }),
      execute: async ({ query }) => {
        const vector = await embeddingClient.embedSingle(query, "query");
        const results = store.search(vector, 5, "code");
        return formatSearchResults(results);
      },
    }),

    read_file: tool({
      description:
        "Read a source file from the project. Provide a path relative to the project root.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path relative to the project root"),
      }),
      execute: async ({ path: filePath }) => {
        const absPath = path.resolve(projectPath, filePath);

        // Security: ensure the resolved path is within the project
        if (!absPath.startsWith(path.resolve(projectPath))) {
          return { error: "Path is outside the project directory." };
        }

        try {
          const stat = await fs.stat(absPath);
          if (stat.size > MAX_FILE_SIZE) {
            return {
              error: `File is too large (${Math.round(stat.size / 1024)}KB). Max allowed: ${MAX_FILE_SIZE / 1000}KB.`,
            };
          }
          const content = await fs.readFile(absPath, "utf-8");
          return { path: filePath, content };
        } catch {
          return { error: `File not found: ${filePath}` };
        }
      },
    }),

    grep_search: tool({
      description:
        "Search for a text pattern in the project files. Uses grep to find matching lines with context.",
      inputSchema: z.object({
        pattern: z.string().describe("The text pattern or regex to search for"),
        path: z
          .string()
          .optional()
          .describe(
            "Optional subdirectory to scope the search (relative to project root)",
          ),
      }),
      execute: async ({ pattern, path: scopePath }) => {
        const searchDir = scopePath
          ? path.resolve(projectPath, scopePath)
          : projectPath;

        // Security: ensure search dir is within project
        if (!searchDir.startsWith(path.resolve(projectPath))) {
          return { error: "Path is outside the project directory." };
        }

        try {
          const { stdout } = await execFileAsync(
            "grep",
            [
              "-rn",
              "--include=*.ts",
              "--include=*.tsx",
              "--include=*.js",
              "--include=*.jsx",
              "--include=*.py",
              "--include=*.go",
              "--include=*.rs",
              "--include=*.java",
              "--include=*.md",
              "--include=*.vue",
              "--include=*.svelte",
              "-m",
              String(MAX_GREP_RESULTS),
              pattern,
              searchDir,
            ],
            { maxBuffer: 1024 * 1024, timeout: 10_000 },
          );

          // Make paths relative to project root
          const lines = stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => line.replace(projectPath + "/", ""));

          return {
            matches: lines.slice(0, MAX_GREP_RESULTS),
            total: lines.length,
          };
        } catch (err: unknown) {
          // grep exits with code 1 when no matches found
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            err.code === 1
          ) {
            return { matches: [], total: 0 };
          }
          return { error: `Grep failed: ${String(err)}` };
        }
      },
    }),
  };
}

// ── Helpers ────────────────────────────────────────

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No matching results found.";
  }

  return results
    .map((r, i) => {
      const header = r.headerPath ? ` | ${r.headerPath}` : "";
      const lines =
        r.startLine != null && r.endLine != null
          ? ` (lines ${r.startLine}-${r.endLine})`
          : "";
      return `[${i + 1}] ${r.sourcePath}${header}${lines}\n${r.content}`;
    })
    .join("\n\n---\n\n");
}
