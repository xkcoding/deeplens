/**
 * Rename the pkg-compiled sidecar binary to match Tauri's expected naming convention.
 * The binary name must include the Rust target triple for Tauri sidecar resolution.
 *
 * Usage: node scripts/rename-sidecar.js
 */

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

// Detect the current platform's Rust target triple
let triple;
try {
  triple = execSync("rustc --print host-tuple", { encoding: "utf-8" }).trim();
} catch {
  // Fallback: infer from platform/arch
  const platform = process.platform;
  const arch = process.arch;
  const map = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "linux-x64": "x86_64-unknown-linux-gnu",
    "win32-x64": "x86_64-pc-windows-msvc",
  };
  triple = map[`${platform}-${arch}`];
  if (!triple) {
    console.error(`Cannot determine target triple for ${platform}-${arch}`);
    process.exit(1);
  }
}

// Source: pkg output (compiled binary)
const source = path.join("dist", "bundle");
const ext = process.platform === "win32" ? ".exe" : "";
const sourceWithExt = source + ext;

// Target: Tauri binaries directory
const targetDir = path.join("src-tauri", "binaries");
const target = path.join(targetDir, `deeplens-sidecar-${triple}${ext}`);

// Ensure target directory exists
mkdirSync(targetDir, { recursive: true });

if (!existsSync(sourceWithExt)) {
  console.error(`Source binary not found: ${sourceWithExt}`);
  console.error('Run "npm run build:sidecar && npx pkg dist/bundle.cjs" first.');
  process.exit(1);
}

copyFileSync(sourceWithExt, target);
console.log(`Sidecar binary: ${sourceWithExt} -> ${target}`);
console.log(`Target triple: ${triple}`);
