/**
 * CLI handler for `deeplens export` command.
 * Exported for registration by the CLI orchestrator.
 */

import path from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import { buildStaticSite } from "./index.js";

export interface ExportCliOptions {
  output?: string;
}

/**
 * Handle the `deeplens export [project-path]` command.
 * Builds the VitePress documentation into a static HTML site.
 */
export async function handleExportCommand(
  projectPath: string | undefined,
  options: ExportCliOptions,
): Promise<void> {
  const absProjectPath = path.resolve(projectPath ?? process.cwd());
  const docsDir = path.join(absProjectPath, ".deeplens", "docs");

  if (!existsSync(docsDir)) {
    console.error(
      chalk.red(`Documentation directory not found: ${docsDir}`),
    );
    console.error(
      chalk.yellow('Run "deeplens analyze <project-path>" first to generate documentation.'),
    );
    process.exit(1);
  }

  const outputDir = options.output ? path.resolve(options.output) : undefined;

  console.log(chalk.cyan("Building static site..."));
  const start = Date.now();

  const result = await buildStaticSite(docsDir, outputDir, (line) => {
    console.log(chalk.dim(line));
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (result.copied) {
    console.log(chalk.green(`\nStatic site exported to ${result.outputPath} (${elapsed}s)`));
  } else {
    console.log(chalk.green(`\nStatic site built at ${result.distDir} (${elapsed}s)`));
  }
}
