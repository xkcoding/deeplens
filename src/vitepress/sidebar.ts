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
 * The domain title itself links to the hub (index.md).
 * Only spoke files appear as children — no redundant "Overview" child.
 */
function buildDomainGroup(domain: Domain, docsDir: string): SidebarItem {
  const domainDir = path.join(docsDir, "domains", domain.id);
  const items: SidebarItem[] = [];

  if (existsSync(domainDir)) {
    // Scan actual generated files — only spoke files as children
    const files = readdirSync(domainDir)
      .filter((f) => f.endsWith(".md") && f !== "index.md")
      .sort();

    for (const file of files) {
      items.push({
        text: fileNameToTitle(file),
        link: `/domains/${domain.id}/${file.replace(/\.md$/, "")}`,
      });
    }
  }

  const result: SidebarItem = {
    text: domain.title,
    link: `/domains/${domain.id}/`,
  };
  if (items.length > 0) {
    result.collapsed = false;
    result.items = items;
  }
  return result;
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
  const overview: SidebarItem = { text: "Overview", link: "/" };

  const groups: SidebarItem[] = outline.knowledge_graph.map((d, index) => {
    const group = buildDomainGroup(d, docsDir);
    group.text = `${index + 1}. ${group.text}`;
    return group;
  });

  const summary: SidebarItem = { text: "Summary", link: "/summary" };

  return {
    "/": [overview, ...groups, summary],
  };
}
