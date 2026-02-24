## MODIFIED Requirements

### Requirement: Sidebar generation from outline
The system SHALL automatically generate VitePress sidebar configuration from the confirmed outline JSON. The `generateSidebar()` function SHALL accept a `locale` parameter (`"en"` or `"zh"`). The sidebar SHALL start with an "Overview" item linking to `/{locale}/` (index.md). Each domain SHALL become a top-level sidebar group below the Overview item. Hub documents SHALL be the group's index. Spoke documents SHALL be listed as children. The sidebar SHALL end with a "Summary" item linking to `/{locale}/summary` (summary.md). The sidebar SHALL reflect the outline's hierarchy including any sub-concepts. All sidebar links SHALL be prefixed with the locale path (`/en/` or `/zh/`).

#### Scenario: Sidebar starts with Overview
- **WHEN** sidebar is generated with locale "en"
- **THEN** the first sidebar item is `{ text: "Overview", link: "/en/" }` followed by domain groups

#### Scenario: Sidebar ends with Summary
- **WHEN** sidebar is generated with locale "zh"
- **THEN** the last sidebar item is `{ text: "Summary", link: "/zh/summary" }` after all domain groups

#### Scenario: Sidebar matches outline structure
- **WHEN** the outline contains 5 domains, each with 2-4 spoke files
- **THEN** the VitePress sidebar has an Overview link, 5 collapsible groups listing their spoke documents, and a Summary link, all with locale-prefixed paths

#### Scenario: Sub-concepts create nested sidebar groups
- **WHEN** a domain has sub_concepts in the outline
- **THEN** the sidebar group contains nested sub-groups matching the hierarchy

### Requirement: Telescope SVG consistency
The VitePress scaffold SHALL generate a `telescope.svg` in the public directory with SVG paths identical to the application logo (`src-tauri/icons/logo.svg`). This ensures visual consistency between the desktop application icon and the documentation site logo.

#### Scenario: Telescope SVG matches app logo
- **WHEN** VitePress is scaffolded
- **THEN** the `telescope.svg` paths (d attributes) match those in `src-tauri/icons/logo.svg`
