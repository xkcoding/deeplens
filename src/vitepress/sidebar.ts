import { readdirSync, readFileSync, existsSync } from "node:fs";
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
 * Extract the first `# ` heading from a markdown file.
 * Returns null if the file doesn't exist or has no H1.
 */
function extractH1(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Build sidebar group for a domain by scanning its actual docs directory.
 * The domain title itself links to the hub (index.md).
 * Only spoke files appear as children — no redundant "Overview" child.
 *
 * For non-English locales, titles are extracted from the translated markdown
 * file headings instead of using English outline data or file names.
 */
function buildDomainGroup(domain: Domain, docsDir: string, locale: string): SidebarItem {
  const domainDir = path.join(docsDir, locale, "domains", domain.id);
  const items: SidebarItem[] = [];
  // English is root locale — links use "/" prefix; others use "/{locale}/"
  const linkPrefix = locale === "en" ? "" : `/${locale}`;

  if (existsSync(domainDir)) {
    // Scan actual generated files — only spoke files as children
    const files = readdirSync(domainDir)
      .filter((f) => f.endsWith(".md") && f !== "index.md")
      .sort();

    for (const file of files) {
      // For zh locale, extract title from the translated file's H1 heading
      const spokeTitle =
        locale !== "en"
          ? extractH1(path.join(domainDir, file)) ?? fileNameToTitle(file)
          : fileNameToTitle(file);
      items.push({
        text: spokeTitle,
        link: `${linkPrefix}/domains/${domain.id}/${file.replace(/\.md$/, "")}`,
      });
    }
  }

  // For zh locale, extract domain title from the translated hub's H1 heading
  const domainTitle =
    locale !== "en"
      ? extractH1(path.join(domainDir, "index.md")) ?? domain.title
      : domain.title;

  const result: SidebarItem = {
    text: domainTitle,
    link: `${linkPrefix}/domains/${domain.id}/`,
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
 *
 * @param locale - Locale prefix (e.g. "en" or "zh")
 */
export function generateSidebar(
  outline: Outline,
  docsDir: string,
  locale: string = "en",
): Record<string, unknown> {
  // English is root locale — sidebar key is "/" and links use no locale prefix
  const linkPrefix = locale === "en" ? "" : `/${locale}`;
  const sidebarKey = locale === "en" ? "/" : `/${locale}/`;

  const overview: SidebarItem = { text: locale === "zh" ? "概览" : "Overview", link: `${linkPrefix}/` };

  const groups: SidebarItem[] = outline.knowledge_graph.map((d, index) => {
    const group = buildDomainGroup(d, docsDir, locale);
    group.text = `${index + 1}. ${group.text}`;
    return group;
  });

  const summary: SidebarItem = { text: locale === "zh" ? "总结" : "Summary", link: `${linkPrefix}/summary` };

  return {
    [sidebarKey]: [overview, ...groups, summary],
  };
}
