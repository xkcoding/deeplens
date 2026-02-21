import { query } from "@anthropic-ai/claude-agent-sdk";
import { createGeneratorServer } from "./tools.js";
import { getGeneratorPrompt } from "../prompts/generator.js";
import { getOverviewPrompt } from "../prompts/overview.js";
import { getSummaryPrompt } from "../prompts/summary.js";
import type { Outline } from "../outline/types.js";
import type { AgentEventCallback } from "./events.js";

/**
 * Run the generation Agent ("Deep Writer").
 * Calls query() with generator prompt + confirmed outline + MCP server (all tools).
 * Generates Hub-and-Spoke documentation per domain.
 *
 * @param outline - Validated outline from the explorer agent
 * @param projectRoot - Absolute path to the project root
 * @param options.onEvent - Optional callback for SSE event dispatch (sidecar mode)
 * @param options.domainFilter - Optional list of domain IDs to generate (incremental update)
 */
export async function runGenerator(
  outline: Outline,
  projectRoot: string,
  options?: { onEvent?: AgentEventCallback; domainFilter?: string[] },
): Promise<void> {
  // When domainFilter is provided, build a filtered outline containing only those domains
  const filteredOutline: Outline = options?.domainFilter
    ? {
        ...outline,
        knowledge_graph: outline.knowledge_graph.filter((d) =>
          options.domainFilter!.includes(d.id),
        ),
      }
    : outline;

  const totalDomains = filteredOutline.knowledge_graph.length;
  let completedDomains = 0;
  let lastHubDomainId: string | null = null;
  const onEvent = options?.onEvent;

  /** Mark a domain as completed (section_ready + progress update). */
  function markDomainCompleted(domainId: string): void {
    const domain = filteredOutline.knowledge_graph.find((d) => d.id === domainId);
    if (!domain) return;
    completedDomains++;
    if (onEvent) {
      onEvent({
        type: "section_ready",
        data: {
          domain_id: domain.id,
          domain_title: domain.title,
          target_file: `domains/${domain.id}/index.md`,
        },
      });
      onEvent({
        type: "progress",
        data: {
          phase: "generate",
          completed: Math.min(completedDomains, totalDomains),
          total: totalDomains,
        },
      });
    } else {
      console.log(
        `\n\u2713 ${domain.title} (${Math.min(completedDomains, totalDomains)}/${totalDomains} domains complete)`,
      );
    }
  }

  // Clean env: remove CLAUDECODE to avoid "nested session" rejection from Claude Code CLI
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  for await (const message of query({
    prompt: `Generate complete documentation for the project based on the provided outline. Process each domain sequentially. The outline JSON is already included in your system prompt.\n\nDomains to process (${totalDomains} total):\n${filteredOutline.knowledge_graph.map((d, i) => `${i + 1}. ${d.title} (${d.id})`).join("\n")}`,
    options: {
      systemPrompt: getGeneratorPrompt(filteredOutline),
      tools: [],
      maxTurns: Math.max(60, totalDomains * 20),
      mcpServers: { deeplens: createGeneratorServer(projectRoot) },
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
            // Agent text: forward as thought (progress is tracked via write_file hub detection)
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

            // Track write_file calls to detect domain completion + send content
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
              // Detect domain transitions via hub (index.md) writes.
              // When a NEW domain's hub is written, the PREVIOUS domain is fully complete
              // (hub + all spokes done, since generator processes domains sequentially).
              const domainHubMatch = filePath.match(
                /^domains\/([^/]+)\/index\.md$/,
              );
              if (domainHubMatch) {
                const domainId = domainHubMatch[1];
                if (lastHubDomainId && lastHubDomainId !== domainId) {
                  markDomainCompleted(lastHubDomainId);
                }
                lastHubDomainId = domainId;
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
          const errMsg = `Generator agent error (${message.subtype}): ${detail}`;
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

  // Mark the last domain as completed (no next hub write to trigger it)
  if (lastHubDomainId) {
    markDomainCompleted(lastHubDomainId);
  }

  if (onEvent) {
    onEvent({
      type: "progress",
      data: {
        phase: "generate",
        completed: completedDomains,
        total: totalDomains,
        status: "complete",
      },
    });
  } else {
    console.log(
      `\nGeneration complete. ${completedDomains}/${totalDomains} domains processed.`,
    );
  }
}

/**
 * Run the Overview Generator — a focused sub-agent that synthesizes index.md
 * from the already-generated domain hub documents.
 *
 * Called AFTER runGenerator() completes all domain documentation.
 */
export async function runOverviewGenerator(
  outline: Outline,
  projectRoot: string,
  options?: { onEvent?: AgentEventCallback },
): Promise<void> {
  const onEvent = options?.onEvent;

  if (onEvent) {
    onEvent({
      type: "progress",
      data: { phase: "overview", completed: 0, total: 1 },
    });
  } else {
    console.log("\nGenerating project overview (index.md)...");
  }

  // Dynamic maxTurns: read N domain hubs + grep/snippet lookups + render_mermaid + write + thinking
  const domainCount = outline.knowledge_graph.length;
  const overviewMaxTurns = Math.max(30, domainCount * 3 + 15);

  // Clean env: remove CLAUDECODE to avoid "nested session" rejection
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  for await (const message of query({
    prompt: "Read the domain hub documents and generate the project overview page (index.md).",
    options: {
      systemPrompt: getOverviewPrompt(outline),
      tools: [],
      maxTurns: overviewMaxTurns,
      mcpServers: { deeplens: createGeneratorServer(projectRoot) },
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

            // Detect index.md write to emit doc_written event
            if (block.name === "mcp__deeplens__write_file") {
              const input = block.input as Record<string, unknown>;
              const filePath =
                typeof input.path === "string" ? input.path : "";
              const fileContent =
                typeof input.content === "string" ? input.content : "";

              if (onEvent && fileContent) {
                onEvent({
                  type: "doc_written",
                  data: { path: filePath, content: fileContent },
                });
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
          const errMsg = `Overview generator error (${message.subtype}): ${detail}`;
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

  if (onEvent) {
    onEvent({
      type: "progress",
      data: { phase: "overview", completed: 1, total: 1, status: "complete" },
    });
  } else {
    console.log("\n\u2713 Overview (index.md) generated.");
  }
}

/**
 * Run the Summary Generator — a focused sub-agent that synthesizes summary.md
 * from the overview and all domain hub documents.
 *
 * Called AFTER runOverviewGenerator() completes the overview page.
 */
export async function runSummaryGenerator(
  outline: Outline,
  projectRoot: string,
  options?: { onEvent?: AgentEventCallback },
): Promise<void> {
  const onEvent = options?.onEvent;

  if (onEvent) {
    onEvent({
      type: "progress",
      data: { phase: "summary", completed: 0, total: 1 },
    });
  } else {
    console.log("\nGenerating project summary (summary.md)...");
  }

  // Dynamic maxTurns: read index.md + N domain hubs + grep/snippet lookups + write + thinking
  const domainCount = outline.knowledge_graph.length;
  const summaryMaxTurns = Math.max(30, domainCount * 3 + 15);

  // Clean env: remove CLAUDECODE to avoid "nested session" rejection
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;

  for await (const message of query({
    prompt: "Read the overview and domain hub documents, then generate the project summary page (summary.md).",
    options: {
      systemPrompt: getSummaryPrompt(outline),
      tools: [],
      maxTurns: summaryMaxTurns,
      mcpServers: { deeplens: createGeneratorServer(projectRoot) },
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

            // Detect summary.md write to emit doc_written event
            if (block.name === "mcp__deeplens__write_file") {
              const input = block.input as Record<string, unknown>;
              const filePath =
                typeof input.path === "string" ? input.path : "";
              const fileContent =
                typeof input.content === "string" ? input.content : "";

              if (onEvent && fileContent) {
                onEvent({
                  type: "doc_written",
                  data: { path: filePath, content: fileContent },
                });
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
          const errMsg = `Summary generator error (${message.subtype}): ${detail}`;
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

  if (onEvent) {
    onEvent({
      type: "progress",
      data: { phase: "summary", completed: 1, total: 1, status: "complete" },
    });
  } else {
    console.log("\n\u2713 Summary (summary.md) generated.");
  }
}
