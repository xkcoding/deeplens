## ADDED Requirements

### Requirement: MCP Server process
The system SHALL provide a standalone MCP Server process at `src/mcp/server.ts` using `@modelcontextprotocol/sdk`. The server SHALL use `StdioServerTransport` for communication with external IDE Agents (Cursor, Windsurf, Claude Code). The server SHALL read `DEEPLENS_SIDECAR_PORT` environment variable to determine the Sidecar HTTP endpoint, and `DEEPLENS_PROJECT_PATH` for the active project path.

#### Scenario: Start MCP Server via stdio
- **WHEN** an IDE spawns the MCP Server process with `DEEPLENS_SIDECAR_PORT=54321` and `DEEPLENS_PROJECT_PATH=/my/project`
- **THEN** the MCP Server connects via stdio and responds to `tools/list` with 4 available tools

#### Scenario: Sidecar not running
- **WHEN** the MCP Server attempts to call a tool but the Sidecar HTTP endpoint is unreachable
- **THEN** the tool returns an error: "DeepLens sidecar is not running. Please start the DeepLens application first."

### Requirement: get_architecture_map tool
The `get_architecture_map` tool SHALL accept no parameters and return the project's knowledge outline as structured text. The tool SHALL call `GET /api/outline?projectPath=<path>` on the Sidecar and format the response as a readable architecture summary including: project name, summary, detected stack, and domain listing with descriptions.

#### Scenario: Retrieve architecture map
- **WHEN** an IDE Agent calls `get_architecture_map` and the project has a completed outline
- **THEN** the tool returns a structured text summary listing all domains, their descriptions, and sub-concepts

#### Scenario: No outline available
- **WHEN** an IDE Agent calls `get_architecture_map` but no outline exists for the project
- **THEN** the tool returns an error: "No architecture map available. Run analysis in DeepLens first."

### Requirement: consult_knowledge_base tool
The `consult_knowledge_base` tool SHALL accept `query` (required string) and `domain_filter` (optional string) parameters. The tool SHALL call `POST /api/search` on the Sidecar with `{ query, domain_filter }`, consume the entire SSE stream, and return the assembled answer text with source citations.

#### Scenario: Knowledge base query
- **WHEN** an IDE Agent calls `consult_knowledge_base` with query "How does authentication work?"
- **THEN** the tool consumes the Fast Search SSE stream and returns the full answer text with source file paths

#### Scenario: Knowledge base query with domain filter
- **WHEN** an IDE Agent calls `consult_knowledge_base` with query "token validation" and domain_filter "auth"
- **THEN** the search is scoped to the "auth" domain and only matching results are returned

### Requirement: investigate_implementation tool
The `investigate_implementation` tool SHALL accept `question` (required string) and `target_files` (optional string array) parameters. The tool SHALL call `POST /api/investigate` on the Sidecar, consume the entire SSE stream (including reasoning and tool call events), and return the final answer text with source citations.

#### Scenario: Deep investigation
- **WHEN** an IDE Agent calls `investigate_implementation` with question "How does the rate limiter handle burst traffic?"
- **THEN** the tool runs the Deep Search agent loop and returns a comprehensive answer with code references

#### Scenario: Investigation with target files
- **WHEN** an IDE Agent calls `investigate_implementation` with target_files `["src/middleware/rate-limiter.ts"]`
- **THEN** the Deep Search prioritizes reading the specified files during its investigation

### Requirement: visualize_data_flow tool
The `visualize_data_flow` tool SHALL accept `scenario` (required string) and `detail_level` (optional enum: "high_level" | "detailed", default: "high_level") parameters. The tool SHALL call `POST /api/visualize` on the Sidecar and return a Mermaid diagram representing the data flow for the described scenario.

#### Scenario: Generate data flow diagram
- **WHEN** an IDE Agent calls `visualize_data_flow` with scenario "user login flow"
- **THEN** the tool returns a Mermaid sequence diagram or flowchart showing the login data flow

#### Scenario: Detailed data flow
- **WHEN** an IDE Agent calls `visualize_data_flow` with detail_level "detailed"
- **THEN** the returned Mermaid diagram includes internal function calls and data transformations

### Requirement: CLI command for MCP Server
The system SHALL provide a `deeplens mcp-server` CLI command that starts the MCP Server process. The command SHALL accept `--port <number>` to specify the Sidecar port to connect to and `--project <path>` to specify the project path.

#### Scenario: Start MCP Server from CLI
- **WHEN** user runs `deeplens mcp-server --port 54321 --project /my/project`
- **THEN** the MCP Server starts and communicates via stdio, calling the Sidecar on port 54321
