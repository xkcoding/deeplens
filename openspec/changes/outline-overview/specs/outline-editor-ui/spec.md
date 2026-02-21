## ADDED Requirements

### Requirement: Overview section in outline editor
The outline editor SHALL render an overview section above the domain tree when the outline contains an `overview` field. The overview section SHALL display: a header labeled "Overview" with a distinct icon (e.g., Globe or BookOpen), editable fields for `architecture`, `tech_stack_roles`, `key_flows`, and `project_structure`. The overview section SHALL have a visually distinct background (e.g., subtle primary tint) to separate it from domain nodes.

#### Scenario: Overview section renders above domains
- **WHEN** the outline editor loads an outline with overview data and 5 domains
- **THEN** the overview section appears at the top, followed by the 5 domain nodes

#### Scenario: Overview not shown for legacy outlines
- **WHEN** the outline editor loads an outline without an overview field (backward compatibility)
- **THEN** the editor renders only the domain tree without an overview section

### Requirement: Summary section in outline editor
The outline editor SHALL render a summary section below the domain tree. The summary section SHALL display: a header labeled "Summary" with a FileText icon, a note indicating "Auto-generated after overview". The summary section SHALL have a neutral visual style (neutral border, subtle background) to distinguish it from domains and the overview.

#### Scenario: Summary section renders below domains
- **WHEN** the outline editor loads an outline with 5 domains
- **THEN** the summary section appears below all domain nodes

#### Scenario: Summary section not sortable
- **WHEN** the user drags domain nodes
- **THEN** the summary section remains fixed at the bottom and cannot be reordered

### Requirement: Overview and Summary drag exclusion
The overview section SHALL NOT have a drag handle and SHALL NOT participate in drag-and-drop interactions. The summary section SHALL NOT have a drag handle and SHALL NOT participate in drag-and-drop interactions. Domain nodes SHALL only be reorderable among themselves, between the overview and summary sections. Drop operations SHALL NOT allow domains to be placed above the overview or below the summary.

#### Scenario: Overview has no drag handle
- **WHEN** the outline editor renders with overview, domains, and summary
- **THEN** the overview section has no drag handle icon; domain nodes retain their drag handles

#### Scenario: Summary has no drag handle
- **WHEN** the outline editor renders with overview, domains, and summary
- **THEN** the summary section has no drag handle icon

#### Scenario: Cannot drag domain above overview or below summary
- **WHEN** the user attempts to drag a domain to the position above the overview or below the summary
- **THEN** the drop is rejected and the domain returns to its original position

### Requirement: Overview inline editing
The overview fields SHALL be editable inline within the outline editor. `architecture` and `project_structure` SHALL use expandable text areas. `tech_stack_roles` SHALL display as an editable list of name-role pairs with add/remove controls. `key_flows` SHALL display as an editable list of name-description pairs with add/remove controls. Changes SHALL update the outline state in real-time.

#### Scenario: Edit architecture text
- **WHEN** the user clicks the architecture field in the overview section
- **THEN** an inline text area expands, showing the full architecture text including any Mermaid blocks

#### Scenario: Add tech stack entry
- **WHEN** the user clicks "Add" on the tech_stack_roles list
- **THEN** a new empty row appears with name and role input fields

#### Scenario: Remove key flow entry
- **WHEN** the user clicks the remove button on a key flow entry
- **THEN** the entry is removed from the key_flows list and the outline state updates
