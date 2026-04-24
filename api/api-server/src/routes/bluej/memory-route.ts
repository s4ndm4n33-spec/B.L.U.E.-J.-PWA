/**
 * memory.ts — API routes for B.L.U.E.-J. RAG memory system.
 *
 * Routes:
 *   GET  /api/bluej/memory          — List memories (with optional filters)
 *   GET  /api/bluej/memory/stats    — Memory statistics
 *   GET  /api/bluej/memory/profile  — Learning profile summary
 *   POST /api/bluej/memory/search   — Semantic search across memories
 *   POST /api/bluej/memory/add      — Manually add a memory
 *   DELETE /api/bluej/memory/:id    — Delete a specific memory
 *   DELETE /api/bluej/memory        — Clear all memories (requires confirmation)
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import vectorStore from "../../lib/vector-store.js";
import memoryManager from "../../lib/memory-manager.js";

const router: IRouter = Router();

// ── GET /api/bluej/memory — List memories ──────────────────

router.get("/", async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const validTypes = ["conversation_summary", "code_snippet", "concept", "preference", "error_fix"];
    const filterType = type && validTypes.includes(type)
      ? type as "conversation_summary" | "code_snippet" | "concept" | "preference" | "error_fix"
      : undefined;

    const memories = vectorStore.listMemories({ type: filterType, limit });

    res.json({
      memories: memories.map((m) => ({
        id: m.id,
        text: m.text,
        type: m.metadata.type,
        language: m.metadata.language,
        phase: m.metadata.phase,
        timestamp: m.metadata.timestamp,
        tags: m.metadata.tags,
      })),
      total: memories.length,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Memory list error");
    res.status(500).json({ error: "Failed to list memories" });
  }
});

// ── GET /api/bluej/memory/stats — Memory statistics ────────

router.get("/stats", async (_req, res) => {
  try {
    const stats = vectorStore.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to get memory stats" });
  }
});

// ── GET /api/bluej/memory/profile — Learning profile ───────

router.get("/profile", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const profile = await memoryManager.getLearningProfile(sessionId);
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to get learning profile" });
  }
});

// ── POST /api/bluej/memory/search — Semantic search ────────

const SearchBody = z.object({
  query: z.string().min(1),
  topK: z.number().min(1).max(20).optional(),
  type: z.string().optional(),
  language: z.string().optional(),
});

router.post("/search", async (req, res) => {
  try {
    const body = SearchBody.parse(req.body);

    const results = await vectorStore.search(body.query, {
      topK: body.topK,
      type: body.type as any,
      language: body.language,
    });

    res.json({
      results: results.map((r) => ({
        id: r.entry.id,
        text: r.entry.text,
        score: Math.round(r.score * 1000) / 1000,
        type: r.entry.metadata.type,
        language: r.entry.metadata.language,
        timestamp: r.entry.metadata.timestamp,
        tags: r.entry.metadata.tags,
      })),
      count: results.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: err.errors });
    }
    req.log?.error?.({ err }, "Memory search error");
    res.status(500).json({ error: "Search failed" });
  }
});

// ── POST /api/bluej/memory/add — Manually add a memory ────

const AddBody = z.object({
  text: z.string().min(1).max(5000),
  type: z.enum(["conversation_summary", "code_snippet", "concept", "preference", "error_fix"]),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

router.post("/add", async (req, res) => {
  try {
    const body = AddBody.parse(req.body);

    const entry = await vectorStore.addMemory(body.text, {
      type: body.type,
      language: body.language,
      timestamp: Date.now(),
      tags: body.tags,
    });

    res.json({
      id: entry.id,
      text: entry.text,
      type: entry.metadata.type,
      timestamp: entry.metadata.timestamp,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: err.errors });
    }
    res.status(500).json({ error: "Failed to add memory" });
  }
});

// ── DELETE /api/bluej/memory/:id — Delete one memory ───────

router.delete("/:id", async (req, res) => {
  try {
    const deleted = vectorStore.deleteMemory(req.params.id);
    if (deleted) {
      res.json({ deleted: true, id: req.params.id });
    } else {
      res.status(404).json({ error: "Memory not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete memory" });
  }
});

// ── DELETE /api/bluej/memory — Clear all (with confirmation) ──

router.delete("/", async (req, res) => {
  try {
    const confirm = req.query.confirm === "true";
    if (!confirm) {
      return res.status(400).json({
        error: "Add ?confirm=true to clear all memories. This action is irreversible.",
      });
    }

    vectorStore.clearAllMemories();
    res.json({ cleared: true, message: "All memories have been erased." });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear memories" });
  }
});

export default router;
