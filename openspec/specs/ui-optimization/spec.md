## ADDED Requirements

### Requirement: Action buttons always visible with disabled state
The AppHeader SHALL always render the Preview, Vectorize, Update, and Export buttons regardless of analysis state. When analysis has not completed or is currently running, these buttons SHALL be disabled (greyed out) rather than hidden. This allows users to see available actions before analysis completes.

#### Scenario: Buttons visible before analysis
- **WHEN** the user opens a project that has not been analyzed
- **THEN** Preview, Vectorize, Update, and Export buttons are visible but disabled

#### Scenario: Buttons disabled during analysis
- **WHEN** analysis is running
- **THEN** all four action buttons are visible but disabled

#### Scenario: Buttons enabled after analysis
- **WHEN** analysis completes successfully
- **THEN** all four action buttons become enabled (subject to their individual constraints like OpenRouter configuration)

### Requirement: Analyze button phase-specific text
The Analyze button SHALL display phase-specific text during analysis instead of generic "Analyzing...". The text SHALL vary based on `progress.phase`:
- `"explore"` or no phase → "Exploring..."
- `"outline_review"` → "Review Outline..."
- `"generate"` → "Generating {current}/{total}..."
- `"overview"` → "Generating Overview..."
- `"summary"` → "Generating Summary..."

#### Scenario: Explore phase text
- **WHEN** analysis is in the explore phase
- **THEN** the button shows "Exploring..."

#### Scenario: Generate phase text with progress
- **WHEN** analysis is in the generate phase with current=3 and total=5
- **THEN** the button shows "Generating 3/5..."

#### Scenario: Overview phase text
- **WHEN** analysis is in the overview phase
- **THEN** the button shows "Generating Overview..."

#### Scenario: Summary phase text
- **WHEN** analysis is in the summary phase
- **THEN** the button shows "Generating Summary..."

### Requirement: Multi-phase progress tracking
The `generateProgress` state SHALL include a `phase` field alongside `current` and `total`. The progress tracking SHALL cover three phases: `"generate"` (domain documentation), `"overview"` (index.md synthesis), and `"summary"` (summary.md synthesis). The header progress bar SHALL display progress for all three phases, not just the generate phase.

#### Scenario: Generate phase progress
- **WHEN** the generate phase emits progress events
- **THEN** `generateProgress` contains `{ phase: "generate", current: N, total: M }`

#### Scenario: Overview phase progress
- **WHEN** the overview phase emits progress events
- **THEN** `generateProgress` contains `{ phase: "overview", current: 0, total: 1 }` then `{ phase: "overview", current: 1, total: 1 }`

#### Scenario: Summary phase progress
- **WHEN** the summary phase emits progress events
- **THEN** `generateProgress` contains `{ phase: "summary", current: 0, total: 1 }` then `{ phase: "summary", current: 1, total: 1 }`

#### Scenario: Progress bar visible during overview
- **WHEN** the overview phase is active
- **THEN** the header progress bar shows progress (0% → 100%)

### Requirement: Summary navigation item
The navigation sidebar SHALL include a "Summary" item at the bottom of the nav items list (after all domain items). The Summary nav item SHALL use the sentinel ID `__summary__`. The Summary item status SHALL transition from "pending" to "completed" when `summary.md` is written.

#### Scenario: Summary nav item appears
- **WHEN** an outline is confirmed
- **THEN** the nav items list contains Overview at top, domains in middle, and Summary at bottom

#### Scenario: Summary status updates on write
- **WHEN** a `doc_written` event with `path: "summary.md"` is received
- **THEN** the Summary nav item status changes to "completed"

#### Scenario: Summary content preview
- **WHEN** the user clicks the Summary nav item
- **THEN** the artifact panel shows the content of `summary.md`
