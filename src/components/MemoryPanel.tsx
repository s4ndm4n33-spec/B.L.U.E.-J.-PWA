/**
 * MemoryPanel.tsx — J.'s Long-Term Memory UI for B.L.U.E.-J.
 *
 * Location: src/components/MemoryPanel.tsx
 *
 * Shows the user what J. remembers across sessions. Includes:
 *   - Memory stats dashboard
 *   - Semantic search ("What do you remember about recursion?")
 *   - Memory browser by type (summaries, code, concepts, preferences)
 *   - Delete individual memories or clear all
 *   - Learning profile summary
 *
 * Design: Matches B.L.U.E.-J.'s sci-fi HUD aesthetic.
 */
import { useState, useEffect, useCallback } from "react";
import { useMemoryStore, type MemoryItem } from "../lib/memory-store";

// ── Type badge styling ────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  conversation_summary: { label: "CONV", color: "text-cyan-400 border-cyan-400/30", icon: "💬" },
  code_snippet:         { label: "CODE", color: "text-green-400 border-green-400/30", icon: "📝" },
  concept:              { label: "CONCEPT", color: "text-purple-400 border-purple-400/30", icon: "🧠" },
  preference:           { label: "PREF", color: "text-yellow-400 border-yellow-400/30", icon: "⚙️" },
  error_fix:            { label: "FIX", color: "text-red-400 border-red-400/30", icon: "🔧" },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || { label: type, color: "text-gray-400 border-gray-400/30", icon: "📌" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded ${cfg.color} bg-black/30`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Memory Card ───────────────────────────────────────────

function MemoryCard({ memory, onDelete }: { memory: MemoryItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isCode = memory.type === "code_snippet";
  const displayText = expanded ? memory.text : memory.text.slice(0, 200);

  return (
    <div className="group relative border border-cyan-900/30 rounded bg-black/40 p-3 hover:border-cyan-500/40 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={memory.type} />
          {memory.language && (
            <span className="text-[10px] font-mono text-cyan-600 uppercase">{memory.language}</span>
          )}
          {memory.score !== undefined && (
            <span className="text-[10px] font-mono text-cyan-600">
              [{(memory.score * 100).toFixed(0)}% match]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
            {timeAgo(memory.timestamp)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(memory.id); }}
            className="opacity-0 group-hover:opacity-100 text-red-500/60 hover:text-red-400 text-xs transition-opacity"
            title="Delete memory"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        onClick={() => memory.text.length > 200 && setExpanded(!expanded)}
        className={`text-sm font-mono leading-relaxed ${isCode ? "text-green-300/80" : "text-gray-300"} ${
          memory.text.length > 200 ? "cursor-pointer" : ""
        }`}
      >
        {isCode ? (
          <pre className="whitespace-pre-wrap text-[12px] bg-black/40 rounded p-2 overflow-x-auto">
            {displayText}
          </pre>
        ) : (
          <p className="whitespace-pre-wrap">{displayText}</p>
        )}
        {!expanded && memory.text.length > 200 && (
          <span className="text-cyan-500 text-xs">... [click to expand]</span>
        )}
      </div>

      {memory.tags && memory.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {memory.tags.map((tag, i) => (
            <span key={i} className="text-[9px] font-mono text-cyan-600/60 bg-cyan-900/10 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────

function StatsBar() {
  const stats = useMemoryStore((s) => s.stats);
  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-black/30 border border-cyan-900/20 rounded text-[11px] font-mono text-cyan-500/70">
      <span>MEMORIES: <span className="text-cyan-300">{stats.totalMemories}</span></span>
      {Object.entries(stats.byType).map(([type, count]) => {
        const cfg = TYPE_CONFIG[type];
        return cfg ? (
          <span key={type}>
            {cfg.icon} {count}
          </span>
        ) : null;
      })}
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────

function SearchBar() {
  const [query, setQuery] = useState("");
  const { searchMemories, isSearching } = useMemoryStore();

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      searchMemories(query.trim());
    }
  }, [query, searchMemories]);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="Search J.'s memory... (e.g. 'recursion', 'that sorting algorithm')"
        className="flex-1 bg-black/50 border border-cyan-900/30 rounded px-3 py-2 text-sm font-mono text-cyan-100 placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
      />
      <button
        onClick={handleSearch}
        disabled={isSearching || !query.trim()}
        className="px-4 py-2 bg-cyan-900/30 border border-cyan-700/40 rounded text-sm font-mono text-cyan-300 hover:bg-cyan-800/40 disabled:opacity-40 transition-colors"
      >
        {isSearching ? "⏳" : "🔍"} RECALL
      </button>
    </div>
  );
}

// ── Type Filter Tabs ──────────────────────────────────────

function TypeFilters() {
  const { filterType, setFilterType, fetchMemories } = useMemoryStore();

  const types = [
    { key: null, label: "ALL" },
    { key: "conversation_summary", label: "💬 CONV" },
    { key: "code_snippet", label: "📝 CODE" },
    { key: "concept", label: "🧠 CONCEPTS" },
    { key: "preference", label: "⚙️ PREFS" },
    { key: "error_fix", label: "🔧 FIXES" },
  ];

  return (
    <div className="flex gap-1 flex-wrap">
      {types.map((t) => (
        <button
          key={t.key || "all"}
          onClick={() => {
            if (t.key === filterType) {
              setFilterType(null);
            } else {
              setFilterType(t.key);
            }
          }}
          className={`px-3 py-1 text-[11px] font-mono rounded border transition-colors ${
            filterType === t.key
              ? "bg-cyan-900/40 border-cyan-500/50 text-cyan-300"
              : "bg-black/20 border-cyan-900/20 text-gray-500 hover:text-cyan-400 hover:border-cyan-900/40"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────

export function MemoryPanel() {
  const {
    memories,
    searchResults,
    isLoading,
    error,
    fetchMemories,
    fetchStats,
    deleteMemory,
    clearAll,
  } = useMemoryStore();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchMemories();
    fetchStats();
  }, [fetchMemories, fetchStats]);

  const displayMemories = searchResults.length > 0 ? searchResults : memories;
  const isSearchMode = searchResults.length > 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-950 to-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/30">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-lg">🧠</span>
          <h2 className="text-sm font-mono font-bold text-cyan-300 uppercase tracking-wider">
            J.'s Long-Term Memory
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {showClearConfirm ? (
            <>
              <span className="text-[11px] text-red-400 font-mono">Erase all memories?</span>
              <button
                onClick={async () => { await clearAll(); setShowClearConfirm(false); }}
                className="px-2 py-1 text-[10px] font-mono bg-red-900/40 border border-red-500/40 text-red-300 rounded hover:bg-red-800/40"
              >
                CONFIRM
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 text-[10px] font-mono text-gray-500 hover:text-gray-300"
              >
                CANCEL
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-2 py-1 text-[10px] font-mono text-gray-600 hover:text-red-400 transition-colors"
              title="Clear all memories"
            >
              🗑️ WIPE
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pt-3">
        <StatsBar />
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <SearchBar />
      </div>

      {/* Filters */}
      <div className="px-4 pt-3">
        <TypeFilters />
      </div>

      {/* Search mode indicator */}
      {isSearchMode && (
        <div className="px-4 pt-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-500/70">
            <span>🔍 Showing {searchResults.length} matches</span>
            <button
              onClick={() => useMemoryStore.setState({ searchResults: [] })}
              className="text-gray-500 hover:text-cyan-400"
            >
              ✕ Clear search
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-900/20 border border-red-500/30 rounded text-[11px] font-mono text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-cyan-500/50 font-mono text-sm animate-pulse">
              Loading memories...
            </span>
          </div>
        ) : displayMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">🧠</span>
            <p className="text-sm font-mono text-gray-500">
              {isSearchMode
                ? "No matching memories found."
                : "No memories stored yet."}
            </p>
            <p className="text-xs font-mono text-gray-600 mt-1">
              {isSearchMode
                ? "Try a different search query."
                : "Start chatting with J. and memories will build automatically."}
            </p>
          </div>
        ) : (
          displayMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={deleteMemory}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-cyan-900/20 text-[10px] font-mono text-gray-600 text-center">
        VECTOR STORE // COSINE SIMILARITY // text-embedding-3-small
      </div>
    </div>
  );
}

export default MemoryPanel;
