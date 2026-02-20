/**
 * Git diff analysis — detect changed files between last analyzed commit and HEAD.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Get the list of files changed between a given commit and HEAD.
 *
 * @param projectRoot - Absolute path to the git project root
 * @param lastCommit - Commit SHA to diff against HEAD
 * @returns Array of relative file paths that changed
 */
export async function getChangedFiles(
  projectRoot: string,
  lastCommit: string,
): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", `${lastCommit}..HEAD`],
    { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
  );

  return stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);
}

/**
 * Get the current HEAD commit SHA.
 *
 * @param projectRoot - Absolute path to the git project root
 * @returns The full commit SHA of HEAD
 */
export async function getHeadCommit(projectRoot: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", "HEAD"],
    { cwd: projectRoot },
  );
  return stdout.trim();
}
