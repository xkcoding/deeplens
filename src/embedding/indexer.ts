/**
 * Index orchestrator — scans files, chunks, embeds, and stores vectors.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import chalk from "chalk";
import ignore, { type Ignore } from "ignore";
import { VectorStore } from "../vector/store.js";
import type { ChunkWithEmbedding } from "../vector/store.js";
import { EmbeddingClient } from "./client.js";
import { chunkMarkdown, chunkCode } from "./chunker.js";
import type { DeepLensConfig } from "../config/env.js";

// ── Types ──────────────────────────────────────────

export interface IndexOptions {
  /** Project root path. */
  projectRoot: string;
  /** Whether to also index source code files. */
  indexCode?: boolean;
  /** Source code file extensions to include. */
  codeExtensions?: string[];
}

interface FileEntry {
  relativePath: string;
  absolutePath: string;
  sourceType: "doc" | "code";
}

// ── Constants ──────────────────────────────────────

const DEFAULT_CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".vue",
  ".svelte",
];

const DEFAULT_EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "target",
  "vendor",
  "__pycache__",
  ".deeplens",
]);

const EMBED_BATCH_SIZE = 20;

// ── Ignore rules ──────────────────────────────────

/**
 * Load ignore rules for indexing.
 * Uses DEFAULT_EXCLUDE_DIRS + .deeplensignore only.
 * Does NOT read .gitignore — indexing needs differ from git tracking
 * (e.g. .deeplens/ is git-ignored but must be scanned for docs).
 */
async function loadIgnoreRules(projectRoot: string): Promise<Ignore> {
  const ig = ignore();

  // Always ignore common heavy/irrelevant directories
  for (const dir of DEFAULT_EXCLUDE_DIRS) {
    ig.add(dir);
  }

  // Read .deeplensignore (user-defined indexing exclusions)
  const deeplensIgnorePath = path.join(projectRoot, ".deeplensignore");
  if (existsSync(deeplensIgnorePath)) {
    const content = await fs.readFile(deeplensIgnorePath, "utf-8");
    ig.add(content);
  }

  return ig;
}

// ── Indexer ────────────────────────────────────────

export class Indexer {
  private store: VectorStore;
  private client: EmbeddingClient;

  constructor(config: DeepLensConfig, dbPath: string) {
    this.store = new VectorStore(dbPath);
    this.client = new EmbeddingClient(config);
  }

  /**
   * Run the full indexing pipeline: scan → chunk → embed → store.
   */
  async index(options: IndexOptions): Promise<void> {
    const docsDir = path.join(options.projectRoot, ".deeplens", "docs");

    // Check if docs directory exists
    if (!existsSync(docsDir)) {
      console.error(
        chalk.red(
          `No docs found at ${docsDir}.\n` +
            `Run "deeplens generate" first to create documentation.`,
        ),
      );
      return;
    }

    // Scan files
    const files: FileEntry[] = [];

    // Scan markdown docs (only skip VitePress artifacts, not .deeplensignore)
    const mdFiles = await scanDirectory(docsDir, ".md");
    for (const absPath of mdFiles) {
      files.push({
        relativePath: path.relative(options.projectRoot, absPath),
        absolutePath: absPath,
        sourceType: "doc",
      });
    }

    // Optionally scan source code (apply DEFAULT_EXCLUDE_DIRS + .deeplensignore)
    if (options.indexCode) {
      const extensions = options.codeExtensions ?? DEFAULT_CODE_EXTENSIONS;
      const ig = await loadIgnoreRules(options.projectRoot);

      const codeFiles = await scanCodeFiles(
        options.projectRoot,
        extensions,
        ig,
      );
      for (const absPath of codeFiles) {
        files.push({
          relativePath: path.relative(options.projectRoot, absPath),
          absolutePath: absPath,
          sourceType: "code",
        });
      }
    }

    if (files.length === 0) {
      console.log(chalk.yellow("No files found to index."));
      return;
    }

    console.log(chalk.blue(`Found ${files.length} files to process.`));

    let processed = 0;
    let skipped = 0;
    let totalChunks = 0;

    for (const file of files) {
      const content = await fs.readFile(file.absolutePath, "utf-8");
      const hash = sha256(content);

      // Check if file already indexed with same hash
      const status = this.store.getStatus(file.relativePath);
      if (status && status.fileHash === hash) {
        skipped++;
        processed++;
        printProgress(processed, files.length, skipped);
        continue;
      }

      // Delete old chunks for this file (re-index case)
      if (status) {
        this.store.deleteBySource(file.relativePath);
      }

      // Chunk the file
      const chunks =
        file.sourceType === "doc"
          ? chunkMarkdown(content, file.relativePath)
          : chunkCode(content, file.relativePath);

      if (chunks.length === 0) {
        processed++;
        printProgress(processed, files.length, skipped);
        continue;
      }

      // Embed in batches
      const embeddings: Float32Array[] = [];
      for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
        const texts = batch.map((c) => c.content);
        const batchEmbeddings = await this.client.embedBatch(
          texts,
          "document",
        );
        embeddings.push(...batchEmbeddings);
      }

      // Store chunks with embeddings
      const chunksWithEmbeddings: ChunkWithEmbedding[] = chunks.map(
        (chunk, i) => ({
          sourcePath: chunk.sourcePath,
          sourceType: chunk.sourceType,
          headerPath: chunk.headerPath ?? undefined,
          content: chunk.content,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          embedding: embeddings[i],
        }),
      );

      this.store.insertChunks(chunksWithEmbeddings);

      // Update index status
      this.store.upsertStatus({
        sourcePath: file.relativePath,
        sourceType: file.sourceType,
        fileHash: hash,
        chunkCount: chunks.length,
      });

      totalChunks += chunks.length;
      processed++;
      printProgress(processed, files.length, skipped);
    }

    console.log(""); // newline after progress
    console.log(
      chalk.green(
        `Indexing complete: ${processed - skipped} files indexed, ${skipped} skipped (unchanged), ${totalChunks} chunks stored.`,
      ),
    );
  }

  /**
   * Close the underlying vector store.
   */
  close(): void {
    this.store.close();
  }

  /**
   * Get the underlying vector store (for search operations).
   */
  getStore(): VectorStore {
    return this.store;
  }
}

// ── Helpers ────────────────────────────────────────

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function printProgress(current: number, total: number, skipped: number): void {
  const pct = Math.round((current / total) * 100);
  process.stdout.write(
    `\r${chalk.dim(`[${current}/${total}]`)} ${chalk.blue(`${pct}%`)} indexed${skipped > 0 ? chalk.dim(` (${skipped} unchanged)`) : ""}`,
  );
}

/** Directories to skip when scanning docs (VitePress artifacts). */
const DOCS_SKIP_DIRS = new Set(["node_modules", ".vitepress"]);

async function scanDirectory(dir: string, ext: string): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!DOCS_SKIP_DIRS.has(entry.name)) {
        results.push(...(await scanDirectory(fullPath, ext)));
      }
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function scanCodeFiles(
  rootDir: string,
  extensions: string[],
  ig: Ignore,
): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      // Check against ignore rules
      if (ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(rootDir);
  return results;
}
