## ADDED Requirements

### Requirement: Translation agent execution
The system SHALL provide a `runTranslator()` function that translates all English documentation into Chinese. The function SHALL be invoked AFTER all English documents (Domains, Overview, Summary) have been generated. The function SHALL use Claude Agent SDK `query()` with a dedicated translation System Prompt. The function SHALL accept an `Outline` parameter, a `projectRoot` path, and optional `onEvent` callback and `domainFilter` parameters.

#### Scenario: Full translation after generation
- **WHEN** all English domain docs, overview, and summary have been generated
- **THEN** `runTranslator()` is called and produces Chinese translations for all documents under `/zh/`

#### Scenario: Filtered translation for incremental update
- **WHEN** `runTranslator()` is called with `domainFilter: ["authentication"]`
- **THEN** only `zh/domains/authentication/` documents are translated, other existing Chinese documents remain untouched

#### Scenario: Translation agent tools
- **WHEN** the translation agent executes
- **THEN** it has access to `read_file` (to read English source) and `write_file` (to write Chinese output) MCP tools only

### Requirement: Glossary extraction before translation
The translation agent's System Prompt SHALL instruct the agent to first scan all English documents and extract a glossary of technical terms with their Chinese translations before beginning any translation work. The glossary SHALL be maintained internally within the agent's reasoning context throughout the translation session.

#### Scenario: Glossary built from all English docs
- **WHEN** translation begins
- **THEN** the agent reads all English documents first and establishes a consistent term mapping before writing any Chinese files

#### Scenario: Cross-domain term consistency
- **WHEN** the term "Repository" appears in Domain A and Domain B
- **THEN** both Chinese translations use the same Chinese term (e.g., always "仓库", not sometimes "代码库")

### Requirement: Translation output structure
The translation agent SHALL write Chinese documents to paths mirroring the English structure under `/zh/`. For each English file at `en/<path>`, the corresponding Chinese file SHALL be written to `zh/<path>`.

#### Scenario: Domain document translation path
- **WHEN** English hub doc exists at `en/domains/auth/index.md`
- **THEN** Chinese translation is written to `zh/domains/auth/index.md`

#### Scenario: Overview translation path
- **WHEN** English overview exists at `en/index.md`
- **THEN** Chinese translation is written to `zh/index.md`

#### Scenario: Summary translation path
- **WHEN** English summary exists at `en/summary.md`
- **THEN** Chinese translation is written to `zh/summary.md`

### Requirement: Translation content rules
The translation agent SHALL follow these content rules when translating:

- **Preserve untranslated**: Mermaid diagram code blocks, inline code (backtick content), fenced code blocks, file paths, URLs, English technical proper nouns (may append Chinese annotation)
- **Translate**: All body text, headings (H1-H6), list item descriptions, descriptive text in tables
- **Cross-references**: Markdown links SHALL be updated to point to `/zh/` paths instead of `/en/` paths

#### Scenario: Mermaid diagrams preserved
- **WHEN** an English document contains a Mermaid code block
- **THEN** the Chinese translation contains the identical Mermaid code block without modification

#### Scenario: Inline code preserved
- **WHEN** English text contains `` `runGenerator()` ``
- **THEN** Chinese text preserves `` `runGenerator()` `` unchanged

#### Scenario: Cross-reference links updated
- **WHEN** English doc links to `[Auth Domain](/en/domains/auth/)`
- **THEN** Chinese doc links to `[认证领域](/zh/domains/auth/)`

### Requirement: Translation progress tracking
The translation agent SHALL emit progress events via the `onEvent` callback compatible with the existing SSE event system. Events SHALL use `phase: "translate"` to distinguish from generation phases.

#### Scenario: Translation progress per domain
- **WHEN** translating 5 domains
- **THEN** progress events are emitted: `{ phase: "translate", completed: 0, total: 5 }` through `{ phase: "translate", completed: 5, total: 5 }`

#### Scenario: Translation doc_written events
- **WHEN** a Chinese document is written
- **THEN** a `doc_written` event is emitted with the Chinese file path and content
