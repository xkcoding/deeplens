import { query } from "@anthropic-ai/claude-agent-sdk";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createExplorerServer } from "./tools.js";
import { getExplorerPrompt } from "../prompts/explorer.js";
import { parseOutline } from "../outline/parser.js";
import { loadIgnoreRules } from "../config/ignore.js";
import type { Outline } from "../outline/types.js";
import type { AgentEventCallback } from "./events.js";

/**
 * Estimate project complexity by counting top-level source directories.
 * Respects DEFAULT_EXCLUDE_DIRS + .deeplensignore.
 * Used to dynamically calculate Explorer maxTurns.
 */
async function estimateProjectComplexity(projectRoot: string): Promise<number> {
  try {
    const ig = await loadIgnoreRules(projectRoot);
    const entries = await readdir(projectRoot);
    let srcDirCount = 0;
    for (const entry of entries) {
      if (ig.ignores(entry)) continue;
      try {
        const s = await stat(join(projectRoot, entry));
        if (s.isDirectory()) srcDirCount++;
      } catch {
        // skip unreadable entries
      }
    }
    return srcDirCount;
  } catch {
    return 5; // fallback for unreadable project root
  }
}

const MAX_RETRIES = 2;

/**
 * Run the exploration Agent ("Code Archaeologist").
 * Calls query() with explorer prompt + MCP server (read-only tools).
 * Returns the validated outline or throws on failure.
 *
 * @param projectRoot - Absolute path to the project root
 * @param options.onEvent - Optional callback for SSE event dispatch (sidecar mode)
 */
export async function runExplorer(
  projectRoot: string,
  options?: { onEvent?: AgentEventCallback },
): Promise<Outline> {
  let lastError = "";
  let previousRawOutput = "";
  const onEvent = options?.onEvent;

  // Dynamic maxTurns: estimate project complexity from top-level directory count
  // Each source dir may need: list_files + read_file + grep_search = ~3-5 turns
  // Plus anchor reads (~5), synthesize (~2), and buffer for retries
  const complexity = await estimateProjectComplexity(projectRoot);
  const explorerMaxTurns = Math.max(50, complexity * 10 + 30);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let prompt: string;
    if (attempt === 0) {
      prompt = "Analyze the codebase and produce a knowledge outline.";
    } else {
      // Include previous raw output so the agent can fix JSON without re-exploring
      prompt = `Your previous analysis produced output that failed validation.

<previous_output>
${previousRawOutput}
</previous_output>

Validation error:
${lastError}

Please fix the validation issues in the JSON above and output ONLY the corrected JSON outline. Do NOT re-explore the codebase — the previous output already contains all the information you need.`;
    }

    let rawOutput: string;
    try {
      rawOutput = await runExplorerQuery(projectRoot, prompt, explorerMaxTurns, onEvent);
    } catch (err) {
      // If max_turns hit on retry, surface a clear error
      const errMsg = (err as Error).message;
      if (attempt < MAX_RETRIES && errMsg.includes("error_max_turns")) {
        const msg = `Explorer hit turn limit (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...`;
        if (onEvent) {
          onEvent({ type: "error", data: { message: msg, recoverable: true } });
        } else {
          console.error(`\n${msg}`);
        }
        lastError = errMsg;
        continue;
      }
      throw err;
    }

    previousRawOutput = rawOutput;
    const result = parseOutline(rawOutput);
    if (result.success) {
      return result.data;
    }

    lastError = result.error;
    if (attempt < MAX_RETRIES) {
      const msg = `Outline validation failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...\n${result.error}`;
      if (onEvent) {
        onEvent({ type: "error", data: { message: msg, recoverable: true } });
      } else {
        console.error(`\n${msg}`);
      }
    }
  }

  // All retries exhausted — save raw output and throw
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const outputDir = path.join(projectRoot, ".deeplens");
  await mkdir(outputDir, { recursive: true });
  const rawPath = path.join(outputDir, "explorer-raw-output.txt");
  await writeFile(rawPath, lastError, "utf-8");
  throw new Error(
    `Explorer agent failed to produce valid JSON after ${MAX_RETRIES + 1} attempts.\n` +
      `Raw output saved to: ${rawPath}\n` +
      `Last error: ${lastError}\n` +
      `Please manually fix the JSON and use 'deeplens generate' to continue.`,
  );
}

/**
 * Execute a single explorer query and return the raw text output.
 * Handles streaming events: prints tool calls and agent reasoning in real-time.
 */
async function runExplorerQuery(
  projectRoot: string,
  prompt: string,
  maxTurns: number,
  onEvent?: AgentEventCallback,
): Promise<string> {
  let resultText = "";

  // Clean env: remove CLAUDECODE to avoid "nested session" rejection from Claude Code CLI
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: getExplorerPrompt(projectRoot),
      tools: [],
      maxTurns,
      mcpServers: { deeplens: createExplorerServer(projectRoot) },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      persistSession: false,
      env: cleanEnv,
      stderr: (data: string) => {
        if (onEvent) {
          onEvent({ type: "thought", data: { content: `[stderr] ${data}` } });
        } else {
          process.stderr.write(data);
        }
      },
    },
  })) {
    switch (message.type) {
      case "assistant": {
        // Process content blocks from the assistant message
        for (const block of message.message.content) {
          if (block.type === "text") {
            if (onEvent) {
              onEvent({ type: "thought", data: { content: block.text } });
            } else {
              process.stdout.write(block.text);
            }
          } else if (block.type === "tool_use") {
            if (onEvent) {
              onEvent({
                type: "tool_start",
                data: { tool: block.name, args: block.input },
              });
            } else {
              const args = JSON.stringify(block.input);
              console.log(`\n\uD83D\uDD27 ${block.name}(${args})`);
            }
          }
        }
        break;
      }
      case "result": {
        if (message.subtype === "success") {
          resultText = message.result;
        } else {
          const errorList =
            "errors" in message
              ? (message.errors as string[])
              : [];
          const detail = errorList.length > 0
            ? errorList.join("; ")
            : `subtype=${message.subtype}`;
          const errMsg = `Explorer agent error (${message.subtype}): ${detail}`;
          if (onEvent) {
            onEvent({ type: "error", data: { message: errMsg, recoverable: false } });
          }
          throw new Error(errMsg);
        }
        break;
      }
      default:
        // Ignore system, user, stream_event, and other message types
        break;
    }
  }

  if (!resultText) {
    throw new Error("Explorer agent returned no result.");
  }

  return resultText;
}
