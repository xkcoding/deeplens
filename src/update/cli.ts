/**
 * CLI handler for `deeplens update` command.
 * Exported for the Lead to register in src/cli/index.ts.
 */

import path from "node:path";
import chalk from "chalk";
import { loadConfig } from "../config/env.js";
import { runIncrementalUpdate } from "./index.js";

/**
 * Handler function for the `deeplens update [project-path]` command.
 *
 * @param projectPath - Path to the project (defaults to cwd)
 * @param options - Command options
 * @param options.full - Force full re-analysis
 */
export async function updateCommand(
  projectPath: string | undefined,
  options: { full?: boolean },
): Promise<void> {
  loadConfig();
  const absProjectPath = path.resolve(projectPath ?? process.cwd());

  console.log(
    chalk.cyan(
      options.full
        ? "Running full re-analysis..."
        : "Running incremental update...",
    ),
  );

  const result = await runIncrementalUpdate(absProjectPath, {
    full: options.full,
    onEvent: (event) => {
      switch (event.type) {
        case "diff_start":
          console.log(
            chalk.dim(`Diffing against commit ${(event.data.lastCommit as string).slice(0, 8)}...`),
          );
          break;
        case "diff_result":
          console.log(
            chalk.blue(`${event.data.count} file(s) changed.`),
          );
          break;
        case "impact_summary":
          console.log(
            chalk.blue(
              `${event.data.affectedCount} of ${event.data.totalDomains} domain(s) affected.`,
            ),
          );
          if ((event.data.untrackedFiles as string[]).length > 0) {
            console.log(
              chalk.dim(
                `Untracked changes: ${(event.data.untrackedFiles as string[]).join(", ")}`,
              ),
            );
          }
          break;
        case "section_ready": {
          const d = event.data as { domain_title: string };
          console.log(chalk.green(`  \u2713 ${d.domain_title}`));
          break;
        }
        case "index_update":
          console.log(
            chalk.dim(`Vector index: ${event.data.phase}`),
          );
          break;
        case "progress":
          // Progress events are handled by the generator's own output
          break;
        case "error":
          console.error(
            chalk.red(`Error: ${event.data.message}`),
          );
          break;
        default:
          break;
      }
    },
  });

  switch (result.mode) {
    case "skipped":
      console.log(chalk.yellow(`\n${result.message}`));
      break;
    case "incremental":
      console.log(chalk.green(`\nIncremental update complete. ${result.message}`));
      break;
    case "full":
      console.log(chalk.green(`\nFull re-analysis complete. ${result.message}`));
      break;
  }
}
