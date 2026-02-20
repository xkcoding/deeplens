import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { Outline, Domain } from "../outline/types.js";

interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

/**
 * Convert a filename like "explorer-agent.md" to a readable title "Explorer Agent".
 */
function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.md$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Build sidebar group for a domain by scanning its actual docs directory.
 * Falls back to outline metadata if the directory doesn't exist.
 */
function buildDomainGroup(domain: Domain, docsDir: string): SidebarItem {
  const domainDir = path.join(docsDir, "domains", domain.id);
  const items: SidebarItem[] = [];

  if (existsSync(domainDir)) {
    // Scan actual generated files
    const files = readdirSync(domainDir)
      .filter((f) => f.endsWith(".md"))
      .sort();

    // index.md first as "Overview"
    if (files.includes("index.md")) {
      items.push({
        text: "Overview",
        link: `/domains/${domain.id}/`,
      });
    }

    // Remaining .md files as spokes
    for (const file of files) {
      if (file === "index.md") continue;
      items.push({
        text: fileNameToTitle(file),
        link: `/domains/${domain.id}/${file.replace(/\.md$/, "")}`,
      });
    }
  } else {
    // Fallback: just link to domain hub
    items.push({
      text: "Overview",
      link: `/domains/${domain.id}/`,
    });
  }

  return {
    text: domain.title,
    collapsed: false,
    items,
  };
}

/**
 * Generate VitePress sidebar configuration from the outline.
 * Scans the actual docs directory to build accurate navigation links.
 * Domain groups are numbered (e.g., "1. Authentication", "2. Data Access").
 */
export function generateSidebar(
  outline: Outline,
  docsDir: string,
): Record<string, unknown> {
  const groups: SidebarItem[] = outline.knowledge_graph.map((d, index) => {
    const group = buildDomainGroup(d, docsDir);
    group.text = `${index + 1}. ${group.text}`;
    return group;
  });

  return {
    "/": groups,
  };
}
