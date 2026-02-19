## ADDED Requirements

### Requirement: Database initialization
The system SHALL initialize a SQLite database at `<project>/.deeplens/deeplens.db` using `better-sqlite3`. On first use, the system SHALL create the `doc_chunks` virtual table (using `sqlite-vec` with `float[2048]` and `distance_metric=cosine`), the `doc_chunk_meta` metadata table, and the `index_status` table. The system SHALL create indexes on `doc_chunk_meta(source_path)` and `doc_chunk_meta(source_type)`.

#### Scenario: First-time database creation
- **WHEN** the vector store is initialized and no `deeplens.db` file exists
- **THEN** the database file is created with all three tables and indexes

#### Scenario: Existing database opened
- **WHEN** the vector store is initialized and `deeplens.db` already exists with the correct schema
- **THEN** the existing database is opened without modification

#### Scenario: sqlite-vec extension loading
- **WHEN** the database is initialized
- **THEN** the `sqlite-vec` extension is loaded via `db.loadExtension()` before any vector operations

### Requirement: Chunk storage (insert)
The system SHALL provide a method to insert chunks with their embeddings and metadata. Each insert SHALL write a row to both `doc_chunks` (vector) and `doc_chunk_meta` (metadata) within a single transaction. The `chunk_id` SHALL be auto-generated and consistent across both tables.

#### Scenario: Insert a single chunk
- **WHEN** a chunk with text content and 2048-dimensional embedding is provided
- **THEN** the vector is stored in `doc_chunks` and metadata in `doc_chunk_meta` with matching `chunk_id`

#### Scenario: Bulk insert chunks
- **WHEN** 100 chunks are provided for batch insertion
- **THEN** all chunks are inserted within a single transaction for atomicity and performance

#### Scenario: Insert with duplicate source_path
- **WHEN** chunks for an already-indexed `source_path` are inserted without first deleting old chunks
- **THEN** new rows are added (no automatic dedup); the caller is responsible for deleting old chunks first

### Requirement: Chunk deletion by source
The system SHALL provide a method to delete all chunks associated with a given `source_path`. This SHALL delete from both `doc_chunk_meta` and `doc_chunks` tables within a single transaction.

#### Scenario: Delete chunks for a re-indexed file
- **WHEN** `deleteBySource("domains/auth/index.md")` is called
- **THEN** all rows in `doc_chunk_meta` and corresponding rows in `doc_chunks` with that `source_path` are removed

#### Scenario: Delete for non-existent source
- **WHEN** `deleteBySource` is called with a path that has no chunks
- **THEN** the operation completes successfully with zero rows affected

### Requirement: KNN vector search
The system SHALL provide a KNN search method that accepts a query vector (2048-dimensional) and a `topK` parameter (default 5). The method SHALL query the `doc_chunks` virtual table using cosine distance and JOIN with `doc_chunk_meta` to return chunk content, metadata, and distance scores, ordered by ascending distance (most similar first).

#### Scenario: Search with default topK
- **WHEN** a query vector is provided with no topK specified
- **THEN** the 5 most similar chunks are returned with their content, metadata, and distance scores

#### Scenario: Search with custom topK
- **WHEN** a query vector is provided with `topK: 10`
- **THEN** the 10 most similar chunks are returned

#### Scenario: Search with source_type filter
- **WHEN** a query vector is provided with `sourceType: "doc"`
- **THEN** only chunks where `source_type = "doc"` are considered in the KNN search

#### Scenario: Empty database search
- **WHEN** a KNN search is performed on an empty database
- **THEN** an empty array is returned

### Requirement: Index status tracking
The system SHALL provide methods to read and update the `index_status` table. This includes: checking if a file has been indexed (by `source_path`), comparing stored `file_hash` with current file hash, and updating status after re-indexing. This enables incremental indexing by skipping unchanged files.

#### Scenario: Check unindexed file
- **WHEN** `getStatus("domains/auth/index.md")` is called for a file not in `index_status`
- **THEN** `null` is returned, indicating the file needs indexing

#### Scenario: Check unchanged file
- **WHEN** `getStatus` returns a record and its `file_hash` matches the current file's SHA-256
- **THEN** the caller can skip re-indexing this file

#### Scenario: Update status after indexing
- **WHEN** a file is successfully indexed
- **THEN** `upsertStatus` inserts or updates the `index_status` row with current `file_hash`, `chunk_count`, and `indexed_at`
