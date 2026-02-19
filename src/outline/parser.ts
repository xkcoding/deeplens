import { outlineSchema } from "./types.js";
import type { Outline } from "./types.js";

export type ParseResult =
  | { success: true; data: Outline }
  | { success: false; error: string; raw: string };

/**
 * Try to extract a JSON string from the raw Agent output.
 * Strategy: direct parse → code fence extraction → brace extraction.
 */
function extractJson(raw: string): string | null {
  const trimmed = raw.trim();

  // Strategy 1: raw string is already valid JSON
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  // Strategy 2: extract from markdown code fence (```json ... ``` or ``` ... ```)
  const fencePattern = /```(?:json)?\s*\n?([\s\S]*?)```/;
  const fenceMatch = trimmed.match(fencePattern);
  if (fenceMatch?.[1]?.trim().startsWith("{")) {
    return fenceMatch[1].trim();
  }

  // Strategy 3: extract outermost { ... } brace pair
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

/**
 * Extract JSON from Agent output and validate against Zod schema.
 * Strategies: direct parse → code fence extraction → brace extraction.
 */
export function parseOutline(rawOutput: string): ParseResult {
  const jsonStr = extractJson(rawOutput);

  if (jsonStr === null) {
    return {
      success: false,
      error: "No JSON object found in agent output. Expected a JSON object starting with '{' either directly, within a markdown code fence, or embedded in text.",
      raw: rawOutput,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `Invalid JSON syntax: ${message}`,
      raw: rawOutput,
    };
  }

  const result = outlineSchema.safeParse(parsed);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  return {
    success: false,
    error: `Outline JSON failed schema validation:\n${issues}`,
    raw: rawOutput,
  };
}
