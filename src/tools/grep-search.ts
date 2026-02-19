/**
 * grep_search tool -- search for patterns across project files.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { ensureWithinRoot, isBinaryFile } from "./read-file.js";

const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", "__pycache__", "dist", "build", ".next", "target", "vendor",
]);

const CONTEXT_LINES = 2;
const MAX_MATCHES = 100;

export async function grepSearch(
  projectRoot: string,
  query: string,
  relativePath?: string,
): Promise<string> {
  const searchRoot = relativePath
    ? ensureWithinRoot(projectRoot, relativePath)
    : projectRoot;

  if (!searchRoot) {
    return `Error: Path "${relativePath}" is outside the project root.`;
  }

  try {
    await fs.stat(searchRoot);
  } catch {
    return `Error: Path "${relativePath ?? "."}" not found.`;
  }

  let pattern: RegExp;
  try {
    pattern = new RegExp(query, "i");
  } catch {
    pattern = new RegExp(escapeRegExp(query), "i");
  }

  const matches: MatchResult[] = [];
  await searchDir(searchRoot, pattern, matches);

  if (matches.length === 0) {
    return `No matches found for "${query}"${relativePath ? ` in ${relativePath}` : ""}.`;
  }

  const lines: string[] = [];
  for (const match of matches) {
    const relPath = path.relative(projectRoot, match.file);
    lines.push(`${relPath}:${match.lineNum}: ${match.line.trimEnd()}`);
    for (const ctx of match.context) {
      lines.push(`  ${ctx.lineNum}: ${ctx.line.trimEnd()}`);
    }
    lines.push("");
  }

  if (matches.length >= MAX_MATCHES) {
    lines.push(`(Results truncated at ${MAX_MATCHES} matches)`);
  }

  return lines.join("\n").trimEnd();
}

interface ContextLine {
  lineNum: number;
  line: string;
}

interface MatchResult {
  file: string;
  lineNum: number;
  line: string;
  context: ContextLine[];
}

async function searchDir(
  dirPath: string,
  pattern: RegExp,
  matches: MatchResult[],
): Promise<void> {
  if (matches.length >= MAX_MATCHES) return;

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (matches.length >= MAX_MATCHES) return;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await searchDir(fullPath, pattern, matches);
      }
    } else if (entry.isFile() && !isBinaryFile(entry.name)) {
      await searchFile(fullPath, pattern, matches);
    }
  }
}

async function searchFile(
  filePath: string,
  pattern: RegExp,
  matches: MatchResult[],
): Promise<void> {
  let content: string;
  try {
    const stat = await fs.stat(filePath);
    // Skip files larger than 1MB for search performance
    if (stat.size > 1024 * 1024) return;
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return;
  }

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (matches.length >= MAX_MATCHES) return;

    if (pattern.test(lines[i])) {
      const context: ContextLine[] = [];
      const ctxStart = Math.max(0, i - CONTEXT_LINES);
      const ctxEnd = Math.min(lines.length - 1, i + CONTEXT_LINES);

      for (let j = ctxStart; j <= ctxEnd; j++) {
        if (j !== i) {
          context.push({ lineNum: j + 1, line: lines[j] });
        }
      }

      matches.push({
        file: filePath,
        lineNum: i + 1,
        line: lines[i],
        context,
      });
    }
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
