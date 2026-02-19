/**
 * Build the sidecar bundle using esbuild.
 * Produces a single CJS file suitable for @yao-pkg/pkg compilation.
 *
 * Usage: node scripts/build-sidecar.js
 */

import { buildSync } from "esbuild";

buildSync({
  entryPoints: ["src/sidecar/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist/bundle.cjs",
  external: [
    // Native modules that cannot be bundled
    "better-sqlite3",
    "sqlite-vec",
  ],
  sourcemap: false,
  minify: true,
});

console.log("Sidecar bundle created: dist/bundle.cjs");
