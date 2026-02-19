import { query } from "@anthropic-ai/claude-agent-sdk";
import { createGeneratorServer } from "./tools.js";
import { getGeneratorPrompt } from "../prompts/generator.js";
import type { Outline } from "../outline/types.js";

/**
 * Run the generation Agent ("Deep Writer").
 * Calls query() with generator prompt + confirmed outline + MCP server (all tools).
 * Generates Hub-and-Spoke documentation per domain.
 */
export async function runGenerator(
  outline: Outline,
  projectRoot: string,
): Promise<void> {
  const totalDomains = outline.knowledge_graph.length;
  let completedDomains = 0;

  for await (const message of query({
    prompt: `Generate complete documentation for the project based on the provided outline. Process each domain sequentially. The outline JSON is already included in your system prompt.\n\nDomains to process (${totalDomains} total):\n${outline.knowledge_graph.map((d, i) => `${i + 1}. ${d.title} (${d.id})`).join("\n")}`,
    options: {
      systemPrompt: getGeneratorPrompt(outline),
      tools: [],
      maxTurns: totalDomains * 10,
      mcpServers: { deeplens: createGeneratorServer(projectRoot) },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      persistSession: false,
    },
  })) {
    switch (message.type) {
      case "assistant": {
        for (const block of message.message.content) {
          if (block.type === "text") {
            // Detect domain completion from agent text
            const completionMatch = block.text.match(
              /Completed domain:\s*(.+?)\s*\((\d+)\/(\d+)\)/,
            );
            if (completionMatch) {
              completedDomains = parseInt(completionMatch[2], 10);
              console.log(
                `\n\u2713 ${completionMatch[1]} (${completedDomains}/${totalDomains} domains complete)`,
              );
            } else {
              process.stdout.write(block.text);
            }
          } else if (block.type === "tool_use") {
            const args = JSON.stringify(block.input);
            console.log(`\n\uD83D\uDD27 ${block.name}(${args})`);

            // Track write_file calls to detect domain completion
            if (block.name === "mcp__deeplens__write_file") {
              const input = block.input as Record<string, unknown>;
              const filePath =
                typeof input.path === "string" ? input.path : "";
              // When a domain hub index.md is written, count it as domain completion
              const domainHubMatch = filePath.match(
                /^domains\/([^/]+)\/index\.md$/,
              );
              if (domainHubMatch) {
                const domainId = domainHubMatch[1];
                const domain = outline.knowledge_graph.find(
                  (d) => d.id === domainId,
                );
                if (domain) {
                  completedDomains++;
                  console.log(
                    `\n\u2713 ${domain.title} (${Math.min(completedDomains, totalDomains)}/${totalDomains} domains complete)`,
                  );
                }
              }
            }
          }
        }
        break;
      }
      case "result": {
        if (message.subtype !== "success") {
          const errorList =
            "errors" in message
              ? (message.errors as string[])
              : [];
          const detail = errorList.length > 0
            ? errorList.join("; ")
            : `subtype=${message.subtype}`;
          throw new Error(`Generator agent error (${message.subtype}): ${detail}`);
        }
        break;
      }
      default:
        break;
    }
  }

  console.log(
    `\nGeneration complete. ${completedDomains}/${totalDomains} domains processed.`,
  );
}
