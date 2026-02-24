/**
 * Shared ignore rules for directory/file exclusion.
 * Single source of truth — used by list_files tool, Explorer agent, and Indexer.
 */
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import ignore, { type Ignore } from "ignore";

/**
 * Directories that are always excluded from scanning.
 * These are build artifacts, dependency caches, and tool-generated directories
 * that never contain user-authored source code worth analyzing.
 */
export const DEFAULT_EXCLUDE_DIRS = new Set([
  // Version control
  ".git", ".hg", ".svn",
  // Dependencies
  "node_modules", "vendor", ".yarn",
  // Build outputs
  "dist", "dist-ui", "build", "out", ".next", ".output", ".nuxt", "target",
  // Caches
  "__pycache__", ".pytest_cache", ".mypy_cache", "coverage",
  ".turbo", ".vercel", ".cache",
  // IDE / Editor
  ".idea", ".vscode",
  // DeepLens own output
  ".deeplens",
  // Misc generated
  "binaries",
]);

/**
 * Load ignore rules: DEFAULT_EXCLUDE_DIRS + .deeplensignore (if present).
 * Returns an `ignore` instance that can be used with `ig.ignores(relativePath)`.
 */
export async function loadIgnoreRules(projectRoot: string): Promise<Ignore> {
  const ig = ignore();

  // Always ignore common heavy/irrelevant directories
  for (const dir of DEFAULT_EXCLUDE_DIRS) {
    ig.add(dir);
  }

  // Read .deeplensignore (user-defined exclusions)
  const ignorePath = path.join(projectRoot, ".deeplensignore");
  if (existsSync(ignorePath)) {
    const content = await fs.readFile(ignorePath, "utf-8");
    ig.add(content);
  }

  return ig;
}

/**
 * Quick check: should this directory name be excluded?
 * Uses only the static DEFAULT_EXCLUDE_DIRS set (no .deeplensignore).
 * For full ignore support, use loadIgnoreRules() instead.
 */
export function isExcludedDir(name: string): boolean {
  return DEFAULT_EXCLUDE_DIRS.has(name) || name.startsWith(".");
}
