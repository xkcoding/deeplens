## MODIFIED Requirements

### Requirement: Incremental update CLI command
The system SHALL provide a `deeplens update [project-path]` command that triggers an incremental analysis based on git diff. The command SHALL accept an optional `--full` flag to force full re-analysis. If `project-path` is omitted, the current directory SHALL be used. The command SHALL display an impact summary (affected domains) before proceeding with regeneration. After regeneration, the command SHALL invoke the translation agent for affected domains.

#### Scenario: Incremental update
- **WHEN** user runs `deeplens update ./my-project`
- **THEN** the system detects changed files via git diff, shows impact summary, regenerates affected domains, and translates affected domains

#### Scenario: Full re-analysis
- **WHEN** user runs `deeplens update ./my-project --full`
- **THEN** the system ignores the last analyzed commit and runs the full explore → generate → translate → index pipeline

#### Scenario: No changes detected
- **WHEN** user runs `deeplens update ./my-project` and HEAD equals last analyzed commit
- **THEN** the system reports "No changes detected since last analysis" and exits

## ADDED Requirements

### Requirement: Six-step CLI progress display
The `deeplens analyze` command SHALL display progress using 6 sequential steps matching the desktop UI stages:

| Step | Display |
|------|---------|
| 1 | `[1/6] Running exploration agent...` |
| 2 | `[2/6] Outline review` |
| 3 | `[3/6] Generating documentation...` |
| 4 | `[4/6] Generating overview...` |
| 5 | `[5/6] Generating summary...` |
| 6 | `[6/6] Translating documentation...` |

#### Scenario: All six steps displayed
- **WHEN** user runs `deeplens analyze ./my-project` and completes the full pipeline
- **THEN** the CLI outputs all 6 steps in order with correct numbering `[1/6]` through `[6/6]`

#### Scenario: Translation step shows progress
- **WHEN** step 6 (Translate) is running with 3 out of 5 domains translated
- **THEN** the CLI displays domain-level progress similar to the generation step

### Requirement: Translation stage in analyze command
The `deeplens analyze` command SHALL invoke `runTranslator()` after the summary generator completes and before VitePress scaffolding. The translation stage SHALL translate all English documents into Chinese.

#### Scenario: Translation runs after summary
- **WHEN** the summary generator completes `en/summary.md`
- **THEN** the CLI proceeds to `[6/6] Translating documentation...` and invokes `runTranslator()`

#### Scenario: VitePress scaffolding after translation
- **WHEN** translation completes
- **THEN** VitePress scaffolding runs with i18n configuration, generating sidebars for both `en` and `zh` locales
