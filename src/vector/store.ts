/**
 * VectorStore — SQLite + sqlite-vec backed vector storage with KNN search.
 */

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { ALL_DDL } from "./schema.js";

// ── Types ──────────────────────────────────────────

export interface ChunkWithEmbedding {
  sourcePath: string;
  sourceType: "doc" | "code";
  headerPath?: string;
  content: string;
  startLine?: number;
  endLine?: number;
  embedding: Float32Array;
}

export interface SearchResult {
  chunkId: number;
  sourcePath: string;
  sourceType: string;
  headerPath: string | null;
  content: string;
  startLine: number | null;
  endLine: number | null;
  distance: number;
}

export interface IndexStatus {
  sourcePath: string;
  sourceType: "doc" | "code";
  fileHash: string;
  chunkCount: number;
  indexedAt?: string;
}

// ── VectorStore ────────────────────────────────────

export class VectorStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");

    // Load sqlite-vec extension
    sqliteVec.load(this.db);

    // Create tables and indexes
    for (const ddl of ALL_DDL) {
      this.db.exec(ddl);
    }
  }

  /**
   * Insert chunks with embeddings and metadata in a single transaction.
   */
  insertChunks(chunks: ChunkWithEmbedding[]): void {
    if (chunks.length === 0) return;

    const insertMeta = this.db.prepare(`
      INSERT INTO doc_chunk_meta (source_path, source_type, header_path, content, start_line, end_line)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertVec = this.db.prepare(`
      INSERT INTO doc_chunks (chunk_id, embedding)
      VALUES (?, ?)
    `);

    const tx = this.db.transaction((items: ChunkWithEmbedding[]) => {
      for (const chunk of items) {
        const result = insertMeta.run(
          chunk.sourcePath,
          chunk.sourceType,
          chunk.headerPath ?? null,
          chunk.content,
          chunk.startLine ?? null,
          chunk.endLine ?? null,
        );
        const chunkId = BigInt(result.lastInsertRowid);
        insertVec.run(chunkId, chunk.embedding);
      }
    });

    tx(chunks);
  }

  /**
   * Delete all chunks associated with a given source path (both tables).
   */
  deleteBySource(sourcePath: string): void {
    const tx = this.db.transaction((sp: string) => {
      // Get chunk IDs to delete from vec table
      const ids = this.db
        .prepare(`SELECT chunk_id FROM doc_chunk_meta WHERE source_path = ?`)
        .all(sp) as { chunk_id: number }[];

      if (ids.length > 0) {
        const deleteVec = this.db.prepare(
          `DELETE FROM doc_chunks WHERE chunk_id = ?`,
        );
        for (const { chunk_id } of ids) {
          deleteVec.run(chunk_id);
        }
      }

      this.db
        .prepare(`DELETE FROM doc_chunk_meta WHERE source_path = ?`)
        .run(sp);
    });

    tx(sourcePath);
  }

  /**
   * KNN vector search with optional source_type filter.
   * Returns results ordered by ascending distance (most similar first).
   */
  search(
    queryVector: Float32Array,
    topK: number = 5,
    sourceType?: string,
  ): SearchResult[] {
    // sqlite-vec KNN query
    const knnQuery = `
      SELECT c.chunk_id, c.distance, m.source_path, m.source_type,
             m.header_path, m.content, m.start_line, m.end_line
      FROM doc_chunks c
      JOIN doc_chunk_meta m ON m.chunk_id = c.chunk_id
      WHERE c.embedding MATCH ? AND k = ?
      ${sourceType ? "AND m.source_type = ?" : ""}
      ORDER BY c.distance
    `;

    const params: unknown[] = [queryVector, topK];
    if (sourceType) {
      params.push(sourceType);
    }

    const rows = this.db.prepare(knnQuery).all(...params) as Array<{
      chunk_id: number;
      distance: number;
      source_path: string;
      source_type: string;
      header_path: string | null;
      content: string;
      start_line: number | null;
      end_line: number | null;
    }>;

    return rows.map((row) => ({
      chunkId: row.chunk_id,
      sourcePath: row.source_path,
      sourceType: row.source_type,
      headerPath: row.header_path,
      content: row.content,
      startLine: row.start_line,
      endLine: row.end_line,
      distance: row.distance,
    }));
  }

  /**
   * Get index status for a given source path.
   */
  getStatus(sourcePath: string): IndexStatus | null {
    const row = this.db
      .prepare(`SELECT * FROM index_status WHERE source_path = ?`)
      .get(sourcePath) as
      | {
          source_path: string;
          source_type: string;
          file_hash: string;
          chunk_count: number;
          indexed_at: string;
        }
      | undefined;

    if (!row) return null;

    return {
      sourcePath: row.source_path,
      sourceType: row.source_type as "doc" | "code",
      fileHash: row.file_hash,
      chunkCount: row.chunk_count,
      indexedAt: row.indexed_at,
    };
  }

  /**
   * Insert or update index status for a source path.
   */
  upsertStatus(status: IndexStatus): void {
    this.db
      .prepare(
        `
      INSERT INTO index_status (source_path, source_type, file_hash, chunk_count, indexed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(source_path) DO UPDATE SET
        source_type = excluded.source_type,
        file_hash = excluded.file_hash,
        chunk_count = excluded.chunk_count,
        indexed_at = excluded.indexed_at
    `,
      )
      .run(
        status.sourcePath,
        status.sourceType,
        status.fileHash,
        status.chunkCount,
      );
  }

  /**
   * Get aggregate index statistics (total chunks, files, last indexed time).
   */
  getAggregateStatus(): {
    totalChunks: number;
    totalFiles: number;
    lastIndexed: string | null;
  } {
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(chunk_count), 0) AS total_chunks,
           COUNT(*) AS total_files,
           MAX(indexed_at) AS last_indexed
         FROM index_status`,
      )
      .get() as {
      total_chunks: number;
      total_files: number;
      last_indexed: string | null;
    };

    return {
      totalChunks: row.total_chunks,
      totalFiles: row.total_files,
      lastIndexed: row.last_indexed,
    };
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close();
  }
}
