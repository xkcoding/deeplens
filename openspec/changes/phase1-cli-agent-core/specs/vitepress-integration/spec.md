## ADDED Requirements

### Requirement: VitePress project scaffolding
The system SHALL generate a complete VitePress configuration in the `.deeplens/` output directory. This SHALL include: `.vitepress/config.ts` with site title (from project name), Mermaid plugin support, and theme configuration. The system SHALL use `npx vitepress` to avoid requiring a local installation.

#### Scenario: VitePress config generated
- **WHEN** document generation completes
- **THEN** `.deeplens/docs/.vitepress/config.ts` exists with correct site title and Mermaid support enabled

#### Scenario: Mermaid diagrams render correctly
- **WHEN** a document contains a Mermaid code block
- **THEN** VitePress renders it as an interactive diagram (via vitepress-plugin-mermaid or equivalent)

### Requirement: Sidebar generation from outline
The system SHALL automatically generate VitePress sidebar configuration from the confirmed outline JSON. Each domain SHALL become a top-level sidebar group. Hub documents SHALL be the group's index. Spoke documents SHALL be listed as children. The sidebar SHALL reflect the outline's hierarchy including any sub-concepts.

#### Scenario: Sidebar matches outline structure
- **WHEN** the outline contains 5 domains, each with 2-4 spoke files
- **THEN** the VitePress sidebar has 5 collapsible groups, each listing their spoke documents

#### Scenario: Sub-concepts create nested sidebar groups
- **WHEN** a domain has sub_concepts in the outline
- **THEN** the sidebar group contains nested sub-groups matching the hierarchy

### Requirement: Local preview server
The system SHALL start a VitePress dev server for local preview. The server SHALL be started via `npx vitepress dev .deeplens/docs`. The system SHALL detect an available port (starting from 5173, incrementing if occupied). The system SHALL print the local URL to the terminal and optionally open the default browser.

#### Scenario: Preview server starts successfully
- **WHEN** user runs `deeplens preview` or the analyze flow completes
- **THEN** a VitePress dev server starts and the terminal shows `Preview available at http://localhost:5173`

#### Scenario: Default port occupied
- **WHEN** port 5173 is already in use
- **THEN** the system tries 5174, 5175, etc. until finding an available port

#### Scenario: Preview with --open flag
- **WHEN** user runs `deeplens preview --open`
- **THEN** the system starts the server AND opens the URL in the default browser
