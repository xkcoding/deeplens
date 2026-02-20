## ADDED Requirements

### Requirement: MCP Server port configuration
The "General" tab in the Settings dialog SHALL add a new field:
- **MCP Server Port** (number input): Default `3100`. The port that the MCP Server uses to connect to the Sidecar HTTP API.

The field SHALL include a helper text: "Port for MCP Server to reach the Sidecar API. Used by external IDE agents (Cursor, Windsurf)."

Port changes SHALL require application restart and display a notice consistent with existing port change behavior.

#### Scenario: Configure MCP Server port
- **WHEN** the user sets the MCP Server port to `3100` in Settings
- **THEN** the value is persisted as `general.mcp_port` in the config store

#### Scenario: MCP port persistence
- **WHEN** the user sets the MCP port and restarts the application
- **THEN** the Tauri shell passes the configured port as `DEEPLENS_SIDECAR_PORT` environment variable when spawning the MCP Server process

#### Scenario: MCP port change notice
- **WHEN** the user changes the MCP Server port
- **THEN** a notice appears: "Port changes require application restart"
