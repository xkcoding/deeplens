## ADDED Requirements

### Requirement: Display outline in CLI
The system SHALL render the Agent-generated outline as a formatted tree in the terminal. Each domain SHALL show its title, description, and file count. Sub-concepts SHALL be indented to show hierarchy. The display SHALL use color coding to improve readability (domain titles in bold/cyan, file paths in dim).

#### Scenario: Display a multi-domain outline
- **WHEN** the exploration agent produces an outline with 5 domains
- **THEN** the CLI prints a formatted tree showing all 5 domains with their descriptions and mapped file counts

#### Scenario: Display nested sub-concepts
- **WHEN** a domain contains sub_concepts
- **THEN** the sub-concepts are displayed as indented child nodes under the parent domain

### Requirement: User confirmation flow
The system SHALL prompt the user to confirm the outline before proceeding to generation. The user SHALL have the following options: (1) Accept the outline as-is, (2) Edit the outline JSON file manually, (3) Re-run exploration with a different strategy, (4) Abort. After manual editing, the system SHALL re-validate the JSON against the Zod schema.

#### Scenario: User accepts outline
- **WHEN** user selects "Accept"
- **THEN** the outline is saved to `.deeplens/outline.json` and the generation phase begins

#### Scenario: User chooses to edit
- **WHEN** user selects "Edit"
- **THEN** the system saves the outline to `.deeplens/outline.json`, opens it (prints the path), and waits for user to press Enter after editing

#### Scenario: Edited outline fails validation
- **WHEN** user edits the outline JSON and the result fails Zod validation
- **THEN** the system displays the validation errors and prompts the user to fix them

#### Scenario: User aborts
- **WHEN** user selects "Abort"
- **THEN** the system exits without generating documents, preserving the outline file for later use

### Requirement: Outline persistence
The confirmed outline SHALL be saved to `.deeplens/outline.json` in the output directory. This file SHALL be reusable — the `deeplens generate` command SHALL accept this file as input to skip the exploration phase entirely.

#### Scenario: Outline saved for reuse
- **WHEN** the outline is confirmed
- **THEN** it is written to `.deeplens/outline.json` with proper JSON formatting

#### Scenario: Generate from existing outline
- **WHEN** user runs `deeplens generate .deeplens/outline.json`
- **THEN** the system skips exploration and proceeds directly to document generation using the saved outline
