## ADDED Requirements

### Requirement: Static site build
The system SHALL provide a `deeplens export [project-path]` CLI command and a `POST /api/export` Sidecar endpoint that builds the VitePress documentation into a static HTML site using `vitepress build`. The output SHALL be placed in `<project>/.deeplens/docs/.vitepress/dist/` by default, or a user-specified output directory.

#### Scenario: Export via CLI
- **WHEN** user runs `deeplens export ./my-project`
- **THEN** the system runs `vitepress build` in the project's docs directory and outputs static files to `.vitepress/dist/`

#### Scenario: Export via API
- **WHEN** the frontend calls `POST /api/export` with `{ "projectPath": "/my/project" }`
- **THEN** the endpoint returns an SSE stream with build progress and a `done` event containing the output path

#### Scenario: Export to custom directory
- **WHEN** user runs `deeplens export ./my-project --output /tmp/docs`
- **THEN** the static site is built and the contents of `.vitepress/dist/` are copied to `/tmp/docs`

### Requirement: Export UI button
The UI SHALL provide an "Export Site" button in the AppHeader, enabled only when analysis is complete (documents exist). Clicking the button SHALL trigger a native directory picker dialog for output selection, then call the export API.

#### Scenario: Export button enabled
- **WHEN** the project has completed analysis with generated documents
- **THEN** the "Export Site" button in the header is enabled

#### Scenario: Export button disabled
- **WHEN** no analysis has been run or no documents exist
- **THEN** the "Export Site" button is disabled with a tooltip "Run analysis first"

#### Scenario: Export with directory picker
- **WHEN** the user clicks "Export Site" and selects an output directory
- **THEN** the system builds the static site and copies it to the selected directory, showing a success notification
