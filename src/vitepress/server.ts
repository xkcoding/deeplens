/**
 * VitePress dev server — finds available port and spawns npx vitepress dev.
 */

import { createServer } from "node:net";
import { spawn } from "node:child_process";
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
  const requestedPort = options?.port ?? DEFAULT_PORT;
  const port = await findAvailablePort(requestedPort);

  const args = ["vitepress", "dev", docsDir, "--port", String(port)];
  if (options?.open) {
    args.push("--open");
  }

  console.log(
    chalk.cyan(`Starting VitePress dev server...`),
  );

  const child = spawn("npx", args, {
    stdio: "inherit",
    shell: true,
  });

  // Forward SIGINT to the child process for clean shutdown
  const onSignal = () => {
    child.kill("SIGINT");
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  console.log(
    chalk.green(`Preview available at http://localhost:${port}`),
  );

  return new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`VitePress exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      reject(err);
    });
  });
}
