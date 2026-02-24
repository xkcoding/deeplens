/**
 * MCP Server factory -- creates deeplens MCP servers for explorer and generator agents.
 * Explorer gets 4 read-only tools; Generator gets all 5 (adds write_file).
 */
import path from "node:path";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod/v4";
import { listFiles } from "../tools/list-files.js";
import { readFile } from "../tools/read-file.js";
import { readFileSnippet } from "../tools/read-file-snippet.js";
import { grepSearch } from "../tools/grep-search.js";
import { writeFile } from "../tools/write-file.js";
import { renderMermaid } from "../tools/render-mermaid.js";

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
    { annotations: { readOnlyHint: true } },
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
    { annotations: { readOnlyHint: true } },
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
    { annotations: { readOnlyHint: true } },
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
    { annotations: { readOnlyHint: true } },
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

/**
 * Create MCP server with list_files + read_file + write_file for the translator agent.
 * Read/list tools resolve from the docs directory (.deeplens/docs/) so the translator
 * can use clean paths like "en/index.md" instead of ".deeplens/docs/en/index.md".
 * Write tool also writes to the docs directory (via writeFile which adds the prefix).
 */
export function createTranslatorServer(projectRoot: string) {
  const docsRoot = path.join(projectRoot, ".deeplens", "docs");

  // list_files scoped to docs directory — "en/domains/auth" resolves to .deeplens/docs/en/domains/auth
  const listFilesTool = tool(
    "list_files",
    "List directory structure within the documentation directory. Returns directories and files up to the given depth.",
    {
      path: z.string().describe("Path relative to the docs directory (e.g. 'en/domains/auth')"),
      depth: z.number().min(1).max(5).default(2).describe("Max depth to traverse (1-5, default 2)"),
    },
    async ({ path: relPath, depth }) => ({
      content: [{ type: "text" as const, text: await listFiles(docsRoot, relPath, depth) }],
    }),
    { annotations: { readOnlyHint: true } },
  );

  // read_file scoped to docs directory — "en/index.md" resolves to .deeplens/docs/en/index.md
  const readFileTool = tool(
    "read_file",
    "Read a documentation file. Path is relative to the docs directory.",
    {
      path: z.string().describe("File path relative to the docs directory (e.g. 'en/index.md')"),
    },
    async ({ path: relPath }) => ({
      content: [{ type: "text" as const, text: await readFile(docsRoot, relPath) }],
    }),
    { annotations: { readOnlyHint: true } },
  );

  // write_file uses projectRoot (writeFile internally resolves to .deeplens/docs/)
  const writeFileTool = tool(
    "write_file",
    "Write content to a file in the documentation output directory. Creates parent directories as needed.",
    {
      path: z.string().describe("File path relative to the docs directory (e.g. 'zh/domains/auth/index.md')"),
      content: z.string().describe("Content to write to the file"),
    },
    async ({ path: relPath, content }) => ({
      content: [{ type: "text" as const, text: await writeFile(projectRoot, relPath, content) }],
    }),
    { annotations: { readOnlyHint: false, destructiveHint: false } },
  );

  return createSdkMcpServer({
    name: "deeplens",
    tools: [listFilesTool, readFileTool, writeFileTool],
  });
}

/**
 * Create MCP server for the overview/summary synthesizer agents.
 * read_file resolves from docs directory (.deeplens/docs/) for reading generated docs.
 * grep_search and read_file_snippet resolve from projectRoot for source code access.
 * write_file writes to the docs directory.
 */
