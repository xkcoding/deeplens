/**
 * MCP Server factory -- creates deeplens MCP servers for explorer and generator agents.
 * Explorer gets 4 read-only tools; Generator gets all 5 (adds write_file).
 */
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";
import { listFiles } from "../tools/list-files.js";
import { readFile } from "../tools/read-file.js";
import { readFileSnippet } from "../tools/read-file-snippet.js";
import { grepSearch } from "../tools/grep-search.js";
import { writeFile } from "../tools/write-file.js";

function createReadOnlyTools(projectRoot: string) {
  const listFilesTool = tool(
    "list_files",
    "List directory structure of a specified path as a tree. Returns directories and files up to the given depth, excluding common non-source directories.",
    {
      path: z.string().describe("Path relative to project root (e.g. '.' or 'src/services')"),
      depth: z.number().min(1).max(5).default(2).describe("Max depth to traverse (1-5, default 2)"),
    },
    async ({ path: relPath, depth }) => ({
      content: [{ type: "text" as const, text: await listFiles(projectRoot, relPath, depth) }],
    }),
    { annotations: { readOnly: true } },
  );

  const readFileTool = tool(
    "read_file",
    "Read the full content of a file. Rejects binary files and files larger than 1MB.",
    {
      path: z.string().describe("File path relative to project root"),
    },
    async ({ path: relPath }) => ({
      content: [{ type: "text" as const, text: await readFile(projectRoot, relPath) }],
    }),
    { annotations: { readOnly: true } },
  );

  const readFileSnippetTool = tool(
    "read_file_snippet",
    "Read a specific line range from a file. Useful for large files where reading the full content would waste tokens.",
    {
      path: z.string().describe("File path relative to project root"),
      start_line: z.number().min(1).default(1).describe("Starting line number (1-based, default 1)"),
      max_lines: z.number().min(1).default(200).describe("Maximum lines to return (default 200)"),
    },
    async ({ path: relPath, start_line, max_lines }) => ({
      content: [{ type: "text" as const, text: await readFileSnippet(projectRoot, relPath, start_line, max_lines) }],
    }),
    { annotations: { readOnly: true } },
  );

  const grepSearchTool = tool(
    "grep_search",
    "Search for a text pattern (string or regex) across project files. Returns matching file paths with line numbers and surrounding context. Excludes non-source directories and binary files.",
    {
      query: z.string().describe("Search pattern (string or regex)"),
      path: z.string().optional().describe("Optional path to limit search scope (relative to project root)"),
    },
    async ({ query, path: relPath }) => ({
      content: [{ type: "text" as const, text: await grepSearch(projectRoot, query, relPath) }],
    }),
    { annotations: { readOnly: true } },
  );

  return [listFilesTool, readFileTool, readFileSnippetTool, grepSearchTool] as const;
}

/** Create MCP server with read-only tools for the explorer agent. */
export function createExplorerServer(projectRoot: string) {
  const tools = createReadOnlyTools(projectRoot);
  return createSdkMcpServer({
    name: "deeplens",
    tools: [...tools],
  });
}

/** Create MCP server with all tools for the generator agent. */
export function createGeneratorServer(projectRoot: string) {
  const readOnlyTools = createReadOnlyTools(projectRoot);

  const writeFileTool = tool(
    "write_file",
    "Write content to a file in the documentation output directory (.deeplens/docs/). Creates parent directories as needed. Only allows writing within the output directory.",
    {
      path: z.string().describe("File path relative to the output directory (e.g. 'domains/user-auth/index.md')"),
      content: z.string().describe("Content to write to the file"),
    },
    async ({ path: relPath, content }) => ({
      content: [{ type: "text" as const, text: await writeFile(projectRoot, relPath, content) }],
    }),
    { annotations: { readOnly: false, destructive: false } },
  );

  return createSdkMcpServer({
    name: "deeplens",
    tools: [...readOnlyTools, writeFileTool],
  });
}
