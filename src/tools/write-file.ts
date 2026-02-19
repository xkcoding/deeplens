/**
 * write_file tool -- write documentation files to .deeplens/docs/.
 */
import path from "node:path";
import fs from "node:fs/promises";

export async function writeFile(
  projectRoot: string,
  relativePath: string,
  content: string,
): Promise<string> {
  // Security: reject absolute paths
  if (path.isAbsolute(relativePath)) {
    return `Error: Absolute paths are not allowed. Use a path relative to the output directory.`;
  }

  // Security: reject path traversal
  if (relativePath.includes("../") || relativePath.includes("..\\")) {
    return `Error: Path traversal ("../") is not allowed.`;
  }

  // Resolve within the .deeplens/docs/ output directory
  const outputBase = path.resolve(projectRoot, ".deeplens", "docs");
  const absPath = path.resolve(outputBase, relativePath);

  // Double-check the resolved path is still within outputBase
  if (!absPath.startsWith(outputBase + path.sep) && absPath !== outputBase) {
    return `Error: Resolved path is outside the output directory.`;
  }

  try {
    // Create parent directories as needed
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, "utf-8");
    const relDisplay = path.relative(projectRoot, absPath);
    return `Successfully wrote ${content.length} characters to ${relDisplay}`;
  } catch (err: unknown) {
    return `Error writing "${relativePath}": ${err instanceof Error ? err.message : String(err)}`;
  }
}
