## ADDED Requirements

### Requirement: Project registry
The system SHALL maintain a project registry at `~/.deeplens/projects.json` containing an array of `ProjectEntry` objects. Each entry SHALL have: `path` (string, absolute path), `name` (string, derived from directory name), `lastAnalyzed` (optional ISO timestamp), `lastCommit` (optional commit SHA), and `status` ("ready" | "analyzing" | "error").

#### Scenario: Register project on first analysis
- **WHEN** the user analyzes a project at `/Users/me/code/my-app` for the first time
- **THEN** a new entry is added to `projects.json` with `name: "my-app"`, `status: "analyzing"`, and the path

#### Scenario: Update project on analysis completion
- **WHEN** analysis completes successfully for a registered project
- **THEN** the entry is updated with `status: "ready"`, `lastAnalyzed` set to current time, and `lastCommit` set to HEAD SHA

#### Scenario: Load project list
- **WHEN** the Project Selection Page loads
- **THEN** it reads `~/.deeplens/projects.json` and displays all registered projects sorted by `lastAnalyzed` descending

### Requirement: Project Selection Page with history
The Project Selection Page SHALL display all registered projects as cards showing: project name, path, status badge (ready/analyzing/error), and last analyzed time (relative format, e.g., "3 days ago"). The page SHALL also show the "Open Project" button for importing new projects.

#### Scenario: Display project cards
- **WHEN** `projects.json` contains 3 projects
- **THEN** the page shows 3 project cards with name, path, status badge, and last analyzed time

#### Scenario: Empty project list
- **WHEN** `projects.json` is empty or does not exist
- **THEN** the page shows only the "Open Project" button with a welcome message

#### Scenario: Click project card
- **WHEN** the user clicks on a project card
- **THEN** the application opens that project (sets currentProject, loads session)

### Requirement: AppHeader project switcher
The AppHeader SHALL display the current project name as a dropdown trigger. Clicking it SHALL show a dropdown menu listing all registered projects with their status badges. Selecting a different project SHALL switch the active project without navigating to the Project Selection Page.

#### Scenario: Switch project via dropdown
- **WHEN** the user selects "Project B" from the AppHeader dropdown while "Project A" is active
- **THEN** the application switches to "Project B": loads its session, updates UI state, and sets it as the current project

#### Scenario: Dropdown shows all projects
- **WHEN** the user clicks the project name in the AppHeader
- **THEN** a dropdown appears listing all registered projects with status indicators

### Requirement: Independent project state
Each project SHALL maintain independent state for: VitePress instance, vector index (`<project>/.deeplens/vectors.db`), session events (`<project>/.deeplens/session.jsonl`), outline (`<project>/.deeplens/outline.json`), and generated documents (`<project>/.deeplens/docs/`). Switching projects SHALL NOT affect other projects' data.

#### Scenario: Independent vector indexes
- **WHEN** Project A has 100 indexed chunks and Project B has 50
- **THEN** searching in Project A returns results from its 100 chunks only, and Project B from its 50 chunks only

#### Scenario: Independent VitePress
- **WHEN** the user switches from Project A to Project B
- **THEN** the VitePress dev server for Project A is stopped and Project B's docs directory is served instead

### Requirement: UI state preservation on project switch
When switching projects, the system SHALL preserve the current project's UI state (event timeline, selected navigation item, chat history, scroll positions) in an in-memory cache keyed by project path. When switching back to a previously viewed project, the system SHALL restore its cached UI state.

#### Scenario: Preserve and restore UI state
- **WHEN** the user switches from Project A (with 20 events in the timeline and a selected nav item) to Project B, then back to Project A
- **THEN** Project A's event timeline, selected nav item, and scroll position are restored exactly as left

#### Scenario: First visit to a project
- **WHEN** the user switches to a project that has not been opened in this session
- **THEN** the UI starts fresh, loading the project's session from disk if available

### Requirement: Project removal
The Project Selection Page SHALL allow removing a project from the registry via a context menu or delete action on the project card. Removing a project SHALL only delete the entry from `projects.json` — it SHALL NOT delete the project's `.deeplens/` directory or source code.

#### Scenario: Remove project from registry
- **WHEN** the user removes "old-project" from the project list
- **THEN** the entry is deleted from `projects.json` but `old-project/.deeplens/` remains on disk
