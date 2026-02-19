import type { Outline, Domain } from "../outline/types.js";

interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

type SubConcept = {
  name: string;
  description: string;
  files: { path: string; role: string }[];
  sub_concepts?: SubConcept[];
};

function filePathToLink(filePath: string): string {
  // Strip .md extension for VitePress links
  return "/" + filePath.replace(/\.md$/, "");
}

function buildSubConceptGroup(sub: SubConcept): SidebarItem {
  const items: SidebarItem[] = sub.files.map((f) => ({
    text: f.role,
    link: filePathToLink(f.path),
  }));

  if (sub.sub_concepts) {
    for (const nested of sub.sub_concepts) {
      items.push(buildSubConceptGroup(nested));
    }
  }

  return {
    text: sub.name,
    collapsed: true,
    items,
  };
}

function buildDomainGroup(domain: Domain): SidebarItem {
  const items: SidebarItem[] = [];

  // First file is treated as the hub (index/overview)
  if (domain.files.length > 0) {
    items.push({
      text: "Overview",
      link: filePathToLink(domain.files[0].path),
    });

    // Remaining files are spokes
    for (let i = 1; i < domain.files.length; i++) {
      items.push({
        text: domain.files[i].role,
        link: filePathToLink(domain.files[i].path),
      });
    }
  }

  // Sub-concepts become nested groups
  if (domain.sub_concepts) {
    for (const sub of domain.sub_concepts) {
      items.push(buildSubConceptGroup(sub));
    }
  }

  return {
    text: domain.title,
    collapsed: false,
    items,
  };
}

/**
 * Generate VitePress sidebar configuration from the outline.
 * Maps domains -> collapsible groups with hub + spoke items.
 */
export function generateSidebar(
  outline: Outline,
): Record<string, unknown> {
  const groups: SidebarItem[] = outline.knowledge_graph.map(buildDomainGroup);

  return {
    "/": groups,
  };
}
