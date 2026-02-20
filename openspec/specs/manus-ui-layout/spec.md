## ADDED Requirements

### Requirement: Three-panel layout
The application SHALL display a three-panel layout: left Navigation panel, center Flow panel ("The Flow"), and right Artifact panel ("The Artifact"). The panels SHALL be separated by resizable dividers. The default width ratio SHALL be approximately 20% / 35% / 45%.

#### Scenario: Initial layout render
- **WHEN** the application loads and sidecar is ready
- **THEN** three panels are visible: Navigation (left), Flow (center), Artifact (right)

#### Scenario: Panel resize
- **WHEN** the user drags a panel divider
- **THEN** the adjacent panels resize proportionally, respecting minimum widths (Navigation: 200px, Flow: 300px, Artifact: 400px)

### Requirement: Navigation panel — document tree
The left Navigation panel SHALL display a tree view of the generated documentation structure. Each domain SHALL be a collapsible parent node. Hub and Spoke documents SHALL be child nodes. Each node SHALL display a status indicator: filled circle (completed), spinning circle (generating), hollow circle (pending).

#### Scenario: Display document tree after generation
- **WHEN** generation has produced documents for 5 domains
- **THEN** the Navigation panel shows 5 collapsible domain groups, each with hub and spoke document nodes marked as completed

#### Scenario: Status indicators during generation
- **WHEN** the generation agent is writing the 3rd of 5 domains
- **THEN** domains 1-2 show filled circles, domain 3 shows a spinning indicator, domains 4-5 show hollow circles

#### Scenario: Click to navigate
- **WHEN** the user clicks a document node in the Navigation tree
- **THEN** the Artifact panel navigates the VitePress iframe to the corresponding page

### Requirement: Flow panel — Agent event stream
The center Flow panel SHALL display a chronological stream of Agent events in real-time. Events SHALL be rendered as styled blocks: `thought` events as text paragraphs, `tool_start`/`tool_end` as collapsible tool call cards (showing tool name, arguments, and duration), `progress` as a progress bar, and `error` as red-highlighted error blocks.

#### Scenario: Display exploration events
- **WHEN** the exploration agent runs and emits tool calls and thoughts
- **THEN** the Flow panel renders each event as a styled block in chronological order with auto-scroll to latest

#### Scenario: Tool call card expansion
- **WHEN** the user clicks a `tool_start` card in the Flow panel
- **THEN** the card expands to show the full tool arguments JSON

### Requirement: Artifact panel — VitePress preview
The right Artifact panel SHALL embed the VitePress dev server output via an `<iframe>`. The iframe source URL SHALL be `http://localhost:{vitepressPort}`. The panel SHALL display a loading skeleton until the VitePress server is ready.

#### Scenario: VitePress preview loads
- **WHEN** the VitePress dev server is running and the sidecar reports its port
- **THEN** the Artifact panel iframe loads the VitePress home page

#### Scenario: Document hot reload
- **WHEN** the generation agent writes a new document to the VitePress docs directory
- **THEN** the VitePress HMR updates the iframe content automatically

### Requirement: Project selection page
Before any analysis, the application SHALL display a welcome/project selection page. This page SHALL show a list of previously analyzed projects (from `~/.deeplens/projects.json`) and a prominent "Open Project" button that triggers the native directory picker.

#### Scenario: First launch with no projects
- **WHEN** the user launches DeepLens for the first time
- **THEN** the welcome page shows an empty project list and the "Open Project" button

#### Scenario: Open existing project
- **WHEN** the user clicks a previously analyzed project
- **THEN** the application loads that project's docs and enters the three-panel layout with the existing documentation

#### Scenario: Start new analysis
- **WHEN** the user selects a directory via "Open Project"
- **THEN** the application enters the three-panel layout and begins the analysis pipeline

### Requirement: Application header bar
The application SHALL display a header bar showing the current project name, a settings gear icon (opens settings dialog), and a project switcher dropdown. The header SHALL be persistent across all views.

#### Scenario: Settings access
- **WHEN** the user clicks the settings gear icon
- **THEN** the settings dialog opens as a modal overlay

#### Scenario: Project name display
- **WHEN** a project is loaded
- **THEN** the header shows the project directory name (e.g., "my-project")

### Requirement: Responsive minimum dimensions
The layout SHALL degrade gracefully at small window sizes. Below 1200px width, the Navigation panel SHALL collapse to an icon-only sidebar. Below 1024px width (minimum), the Flow panel SHALL be hidden and accessible via a tab/toggle.

#### Scenario: Narrow window collapses Navigation
- **WHEN** the window width is between 1024px and 1200px
- **THEN** the Navigation panel collapses to a narrow icon-only sidebar with tooltips
