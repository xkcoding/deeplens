import { query } from "@anthropic-ai/claude-agent-sdk";
import chalk from "chalk";
import { createTranslatorServer } from "./tools.js";
import { getTranslatorPrompt } from "../prompts/translator.js";
import type { Outline } from "../outline/types.js";
import type { AgentEventCallback } from "./events.js";

/**
 * Run the Translation Agent ("Deep Translator").
 * Translates all English documentation into Chinese.
 *
 * Called AFTER all English documents (domains, overview, summary) are generated.
 * Works in two phases: glossary extraction → per-domain translation.
 *
 * @param outline - Validated outline from the explorer agent
 * @param projectRoot - Absolute path to the project root
 * @param options.onEvent - Optional callback for SSE event dispatch (sidecar mode)
 * @param options.domainFilter - Optional list of domain IDs to translate (incremental update)
 */
export async function runTranslator(
  outline: Outline,
  projectRoot: string,
  options?: { onEvent?: AgentEventCallback; domainFilter?: string[] },
): Promise<void> {
  const filteredDomains = options?.domainFilter
    ? outline.knowledge_graph.filter((d) =>
        options.domainFilter!.includes(d.id),
      )
    : outline.knowledge_graph;

  const totalDomains = filteredDomains.length;
  let completedDomains = 0;
  let lastHubDomainId: string | null = null;
  const onEvent = options?.onEvent;

  // Accumulate text to detect the glossary block (may span multiple chunks)
  let glossaryBuffer = "";
  let glossaryLogged = false;

  /** Mark a domain as completed (progress update). */
  function markDomainCompleted(domainId: string): void {
    const domain = filteredDomains.find((d) => d.id === domainId);
    if (!domain) return;
    completedDomains++;
    if (onEvent) {
      onEvent({
        type: "progress",
        data: {
          phase: "translate",
          completed: Math.min(completedDomains, totalDomains),
          total: totalDomains,
        },
      });
    } else {
      console.log(
        `\n\u2713 ${domain.title} translated (${Math.min(completedDomains, totalDomains)}/${totalDomains})`,
      );
    }
  }

  if (onEvent) {
    onEvent({
      type: "progress",
      data: { phase: "translate", completed: 0, total: totalDomains },
    });
  } else {
    console.log(`\nTranslating documentation (${totalDomains} domains)...`);
  }

  // Dynamic maxTurns: read all EN docs + write all ZH docs + thinking
  // Each domain: list_files(1) + read hub+spokes(~4) + write hub+spokes(~4) + thinking(~1) = ~10
  const maxTurns = Math.max(40, totalDomains * 10 + 20);

  // Clean env: remove CLAUDECODE to avoid "nested session" rejection
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  for await (const message of query({
    prompt: `Translate all English documentation into Chinese. There are ${totalDomains} domains to translate: ${filteredDomains.map((d, i) => `${i + 1}. ${d.title} (${d.id})`).join(", ")}. Start by reading all English documents to build a glossary, then translate domain by domain.`,
    options: {
      systemPrompt: getTranslatorPrompt(outline, options?.domainFilter),
      tools: [],
      maxTurns,
      mcpServers: { deeplens: createTranslatorServer(projectRoot) },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      persistSession: false,
      env: cleanEnv,
    },
  })) {
    switch (message.type) {
      case "assistant": {
        for (const block of message.message.content) {
          if (block.type === "text") {
            if (onEvent) {
              onEvent({ type: "thought", data: { content: block.text } });
            } else {
              process.stdout.write(block.text);
            }

            // Detect and log glossary block
            if (!glossaryLogged) {
              glossaryBuffer += block.text;
              const startIdx = glossaryBuffer.indexOf("===GLOSSARY_START===");
              const endIdx = glossaryBuffer.indexOf("===GLOSSARY_END===");
              if (startIdx >= 0 && endIdx > startIdx) {
                const glossaryContent = glossaryBuffer
                  .slice(startIdx + "===GLOSSARY_START===".length, endIdx)
                  .trim();
                glossaryLogged = true;

                // Log glossary with formatting
                const header = chalk.cyan.bold("\n📖 Translation Glossary:");
                const terms = glossaryContent
                  .split("\n")
                  .filter((line) => line.trim().startsWith("-"))
                  .map((line) => chalk.dim("  " + line.trim()))
                  .join("\n");
                console.log(`${header}\n${terms}\n`);

                if (onEvent) {
                  onEvent({
                    type: "thought",
                    data: { content: `📖 Translation Glossary:\n${glossaryContent}` },
                  });
                }
              }
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

            // Track write_file calls for progress + doc_written events
            if (block.name === "mcp__deeplens__write_file") {
              const input = block.input as Record<string, unknown>;
              const filePath =
                typeof input.path === "string" ? input.path : "";
              const fileContent =
                typeof input.content === "string" ? input.content : "";

              // Send document content to frontend for live preview
              if (onEvent && fileContent) {
                onEvent({
                  type: "doc_written",
                  data: { path: filePath, content: fileContent },
                });
              }

              // Detect domain transitions via zh hub (index.md) writes.
              // When a NEW domain's hub is written, the PREVIOUS domain is fully complete
              // (hub + all spokes done, since translator processes domains sequentially).
              const domainHubMatch = filePath.match(
                /^zh\/domains\/([^/]+)\/index\.md$/,
              );
              if (domainHubMatch) {
                const domainId = domainHubMatch[1];
                if (lastHubDomainId && lastHubDomainId !== domainId) {
                  markDomainCompleted(lastHubDomainId);
                }
                lastHubDomainId = domainId;
              }

              // zh/index.md or zh/summary.md write means all domains are done
              if (
                lastHubDomainId &&
                (filePath === "zh/index.md" || filePath === "zh/summary.md")
              ) {
                markDomainCompleted(lastHubDomainId);
                lastHubDomainId = null; // prevent double-counting
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
          const errMsg = `Translation agent error (${message.subtype}): ${detail}`;
          if (onEvent) {
            onEvent({ type: "error", data: { message: errMsg, recoverable: false } });
          }
          throw new Error(errMsg);
        }
        break;
      }
      default:
        break;
    }
  }

  // Mark the last domain as completed if not already marked
  if (lastHubDomainId) {
    markDomainCompleted(lastHubDomainId);
  }

  if (onEvent) {
    onEvent({
      type: "progress",
      data: {
        phase: "translate",
        completed: totalDomains,
        total: totalDomains,
        status: "complete",
      },
    });
  } else {
    console.log(
      `\n\u2713 Translation complete. ${totalDomains} domains translated.`,
    );
  }
}
