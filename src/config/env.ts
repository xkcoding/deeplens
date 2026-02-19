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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      chalk.red(
        "ANTHROPIC_API_KEY is required. Set it in .env or as an environment variable.",
      ),
    );
    process.exit(1);
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL || undefined;

  return { apiKey, baseUrl };
}
