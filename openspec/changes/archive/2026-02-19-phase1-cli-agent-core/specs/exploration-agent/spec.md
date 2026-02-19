## ADDED Requirements

### Requirement: Autonomous code exploration
The system SHALL invoke `query()` from claude-agent-sdk with the "Code Archaeologist" system prompt, project path context, and the `deeplens` MCP tools. The Agent SHALL autonomously explore the codebase by calling tools (list_files, read_file, grep_search) without user intervention. The system SHALL disable all built-in tools (`tools: []`) and only provide custom MCP tools.

#### Scenario: Agent explores a Node.js project
- **WHEN** the exploration agent is invoked with a path to a Node.js project
- **THEN** the Agent autonomously reads README.md, package.json, and key source files to understand the project structure

#### Scenario: Agent explores a project without README
- **WHEN** the exploration agent is invoked with a project that has no README.md
- **THEN** the Agent falls back to reading package.json/pom.xml/go.mod and scanning directory structure

### Requirement: Business domain identification
The Agent SHALL identify 3-8 core business domains by analyzing code semantics, NOT following file directory structure. Domains SHALL be named using the project's "Ubiquitous Language" (e.g., if code says `Shipment`, the domain must not be renamed to `Logistics`). The Agent SHALL group source files by logical business concept, allowing a single file to belong to multiple domains.

#### Scenario: Cross-cutting file assignment
- **WHEN** a file like `UserOrderRelation.ts` relates to both "User Management" and "Order Processing"
- **THEN** the Agent assigns it to both domains with appropriate role descriptions

#### Scenario: Infrastructure vs business separation
- **WHEN** the codebase contains both business logic (`OrderService`) and infrastructure (`DatabaseConfig`)
- **THEN** the Agent separates them into distinct domains (e.g., "Order Processing" vs "Infrastructure: Database")

### Requirement: Noise filtering
The Agent SHALL identify and ignore non-essential files including: build configs (webpack, babel, vite configs), lint configs (eslint, prettier), CI/CD configs, lock files, test setup/fixtures, and generic boilerplate. Each ignored file SHALL include a reason for exclusion.

#### Scenario: Standard config files are filtered
- **WHEN** the project contains `.eslintrc.js`, `babel.config.js`, `jest.config.ts`
- **THEN** these files appear in the `ignored_files` list with reasons like "build configuration" or "test setup"

#### Scenario: Config with business logic is retained
- **WHEN** a config file contains meaningful business rules (e.g., custom webpack plugin with business logic)
- **THEN** the Agent includes it in the relevant domain rather than ignoring it

### Requirement: JSON outline output
The Agent's final output SHALL be a valid JSON object conforming to the outline schema. The JSON SHALL include: `project_name`, `summary`, `detected_stack`, `knowledge_graph` (array of domains with files and reasoning), and `ignored_files`. The system SHALL validate the output against the Zod schema and retry up to 2 times if validation fails.

#### Scenario: Valid JSON output
- **WHEN** the exploration agent completes successfully
- **THEN** the output is a valid JSON object with all required fields populated

#### Scenario: Agent produces invalid JSON
- **WHEN** the Agent's output fails Zod validation (e.g., missing required field)
- **THEN** the system retries the query with the validation error appended to the prompt, up to 2 retries

#### Scenario: All retries exhausted
- **WHEN** the Agent fails to produce valid JSON after 2 retries
- **THEN** the system saves the raw output to a file and prompts the user to manually fix it

### Requirement: Sampling strategy for token efficiency
The exploration Agent SHALL follow a "Survey → Anchor → Probe → Synthesize" strategy. It SHALL NOT read every file. It SHALL survey the directory structure first, anchor on key files (README, package manifests, entry points), probe 3-8 representative files, then synthesize findings. The `maxTurns` option SHALL be set to limit Agent loop iterations (default: 20).

#### Scenario: Agent respects maxTurns limit
- **WHEN** `maxTurns` is set to 20
- **THEN** the Agent completes exploration within 20 tool call rounds

#### Scenario: Agent prioritizes high-signal files
- **WHEN** exploring a Spring Boot project
- **THEN** the Agent reads `pom.xml`, `Application.java`, and key `@RestController` files before general source files
