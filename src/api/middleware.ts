/**
 * Hono middleware — CORS and global error handling.
 */

import { cors } from "hono/cors";
import type { Hono } from "hono";

export function applyMiddleware(app: Hono): void {
  // CORS — allow all origins
  app.use("*", cors());

  // Global error handler — catch unhandled exceptions
  app.onError((err, c) => {
    console.error("Unhandled error:", err);

    // Detect upstream timeout
    if (
      err.message?.includes("timeout") ||
      err.message?.includes("ETIMEDOUT")
    ) {
      return c.json({ error: "Upstream API timeout" }, 502);
    }

    return c.json({ error: "Internal server error" }, 500);
  });
}
