## ADDED Requirements

### Requirement: analyze command (full pipeline)
The system SHALL provide a `deeplens analyze <project-path>` command that orchestrates the complete flow: exploration → HITL review → generation → VitePress preview. The command SHALL accept an optional `--output <dir>` flag to specify the output directory (default: `<project-path>/.deeplens`). The command SHALL accept an optional `--no-preview` flag to skip starting the VitePress server.

#### Scenario: Full pipeline execution
- **WHEN** user runs `deeplens analyze ./my-project`
- **THEN** the system runs exploration, presents the outline for review, generates documents, and starts the preview server

#### Scenario: Custom output directory
- **WHEN** user runs `deeplens analyze ./my-project --output ~/docs/my-project`
- **THEN** all generated files are written to `~/docs/my-project/` instead of `./my-project/.deeplens/`

#### Scenario: Skip preview
- **WHEN** user runs `deeplens analyze ./my-project --no-preview`
- **THEN** the system completes generation but does not start the VitePress dev server

### Requirement: explore command (outline only)
The system SHALL provide a `deeplens explore <project-path>` command that runs only the exploration phase. The output SHALL be the JSON outline printed to stdout and saved to the output directory. This command is useful for debugging the exploration agent independently.

#### Scenario: Explore and output outline
- **WHEN** user runs `deeplens explore ./my-project`
- **THEN** the system runs the exploration agent, saves the outline to `.deeplens/outline.json`, and prints a summary to the terminal

### Requirement: generate command (from outline)
The system SHALL provide a `deeplens generate <outline-path>` command that generates documents from a pre-existing outline JSON file. This skips exploration and HITL review. The command SHALL validate the outline against the Zod schema before proceeding.

#### Scenario: Generate from saved outline
- **WHEN** user runs `deeplens generate ./my-project/.deeplens/outline.json`
- **THEN** the system validates the outline, runs the generation agent, and writes documents to the output directory

#### Scenario: Invalid outline file
- **WHEN** user runs `deeplens generate` with an invalid JSON file
- **THEN** the system displays validation errors and exits without generating

### Requirement: preview command
The system SHALL provide a `deeplens preview [docs-path]` command that starts a VitePress dev server. If `docs-path` is omitted, it SHALL look for `.deeplens/docs` in the current directory. The command SHALL accept a `--port <number>` flag and an `--open` flag.

#### Scenario: Preview existing docs
- **WHEN** user runs `deeplens preview` in a directory containing `.deeplens/docs/`
- **THEN** a VitePress dev server starts serving those docs

#### Scenario: No docs found
- **WHEN** user runs `deeplens preview` in a directory without `.deeplens/docs/`
- **THEN** the system prints an error message suggesting to run `deeplens analyze` first

### Requirement: Environment configuration
The system SHALL load configuration from a `.env` file (if present) and environment variables. Required configuration: `ANTHROPIC_API_KEY`. Optional configuration: `ANTHROPIC_BASE_URL` (default: Anthropic official endpoint). The system SHALL validate that required configuration is present before any Agent invocation and display a clear error message if missing.

#### Scenario: Missing API key
- **WHEN** user runs any Agent command without `ANTHROPIC_API_KEY` set
- **THEN** the system exits with a clear error: "ANTHROPIC_API_KEY is required. Set it in .env or as an environment variable."

#### Scenario: Custom API base URL
- **WHEN** `ANTHROPIC_BASE_URL` is set to a custom endpoint (e.g., a Coding Plan proxy)
- **THEN** the claude-agent-sdk uses that endpoint for all API calls

#### Scenario: .env file loading
- **WHEN** a `.env` file exists in the current directory or project root
- **THEN** its values are loaded as environment variables (lower priority than actual env vars)

### Requirement: Real-time progress display
The system SHALL display Agent activity in real-time during both exploration and generation phases. Tool calls SHALL be printed as they occur (e.g., `🔧 list_files("src/")`). Agent reasoning SHALL be displayed when available. Errors and retries SHALL be clearly indicated.

#### Scenario: Tool call logging
- **WHEN** the Agent calls `read_file("src/main.ts")` during exploration
- **THEN** the terminal shows `  🔧 read_file(src/main.ts)` in real-time

#### Scenario: Generation progress
- **WHEN** the Agent completes writing a hub document
- **THEN** the terminal shows `  📝 wrote domains/user-auth/index.md`

#### Scenario: Error with retry
- **WHEN** the Agent produces invalid JSON and the system retries
- **THEN** the terminal shows `  ⚠️ Invalid output, retrying (1/2)...`
