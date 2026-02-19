/**
 * read_file tool -- read full file content as UTF-8.
 * Also exports shared helpers: isBinaryFile(), ensureWithinRoot().
 */
import path from "node:path";
import fs from "node:fs/promises";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv", ".flac", ".ogg",
  ".zip", ".tar", ".gz", ".bz2", ".xz", ".rar", ".7z", ".zst",
  ".jar", ".war", ".ear", ".class",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pyc", ".pyo", ".wasm",
  ".db", ".sqlite", ".sqlite3",
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/** Check if a file path has a binary extension. */
export function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/** Ensure resolved path is within project root. Returns absolute path or null. */
export function ensureWithinRoot(
  projectRoot: string,
  filePath: string,
): string | null {
  const resolved = path.resolve(projectRoot, filePath);
  const normalizedRoot = path.resolve(projectRoot);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    return null;
  }
  return resolved;
}

export async function readFile(
  projectRoot: string,
  relativePath: string,
): Promise<string> {
  const absPath = ensureWithinRoot(projectRoot, relativePath);
  if (!absPath) {
    return `Error: Path "${relativePath}" is outside the project root.`;
  }

  if (isBinaryFile(relativePath)) {
    return `Error: "${relativePath}" appears to be a binary file. Binary files are not supported.`;
  }

  try {
    const stat = await fs.stat(absPath);
    if (!stat.isFile()) {
      return `Error: "${relativePath}" is not a file.`;
    }
    if (stat.size > MAX_FILE_SIZE) {
      return `Error: "${relativePath}" is ${(stat.size / 1024 / 1024).toFixed(1)}MB, exceeding the 1MB limit. Use read_file_snippet to read portions of large files.`;
    }
    const content = await fs.readFile(absPath, "utf-8");
    return content;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return `Error: File "${relativePath}" not found.`;
    }
    if (code === "EACCES") {
      return `Error: Permission denied reading "${relativePath}".`;
    }
    return `Error reading "${relativePath}": ${err instanceof Error ? err.message : String(err)}`;
  }
}
