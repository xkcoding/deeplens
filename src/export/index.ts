/**
 * Static site export — builds VitePress docs into a static HTML site.
 */

import { spawn } from "node:child_process";
import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export interface BuildOptions {
  /** Absolute path to the docs directory (containing .vitepress/) */
  docsDir: string;
  /** Optional output directory to copy the built site to */
  outputDir?: string;
  /** Callback for build log lines */
  onLog?: (line: string) => void;
}

export interface BuildResult {
  /** Path to the built static site */
  distDir: string;
  /** Whether the dist was copied to a custom output directory */
  copied: boolean;
  /** Final output path (distDir or outputDir) */
  outputPath: string;
}

/**
 * Build the VitePress docs directory into a static HTML site.
 * Runs `npx vitepress build` as a child process.
 * Optionally copies the dist output to a user-specified directory.
 */
export async function buildStaticSite(
  docsDir: string,
  outputDir?: string,
  onLog?: (line: string) => void,
): Promise<BuildResult> {
  const distDir = path.join(docsDir, ".vitepress", "dist");

  // Ensure docs directory exists
  if (!existsSync(docsDir)) {
    throw new Error(`Docs directory not found: ${docsDir}`);
  }

  // Run vitepress build
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["vitepress", "build"], {
      cwd: docsDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    child.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        onLog?.(line);
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        onLog?.(line);
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`vitepress build exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start vitepress build: ${err.message}`));
    });
  });

  // Verify dist was created
  if (!existsSync(distDir)) {
    throw new Error(`Build completed but dist directory not found: ${distDir}`);
  }

  // Optionally copy to output directory
  let copied = false;
  let outputPath = distDir;

  if (outputDir) {
    await cp(distDir, outputDir, { recursive: true });
    copied = true;
    outputPath = outputDir;
  }

  return { distDir, copied, outputPath };
}
