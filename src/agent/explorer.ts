import { query } from "@anthropic-ai/claude-agent-sdk";
import { createExplorerServer } from "./tools.js";
import { getExplorerPrompt } from "../prompts/explorer.js";
import { parseOutline } from "../outline/parser.js";
import type { Outline } from "../outline/types.js";

const MAX_RETRIES = 2;

/**
 * Run the exploration Agent ("Code Archaeologist").
 * Calls query() with explorer prompt + MCP server (read-only tools).
 * Returns the validated outline or throws on failure.
 */
export async function runExplorer(projectRoot: string): Promise<Outline> {
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt =
      attempt === 0
        ? "Analyze the codebase and produce a knowledge outline."
        : `Your previous output failed validation:\n\n${lastError}\n\nPlease fix the issues and produce a valid JSON outline. Output ONLY the corrected JSON.`;

    const rawOutput = await runExplorerQuery(projectRoot, prompt);

    const result = parseOutline(rawOutput);
    if (result.success) {
      return result.data;
    }

    lastError = result.error;
    if (attempt < MAX_RETRIES) {
      console.error(
        `\nOutline validation failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...\n${result.error}`,
      );
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
): Promise<string> {
  let resultText = "";

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: getExplorerPrompt(projectRoot),
      tools: [],
      maxTurns: 50,
      mcpServers: { deeplens: createExplorerServer(projectRoot) },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      persistSession: false,
    },
  })) {
    switch (message.type) {
      case "assistant": {
        // Process content blocks from the assistant message
        for (const block of message.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
          } else if (block.type === "tool_use") {
            const args = JSON.stringify(block.input);
            console.log(`\n\uD83D\uDD27 ${block.name}(${args})`);
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
          throw new Error(`Explorer agent error (${message.subtype}): ${detail}`);
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
