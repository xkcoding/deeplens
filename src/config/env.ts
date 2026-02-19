/**
 * Configuration management — loads .env and validates ANTHROPIC_API_KEY.
 */

import dotenv from "dotenv";
import chalk from "chalk";

export interface DeepLensConfig {
  // Phase 1
  apiKey: string;
  baseUrl?: string;

  // Phase 2 — SiliconFlow
  siliconflowApiKey?: string;
  siliconflowBaseUrl?: string;
  siliconflowEmbedModel?: string;
  siliconflowLlmModel?: string;
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

  // Phase 2 — SiliconFlow (optional, validated on demand)
  const siliconflowApiKey = process.env.SILICONFLOW_API_KEY || undefined;
  const siliconflowBaseUrl =
    process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";
  const siliconflowEmbedModel =
    process.env.SILICONFLOW_EMBED_MODEL || "Qwen/Qwen3-Embedding-8B";
  const siliconflowLlmModel =
    process.env.SILICONFLOW_LLM_MODEL || "deepseek-ai/DeepSeek-V3";

  if (siliconflowApiKey) {
    console.log(
      chalk.dim(
        `SiliconFlow: key=${siliconflowApiKey.slice(0, 8)}…, embed=${siliconflowEmbedModel}, llm=${siliconflowLlmModel}`,
      ),
    );
  }

  return {
    apiKey,
    baseUrl,
    siliconflowApiKey,
    siliconflowBaseUrl,
    siliconflowEmbedModel,
    siliconflowLlmModel,
  };
}

export function validateSiliconFlowConfig(config: DeepLensConfig): void {
  if (!config.siliconflowApiKey) {
    console.error(
      chalk.red(
        "SILICONFLOW_API_KEY is required for this command.\n" +
          "Set it in .env or as an environment variable.",
      ),
    );
    process.exit(1);
  }
}
