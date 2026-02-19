/**
 * Configuration management — loads .env and validates ANTHROPIC_API_KEY.
 */

import dotenv from "dotenv";
import chalk from "chalk";

export interface DeepLensConfig {
  apiKey: string;
  baseUrl?: string;
}

export function loadConfig(): DeepLensConfig {
  dotenv.config();

  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey) {
    console.error(
      chalk.red(
        "ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is required.\n" +
          "Set it in .env, as an environment variable, or in ~/.claude/settings.json.",
      ),
    );
    process.exit(1);
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL || undefined;
  const keySource = process.env.ANTHROPIC_API_KEY
    ? "ANTHROPIC_API_KEY"
    : "ANTHROPIC_AUTH_TOKEN";
  console.log(
    chalk.dim(
      `Config loaded: ${keySource}=${apiKey.slice(0, 8)}…, base_url=${baseUrl ?? "(default)"}`,
    ),
  );

  return { apiKey, baseUrl };
}
