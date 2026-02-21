## ADDED Requirements

### Requirement: Incremental update trigger
The system SHALL provide a `deeplens update [project-path]` CLI command and a `POST /api/update` Sidecar endpoint that triggers an incremental analysis. Both interfaces SHALL accept an optional `--full` / `{ "full": true }` flag to force a full re-analysis instead of incremental.

#### Scenario: Trigger incremental update via CLI
- **WHEN** user runs `deeplens update ./my-project`
- **THEN** the system performs a git diff-based incremental analysis on the project

#### Scenario: Trigger incremental update via API
- **WHEN** the frontend calls `POST /api/update` with `{ "projectPath": "/my/project" }`
- **THEN** the endpoint returns an SSE stream with progress events for the incremental update

#### Scenario: Force full re-analysis
- **WHEN** user runs `deeplens update ./my-project --full`
- **THEN** the system ignores the last analyzed commit and re-runs the full explore → generate → index pipeline

### Requirement: Git diff analysis
The system SHALL read the last analyzed commit SHA from `<project>/.deeplens/last_analyzed_commit`. It SHALL execute `git diff --name-only <last_commit>..HEAD` to identify changed files. If `last_analyzed_commit` does not exist, the system SHALL fall back to full re-analysis.

#### Scenario: Detect changed files
- **WHEN** 3 files have been modified since the last analysis
- **THEN** the system identifies the 3 changed file paths

#### Scenario: No previous analysis
- **WHEN** `<project>/.deeplens/last_analyzed_commit` does not exist
- **THEN** the system falls back to full pipeline (explore → outline → generate → index)

#### Scenario: No changes detected
- **WHEN** `git diff --name-only` returns empty (HEAD equals last analyzed commit)
- **THEN** the system reports "No changes detected since last analysis" and exits without reprocessing

### Requirement: Impact tracing
The system SHALL load the existing outline from `<project>/.deeplens/outline.json` and match changed files against each domain's `files` array. A domain is considered "affected" if any of its associated files appear in the changed files list. The system SHALL output an impact summary listing affected domains before proceeding with regeneration.

#### Scenario: Trace impact to domains
- **WHEN** `src/auth/middleware.ts` has changed and the outline maps it to the "authentication" domain
- **THEN** the "authentication" domain is marked as affected

#### Scenario: File not in any domain
- **WHEN** a changed file (e.g., `.eslintrc.js`) is not mapped to any domain in the outline
- **THEN** the file is listed as "untracked change" and no domain is affected by it

#### Scenario: Impact summary display
- **WHEN** 2 out of 6 domains are affected by changes
- **THEN** the system displays: "2 domains affected: authentication, data-access. 4 domains unchanged."

### Requirement: Selective regeneration
The system SHALL invoke the Generator Agent for only the affected domains, passing a `domainFilter` parameter. The Generator Agent SHALL read the latest source code for affected domains and regenerate their Hub and Spoke documents, overwriting the previous versions in `<project>/.deeplens/docs/domains/<domain-id>/`.

#### Scenario: Regenerate single domain
- **WHEN** only the "authentication" domain is affected
- **THEN** the system calls `runGenerator` with `domainFilter: ["authentication"]` and only `domains/authentication/*.md` files are regenerated

#### Scenario: Regenerate multiple domains
- **WHEN** domains "authentication" and "data-access" are affected
- **THEN** both domains' docs are regenerated while all other domains' docs remain untouched

### Requirement: Index update
After regeneration, the system SHALL delete old vector chunks for affected source paths using `VectorStore.deleteBySource()` and re-index the regenerated documents. The system SHALL then update `<project>/.deeplens/last_analyzed_commit` to the current HEAD commit SHA.

#### Scenario: Reindex after regeneration
- **WHEN** the "authentication" domain docs have been regenerated
- **THEN** old chunks for `domains/authentication/*.md` are deleted and new chunks are inserted into the vector store

#### Scenario: Commit SHA updated
- **WHEN** incremental update completes successfully
- **THEN** `<project>/.deeplens/last_analyzed_commit` contains the current HEAD commit SHA
