## MODIFIED Requirements

### Requirement: Sidebar generation from outline
The system SHALL automatically generate VitePress sidebar configuration from the confirmed outline JSON. The sidebar SHALL start with an "Overview" item linking to `/` (index.md). Each domain SHALL become a top-level sidebar group below the Overview item. Hub documents SHALL be the group's index. Spoke documents SHALL be listed as children. The sidebar SHALL end with a "Summary" item linking to `/summary` (summary.md). The sidebar SHALL reflect the outline's hierarchy including any sub-concepts.

#### Scenario: Sidebar starts with Overview
- **WHEN** sidebar is generated from an outline with overview data
- **THEN** the first sidebar item is `{ text: "Overview", link: "/" }` followed by domain groups

#### Scenario: Sidebar ends with Summary
- **WHEN** sidebar is generated from an outline
- **THEN** the last sidebar item is `{ text: "Summary", link: "/summary" }` after all domain groups

#### Scenario: Sidebar matches outline structure
- **WHEN** the outline contains 5 domains, each with 2-4 spoke files
- **THEN** the VitePress sidebar has an Overview link, 5 collapsible groups listing their spoke documents, and a Summary link

#### Scenario: Sub-concepts create nested sidebar groups
- **WHEN** a domain has sub_concepts in the outline
- **THEN** the sidebar group contains nested sub-groups matching the hierarchy

### Requirement: Telescope SVG consistency
The VitePress scaffold SHALL generate a `telescope.svg` in the public directory with SVG paths identical to the application logo (`src-tauri/icons/logo.svg`). This ensures visual consistency between the desktop application icon and the documentation site logo.

#### Scenario: Telescope SVG matches app logo
- **WHEN** VitePress is scaffolded
- **THEN** the `telescope.svg` paths (d attributes) match those in `src-tauri/icons/logo.svg`
