## ADDED Requirements

### Requirement: Custom VitePress theme
The VitePress scaffold SHALL generate a custom theme directory at `<project>/.deeplens/docs/.vitepress/theme/` containing `index.ts` (theme registration) and `custom.css` (CSS variable overrides). The custom theme SHALL extend VitePress's default theme and override brand colors to use the DeepLens orange palette.

#### Scenario: Theme files generated on scaffold
- **WHEN** `scaffoldVitePress()` is called during document generation
- **THEN** the `.vitepress/theme/index.ts` and `.vitepress/theme/custom.css` files are created alongside `config.mts`

#### Scenario: Theme extends default
- **WHEN** VitePress loads the custom theme
- **THEN** all default VitePress features (sidebar, nav, search) remain functional with the custom styling applied

### Requirement: Orange brand color scheme
The custom CSS SHALL override VitePress brand color variables to the DeepLens orange palette:
- `--vp-c-brand-1`: `#F97316` (primary-500)
- `--vp-c-brand-2`: `#EA580C` (primary-600)
- `--vp-c-brand-3`: `#C2410C` (primary-700)
- `--vp-c-brand-soft`: `rgba(249, 115, 22, 0.14)`

The theme SHALL also set sidebar active link color, code block accent, and badge colors to match the orange palette.

#### Scenario: Brand colors applied
- **WHEN** VitePress renders a page with the custom theme
- **THEN** links, sidebar active items, and brand elements use the orange color scheme (#F97316) instead of the default VitePress blue/purple

### Requirement: Content-first homepage
The VitePress configuration SHALL NOT use a hero layout for the homepage. The generated `index.md` SHALL contain the project overview content directly: project name as h1, project summary, detected tech stack as badges, and a table of contents linking to each domain's overview page.

#### Scenario: Homepage shows project overview
- **WHEN** the user opens the VitePress site root `/`
- **THEN** the page displays the project name, summary, tech stack, and domain links — no hero banner or call-to-action buttons

#### Scenario: Domain links on homepage
- **WHEN** the homepage lists 5 domains
- **THEN** each domain is a clickable link to `/domains/<domain-id>/` with the domain title and description

### Requirement: Numbered sidebar groups
The sidebar SHALL display domain groups with numeric prefixes in their display text (e.g., "1. Authentication", "2. Data Access", "3. API Layer"). The numbering SHALL follow the order of domains in the knowledge outline.

#### Scenario: Sidebar with numbered groups
- **WHEN** the outline contains domains ["authentication", "data-access", "api-layer"]
- **THEN** the sidebar shows "1. Authentication", "2. Data Access", "3. Api Layer" as group headers

### Requirement: DeepWiki-inspired layout refinements
The custom CSS SHALL apply the following layout refinements inspired by DeepWiki:
- Content area max-width increased for better readability on wide screens
- Sidebar font size and spacing tuned for scan-ability
- Code blocks with subtle background and left accent border
- Mermaid diagram blocks with centered alignment and appropriate padding

#### Scenario: Wide screen readability
- **WHEN** the browser viewport is wider than 1400px
- **THEN** the content area maintains a readable max-width with balanced margins
