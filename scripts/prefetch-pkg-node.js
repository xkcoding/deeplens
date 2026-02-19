/**
 * Pre-fetch Node.js binary for @yao-pkg/pkg from GitHub mirrors.
 *
 * Avoids slow/failed downloads from GitHub in China.
 * Downloads the pre-built binary to ~/.pkg-cache/v3.5/ so pkg finds it locally.
 *
 * Usage:
 *   node scripts/prefetch-pkg-node.js --target node22-macos-arm64
 *
 * Environment:
 *   PKG_GITHUB_MIRROR - Custom GitHub mirror URL (e.g. https://ghfast.top)
 *   PKG_CACHE_PATH    - Custom pkg cache directory
 */

import { existsSync, mkdirSync, createWriteStream, renameSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

// ── Configuration ───────────────────────────────────────────

const PKG_FETCH_TAG = "v3.5";
const PKG_FETCH_REPO = "yao-pkg/pkg-fetch";

// Mirror list (tried in order; set PKG_GITHUB_MIRROR to override)
const GITHUB_MIRRORS = process.env.PKG_GITHUB_MIRROR
  ? [process.env.PKG_GITHUB_MIRROR]
  : [
      "https://gh-proxy.com",
      "https://ghfast.top",
      "https://mirror.ghproxy.com",
    ];

// Direct GitHub (fallback)
const GITHUB_DIRECT = "https://github.com";

// ── Helpers ─────────────────────────────────────────────────

function parseTarget(args) {
  const idx = args.indexOf("--target");
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  for (const a of args) {
    if (a.startsWith("--target=")) return a.split("=")[1];
  }
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const platform = process.platform === "darwin" ? "macos"
    : process.platform === "win32" ? "win" : "linux";
  return `node22-${platform}-${arch}`;
}

async function resolveLatestVersion(nodeMajor, platform, arch) {
  // Query pkg-fetch releases API to find the latest available binary
  const apiUrl = `https://api.github.com/repos/${PKG_FETCH_REPO}/releases/tags/${PKG_FETCH_TAG}`;
  try {
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "deeplens-prefetch" },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const pattern = new RegExp(`^node-v(${nodeMajor}\\.\\d+\\.\\d+)-${platform}-${arch}$`);
    const versions = data.assets
      .map((a) => a.name.match(pattern))
      .filter(Boolean)
      .map((m) => m[1])
      .sort((a, b) => {
        const [a1, a2, a3] = a.split(".").map(Number);
        const [b1, b2, b3] = b.split(".").map(Number);
        return b1 - a1 || b2 - a2 || b3 - a3; // descending
      });
    if (versions.length > 0) return versions[0];
  } catch (err) {
    console.log(`  (API lookup failed: ${err.message}, using local detection)`);
  }

  // Fallback: check what's already in cache
  const cacheDir = join(
    process.env.PKG_CACHE_PATH || join(homedir(), ".pkg-cache"),
    PKG_FETCH_TAG,
  );
  if (existsSync(cacheDir)) {
    const { readdirSync } = await import("fs");
    const pattern = new RegExp(`^fetched-v(${nodeMajor}\\.\\d+\\.\\d+)-${platform}-${arch}$`);
    const cached = readdirSync(cacheDir)
      .map((f) => f.match(pattern))
      .filter(Boolean)
      .map((m) => m[1]);
    if (cached.length > 0) return cached.sort().pop();
  }

  // Hardcoded fallback
  return nodeMajor === "22" ? "22.22.0" : `${nodeMajor}.0.0`;
}

async function downloadWithProgress(url, dest, label) {
  const tmpDest = dest + ".downloading";
  if (existsSync(tmpDest)) unlinkSync(tmpDest);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2min timeout

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const total = Number(res.headers.get("content-length") || 0);
    const writer = createWriteStream(tmpDest);
    const reader = res.body.getReader();
    let downloaded = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(value);
      downloaded += value.length;

      const elapsed = (Date.now() - startTime) / 1000;
      const speed = downloaded / elapsed / 1024 / 1024; // MB/s
      const mb = (downloaded / 1024 / 1024).toFixed(1);

      if (total > 0) {
        const pct = ((downloaded / total) * 100).toFixed(1);
        const totalMb = (total / 1024 / 1024).toFixed(1);
        process.stdout.write(
          `\r  ${label}  ${mb}/${totalMb} MB (${pct}%) ${speed.toFixed(1)} MB/s`,
        );
      } else {
        process.stdout.write(`\r  ${label}  ${mb} MB ${speed.toFixed(1)} MB/s`);
      }
    }

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
      writer.end();
    });

    renameSync(tmpDest, dest);
    console.log(); // newline
    return true;
  } finally {
    clearTimeout(timeout);
    if (existsSync(tmpDest)) {
      try { unlinkSync(tmpDest); } catch { }
    }
  }
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const target = parseTarget(process.argv.slice(2));
  const match = target.match(/^node(\d+)-(\w+)-(\w+)$/);
  if (!match) {
    console.error(`Invalid target: ${target}`);
    process.exit(1);
  }

  const [, nodeMajor, platform, arch] = match;

  console.log(`\n📦 Prefetch pkg-fetch binary`);
  console.log(`   Target: ${target}\n`);

  const nodeVersion = await resolveLatestVersion(nodeMajor, platform, arch);
  console.log(`   Resolved: node-v${nodeVersion}-${platform}-${arch}\n`);

  const cacheDir = join(
    process.env.PKG_CACHE_PATH || join(homedir(), ".pkg-cache"),
    PKG_FETCH_TAG,
  );
  mkdirSync(cacheDir, { recursive: true });

  const binaryName = `fetched-v${nodeVersion}-${platform}-${arch}`;
  const binaryPath = join(cacheDir, binaryName);

  if (existsSync(binaryPath)) {
    console.log(`✅ Already cached: ${binaryPath}\n`);
    return;
  }

  const ghPath = `/${PKG_FETCH_REPO}/releases/download/${PKG_FETCH_TAG}/node-v${nodeVersion}-${platform}-${arch}`;

  // Try mirrors first, then direct
  const allSources = [
    ...GITHUB_MIRRORS.map((m) => ({
      label: m.replace(/^https?:\/\//, ""),
      url: `${m}/${GITHUB_DIRECT}${ghPath}`,
    })),
    { label: "github.com (direct)", url: `${GITHUB_DIRECT}${ghPath}` },
  ];

  for (const source of allSources) {
    console.log(`⬇  Trying ${source.label}...`);
    try {
      await downloadWithProgress(source.url, binaryPath, binaryName);
      // Make executable
      try { execSync(`chmod +x "${binaryPath}"`); } catch { }
      console.log(`\n✅ Cached to ${binaryPath}`);
      console.log(`   pkg will use this binary without downloading.\n`);
      return;
    } catch (err) {
      console.log(`\n   ✗ ${err.message}\n`);
    }
  }

  // All failed — provide manual instructions
  const directUrl = `${GITHUB_DIRECT}${ghPath}`;
  console.log(`❌ All mirrors failed.\n`);
  console.log(`Manual download:`);
  console.log(`  curl -L -o "${binaryPath}" "${directUrl}"`);
  console.log(`  chmod +x "${binaryPath}"\n`);
  console.log(`Or set proxy:`);
  console.log(`  https_proxy=http://127.0.0.1:7890 npm run pkg:macos-arm64\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Prefetch failed:", err.message);
  process.exit(1);
});
