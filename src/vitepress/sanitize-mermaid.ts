import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Post-generation Mermaid sanitizer.
 * Scans all .md files in the docs directory and fixes common Mermaid syntax
 * issues that agents may produce (e.g. multiline labels, unbalanced quotes).
 *
 * Returns the number of files that were modified.
 */
export async function sanitizeMermaidBlocks(docsDir: string): Promise<number> {
  const mdFiles = await collectMarkdownFiles(docsDir);
  let fixedCount = 0;

  for (const filePath of mdFiles) {
    const original = await readFile(filePath, "utf-8");
    const fixed = fixMermaidInMarkdown(original);
    if (fixed !== original) {
      await writeFile(filePath, fixed, "utf-8");
      fixedCount++;
    }
  }

  return fixedCount;
}

/** Recursively collect all .md files under a directory. */
async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Find all ```mermaid ... ``` blocks in markdown content and apply syntax fixes.
 */
function fixMermaidInMarkdown(content: string): string {
  return content.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, mermaidCode: string) => {
      const fixed = fixMermaidSyntax(mermaidCode);
      return "```mermaid\n" + fixed + "```";
    },
  );
}

/**
 * Fix common Mermaid syntax issues:
 * 1. Multiline participant labels in sequence diagrams
 * 2. Multiline note text
 * 3. Multiline node labels in flowcharts
 * 4. Unbalanced/nested brackets in node definitions
 */
function fixMermaidSyntax(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Fix multiline quoted strings: if a line has an unmatched opening quote,
    // merge subsequent lines until the closing quote is found.
    if (hasUnmatchedQuote(line)) {
      while (i + 1 < lines.length && hasUnmatchedQuote(line)) {
        i++;
        // Collapse the next line into the current, replacing the newline with a space
        line = line + " " + lines[i].trimStart();
      }
    }

    // Fix participant lines with multiline aliases (already collapsed above)
    // Additional safety: ensure participant labels don't contain literal newlines
    line = fixParticipantLine(line);

    // Fix note lines
    line = fixNoteLine(line);

    // Fix flowchart node definitions with nested/unbalanced brackets
    line = fixFlowchartNode(line);

    result.push(line);
  }

  return result.join("\n");
}

/** Check if a line has an unmatched double quote (odd number of unescaped quotes). */
function hasUnmatchedQuote(line: string): boolean {
  // Count unescaped double quotes
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && (i === 0 || line[i - 1] !== "\\")) {
      count++;
    }
  }
  return count % 2 !== 0;
}

/** Fix participant line: collapse any embedded newlines in the label. */
function fixParticipantLine(line: string): string {
  // participant X as "Label with spaces"
  const match = line.match(/^(\s*participant\s+\S+\s+as\s+")(.*)(")\s*$/);
  if (match) {
    const label = match[2].replace(/\n/g, " ").replace(/\s+/g, " ");
    return `${match[1]}${label}${match[3]}`;
  }
  return line;
}

/** Fix note lines: collapse any embedded newlines in the text. */
function fixNoteLine(line: string): string {
  const match = line.match(/^(\s*note\s+(?:over|left of|right of)\s+[^:]+:\s*)(.*)$/);
  if (match) {
    const text = match[2].replace(/\n/g, " ").replace(/\s+/g, " ");
    return `${match[1]}${text}`;
  }
  return line;
}

/**
 * Fix flowchart node definitions with nested brackets.
 * e.g. `CLI["DeepLens CLI["Commands"]` → `CLI["DeepLens CLI - Commands"]`
 */
function fixFlowchartNode(line: string): string {
  // Match patterns like: nodeId["label["nested"]
  // This is a heuristic — detect more opening brackets than closing
  const nodeMatch = line.match(/^(\s*)(\w+)(\[.*\])\s*$/);
  if (!nodeMatch) return line;

  const [, indent, nodeId, bracketPart] = nodeMatch;

  // Count bracket pairs
  let openSquare = 0;
  let openParen = 0;
  let openCurly = 0;
  for (const ch of bracketPart) {
    if (ch === "[") openSquare++;
    else if (ch === "]") openSquare--;
    else if (ch === "(") openParen++;
    else if (ch === ")") openParen--;
    else if (ch === "{") openCurly++;
    else if (ch === "}") openCurly--;
  }

  // If brackets are balanced, no fix needed
  if (openSquare === 0 && openParen === 0 && openCurly === 0) return line;

  // Extract the inner label text, strip all bracket types, and re-wrap as simple rect
  const labelText = bracketPart
    .replace(/[\[\](){}"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${indent}${nodeId}["${labelText}"]`;
}
