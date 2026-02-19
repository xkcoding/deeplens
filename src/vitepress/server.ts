/**
 * VitePress dev server — installs deps, finds available port, and starts dev server.
 */

import { createServer } from "node:net";
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";

const DEFAULT_PORT = 5173;

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
