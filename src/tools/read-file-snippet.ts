/**
 * read_file_snippet tool -- read a line range from a file (1-based).
 */
import fs from "node:fs/promises";
import { ensureWithinRoot, isBinaryFile } from "./read-file.js";

export async function readFileSnippet(
  projectRoot: string,
  relativePath: string,
  startLine?: number,
  maxLines?: number,
): Promise<string> {
  const absPath = ensureWithinRoot(projectRoot, relativePath);
  if (!absPath) {
    return `Error: Path "${relativePath}" is outside the project root.`;
  }

  if (isBinaryFile(relativePath)) {
    return `Error: "${relativePath}" appears to be a binary file. Binary files are not supported.`;
  }

  const start = Math.max(startLine ?? 1, 1);
  const limit = Math.max(maxLines ?? 200, 1);

  try {
    const content = await fs.readFile(absPath, "utf-8");
    const allLines = content.split("\n");
    const totalLines = allLines.length;

    const startIdx = start - 1; // 0-based
    if (startIdx >= totalLines) {
      return `Error: start_line ${start} exceeds total line count (${totalLines}).`;
    }

    const endIdx = Math.min(startIdx + limit, totalLines);
    const snippet = allLines.slice(startIdx, endIdx);

    const header = `// Lines ${start}-${startIdx + snippet.length} of ${totalLines} total`;
    return header + "\n" + snippet.join("\n");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return `Error: File "${relativePath}" not found.`;
    }
    return `Error reading "${relativePath}": ${err instanceof Error ? err.message : String(err)}`;
  }
}
