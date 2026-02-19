## ADDED Requirements

### Requirement: Markdown document chunker
The system SHALL provide a Markdown chunker that splits `.md` files into semantically coherent chunks. The chunker SHALL split by H1/H2/H3 headers first, producing one chunk per section. If a section exceeds the maximum chunk size (1024 tokens), the chunker SHALL recursively split by paragraph (`\n\n`) then by line (`\n`). Fenced code blocks (``` delimiters) SHALL never be split mid-block. Each chunk SHALL carry metadata: `source_path`, `source_type: "doc"`, `header_path` (e.g., "## Auth > ### Login Flow"), `start_line`, and `end_line`.

#### Scenario: Split a well-structured Markdown file
- **WHEN** the chunker processes a Markdown file with H2 and H3 sections each under 1024 tokens
- **THEN** each section becomes exactly one chunk, and each chunk's `header_path` reflects the heading hierarchy

#### Scenario: Split an oversized section
- **WHEN** a single H2 section exceeds 1024 tokens
- **THEN** the chunker recursively splits by `\n\n` first, then by `\n`, producing chunks that are each ≤1024 tokens
- **AND** adjacent chunks overlap by approximately 50 tokens

#### Scenario: Preserve fenced code blocks
- **WHEN** a section contains a fenced code block (``` ... ```) that spans multiple paragraphs
- **THEN** the code block is kept intact within a single chunk, even if this causes the chunk to slightly exceed the target size of 512 tokens

#### Scenario: Process a file with no headings
- **WHEN** the chunker processes a Markdown file with no H1/H2/H3 headers
- **THEN** the entire file content is treated as a single section and split only if it exceeds the maximum chunk size

### Requirement: Source code chunker
The system SHALL provide a source code chunker that splits code files into logical chunks. The chunker SHALL split by blank-line-separated blocks (approximating function/class boundaries). Each chunk SHALL carry metadata: `source_path`, `source_type: "code"`, `start_line`, and `end_line`. The `header_path` for code chunks SHALL be `null`.

#### Scenario: Split a TypeScript file
- **WHEN** the chunker processes a `.ts` file with multiple functions separated by blank lines
- **THEN** each function block becomes a separate chunk with correct `start_line` and `end_line`

#### Scenario: Small file under chunk size
- **WHEN** the chunker processes a code file under 512 tokens
- **THEN** the entire file is returned as a single chunk

### Requirement: SiliconFlow Embedding client
The system SHALL provide an Embedding client that calls the SiliconFlow Embedding API to convert text chunks into vectors. The client SHALL use the model specified by `SILICONFLOW_EMBED_MODEL` (default `Qwen/Qwen3-Embedding-8B`). The client SHALL return 2048-dimensional float vectors (configurable via the model's dimension parameter). The client SHALL support batch embedding of multiple chunks in a single API call (up to 20 chunks per batch). The client SHALL apply an instruction prefix to query embeddings (`"Instruct: Given a user question about a software project, retrieve the relevant documentation or code.\nQuery: {text}"`) while document embeddings use raw text without prefix.

#### Scenario: Embed a document chunk (no prefix)
- **WHEN** the client receives one text chunk with `mode: "document"`
- **THEN** it calls the SiliconFlow API with the raw text and returns a 2048-dimensional float array

#### Scenario: Embed a query (with instruction prefix)
- **WHEN** the client receives a query string with `mode: "query"`
- **THEN** it prepends the instruction prefix before calling the API, returning a 2048-dimensional float array

#### Scenario: Batch embed multiple chunks
- **WHEN** the client receives 50 text chunks
- **THEN** it splits them into batches of 20 and calls the API 3 times, returning 50 vectors in order

#### Scenario: API error with retry
- **WHEN** the SiliconFlow API returns a transient error (HTTP 429 or 5xx)
- **THEN** the client retries up to 3 times with exponential backoff (1s, 2s, 4s) before failing

#### Scenario: API key not configured
- **WHEN** `SILICONFLOW_API_KEY` is not set
- **THEN** the client throws a descriptive error indicating the key is required

### Requirement: Index orchestrator
The system SHALL provide an index orchestrator that coordinates the full indexing pipeline: scan files → chunk → embed → store. The orchestrator SHALL scan the `.deeplens/docs/` directory for Markdown files and optionally scan source code files from the project root. The orchestrator SHALL use the `index_status` table to skip files whose SHA-256 hash has not changed since last indexing. The orchestrator SHALL display a progress indicator during indexing.

#### Scenario: Index a project for the first time
- **WHEN** the user runs `deeplens index <project-path>` on a project with no existing index
- **THEN** all Markdown files under `.deeplens/docs/` are chunked, embedded, and stored
- **AND** the `index_status` table records each file's hash and chunk count

#### Scenario: Incremental re-index
- **WHEN** the user runs `deeplens index` again after modifying 2 out of 10 documents
- **THEN** only the 2 modified files are re-chunked and re-embedded
- **AND** old chunks from those 2 files are deleted before new chunks are inserted

#### Scenario: Index with progress display
- **WHEN** the indexing pipeline processes files
- **THEN** the CLI displays a progress bar or counter showing `[current/total]` files processed

#### Scenario: No documents found
- **WHEN** the `.deeplens/docs/` directory does not exist or contains no `.md` files
- **THEN** the system displays an error message suggesting the user run `deeplens generate` first
