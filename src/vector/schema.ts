/**
 * Vector store schema — DDL for doc_chunks, doc_chunk_meta, and index_status tables.
 */

export const CREATE_DOC_CHUNKS = `
CREATE VIRTUAL TABLE IF NOT EXISTS doc_chunks USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  embedding float[4096] distance_metric=cosine
);
`;

export const CREATE_DOC_CHUNK_META = `
CREATE TABLE IF NOT EXISTS doc_chunk_meta (
  chunk_id INTEGER PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_type TEXT NOT NULL,
  header_path TEXT,
  content TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export const CREATE_INDEX_STATUS = `
CREATE TABLE IF NOT EXISTS index_status (
  source_path TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  indexed_at TEXT DEFAULT (datetime('now'))
);
`;

export const CREATE_IDX_CHUNK_SOURCE = `
CREATE INDEX IF NOT EXISTS idx_chunk_source ON doc_chunk_meta(source_path);
`;

export const CREATE_IDX_CHUNK_TYPE = `
CREATE INDEX IF NOT EXISTS idx_chunk_type ON doc_chunk_meta(source_type);
`;

/** All DDL statements in execution order. */
export const ALL_DDL = [
  CREATE_DOC_CHUNKS,
  CREATE_DOC_CHUNK_META,
  CREATE_INDEX_STATUS,
  CREATE_IDX_CHUNK_SOURCE,
  CREATE_IDX_CHUNK_TYPE,
];
