/**
 * memory-store.ts — Frontend Zustand store for B.L.U.E.-J. memory UI.
 *
 * Location: src/lib/memory-store.ts
 *
 * Manages the client-side view of J.'s long-term memory:
 *   - Fetching memories from the API
 *   - Searching memories
 *   - Memory stats display
 *   - Manual memory management (add/delete)
 */
import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────

export interface MemoryItem {
  id: string;
  text: string;
  type: "conversation_summary" | "code_snippet" | "concept" | "preference" | "error_fix";
  language?: string;
  phase?: number;
  timestamp: number;
  tags?: string[];
  score?: number; // Only present in search results
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<string, number>;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}

interface MemoryState {
  // Data
  memories: MemoryItem[];
  stats: MemoryStats | null;
  searchResults: MemoryItem[];
  learningProfile: string;

  // UI state
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  filterType: string | null;

  // Actions
  fetchMemories: (type?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  searchMemories: (query: string, topK?: number) => Promise<void>;
  addMemory: (text: string, type: MemoryItem["type"], language?: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  clearAll: () => Promise<boolean>;
  setFilterType: (type: string | null) => void;
}

// ── API Helper ─────────────────────────────────────────────

const API_BASE = "/api/bluej/memory";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `API error: ${resp.status}`);
  }

  return resp.json();
}

// ── Store ──────────────────────────────────────────────────

export const useMemoryStore = create<MemoryState>((set, get) => ({
  // Initial state
  memories: [],
  stats: null,
  searchResults: [],
  learningProfile: "",
  isLoading: false,
  isSearching: false,
  error: null,
  filterType: null,

  fetchMemories: async (type?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      params.set("limit", "100");

      const data = await apiFetch<{ memories: MemoryItem[] }>(
        `?${params.toString()}`
      );
      set({ memories: data.memories, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await apiFetch<MemoryStats>("/stats");
      set({ stats });
    } catch (err: any) {
      console.warn("Failed to fetch memory stats:", err);
    }
  },

  fetchProfile: async () => {
    try {
      const data = await apiFetch<{ profile: string }>("/profile");
      set({ learningProfile: data.profile });
    } catch (err: any) {
      console.warn("Failed to fetch learning profile:", err);
    }
  },

  searchMemories: async (query: string, topK = 10) => {
    set({ isSearching: true, error: null });
    try {
      const data = await apiFetch<{ results: MemoryItem[] }>("/search", {
        method: "POST",
        body: JSON.stringify({ query, topK }),
      });
      set({ searchResults: data.results, isSearching: false });
    } catch (err: any) {
      set({ error: err.message, isSearching: false });
    }
  },

  addMemory: async (text, type, language) => {
    try {
      await apiFetch("/add", {
        method: "POST",
        body: JSON.stringify({ text, type, language }),
      });
      // Refresh the list
      get().fetchMemories(get().filterType || undefined);
      get().fetchStats();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteMemory: async (id: string) => {
    try {
      await apiFetch(`/${id}`, { method: "DELETE" });
      set((state) => ({
        memories: state.memories.filter((m) => m.id !== id),
        searchResults: state.searchResults.filter((m) => m.id !== id),
      }));
      get().fetchStats();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearAll: async () => {
    try {
      await apiFetch("?confirm=true", { method: "DELETE" });
      set({ memories: [], searchResults: [], stats: null, learningProfile: "" });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  setFilterType: (type) => {
    set({ filterType: type });
    get().fetchMemories(type || undefined);
  },
}));
