/**
 * Outline endpoints:
 *   GET  /api/outline         — Return current outline from analyze pipeline
 *   POST /api/outline/confirm — Validate and confirm outline, resume analyze pipeline
 */

import { Hono } from "hono";
import { outlineSchema } from "../../outline/types.js";
import type { AnalyzeContext } from "./analyze.js";

export function createOutlineRoute(analyzeCtx: AnalyzeContext): Hono {
  const app = new Hono();

  // GET / — return current outline
  app.get("/", (c) => {
    const outline = analyzeCtx.getCurrentOutline();
    if (!outline) {
      return c.json({ error: "No outline available. Run /api/analyze first." }, 404);
    }
    return c.json({ outline });
  });

  // POST /confirm — validate and confirm outline to resume pipeline
  app.post("/confirm", async (c) => {
    const resolve = analyzeCtx.getResolveOutline();
    if (!resolve) {
      return c.json(
        { error: "No pending outline confirmation. Start /api/analyze first." },
        409,
      );
    }

    const body = await c.req.json().catch(() => ({}));
    const raw = body as Record<string, unknown>;

    // If outline is provided in body, use it (allows edits); otherwise use current
    const outlineData = raw.outline ?? analyzeCtx.getCurrentOutline();

    const result = outlineSchema.safeParse(outlineData);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return c.json({ error: `Invalid outline: ${issues}` }, 400);
    }

    // Resolve the waiting promise in the analyze pipeline
    resolve(result.data);

    return c.json({ status: "confirmed" });
  });

  return app;
}
