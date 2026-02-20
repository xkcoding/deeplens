/**
 * Project-level settings — stored per-project in `<project>/.deeplens/settings.json`.
 * Overrides global config for supported keys only.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DeepLensConfig } from "./env.js";

// ── Overridable Keys ─────────────────────────────────

/** Only these config keys can be overridden at the project level. */
export const OVERRIDABLE_KEYS = [
  "openrouter_llm_model",
  "openrouter_embedding_model",
] as const;

export type OverridableKey = (typeof OVERRIDABLE_KEYS)[number];

/** Mapping from project settings key to DeepLensConfig field. */
const KEY_TO_CONFIG: Record<OverridableKey, keyof DeepLensConfig> = {
  openrouter_llm_model: "openrouterLlmModel",
  openrouter_embedding_model: "openrouterEmbedModel",
};

// ── Types ─────────────────────────────────────────────

export type ProjectSettings = Partial<Record<OverridableKey, string>>;

// ── Load / Save ───────────────────────────────────────

function settingsPath(projectPath: string): string {
  return join(projectPath, ".deeplens", "settings.json");
}

export function loadProjectSettings(projectPath: string): ProjectSettings {
  const filePath = settingsPath(projectPath);
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Only return recognized overridable keys
    const settings: ProjectSettings = {};
    for (const key of OVERRIDABLE_KEYS) {
      if (typeof parsed[key] === "string" && parsed[key]) {
        settings[key] = parsed[key] as string;
      }
    }
    return settings;
  } catch {
    return {};
  }
}

export function saveProjectSetting(
  projectPath: string,
  key: OverridableKey,
  value: string | null,
): void {
  const filePath = settingsPath(projectPath);
  const dir = join(projectPath, ".deeplens");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const current = loadProjectSettings(projectPath);
  if (value === null || value === "") {
    delete current[key];
  } else {
    current[key] = value;
  }
  writeFileSync(filePath, JSON.stringify(current, null, 2) + "\n", "utf-8");
}

// ── Config Resolution ────────────────────────────────

/**
 * Resolve config by merging project-level overrides onto the global env config.
 * Project settings take precedence over global defaults.
 */
export function resolveConfig(
  globalConfig: DeepLensConfig,
  projectPath?: string,
): DeepLensConfig {
  if (!projectPath) return globalConfig;

  const projectSettings = loadProjectSettings(projectPath);
  if (Object.keys(projectSettings).length === 0) return globalConfig;

  const resolved = { ...globalConfig };
  for (const [settingsKey, configField] of Object.entries(KEY_TO_CONFIG)) {
    const override = projectSettings[settingsKey as OverridableKey];
    if (override) {
      (resolved as Record<string, unknown>)[configField] = override;
    }
  }
  return resolved;
}
