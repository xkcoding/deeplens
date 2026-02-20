/**
 * Build the sidecar bundle using esbuild.
 * Produces an ESM bundle + a launcher shell script for Tauri sidecar.
 *
 * The Agent SDK is kept as an external dependency so that its query() function
 * can correctly resolve and spawn the bundled cli.js subprocess at runtime.
 * This replaces the previous @yao-pkg/pkg approach which broke query()'s
 * subprocess spawning.
 *
 * Usage: node scripts/build-sidecar.js
 */

import { buildSync } from "esbuild";
import { writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { arch, platform } from "node:os";

// ── Step 1: Build ESM bundle ────────────────────────────────────────────────

buildSync({
  entryPoints: ["src/sidecar/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/bundle.mjs",
  external: [
    // Native modules that cannot be bundled
    "better-sqlite3",
    "sqlite-vec",
    // Agent SDK must be external — its query() spawns cli.js as a subprocess
    // and needs the real package location on disk to resolve it
    "@anthropic-ai/claude-agent-sdk",
  ],
  sourcemap: false,
  minify: true,
  banner: {
    // Provide createRequire for any bundled code that needs require() at runtime
    js: 'import{createRequire}from"module";const require=createRequire(import.meta.url);',
  },
});

console.log("Sidecar bundle created: dist/bundle.mjs");

// ── Step 2: Create launcher shell script ────────────────────────────────────
// Instead of pkg'd binary, we use a shell script that runs the bundle with node.
// This allows the Agent SDK's query() to spawn cli.js as a subprocess normally.

function getTargetTriple() {
  const a = arch();
  const p = platform();
  if (p === "darwin" && a === "arm64") return "aarch64-apple-darwin";
  if (p === "darwin" && a === "x64") return "x86_64-apple-darwin";
  if (p === "linux" && a === "x64") return "x86_64-unknown-linux-gnu";
  if (p === "win32" && a === "x64") return "x86_64-pc-windows-msvc";
  throw new Error(`Unsupported platform: ${p}-${a}`);
}

const triple = getTargetTriple();
const binDir = "src-tauri/binaries";
mkdirSync(binDir, { recursive: true });

const ext = platform() === "win32" ? ".exe" : "";
const sidecarPath = join(binDir, `deeplens-sidecar-${triple}${ext}`);

// Embed absolute project root — avoids unreliable $0 / dirname resolution
// when Tauri spawns the sidecar in a different working directory context
const projectRoot = process.cwd();
const bundlePath = join(projectRoot, "dist", "bundle.mjs");

if (platform() === "win32") {
  // Windows: .cmd launcher
  writeFileSync(
    sidecarPath,
    `@echo off\r\nnode "${bundlePath}" %*\r\n`,
  );
} else {
  // macOS / Linux: bash launcher
  writeFileSync(
    sidecarPath,
    [
      "#!/bin/bash",
      `exec node "${bundlePath}" "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(sidecarPath, 0o755);
}

console.log(`Sidecar launcher created: ${sidecarPath}`);
