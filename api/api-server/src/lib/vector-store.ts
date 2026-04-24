/**
 * vector-store.ts — Lightweight vector store for B.L.U.E.-J. RAG memory.
 *
 * No external vector DB required. Uses:
 *   - OpenAI text-embedding-3-small (1536 dims) for embeddings
 *   - Cosine similarity for retrieval
 *   - File persistence (~/.bluej/memory.json)
 *
 * Works on Vercel (uses /tmp), standalone (uses ~/.bluej), and Electron.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { getOpenAI, hasApiKey } from "./ai-client.js";

// ── Types ──────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  text: string;          // The original text content
  embedding: number[];   // 1536-dim float vector
  metadata: {
    type: "conversation_summary" | "code_snippet" | "concept" | "preference" | "error_fix";
    language?: string;    // python | cpp | javascript
    phase?: number;       // Curriculum phase when created
    sessionId?: string;
    timestamp: number;    // Unix ms
    tags?: string[];      // Searchable tags
  };
}

export interface SearchResult {
  entry: MemoryEntry;
  score: number;         // Cosine similarity [0, 1]
}

// ── Configuration ──────────────────────────────────────────

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const MAX_MEMORIES = 2000;       // Hard cap to prevent unbounded growth
const DEFAULT_TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.3; // Minimum score to include in results

// ── Storage ────────────────────────────────────────────────

let _memories: Map<string, MemoryEntry> = new Map();
let _loaded = false;
let _dirty = false;
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function storagePath(): string {
  // Vercel serverless: use /tmp (ephemeral but fast)
  // Standalone/Electron: use ~/.bluej (persistent)
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const base = isVercel ? tmpdir() : join(homedir(), ".bluej");

  if (!existsSync(base)) {
    mkdirSync(base, { recursive: true });
  }
  return join(base, "memory.json");
}

function loadFromDisk(): void {
  if (_loaded) return;
  _loaded = true;

  try {
    const p = storagePath();
    if (existsSync(p)) {
      const raw = JSON.parse(readFileSync(p, "utf-8")) as MemoryEntry[];
      for (const entry of raw) {
        _memories.set(entry.id, entry);
      }
      console.log(`[vector-store] Loaded ${_memories.size} memories from disk`);
    }
  } catch (err) {
    console.warn("[vector-store] Could not load memory file:", err);
  }
}

function scheduleSave(): void {
  _dirty = true;
  if (_saveTimer) return;

  // Debounce: save at most once per 2 seconds
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    if (_dirty) {
      _dirty = false;
      try {
        const data = [..._memories.values()];
        writeFileSync(storagePath(), JSON.stringify(data));
      } catch (err) {
        console.warn("[vector-store] Could not save memory file:", err);
      }
    }
  }, 2000);
}

// ── Math ───────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Embedding ──────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text.
 * Falls back to a simple hash-based vector if no API key is available.
 */
export async function embed(text: string): Promise<number[]> {
  if (!hasApiKey()) {
    // Fallback: deterministic hash-based pseudo-embedding
    // NOT semantically meaningful, but prevents crashes in offline mode
    return hashEmbed(text);
  }

  try {
    const openai = getOpenAI();
    const resp = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Model limit safety
      dimensions: EMBEDDING_DIMS,
    });
    return resp.data[0].embedding;
  } catch (err) {
    console.warn("[vector-store] Embedding failed, using hash fallback:", err);
    return hashEmbed(text);
  }
}

