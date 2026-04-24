/**
 * memory-manager.ts — High-level RAG memory manager for B.L.U.E.-J.
 *
 * Handles:
 *   - Automatic conversation summarization after each exchange
 *   - Code snippet extraction and storage
 *   - Concept/pattern detection
 *   - Context injection for chat (the "recall" step)
 *   - User preference tracking
 *
 * This is the brain layer on top of vector-store.ts.
 */
import { getOpenAI, getFastModel, hasApiKey } from "./ai-client.js";
import vectorStore, { type MemoryEntry, type SearchResult } from "./vector-store.js";

// ── Types ──────────────────────────────────────────────────

export interface MemoryContext {
  /** Formatted text to inject into the system prompt */
  contextBlock: string;
  /** The raw search results used to build the context */
  results: SearchResult[];
  /** Number of memories recalled */
  count: number;
}

export interface ExchangeSummary {
  summary: string;
  codeSnippets: Array<{ language: string; code: string; description: string }>;
  concepts: string[];
  preferences: string[];
}

// ── Conversation Summarization ─────────────────────────────

/**
 * Summarize a user-assistant exchange for long-term memory storage.
 * Uses the fast model to keep costs low.
 */
async function summarizeExchange(
  userMessage: string,
  assistantResponse: string,
  language: string
): Promise<ExchangeSummary | null> {
  if (!hasApiKey()) return null;

  // Skip trivial exchanges (greetings, very short messages)
  if (userMessage.length < 20 && assistantResponse.length < 100) return null;

  try {
    const openai = getOpenAI();
    const prompt = `Analyze this coding conversation exchange and extract structured memory.

USER MESSAGE:
${userMessage.slice(0, 2000)}

ASSISTANT RESPONSE:
${assistantResponse.slice(0, 4000)}

LANGUAGE CONTEXT: ${language}

Extract the following as JSON:
{
  "summary": "One concise sentence describing what was discussed/learned/built",
  "codeSnippets": [{"language": "python", "code": "the actual code", "description": "what it does"}],
  "concepts": ["list of programming concepts covered, e.g. 'recursion', 'list comprehension'"],
  "preferences": ["any user preferences detected, e.g. 'prefers functional style', 'learning about ML'"]
}

Rules:
- summary should be specific enough to be useful as context later
- Only include code snippets that are meaningful (not hello world unless it's the user's first program)
- concepts should be concrete technical terms
- preferences only if clearly stated or strongly implied
- Return empty arrays if nothing fits a category`;

    const resp = await openai.chat.completions.create({
      model: getFastModel(),
      messages: [
        { role: "system", content: "You extract structured data from conversations. Respond only in valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as ExchangeSummary;

    return {
      summary: parsed.summary || "",
      codeSnippets: Array.isArray(parsed.codeSnippets) ? parsed.codeSnippets : [],
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
    };
  } catch (err) {
    console.warn("[memory-manager] Summarization failed:", err);
    return null;
  }
}

// ── Memory Storage ─────────────────────────────────────────

/**
 * Process and store memories from a conversation exchange.
 * Call this after each user→assistant exchange in the chat route.
 *
 * This is fire-and-forget — it runs in the background and doesn't
 * block the response to the user.
 */
export async function memorizeExchange(
  userMessage: string,
  assistantResponse: string,
  options: {
    sessionId: string;
    language: string;
    phaseIndex: number;
  }
): Promise<void> {
  try {
    const summary = await summarizeExchange(
      userMessage,
      assistantResponse,
      options.language
    );

    if (!summary || !summary.summary) return;

    // Store the conversation summary
    await vectorStore.addMemory(summary.summary, {
      type: "conversation_summary",
      language: options.language,
      phase: options.phaseIndex,
      sessionId: options.sessionId,
      timestamp: Date.now(),
      tags: summary.concepts,
    });

    // Store significant code snippets
    for (const snippet of summary.codeSnippets) {
      if (snippet.code.length > 30) {
        const text = `${snippet.description}\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``;
        await vectorStore.addMemory(text, {
          type: "code_snippet",
          language: snippet.language || options.language,
          phase: options.phaseIndex,
          sessionId: options.sessionId,
          timestamp: Date.now(),
          tags: summary.concepts,
        });
      }
    }

    // Store detected concepts
    if (summary.concepts.length > 0) {
      const conceptText = `User has learned/discussed: ${summary.concepts.join(", ")} in ${options.language}`;
      await vectorStore.addMemory(conceptText, {
        type: "concept",
        language: options.language,
        phase: options.phaseIndex,
        sessionId: options.sessionId,
        timestamp: Date.now(),
        tags: summary.concepts,
      });
    }

    // Store user preferences
    for (const pref of summary.preferences) {
      await vectorStore.addMemory(pref, {
        type: "preference",
        sessionId: options.sessionId,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    // Never let memory processing crash the app
    console.warn("[memory-manager] memorizeExchange failed:", err);
  }
}

/**
 * Store an error→fix pattern for future reference.
 * Call this when the self-correction system successfully fixes an error.
 */
export async function memorizeErrorFix(
  error: string,
  fix: string,
  options: {
    sessionId: string;
    language: string;
  }
): Promise<void> {
  try {
    const text = `Error: ${error}\nFix: ${fix}`;
    await vectorStore.addMemory(text, {
      type: "error_fix",
      language: options.language,
      sessionId: options.sessionId,
      timestamp: Date.now(),
      tags: ["error-fix", options.language],
    });
  } catch (err) {
    console.warn("[memory-manager] memorizeErrorFix failed:", err);
  }
}

// ── Context Retrieval (the "Recall" step) ──────────────────

/**
 * Recall relevant memories for a new user message.
 * Returns a formatted context block to inject into the system prompt.
 *
 * This is the key function — it's what makes J. "remember."
 */
export async function recall(
  userMessage: string,
  options?: {
    language?: string;
    sessionId?: string;
    topK?: number;
    includeTypes?: MemoryEntry["metadata"]["type"][];
  }
): Promise<MemoryContext> {
  const topK = options?.topK ?? 8;

  // Search for relevant memories
  const results = await vectorStore.search(userMessage, {
    topK,
    language: options?.language,
    minScore: 0.25,
  });

  if (results.length === 0) {
    return { contextBlock: "", results: [], count: 0 };
  }

  // Filter by type if specified
  const filtered = options?.includeTypes
    ? results.filter((r) => options.includeTypes!.includes(r.entry.metadata.type))
    : results;

  if (filtered.length === 0) {
    return { contextBlock: "", results: [], count: 0 };
  }

  // Build the context block
  const sections: string[] = [];

  // Group by type for clean formatting
  const summaries = filtered.filter((r) => r.entry.metadata.type === "conversation_summary");
  const snippets = filtered.filter((r) => r.entry.metadata.type === "code_snippet");
  const concepts = filtered.filter((r) => r.entry.metadata.type === "concept");
  const preferences = filtered.filter((r) => r.entry.metadata.type === "preference");
  const errorFixes = filtered.filter((r) => r.entry.metadata.type === "error_fix");

  if (summaries.length > 0) {
    sections.push(
      "PREVIOUS CONVERSATIONS (things the user has discussed before):",
      ...summaries.map((r) => `• ${r.entry.text}`)
    );
  }

  if (snippets.length > 0) {
    sections.push(
      "\nPREVIOUS CODE (code the user has written or been shown):",
      ...snippets.map((r) => r.entry.text)
    );
  }

  if (concepts.length > 0) {
    sections.push(
      "\nKNOWN CONCEPTS (what the user has already learned):",
      ...concepts.map((r) => `• ${r.entry.text}`)
    );
  }

  if (preferences.length > 0) {
    sections.push(
      "\nUSER PREFERENCES:",
      ...preferences.map((r) => `• ${r.entry.text}`)
    );
  }

  if (errorFixes.length > 0) {
    sections.push(
      "\nPAST ERROR FIXES (patterns the user has encountered):",
      ...errorFixes.map((r) => `• ${r.entry.text}`)
    );
  }

  const contextBlock = [
    "═══ LONG-TERM MEMORY (recalled from previous sessions) ═══",
    "",
    ...sections,
    "",
    "═══ END MEMORY ═══",
    "",
    "Use this context to personalize your response. Reference things the user has",
    "done before. Build on their existing knowledge. Don't re-explain concepts",
    "they've already mastered. If they've had an error before, proactively warn them.",
  ].join("\n");

  return {
    contextBlock,
    results: filtered,
    count: filtered.length,
  };
}

/**
 * Get a summary of the user's learning journey so far.
 * Useful for progress reports or session starts.
 */
export async function getLearningProfile(sessionId?: string): Promise<string> {
  const allConcepts = vectorStore.listMemories({ type: "concept", limit: 50 });
  const allPrefs = vectorStore.listMemories({ type: "preference", limit: 20 });
  const stats = vectorStore.getStats();

  if (stats.totalMemories === 0) {
    return "No previous learning history found. This appears to be a new user.";
  }

  const conceptList = allConcepts.map((e) => e.text).join("\n");
  const prefList = allPrefs.map((e) => e.text).join("\n");

  return [
    `Learning Profile (${stats.totalMemories} memories stored):`,
    "",
    "Concepts covered:",
    conceptList || "  (none yet)",
    "",
    "User preferences:",
    prefList || "  (none detected)",
    "",
    `Memory breakdown: ${Object.entries(stats.byType).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
  ].join("\n");
}

export default {
  memorizeExchange,
  memorizeErrorFix,
  recall,
  getLearningProfile,
};
