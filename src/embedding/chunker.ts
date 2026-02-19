/**
 * Chunker — splits Markdown documents and source code files into semantic chunks.
 */

// ── Types ──────────────────────────────────────────

export interface Chunk {
  sourcePath: string;
  sourceType: "doc" | "code";
  headerPath: string | null;
  content: string;
  startLine: number;
  endLine: number;
}

// ── Constants ──────────────────────────────────────

/** Target chunk size in characters (~512 tokens). */
const TARGET_SIZE = 2000;
/** Maximum chunk size in characters (~1024 tokens). */
const MAX_SIZE = 4000;
/** Overlap in characters (~50 tokens). */
const OVERLAP_SIZE = 200;

// ── Markdown Chunker ───────────────────────────────

/** Regex matching H1/H2/H3 headers at line start. */
const HEADER_RE = /^(#{1,3})\s+(.+)$/;

interface Section {
  headerPath: string;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Split Markdown content into chunks by H1/H2/H3 headers.
 * Oversized sections are recursively split by paragraph then by line.
 * Fenced code blocks are never split mid-block.
 */
export function chunkMarkdown(content: string, sourcePath: string): Chunk[] {
  const lines = content.split("\n");
  const sections = splitByHeaders(lines);

  const chunks: Chunk[] = [];
  for (const section of sections) {
    if (section.content.length <= MAX_SIZE) {
      chunks.push({
        sourcePath,
        sourceType: "doc",
        headerPath: section.headerPath || null,
        content: section.content,
        startLine: section.startLine,
        endLine: section.endLine,
      });
    } else {
      // Recursively split oversized sections
      const subChunks = splitOversizedSection(section, sourcePath);
      chunks.push(...subChunks);
    }
  }

  return chunks;
}

/**
 * Split lines into sections based on H1/H2/H3 headers.
 * Maintains header hierarchy for header_path metadata.
 */
function splitByHeaders(lines: string[]): Section[] {
  const sections: Section[] = [];
  const headerStack: string[] = []; // tracks current heading hierarchy
  let currentLines: string[] = [];
  let sectionStart = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = HEADER_RE.exec(line);

    if (match) {
      // Flush previous section
      if (currentLines.length > 0) {
        const text = currentLines.join("\n").trim();
        if (text.length > 0) {
          sections.push({
            headerPath: headerStack.join(" > "),
            content: text,
            startLine: sectionStart,
            endLine: i, // previous line
          });
        }
      }

      const level = match[1].length; // 1, 2, or 3
      const title = `${"#".repeat(level)} ${match[2]}`;

      // Update header stack: pop until we find a parent level
      while (headerStack.length >= level) {
        headerStack.pop();
      }
      headerStack.push(title);

      currentLines = [line];
      sectionStart = i + 1;
    } else {
      currentLines.push(line);
    }
  }

  // Flush last section
  if (currentLines.length > 0) {
    const text = currentLines.join("\n").trim();
    if (text.length > 0) {
      sections.push({
        headerPath: headerStack.join(" > "),
        content: text,
        startLine: sectionStart,
        endLine: lines.length,
      });
    }
  }

  // Handle files with no headers — single section
  if (sections.length === 0 && lines.length > 0) {
    const text = lines.join("\n").trim();
    if (text.length > 0) {
      sections.push({
        headerPath: "",
        content: text,
        startLine: 1,
        endLine: lines.length,
      });
    }
  }

  return sections;
}

/**
 * Recursively split an oversized section into chunks ≤ MAX_SIZE.
 * Strategy: split by paragraphs (\n\n) first, then by lines (\n).
 * Fenced code blocks are kept intact.
 */
function splitOversizedSection(section: Section, sourcePath: string): Chunk[] {
  const blocks = splitPreservingCodeBlocks(section.content);
  const chunks: Chunk[] = [];
  let buffer = "";
  let bufferStartLine = section.startLine;
  let currentLine = section.startLine;

  for (const block of blocks) {
    const blockLines = block.split("\n").length;

    if (buffer.length > 0 && buffer.length + block.length > TARGET_SIZE) {
      // Flush buffer
      chunks.push({
        sourcePath,
        sourceType: "doc",
        headerPath: section.headerPath || null,
        content: buffer.trim(),
        startLine: bufferStartLine,
        endLine: currentLine - 1,
      });

      // Add overlap from end of buffer
      const overlapText = getOverlapSuffix(buffer, OVERLAP_SIZE);
      buffer = overlapText + block;
      bufferStartLine = currentLine;
    } else {
      if (buffer.length === 0) {
        bufferStartLine = currentLine;
      }
      buffer += (buffer.length > 0 ? "\n\n" : "") + block;
    }

    currentLine += blockLines;
  }

  // Flush remaining buffer
  if (buffer.trim().length > 0) {
    chunks.push({
      sourcePath,
      sourceType: "doc",
      headerPath: section.headerPath || null,
      content: buffer.trim(),
      startLine: bufferStartLine,
      endLine: section.endLine,
    });
  }

  // If any chunk is still too large, split by lines
  const result: Chunk[] = [];
  for (const chunk of chunks) {
    if (chunk.content.length > MAX_SIZE) {
      result.push(...splitByLines(chunk));
    } else {
      result.push(chunk);
    }
  }

  return result;
}

/**
 * Split text into blocks by double newlines, but keep fenced code blocks intact.
 */
function splitPreservingCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split("\n");
  let current: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      current.push(line);
      continue;
    }

    if (inCodeBlock) {
      current.push(line);
      continue;
    }

    // Check for paragraph boundary (empty line)
    if (line.trim() === "" && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

/**
 * Get the last `size` characters from text as overlap content.
 */
function getOverlapSuffix(text: string, size: number): string {
  if (text.length <= size) return text;
  return text.slice(-size);
}

/**
 * Last-resort split: split chunk content by individual lines.
 */
function splitByLines(chunk: Chunk): Chunk[] {
  const lines = chunk.content.split("\n");
  const result: Chunk[] = [];
  let buffer = "";
  let bufferStart = chunk.startLine;
  let lineNum = chunk.startLine;

  for (const line of lines) {
    if (buffer.length > 0 && buffer.length + line.length + 1 > TARGET_SIZE) {
      result.push({
        sourcePath: chunk.sourcePath,
        sourceType: chunk.sourceType,
        headerPath: chunk.headerPath,
        content: buffer.trim(),
        startLine: bufferStart,
        endLine: lineNum - 1,
      });
      const overlap = getOverlapSuffix(buffer, OVERLAP_SIZE);
      buffer = overlap + "\n" + line;
      bufferStart = lineNum;
    } else {
      if (buffer.length === 0) bufferStart = lineNum;
      buffer += (buffer.length > 0 ? "\n" : "") + line;
    }
    lineNum++;
  }

  if (buffer.trim().length > 0) {
    result.push({
      sourcePath: chunk.sourcePath,
      sourceType: chunk.sourceType,
      headerPath: chunk.headerPath,
      content: buffer.trim(),
      startLine: bufferStart,
      endLine: chunk.endLine,
    });
  }

  return result;
}

// ── Source Code Chunker ────────────────────────────

/**
 * Split source code into chunks by blank-line-separated blocks.
 * Each block approximates a function/class boundary.
 * Adjacent small blocks (<512 tokens) are merged; oversized blocks (>1024 tokens)
 * are split by lines.
 */
export function chunkCode(content: string, sourcePath: string): Chunk[] {
  const lines = content.split("\n");

  // If file is small enough, return as single chunk
  if (content.length <= TARGET_SIZE) {
    return [
      {
        sourcePath,
        sourceType: "code",
        headerPath: null,
        content: content.trim(),
        startLine: 1,
        endLine: lines.length,
      },
    ];
  }

  // Step 1: Split into raw blocks by blank lines
  const rawBlocks: { lines: string[]; startLine: number; endLine: number }[] =
    [];
  let currentBlock: string[] = [];
  let blockStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" && currentBlock.length > 0) {
      rawBlocks.push({
        lines: currentBlock,
        startLine: blockStartLine,
        endLine: i, // 0-indexed i = line (i+1) - 1
      });
      currentBlock = [];
      blockStartLine = i + 2; // next non-empty line (1-indexed)
    } else {
      if (currentBlock.length === 0) blockStartLine = i + 1;
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    rawBlocks.push({
      lines: currentBlock,
      startLine: blockStartLine,
      endLine: lines.length,
    });
  }

  // Step 2: Merge adjacent small blocks, flush when buffer reaches TARGET_SIZE
  const merged: Chunk[] = [];
  let buffer: string[] = [];
  let bufferStart = 1;
  let bufferEnd = 1;

  for (const block of rawBlocks) {
    const blockText = block.lines.join("\n");

    if (buffer.length > 0) {
      const combined = buffer.join("\n") + "\n\n" + blockText;
      if (combined.length <= TARGET_SIZE) {
        // Merge: keep accumulating
        buffer.push("", ...block.lines); // empty string for the blank separator line
        bufferEnd = block.endLine;
        continue;
      }
      // Flush current buffer
      const text = buffer.join("\n").trim();
      if (text.length > 0) {
        merged.push({
          sourcePath,
          sourceType: "code",
          headerPath: null,
          content: text,
          startLine: bufferStart,
          endLine: bufferEnd,
        });
      }
      buffer = [];
    }

    // Start new buffer with this block
    buffer = [...block.lines];
    bufferStart = block.startLine;
    bufferEnd = block.endLine;
  }

  // Flush remaining buffer
  if (buffer.length > 0) {
    const text = buffer.join("\n").trim();
    if (text.length > 0) {
      merged.push({
        sourcePath,
        sourceType: "code",
        headerPath: null,
        content: text,
        startLine: bufferStart,
        endLine: bufferEnd,
      });
    }
  }

  // Step 3: Split any oversized chunks by lines
  const result: Chunk[] = [];
  for (const chunk of merged) {
    if (chunk.content.length > MAX_SIZE) {
      result.push(...splitByLines(chunk));
    } else {
      result.push(chunk);
    }
  }

  return result.length > 0
    ? result
    : [
        {
          sourcePath,
          sourceType: "code",
          headerPath: null,
          content: content.trim(),
          startLine: 1,
          endLine: lines.length,
        },
      ];
}