/** Deterministic hash-based pseudo-embedding (offline fallback) */
function hashEmbed(text: string): number[] {
  const vec = new Float32Array(EMBEDDING_DIMS);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  // Use hash as seed for pseudo-random but deterministic vector
  let seed = hash;
  for (let i = 0; i < EMBEDDING_DIMS; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    vec[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  // Normalize
  let mag = 0;
  for (let i = 0; i < EMBEDDING_DIMS; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag);
  for (let i = 0; i < EMBEDDING_DIMS; i++) vec[i] /= mag;
  return Array.from(vec);
}

// ── Public API ─────────────────────────────────────────────

/**
 * Store a memory entry.
 * Automatically generates an embedding for the text.
 */
export async function addMemory(
  text: string,
  metadata: MemoryEntry["metadata"]
): Promise<MemoryEntry> {
  loadFromDisk();

  const embedding = await embed(text);
  const entry: MemoryEntry = {
    id: generateId(),
    text,
    embedding,
    metadata: { ...metadata, timestamp: metadata.timestamp || Date.now() },
  };

  _memories.set(entry.id, entry);

  // Evict oldest entries if over capacity
  if (_memories.size > MAX_MEMORIES) {
    const sorted = [..._memories.values()].sort(
      (a, b) => a.metadata.timestamp - b.metadata.timestamp
    );
    const toRemove = sorted.slice(0, _memories.size - MAX_MEMORIES);
    for (const old of toRemove) {
      _memories.delete(old.id);
    }
  }

  scheduleSave();
  return entry;
}

/**
 * Search memories by semantic similarity to the query text.
 */
export async function search(
  query: string,
  options?: {
    topK?: number;
    type?: MemoryEntry["metadata"]["type"];
    language?: string;
    sessionId?: string;
    minScore?: number;
  }
): Promise<SearchResult[]> {
  loadFromDisk();

  const topK = options?.topK ?? DEFAULT_TOP_K;
  const minScore = options?.minScore ?? SIMILARITY_THRESHOLD;

  if (_memories.size === 0) return [];

  const queryVec = await embed(query);

  let candidates = [..._memories.values()];

  // Pre-filter by metadata
  if (options?.type) {
    candidates = candidates.filter((e) => e.metadata.type === options.type);
  }
  if (options?.language) {
    candidates = candidates.filter(
      (e) => !e.metadata.language || e.metadata.language === options.language
    );
  }
  if (options?.sessionId) {
    candidates = candidates.filter(
      (e) => !e.metadata.sessionId || e.metadata.sessionId === options.sessionId
    );
  }

  // Score all candidates
  const scored: SearchResult[] = candidates.map((entry) => ({
    entry,
    score: cosineSimilarity(queryVec, entry.embedding),
  }));

  // Sort by score descending, filter by threshold, take top-K
  return scored
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Get all memories (for UI display, debugging, or export).
 */
export function listMemories(options?: {
  type?: MemoryEntry["metadata"]["type"];
  limit?: number;
}): MemoryEntry[] {
  loadFromDisk();
  let entries = [..._memories.values()];

  if (options?.type) {
    entries = entries.filter((e) => e.metadata.type === options.type);
  }

  entries.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);

  if (options?.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Delete a memory by ID.
 */
export function deleteMemory(id: string): boolean {
  loadFromDisk();
  const deleted = _memories.delete(id);
  if (deleted) scheduleSave();
  return deleted;
}

/**
 * Clear all memories. Destructive — use with caution.
 */
export function clearAllMemories(): void {
  _memories.clear();
  _dirty = true;
  scheduleSave();
}

/**
 * Get memory stats.
 */
export function getStats(): {
  totalMemories: number;
  byType: Record<string, number>;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  storagePath: string;
} {
  loadFromDisk();
  const entries = [..._memories.values()];
  const byType: Record<string, number> = {};
  let oldest = Infinity;
  let newest = 0;

  for (const e of entries) {
    byType[e.metadata.type] = (byType[e.metadata.type] || 0) + 1;
    if (e.metadata.timestamp < oldest) oldest = e.metadata.timestamp;
    if (e.metadata.timestamp > newest) newest = e.metadata.timestamp;
  }

  return {
    totalMemories: entries.length,
    byType,
    oldestTimestamp: entries.length ? oldest : null,
    newestTimestamp: entries.length ? newest : null,
    storagePath: storagePath(),
  };
}

export default {
  addMemory,
  search,
  listMemories,
  deleteMemory,
  clearAllMemories,
  getStats,
  embed,
};
