## ADDED Requirements

### Requirement: list_files tool
The system SHALL provide a `list_files` MCP tool that returns the directory structure of a specified path. The tool SHALL accept a `path` parameter (relative to project root) and an optional `depth` parameter (default 2, max 5). The tool SHALL exclude common non-source directories (`.git`, `node_modules`, `__pycache__`, `dist`, `build`, `.next`, `target`, `vendor`). The output SHALL be a tree-formatted string showing directories and files.

#### Scenario: List project root with default depth
- **WHEN** Agent calls `list_files` with `path: "."` and no depth specified
- **THEN** the tool returns a tree of directories and files up to 2 levels deep, excluding `.git` and `node_modules`

#### Scenario: List specific subdirectory with custom depth
- **WHEN** Agent calls `list_files` with `path: "src/services"` and `depth: 1`
- **THEN** the tool returns only the immediate children of `src/services/`

#### Scenario: Path does not exist
- **WHEN** Agent calls `list_files` with a non-existent path
- **THEN** the tool returns an error message indicating the path was not found

### Requirement: read_file tool
The system SHALL provide a `read_file` MCP tool that returns the full content of a specified file. The tool SHALL accept a `path` parameter (relative to project root). The tool SHALL refuse to read binary files and files larger than 1MB, returning an error message instead.

#### Scenario: Read a source file
- **WHEN** Agent calls `read_file` with `path: "src/index.ts"`
- **THEN** the tool returns the complete file content as text

#### Scenario: Read a binary file
- **WHEN** Agent calls `read_file` with a path pointing to a binary file (e.g., `.png`, `.jar`)
- **THEN** the tool returns an error message indicating binary files are not supported

#### Scenario: File exceeds size limit
- **WHEN** Agent calls `read_file` with a file larger than 1MB
- **THEN** the tool returns an error message suggesting to use `read_file_snippet` instead

### Requirement: read_file_snippet tool
The system SHALL provide a `read_file_snippet` MCP tool that returns a portion of a file's content. The tool SHALL accept `path`, optional `start_line` (default 1), and optional `max_lines` (default 200) parameters. This tool is designed for large files where reading the full content would waste tokens.

#### Scenario: Read first 200 lines of a large file
- **WHEN** Agent calls `read_file_snippet` with `path: "src/services/OrderService.ts"` and no other params
- **THEN** the tool returns the first 200 lines of the file, with a note indicating total line count

#### Scenario: Read specific line range
- **WHEN** Agent calls `read_file_snippet` with `path: "src/main.py"`, `start_line: 50`, `max_lines: 100`
- **THEN** the tool returns lines 50 through 149 of the file

### Requirement: grep_search tool
The system SHALL provide a `grep_search` MCP tool that searches for a text pattern across the project. The tool SHALL accept a `query` parameter (string or regex pattern) and an optional `path` parameter to limit search scope. The tool SHALL exclude non-source directories and binary files. The tool SHALL return matching file paths with line numbers and surrounding context (2 lines before and after).

#### Scenario: Search for a class definition
- **WHEN** Agent calls `grep_search` with `query: "class OrderService"`
- **THEN** the tool returns all files containing this pattern, with line numbers and context

#### Scenario: Search within a specific directory
- **WHEN** Agent calls `grep_search` with `query: "authenticate"` and `path: "src/auth/"`
- **THEN** the tool returns matches only within the `src/auth/` directory

#### Scenario: No matches found
- **WHEN** Agent calls `grep_search` with a pattern that matches no files
- **THEN** the tool returns a message indicating no matches were found

### Requirement: write_file tool
The system SHALL provide a `write_file` MCP tool that writes content to a file within the output directory. The tool SHALL accept `path` (relative to the output directory) and `content` parameters. The tool SHALL create parent directories as needed. The tool SHALL ONLY allow writing to the designated output directory (`.deeplens/docs/`), refusing writes to any other location.

#### Scenario: Write a Markdown document
- **WHEN** Agent calls `write_file` with `path: "domains/user-auth/index.md"` and content
- **THEN** the tool creates the file at `.deeplens/docs/domains/user-auth/index.md`, creating directories as needed

#### Scenario: Attempt to write outside output directory
- **WHEN** Agent calls `write_file` with a path containing `../` or an absolute path
- **THEN** the tool rejects the write and returns a security error

### Requirement: Tools registered as MCP server
All tools SHALL be registered under a single MCP server named `deeplens` using `createSdkMcpServer()`. Tool names SHALL follow the `mcp__deeplens__<tool_name>` convention. Each tool SHALL use Zod schemas for input validation.

#### Scenario: Agent discovers available tools
- **WHEN** Agent session starts with the `deeplens` MCP server configured
- **THEN** all 5 tools are available under the `mcp__deeplens__` namespace

#### Scenario: Invalid tool input
- **WHEN** Agent calls any tool with parameters that fail Zod validation
- **THEN** the tool returns a validation error with details about the invalid fields
