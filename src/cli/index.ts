import { Command } from "commander";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { loadConfig } from "../config/env.js";
import { runExplorer } from "../agent/explorer.js";
import { runGenerator } from "../agent/generator.js";
import { reviewOutline } from "../outline/review.js";
import { outlineSchema } from "../outline/types.js";
import { scaffoldVitePress } from "../vitepress/scaffold.js";
import { generateSidebar } from "../vitepress/sidebar.js";
import { SIDEBAR_PLACEHOLDER } from "../vitepress/scaffold.js";
import { startPreviewServer } from "../vitepress/server.js";
import type { Outline } from "../outline/types.js";

const program = new Command();

program
  .name("deeplens")
  .description("Deep code analysis and documentation generator")
  .version("0.1.0");

// ── analyze ──────────────────────────────────────────────────────────
program
  .command("analyze <project-path>")
  .description("Full pipeline: explore -> review -> generate -> preview")
  .option("--output <dir>", "Output directory")
  .option("--no-preview", "Skip VitePress preview")
  .action(async (projectPath: string, options: { output?: string; preview: boolean }) => {
    loadConfig();
    const absProjectPath = path.resolve(projectPath);
    const outputDir = path.resolve(options.output ?? path.join(absProjectPath, ".deeplens"));
    const docsDir = path.join(outputDir, "docs");

    // Exploration phase (with re-run loop)
    let outline: Outline;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      console.log(chalk.cyan("\n[1/4] Running exploration agent..."));
      outline = await runExplorer(absProjectPath);

      console.log(chalk.cyan("\n[2/4] Outline review"));
      const review = await reviewOutline(outline, outputDir);

      if (review.action === "abort") {
        console.log(chalk.yellow("Aborted."));
        return;
      }
      if (review.action === "rerun") {
        console.log(chalk.cyan("Re-running exploration..."));
        continue;
      }
      // accept
      outline = review.outline;
      break;
    }

    // Generation phase
    console.log(chalk.cyan("\n[3/4] Generating documentation..."));
    await runGenerator(outline, absProjectPath);

    // VitePress scaffolding + sidebar injection
    await scaffoldVitePress(docsDir, outline.project_name);
    const sidebar = generateSidebar(outline, docsDir);
    await injectSidebar(docsDir, sidebar);

    console.log(chalk.green("\nDocumentation generated successfully."));

    // Preview phase
    if (options.preview) {
      console.log(chalk.cyan("\n[4/4] Starting preview server..."));
      await startPreviewServer(docsDir);
    } else {
      console.log(chalk.dim("Preview skipped. Run `deeplens preview` to start later."));
    }
  });

// ── explore ──────────────────────────────────────────────────────────
program
  .command("explore <project-path>")
  .description("Run exploration agent and output outline JSON")
  .option("--output <dir>", "Output directory")
  .action(async (projectPath: string, options: { output?: string }) => {
    loadConfig();
    const absProjectPath = path.resolve(projectPath);
    const outputDir = path.resolve(options.output ?? path.join(absProjectPath, ".deeplens"));

    console.log(chalk.cyan("Running exploration agent..."));
    const outline = await runExplorer(absProjectPath);

    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(outputDir, { recursive: true });
    const outlinePath = path.join(outputDir, "outline.json");
    await writeFile(outlinePath, JSON.stringify(outline, null, 2), "utf-8");

    console.log(chalk.green(`\nOutline saved to ${outlinePath}`));
    console.log(`Project: ${outline.project_name}`);
    console.log(`Domains: ${outline.knowledge_graph.length}`);
    console.log(`Stack: ${outline.detected_stack.join(", ")}`);
  });

// ── generate ─────────────────────────────────────────────────────────
program
  .command("generate <outline-path>")
  .description("Generate documentation from an existing outline JSON file")
  .option("--output <dir>", "Output directory")
  .action(async (outlinePath: string, options: { output?: string }) => {
    loadConfig();
    const absOutlinePath = path.resolve(outlinePath);

    // Read and validate outline
    let raw: string;
    try {
      raw = await readFile(absOutlinePath, "utf-8");
    } catch {
      console.error(chalk.red(`Cannot read outline file: ${absOutlinePath}`));
      process.exit(1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error(chalk.red("Invalid JSON syntax in outline file."));
      process.exit(1);
    }

    const result = outlineSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      console.error(chalk.red(`Outline validation failed:\n${issues}`));
      process.exit(1);
    }

    const outline = result.data;

    // Derive output directory from outline file location
    const outlineDir = path.dirname(absOutlinePath);
    const outputDir = path.resolve(options.output ?? outlineDir);
    const docsDir = path.join(outputDir, "docs");

    console.log(chalk.cyan("Generating documentation..."));
    await runGenerator(outline, process.cwd());

    await scaffoldVitePress(docsDir, outline.project_name);
    const sidebar = generateSidebar(outline, docsDir);
    await injectSidebar(docsDir, sidebar);

    console.log(chalk.green(`\nDocumentation generated to ${docsDir}`));
  });

// ── preview ──────────────────────────────────────────────────────────
program
  .command("preview [docs-path]")
  .description("Start VitePress dev server for preview")
  .option("--port <number>", "Port number", parseInt)
  .option("--open", "Open browser automatically")
  .action(async (docsPath: string | undefined, options: { port?: number; open?: boolean }) => {
    const resolvedDocsPath = path.resolve(docsPath ?? path.join(process.cwd(), ".deeplens", "docs"));

    if (!existsSync(resolvedDocsPath)) {
      console.error(
        chalk.red(`Documentation directory not found: ${resolvedDocsPath}`),
      );
      console.error(
        chalk.yellow('Run "deeplens analyze <project-path>" first to generate documentation.'),
      );
      process.exit(1);
    }

    await startPreviewServer(resolvedDocsPath, {
      port: options.port,
      open: options.open,
    });
  });

// ── Sidebar injection helper ─────────────────────────────────────────
async function injectSidebar(
  docsDir: string,
  sidebar: Record<string, unknown>,
): Promise<void> {
  const configPath = path.join(docsDir, ".vitepress", "config.mts");
  const content = await readFile(configPath, "utf-8");
  const injected = content.replace(
    SIDEBAR_PLACEHOLDER,
    JSON.stringify(sidebar, null, 6),
  );
  const { writeFile: wf } = await import("node:fs/promises");
  await wf(configPath, injected, "utf-8");
}

program.parse();
