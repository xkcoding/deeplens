/**
 * VitePress dev server — installs deps, finds available port, and starts dev server.
 */

import { createServer } from "node:net";
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";

const DEFAULT_PORT = 5173;
const DEFAULT_PREVIEW_PORT = 4173;

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

/**
 * Start VitePress dev server in the background (non-blocking).
 * Returns port and the child process for lifecycle management.
 * Waits until the server is actually listening before returning.
 */
export async function startPreviewBackground(
  docsDir: string,
  options?: { port?: number },
): Promise<{ port: number; child: ReturnType<typeof spawn> }> {
  const nodeModules = path.join(docsDir, "node_modules");
  if (!existsSync(nodeModules)) {
    execSync("npm install", { cwd: docsDir, stdio: "inherit" });
  }

  const requestedPort = options?.port ?? DEFAULT_PREVIEW_PORT;
  const port = await findAvailablePort(requestedPort);

  const child = spawn("npx", ["vitepress", "dev", "--port", String(port)], {
    cwd: docsDir,
    stdio: "pipe",
  });

  // Wait for VitePress to print its URL (indicates server is ready),
  // or timeout after 30 seconds.
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Resolve even on timeout — the server might still be starting
      resolve();
    }, 30_000);

    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      // VitePress prints "Local: http://localhost:PORT/" when ready
      if (text.includes("localhost") || text.includes("Local:")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      // Log stderr for debugging but don't reject — VitePress outputs
      // deprecation warnings to stderr which are non-fatal
      console.error(`[VitePress stderr] ${data.toString().trim()}`);
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`VitePress exited with code ${code}`));
      }
    });
  });

  return { port, child };
}

export async function startPreviewServer(
  docsDir: string,
  options?: { port?: number; open?: boolean },
): Promise<void> {
  // Install dependencies if not already present
  const nodeModules = path.join(docsDir, "node_modules");
  if (!existsSync(nodeModules)) {
    console.log(chalk.cyan("Installing VitePress dependencies..."));
    execSync("npm install", { cwd: docsDir, stdio: "inherit" });
  }

  const requestedPort = options?.port ?? DEFAULT_PORT;
  const port = await findAvailablePort(requestedPort);

  const args = ["vitepress", "dev", "--port", String(port)];
  if (options?.open) {
    args.push("--open");
  }

  console.log(chalk.cyan("Starting VitePress dev server..."));

  const child = spawn("npx", args, {
    cwd: docsDir,
    stdio: "inherit",
  });

  const onSignal = () => {
    child.kill("SIGINT");
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  console.log(chalk.green(`Preview available at http://localhost:${port}`));

  return new Promise<void>((resolve, reject) => {
    child.on("close", () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      resolve();
    });

    child.on("error", (err) => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      reject(err);
    });
  });
}
