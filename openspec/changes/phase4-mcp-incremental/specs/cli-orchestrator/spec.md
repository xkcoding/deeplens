## ADDED Requirements

### Requirement: MCP Server CLI command
The system SHALL provide a `deeplens mcp-server` command that starts the MCP Server process in stdio transport mode. The command SHALL accept a `--sidecar-port <number>` option specifying the Sidecar HTTP port to connect to (default: 54321). The command SHALL read `DEEPLENS_SIDECAR_PORT` environment variable as an alternative to the CLI flag. The process SHALL communicate via stdin/stdout using the MCP JSON-RPC protocol and SHALL NOT produce any non-protocol output on stdout.

#### Scenario: Start MCP Server with default port
- **WHEN** user runs `deeplens mcp-server`
- **THEN** the MCP Server starts in stdio mode, connecting to Sidecar at `http://localhost:54321`

#### Scenario: Start MCP Server with custom port
- **WHEN** user runs `deeplens mcp-server --sidecar-port 54322`
- **THEN** the MCP Server starts in stdio mode, connecting to Sidecar at `http://localhost:54322`

#### Scenario: Start MCP Server with environment variable
- **WHEN** `DEEPLENS_SIDECAR_PORT=54322` is set and user runs `deeplens mcp-server`
- **THEN** the MCP Server connects to Sidecar at `http://localhost:54322`

#### Scenario: CLI flag overrides environment variable
- **WHEN** `DEEPLENS_SIDECAR_PORT=54322` is set and user runs `deeplens mcp-server --sidecar-port 54323`
- **THEN** the MCP Server connects to Sidecar at `http://localhost:54323` (CLI flag wins)

### Requirement: Incremental update CLI command
The system SHALL provide a `deeplens update [project-path]` command that triggers an incremental analysis based on git diff. The command SHALL accept an optional `--full` flag to force full re-analysis. If `project-path` is omitted, the current directory SHALL be used. The command SHALL display an impact summary (affected domains) before proceeding with regeneration.

#### Scenario: Incremental update
- **WHEN** user runs `deeplens update ./my-project`
- **THEN** the system detects changed files via git diff, shows impact summary, and regenerates affected domains

#### Scenario: Full re-analysis
- **WHEN** user runs `deeplens update ./my-project --full`
- **THEN** the system ignores the last analyzed commit and runs the full explore → generate → index pipeline

#### Scenario: No changes detected
- **WHEN** user runs `deeplens update ./my-project` and HEAD equals last analyzed commit
- **THEN** the system reports "No changes detected since last analysis" and exits

### Requirement: Static export CLI command
The system SHALL provide a `deeplens export [project-path]` command that builds the VitePress documentation into a static HTML site. The command SHALL accept `--output <directory>` to specify a custom output location (default: `<project>/.deeplens/docs/.vitepress/dist/`). If `project-path` is omitted, the current directory SHALL be used.

#### Scenario: Export to default location
- **WHEN** user runs `deeplens export ./my-project`
- **THEN** the system runs `vitepress build` and outputs static files to `./my-project/.deeplens/docs/.vitepress/dist/`

#### Scenario: Export to custom directory
- **WHEN** user runs `deeplens export ./my-project --output /tmp/docs`
- **THEN** the static site is built and the dist contents are copied to `/tmp/docs`

#### Scenario: Export without prior analysis
- **WHEN** user runs `deeplens export ./my-project` but no docs exist at `./my-project/.deeplens/docs/`
- **THEN** the system exits with error: "No generated docs found. Run analysis first."
