## ADDED Requirements

### Requirement: Visual outline tree display
The outline editor SHALL render the Agent-generated outline as an interactive tree component. Each domain SHALL be displayed as a top-level node with its title, description (truncated), and file count badge. Sub-concepts SHALL be displayed as nested child nodes. The tree SHALL use indentation and connector lines to show hierarchy.

#### Scenario: Render multi-domain outline
- **WHEN** the exploration agent produces an outline with 5 domains and 3 sub-concepts
- **THEN** the editor displays a tree with 5 top-level nodes and nested sub-concept nodes

### Requirement: Drag-and-drop reordering
The outline editor SHALL support drag-and-drop to reorder domains and move sub-concepts between domains. The system SHALL use `@dnd-kit/core` + `@dnd-kit/sortable` for the drag interaction. Drop targets SHALL be highlighted during drag. The resulting tree state SHALL be maintained in React state.

#### Scenario: Reorder domains
- **WHEN** the user drags domain "Auth" above domain "Payment"
- **THEN** the tree reorders to place "Auth" before "Payment"

#### Scenario: Move sub-concept between domains
- **WHEN** the user drags sub-concept "JWT Validation" from domain "Auth" to domain "Security"
- **THEN** "JWT Validation" appears as a child of "Security" and is removed from "Auth"

### Requirement: Inline node rename
The outline editor SHALL support inline renaming of domain and sub-concept titles. Double-clicking a node title SHALL activate an inline text input. Pressing Enter or clicking outside SHALL confirm the rename. Pressing Escape SHALL cancel.

#### Scenario: Rename domain
- **WHEN** the user double-clicks the title "user-authentication"
- **THEN** the title becomes an editable text input pre-filled with "user-authentication"

#### Scenario: Confirm rename
- **WHEN** the user types "auth-module" and presses Enter
- **THEN** the node title updates to "auth-module" and the `id` field updates to the kebab-case version

#### Scenario: Cancel rename
- **WHEN** the user presses Escape during inline editing
- **THEN** the title reverts to its original value

### Requirement: Node context menu
The outline editor SHALL provide a right-click context menu on each node with actions: "Rename", "Delete", "Add Sub-Concept" (for domain nodes), and "View Files" (shows mapped source files). Deleting a domain SHALL prompt for confirmation.

#### Scenario: Delete domain with confirmation
- **WHEN** the user right-clicks a domain and selects "Delete"
- **THEN** a confirmation dialog appears: "Delete domain 'Auth' and its 3 sub-concepts?"

#### Scenario: Add sub-concept
- **WHEN** the user right-clicks a domain and selects "Add Sub-Concept"
- **THEN** a new child node is added with a default title "New Concept" in inline edit mode

#### Scenario: View mapped files
- **WHEN** the user selects "View Files" from the context menu
- **THEN** a popover displays the list of source files mapped to this domain with their roles

### Requirement: Outline confirmation actions
The outline editor SHALL display a bottom action bar with three buttons: "Confirm" (locks the outline as Knowledge Skeleton), "Re-explore" (triggers a new exploration), and "Export JSON" (downloads the outline as a JSON file). "Confirm" SHALL send the edited outline to `POST /api/outline/confirm`. "Re-explore" SHALL send `POST /api/explore` to re-run exploration.

#### Scenario: Confirm outline
- **WHEN** the user clicks "Confirm"
- **THEN** the system sends the current tree state as JSON to `POST /api/outline/confirm` and the pipeline continues to generation

#### Scenario: Re-explore
- **WHEN** the user clicks "Re-explore"
- **THEN** the system triggers `POST /api/explore` and the outline editor resets to show the new exploration results

#### Scenario: Export JSON
- **WHEN** the user clicks "Export JSON"
- **THEN** the browser downloads a `outline.json` file containing the current outline state

### Requirement: Outline editor activation
The outline editor SHALL replace the Artifact panel (right panel) when the pipeline enters the `waiting` state (after `outline_ready` event). After the user confirms the outline, the Artifact panel SHALL switch back to VitePress preview mode.

#### Scenario: Editor appears after exploration
- **WHEN** the SSE stream emits `outline_ready` followed by `waiting`
- **THEN** the Artifact panel switches from empty/loading state to the outline editor view

#### Scenario: Editor dismissed after confirmation
- **WHEN** the user confirms the outline
- **THEN** the Artifact panel transitions to VitePress preview mode (iframe)

### Requirement: Outline Zod validation feedback
Before sending the confirmed outline, the editor SHALL validate the tree state against the outline Zod schema (client-side). If validation fails, the editor SHALL highlight invalid nodes with red borders and display error tooltips.

#### Scenario: Validation error on empty domain
- **WHEN** the user deletes all files from a domain and clicks "Confirm"
- **THEN** the domain node shows a red border with tooltip "Domain must have at least one file"
