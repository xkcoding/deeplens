/**
 * list_files tool -- recursively list directory structure as a tree.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { ensureWithinRoot } from "./read-file.js";

const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", "__pycache__", "dist", "build", ".next", "target", "vendor",
]);

export async function listFiles(
  projectRoot: string,
  relativePath: string,
  depth?: number,
): Promise<string> {
  const maxDepth = Math.min(Math.max(depth ?? 2, 1), 5);

  const absPath = ensureWithinRoot(projectRoot, relativePath);
  if (!absPath) {
    return `Error: Path "${relativePath}" is outside the project root.`;
  }

  try {
    const stat = await fs.stat(absPath);
    if (!stat.isDirectory()) {
      return `Error: "${relativePath}" is not a directory.`;
    }
  } catch {
    return `Error: Path "${relativePath}" not found.`;
  }

  const lines: string[] = [];
  const displayRoot = relativePath === "." || relativePath === "" ? path.basename(projectRoot) : relativePath;
  lines.push(displayRoot + "/");

  await buildTree(absPath, "", maxDepth, 0, lines);
  return lines.join("\n");
}

async function buildTree(
  dirPath: string,
  prefix: string,
  maxDepth: number,
  currentDepth: number,
  lines: string[],
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  // Sort: directories first, then alphabetically
  entries.sort((a, b) => {
    const aIsDir = a.isDirectory() ? 0 : 1;
    const bIsDir = b.isDirectory() ? 0 : 1;
    if (aIsDir !== bIsDir) return aIsDir - bIsDir;
    return a.name.localeCompare(b.name);
  });

  // Filter out excluded directories
  const filtered = entries.filter(
    (e) => !(e.isDirectory() && EXCLUDED_DIRS.has(e.name)),
  );

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];
    const isLast = i === filtered.length - 1;
    const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    const childPrefix = isLast ? "    " : "\u2502   ";

    if (entry.isDirectory()) {
      lines.push(`${prefix}${connector}${entry.name}/`);
      await buildTree(
        path.join(dirPath, entry.name),
        prefix + childPrefix,
        maxDepth,
        currentDepth + 1,
        lines,
      );
    } else {
      lines.push(`${prefix}${connector}${entry.name}`);
    }
  }
}
