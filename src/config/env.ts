/**
 * Configuration management — loads .env and validates ANTHROPIC_API_KEY.
 */

import dotenv from "dotenv";
import chalk from "chalk";

export interface DeepLensConfig {
  // Phase 1
  apiKey: string;
  baseUrl?: string;

  // Phase 2 — OpenRouter
  openrouterApiKey?: string;
  openrouterBaseUrl?: string;
  openrouterEmbedModel?: string;
  openrouterLlmModel?: string;
}

export function loadConfig(options?: { requireApiKey?: boolean }): DeepLensConfig {
  dotenv.config();

  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || "";

  if (!apiKey && options?.requireApiKey !== false) {
    console.error(
      chalk.red(
        "ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is required.\n" +
          "Set it in .env, as an environment variable, or in ~/.claude/settings.json.",
      ),
    );
    process.exit(1);
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL || undefined;
  if (apiKey) {
    const keySource = process.env.ANTHROPIC_API_KEY
      ? "ANTHROPIC_API_KEY"
      : "ANTHROPIC_AUTH_TOKEN";
    console.log(
      chalk.dim(
        `Config loaded: ${keySource}=${apiKey.slice(0, 8)}…, base_url=${baseUrl ?? "(default)"}`,
      ),
    );
  } else {
    console.log(chalk.yellow("No API key configured. Set it in Settings."));
  }

  // Phase 2 — OpenRouter (optional, validated on demand)
  const openrouterApiKey = process.env.OPENROUTER_API_KEY || undefined;
  const openrouterBaseUrl =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const openrouterEmbedModel =
    process.env.OPENROUTER_EMBED_MODEL || "qwen/qwen3-embedding-8b";
  const openrouterLlmModel =
    process.env.OPENROUTER_LLM_MODEL || "qwen/qwen3-32b";

  if (openrouterApiKey) {
    console.log(
      chalk.dim(
        `OpenRouter: key=${openrouterApiKey.slice(0, 8)}…, embed=${openrouterEmbedModel}, llm=${openrouterLlmModel}`,
      ),
    );
  }

  return {
    apiKey,
    baseUrl,
    openrouterApiKey,
    openrouterBaseUrl,
    openrouterEmbedModel,
    openrouterLlmModel,
  };
}

export function validateOpenRouterConfig(config: DeepLensConfig): void {
  if (!config.openrouterApiKey) {
    console.error(
      chalk.red(
        "OPENROUTER_API_KEY is required for this command.\n" +
          "Set it in .env or as an environment variable.",
      ),
    );
    process.exit(1);
  }
}
