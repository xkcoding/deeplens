/**
 * Project registry — manages ~/.deeplens/projects.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import os from "node:os";

export interface ProjectEntry {
  path: string;
  name: string;
  lastAnalyzed?: string;
  lastCommit?: string;
  status: "ready" | "analyzing" | "error";
}

const REGISTRY_DIR = path.join(os.homedir(), ".deeplens");
const REGISTRY_PATH = path.join(REGISTRY_DIR, "projects.json");

async function ensureRegistryExists(): Promise<void> {
  if (!existsSync(REGISTRY_DIR)) {
    await fs.mkdir(REGISTRY_DIR, { recursive: true });
  }
  if (!existsSync(REGISTRY_PATH)) {
    await fs.writeFile(REGISTRY_PATH, "[]", "utf-8");
  }
}

export async function loadProjects(): Promise<ProjectEntry[]> {
  await ensureRegistryExists();
  const raw = await fs.readFile(REGISTRY_PATH, "utf-8");
  try {
    const entries = JSON.parse(raw) as ProjectEntry[];
    // Sort by lastAnalyzed descending (most recent first)
    return entries.sort((a, b) => {
      if (!a.lastAnalyzed && !b.lastAnalyzed) return 0;
      if (!a.lastAnalyzed) return 1;
      if (!b.lastAnalyzed) return -1;
      return new Date(b.lastAnalyzed).getTime() - new Date(a.lastAnalyzed).getTime();
    });
  } catch {
    return [];
  }
}

export async function registerProject(projectPath: string): Promise<void> {
  const entries = await loadProjects();
  const existing = entries.find((e) => e.path === projectPath);
  if (existing) {
    existing.status = "analyzing";
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(entries, null, 2), "utf-8");
    return;
  }

  const name = path.basename(projectPath);
  entries.push({
    path: projectPath,
    name,
    status: "analyzing",
  });
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export async function updateProject(
  projectPath: string,
  updates: Partial<Omit<ProjectEntry, "path">>,
): Promise<void> {
  const entries = await loadProjects();
  const entry = entries.find((e) => e.path === projectPath);
  if (!entry) return;

  Object.assign(entry, updates);
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export async function removeProject(projectPath: string): Promise<void> {
  const entries = await loadProjects();
  const filtered = entries.filter((e) => e.path !== projectPath);
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(filtered, null, 2), "utf-8");
}
