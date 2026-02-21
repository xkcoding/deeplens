## ADDED Requirements

### Requirement: Overview schema definition
The outline schema SHALL include a top-level `overview` field containing structured project-level metadata. The `overview` object SHALL include: `architecture` (string — high-level architecture description with Mermaid diagram), `tech_stack_roles` (array of `{ name, role }` — each technology and its specific role in the project), `key_flows` (array of `{ name, description }` — 3-5 most important user/data flows), and `project_structure` (string — directory structure explanation). All fields SHALL be required. The Zod schema SHALL validate the overview object alongside existing fields.

#### Scenario: Valid outline with overview
- **WHEN** the exploration agent produces an outline JSON
- **THEN** the JSON includes an `overview` object with `architecture`, `tech_stack_roles`, `key_flows`, and `project_structure` fields all populated

#### Scenario: Overview validation failure
- **WHEN** the exploration agent omits the `overview` field or leaves a sub-field empty
- **THEN** Zod validation fails with a specific error message indicating which overview field is missing

### Requirement: Overview fixed position in HITL
The overview section SHALL always appear as the first element in the HITL outline editor. The overview SHALL NOT participate in drag-and-drop reordering. The overview SHALL be visually distinct from domain nodes (e.g., different background color or icon). The overview fields SHALL be editable inline (text areas for `architecture` and `project_structure`, structured list editors for `tech_stack_roles` and `key_flows`).

#### Scenario: Overview pinned at top
- **WHEN** the outline editor renders an outline with overview and 5 domains
- **THEN** the overview section appears above all domain nodes and has no drag handle

#### Scenario: Domains reorder below overview
- **WHEN** the user drags domain "Auth" to a new position
- **THEN** the overview remains fixed at the top; only domain ordering changes

#### Scenario: Edit overview architecture text
- **WHEN** the user clicks on the architecture text in the overview section
- **THEN** an inline text area opens allowing the user to edit the architecture description

### Requirement: Overview renders as index.md
The Generator Agent SHALL produce `index.md` from the `overview` data instead of a static template. The `index.md` SHALL contain: project name as title, `architecture` section with rendered Mermaid diagram, `tech_stack_roles` as a formatted table, `key_flows` as a numbered list with descriptions, `project_structure` as a code block or description, and domain navigation links. The `index.md` SHALL replace both the current static index template and the separate `architecture.md`.

#### Scenario: index.md generated from overview
- **WHEN** the generation agent processes a confirmed outline with overview data
- **THEN** `index.md` contains the architecture diagram, tech stack table, key flows list, and links to all domain hubs

#### Scenario: No separate architecture.md
- **WHEN** document generation completes
- **THEN** no standalone `architecture.md` file is generated; all architecture content lives in `index.md`

### Requirement: Overview as sidebar first item
The VitePress sidebar generation SHALL insert an "Overview" item as the first entry linking to `/` (index.md). This item SHALL appear above all domain groups. The sidebar item SHALL use a distinct label "Overview" (not the project name).

#### Scenario: Sidebar starts with Overview
- **WHEN** sidebar is generated from an outline with overview
- **THEN** the first sidebar item is `{ text: "Overview", link: "/" }` followed by domain groups