export function createSynthesizerServer(projectRoot: string) {
  const docsRoot = path.join(projectRoot, ".deeplens", "docs");

  // read_file scoped to docs directory — "en/index.md" resolves to .deeplens/docs/en/index.md
  const readFileTool = tool(
    "read_file",
    "Read a generated documentation file. Path is relative to the docs directory (e.g. 'en/index.md', 'en/domains/auth/index.md').",
    {
      path: z.string().describe("File path relative to the docs directory"),
    },
    async ({ path: relPath }) => ({
      content: [{ type: "text" as const, text: await readFile(docsRoot, relPath) }],
    }),
    { annotations: { readOnlyHint: true } },
  );

  // read_file_snippet scoped to project root for source code access
  const readFileSnippetTool = tool(
    "read_file_snippet",
    "Read a specific line range from a source file. Path is relative to the project root.",
    {
      path: z.string().describe("File path relative to project root"),
      start_line: z.number().min(1).default(1).describe("Starting line number (1-based, default 1)"),
      max_lines: z.number().min(1).default(200).describe("Maximum lines to return (default 200)"),
    },
    async ({ path: relPath, start_line, max_lines }) => ({
      content: [{ type: "text" as const, text: await readFileSnippet(projectRoot, relPath, start_line, max_lines) }],
    }),
    { annotations: { readOnlyHint: true } },
  );

  // grep_search scoped to project root for source code search
  const grepSearchTool = tool(
    "grep_search",
    "Search for a text pattern across project source files. Returns matching file paths with line numbers and context.",
    {
      query: z.string().describe("Search pattern (string or regex)"),
      path: z.string().optional().describe("Optional path to limit search scope (relative to project root)"),
    },
    async ({ query, path: relPath }) => ({
      content: [{ type: "text" as const, text: await grepSearch(projectRoot, query, relPath) }],
    }),
    { annotations: { readOnlyHint: true } },
  );

  // write_file uses projectRoot (writeFile internally resolves to .deeplens/docs/)
  const writeFileTool = tool(
    "write_file",
    "Write a documentation file. Path is relative to the docs directory.",
    {
      path: z.string().describe("File path relative to the docs directory (e.g. 'en/index.md')"),
      content: z.string().describe("Content to write to the file"),
    },
    async ({ path: relPath, content }) => ({
      content: [{ type: "text" as const, text: await writeFile(projectRoot, relPath, content) }],
    }),
    { annotations: { readOnlyHint: false, destructiveHint: false } },
  );

  const renderMermaidTool = tool(
    "render_mermaid",
    "Render a structured diagram description into valid Mermaid code. Accepts a JSON object describing a flowchart, sequence, or class diagram. Returns syntactically correct Mermaid code with proper escaping of special characters and sanitized node IDs. ALWAYS use this tool instead of writing Mermaid code by hand.",
    {
      diagram: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("flowchart"),
          direction: z.enum(["TD", "LR", "RL", "BT"]).optional().describe("Graph direction (default TD)"),
          nodes: z.array(z.object({
            id: z.string().describe("Unique node ID"),
            label: z.string().describe("Display label"),
            shape: z.enum(["rect", "round", "diamond", "stadium", "cylinder", "circle"]).optional(),
          })),
          edges: z.array(z.object({
            from: z.string().describe("Source node ID"),
            to: z.string().describe("Target node ID"),
            label: z.string().optional(),
            style: z.enum(["solid", "dotted", "thick"]).optional(),
          })),
          subgraphs: z.array(z.object({
            id: z.string(),
            label: z.string(),
            nodeIds: z.array(z.string()),
          })).optional(),
        }),
        z.object({
          type: z.literal("sequence"),
          participants: z.array(z.object({
            id: z.string().describe("Participant ID"),
            label: z.string().optional().describe("Display label (if different from ID)"),
          })),
          messages: z.array(z.object({
            from: z.string(),
            to: z.string(),
            label: z.string(),
            type: z.enum(["solid", "dotted", "solid_arrow", "dotted_arrow"]).optional(),
            activate: z.boolean().optional(),
            deactivate: z.boolean().optional(),
          })),
          notes: z.array(z.object({
            over: z.array(z.string()),
            text: z.string(),
          })).optional(),
        }),
        z.object({
          type: z.literal("class"),
          classes: z.array(z.object({
            name: z.string(),
            members: z.array(z.string()).optional().describe("Fields like '- name: string'"),
            methods: z.array(z.string()).optional().describe("Methods like '+ validate()'"),
          })),
          relations: z.array(z.object({
            from: z.string(),
            to: z.string(),
            type: z.enum(["inheritance", "composition", "aggregation", "dependency", "association"]).optional(),
            label: z.string().optional(),
          })).optional(),
        }),
      ]).describe("Diagram definition with type discriminator"),
    },
    async ({ diagram }) => ({
      content: [{ type: "text" as const, text: renderMermaid(diagram) }],
    }),
    { annotations: { readOnlyHint: true } },
  );

  return createSdkMcpServer({
    name: "deeplens",
    tools: [readFileTool, readFileSnippetTool, grepSearchTool, writeFileTool, renderMermaidTool],
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
    { annotations: { readOnlyHint: false, destructiveHint: false } },
  );

  const renderMermaidTool = tool(
    "render_mermaid",
    "Render a structured diagram description into valid Mermaid code. Accepts a JSON object describing a flowchart, sequence, or class diagram. Returns syntactically correct Mermaid code with proper escaping of special characters and sanitized node IDs. ALWAYS use this tool instead of writing Mermaid code by hand.",
    {
      diagram: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("flowchart"),
          direction: z.enum(["TD", "LR", "RL", "BT"]).optional().describe("Graph direction (default TD)"),
          nodes: z.array(z.object({
            id: z.string().describe("Unique node ID"),
            label: z.string().describe("Display label"),
            shape: z.enum(["rect", "round", "diamond", "stadium", "cylinder", "circle"]).optional(),
          })),
          edges: z.array(z.object({
            from: z.string().describe("Source node ID"),
            to: z.string().describe("Target node ID"),
            label: z.string().optional(),
            style: z.enum(["solid", "dotted", "thick"]).optional(),
          })),
          subgraphs: z.array(z.object({
            id: z.string(),
            label: z.string(),
            nodeIds: z.array(z.string()),
          })).optional(),
        }),
        z.object({
          type: z.literal("sequence"),
          participants: z.array(z.object({
            id: z.string().describe("Participant ID"),
            label: z.string().optional().describe("Display label (if different from ID)"),
          })),
          messages: z.array(z.object({
            from: z.string(),
            to: z.string(),
            label: z.string(),
            type: z.enum(["solid", "dotted", "solid_arrow", "dotted_arrow"]).optional(),
            activate: z.boolean().optional(),
            deactivate: z.boolean().optional(),
          })),
          notes: z.array(z.object({
            over: z.array(z.string()),
            text: z.string(),
          })).optional(),
        }),
        z.object({
          type: z.literal("class"),
          classes: z.array(z.object({
            name: z.string(),
            members: z.array(z.string()).optional().describe("Fields like '- name: string'"),
            methods: z.array(z.string()).optional().describe("Methods like '+ validate()'"),
          })),
          relations: z.array(z.object({
            from: z.string(),
            to: z.string(),
            type: z.enum(["inheritance", "composition", "aggregation", "dependency", "association"]).optional(),
            label: z.string().optional(),
          })).optional(),
        }),
      ]).describe("Diagram definition with type discriminator"),
    },
    async ({ diagram }) => ({
      content: [{ type: "text" as const, text: renderMermaid(diagram) }],
    }),
    { annotations: { readOnlyHint: true } },
  );

  return createSdkMcpServer({
    name: "deeplens",
    tools: [...readOnlyTools, writeFileTool, renderMermaidTool],
  });
}
