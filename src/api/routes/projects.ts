/**
 * Project registry API routes.
 * GET  /  — Returns the project list sorted by lastAnalyzed descending.
 * DELETE / — Removes a project from the registry (does NOT delete .deeplens/ directory).
 */

import { Hono } from "hono";
import { loadProjects, registerProject, removeProject } from "../../projects/registry.js";

export function createProjectsRoute(): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const projects = await loadProjects();
    return c.json(projects);
  });

  /** Register a project when opened (before analysis). */
  app.post("/", async (c) => {
    const body = await c.req.json<{ path: string }>();
    if (!body.path) {
      return c.json({ error: "path is required" }, 400);
    }
    await registerProject(body.path, "opened");
    return c.json({ ok: true });
  });

  app.delete("/", async (c) => {
    const body = await c.req.json<{ path: string }>();
    if (!body.path) {
      return c.json({ error: "path is required" }, 400);
    }
    await removeProject(body.path);
    return c.json({ ok: true });
  });

  return app;
}
