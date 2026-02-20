/**
 * Impact tracing — match changed files against outline domains to find affected areas.
 */

import type { Outline } from "../outline/types.js";

export interface ImpactResult {
  /** Domain IDs that have at least one changed file. */
  affectedDomains: string[];
  /** Domain IDs with no changed files. */
  unchangedDomains: string[];
  /** Changed files not mapped to any domain in the outline. */
  untrackedFiles: string[];
}

/**
 * Collect all file paths from a domain, including nested sub_concepts.
 */
function collectDomainFiles(domain: {
  files: Array<{ path: string }>;
  sub_concepts?: Array<{
    files: Array<{ path: string }>;
    sub_concepts?: unknown[];
  }>;
}): Set<string> {
  const paths = new Set<string>();

  for (const f of domain.files) {
    paths.add(f.path);
  }

  if (domain.sub_concepts) {
    for (const sc of domain.sub_concepts) {
      for (const f of sc.files) {
        paths.add(f.path);
      }
      // Recurse into nested sub_concepts
      if (sc.sub_concepts) {
        const nested = collectDomainFiles(
          sc as { files: Array<{ path: string }>; sub_concepts?: Array<{ files: Array<{ path: string }>; sub_concepts?: unknown[] }> },
        );
        for (const p of nested) {
          paths.add(p);
        }
      }
    }
  }

  return paths;
}

/**
 * Trace the impact of changed files against the outline's domain structure.
 *
 * @param changedFiles - List of relative file paths from git diff
 * @param outline - The project's analysis outline
 * @returns Impact analysis result with affected/unchanged domains and untracked files
 */
export function traceImpact(
  changedFiles: string[],
  outline: Outline,
): ImpactResult {
  const affectedDomains: string[] = [];
  const unchangedDomains: string[] = [];
  const trackedFiles = new Set<string>();

  for (const domain of outline.knowledge_graph) {
    const domainFiles = collectDomainFiles(domain);
    let isAffected = false;

    for (const changedFile of changedFiles) {
      if (domainFiles.has(changedFile)) {
        isAffected = true;
        trackedFiles.add(changedFile);
      }
    }

    if (isAffected) {
      affectedDomains.push(domain.id);
    } else {
      unchangedDomains.push(domain.id);
    }
  }

  const untrackedFiles = changedFiles.filter((f) => !trackedFiles.has(f));

  return { affectedDomains, unchangedDomains, untrackedFiles };
}
