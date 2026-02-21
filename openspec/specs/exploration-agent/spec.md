## MODIFIED Requirements

### Requirement: JSON outline output
The Agent's final output SHALL be a valid JSON object conforming to the outline schema. The JSON SHALL include: `project_name`, `summary`, `detected_stack`, `overview` (with `architecture`, `tech_stack_roles`, `key_flows`, `project_structure`), `knowledge_graph` (array of domains with files and reasoning), and `ignored_files`. The system SHALL validate the output against the Zod schema and retry up to 2 times if validation fails.

#### Scenario: Valid JSON output with overview
- **WHEN** the exploration agent completes successfully
- **THEN** the output is a valid JSON object with all required fields including `overview` populated

#### Scenario: Overview contains architecture diagram
- **WHEN** the exploration agent analyzes a multi-module project
- **THEN** the `overview.architecture` field contains a text description with an embedded Mermaid diagram showing component relationships

#### Scenario: Overview tech stack roles are specific
- **WHEN** the exploration agent detects React, Express, and PostgreSQL
- **THEN** `overview.tech_stack_roles` contains entries like `{ name: "React", role: "Frontend UI rendering with component-based architecture" }` — not just technology names

#### Scenario: Agent produces invalid JSON
- **WHEN** the Agent's output fails Zod validation (e.g., missing overview field)
- **THEN** the system retries the query with the validation error appended to the prompt, up to 2 retries

#### Scenario: All retries exhausted
- **WHEN** the Agent fails to produce valid JSON after 2 retries
- **THEN** the system saves the raw output to a file and prompts the user to manually fix it
