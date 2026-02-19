## ADDED Requirements

### Requirement: Fast Search query pipeline
The system SHALL provide a Fast Search function that accepts a user query string and returns a streamed LLM response grounded in retrieved document chunks. The pipeline SHALL: (1) embed the query using the SiliconFlow Embedding API, (2) perform KNN search on the vector store to retrieve top-5 chunks, (3) assemble a prompt with retrieved chunks as context, (4) call the SiliconFlow LLM via Vercel AI SDK `streamText()` to generate a streamed response.

#### Scenario: Successful query with matching documents
- **WHEN** a user submits the query "How does the authentication flow work?"
- **AND** the vector store contains relevant document chunks
- **THEN** the system retrieves the top-5 most similar chunks, includes them as context in the LLM prompt, and streams a coherent answer referencing the retrieved content

#### Scenario: Query with no relevant results
- **WHEN** a user submits a query that has no similar chunks (all distances above a threshold)
- **THEN** the LLM response acknowledges that no relevant documentation was found and suggests alternative approaches

#### Scenario: Empty index
- **WHEN** a user submits a query but the vector store has no indexed chunks
- **THEN** the system returns an error indicating that indexing must be performed first via `deeplens index`

### Requirement: Context assembly
The system SHALL assemble the LLM prompt by placing retrieved chunks in a structured context block within the system prompt. Each chunk SHALL include its `source_path` and `header_path` as attribution. The system prompt SHALL instruct the LLM to answer based on the provided context and cite sources.

#### Scenario: Context with multiple sources
- **WHEN** the top-5 chunks come from 3 different source files
- **THEN** each chunk in the context block is labeled with its source path and header path

#### Scenario: Context truncation
- **WHEN** the total context exceeds 6000 tokens
- **THEN** the system reduces to top-3 chunks to stay within a reasonable prompt size

### Requirement: Streaming response format
The system SHALL return Fast Search results as a stream of text deltas via SSE (Server-Sent Events). Each SSE event SHALL have `event: text-delta` with `data` containing the text fragment. The final event SHALL be `event: done` with optional metadata (sources used, chunk count).

#### Scenario: Normal streaming response
- **WHEN** the LLM generates a response
- **THEN** text is streamed as individual `text-delta` events as tokens are produced

#### Scenario: Source attribution in final event
- **WHEN** the stream completes
- **THEN** a `done` event is sent containing a JSON payload with `sources` (array of `source_path` values used)
