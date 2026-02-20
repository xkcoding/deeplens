/**
 * Project-level config routes — GET/POST for per-project settings overrides.
 */

import { Hono } from "hono";
import {
  loadProjectSettings,
  saveProjectSetting,
  OVERRIDABLE_KEYS,
  type OverridableKey,
} from "../../config/project-settings.js";

export function createProjectConfigRoute(): Hono {
  const app = new Hono();

  /** GET /api/project-config?projectPath=... — returns project-level overrides */
  app.get("/", (c) => {
    const projectPath = c.req.query("projectPath");
    if (!projectPath) {
      return c.json({ error: "projectPath query parameter is required" }, 400);
    }
    const settings = loadProjectSettings(projectPath);
    return c.json({ settings, overridableKeys: OVERRIDABLE_KEYS });
  });

  /** POST /api/project-config — save a project-level setting override */
  app.post("/", async (c) => {
    const body = await c.req.json<{
      projectPath?: string;
      key?: string;
      value?: string | null;
    }>().catch(() => null);

    if (!body?.projectPath || !body?.key) {
      return c.json({ error: "projectPath and key are required" }, 400);
    }

    if (!OVERRIDABLE_KEYS.includes(body.key as OverridableKey)) {
      return c.json(
        { error: `Key "${body.key}" is not overridable at project level. Allowed: ${OVERRIDABLE_KEYS.join(", ")}` },
        400,
      );
    }

    saveProjectSetting(
      body.projectPath,
      body.key as OverridableKey,
      body.value ?? null,
    );

    return c.json({ ok: true });
  });

  return app;
}
