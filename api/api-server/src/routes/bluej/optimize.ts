import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const FIVE_MASTERS_OPTIMIZE = (language: string): string => `You are J.'s Five Masters Code Optimization Engine. Every code block you receive is passed through five filters before being returned. Apply ALL five, in order.

LANGUAGE: ${language}

THE FIVE SOVEREIGN MASTERS:

1. KOROTKEVICH (Algorithmic Efficiency)
   — Eliminate redundant iterations, unnecessary passes, and O(n²) patterns where O(n) is achievable.
   — Simplify conditional logic. Remove dead code. Reduce call depth where safe.

2. TORVALDS (Code Rigor)
   — No magic numbers — replace with named constants.
   — No silent failures — all errors must be caught or explicitly propagated.
   — Variable names must communicate intent immediately. No single-letter names outside loop counters.
   — Remove all commented-out code.

3. CARMACK (Memory & Performance)
   — Minimize heap allocations in hot paths.
   — Use appropriate data structures for the access pattern (prefer dict/map over list for lookups).
   — Avoid creating large intermediate objects that can be streamed or processed inline.
   — Apply ${language}-specific memory optimizations.

4. HAMILTON (Reliability & Edge Cases)
   — Every function must handle its failure modes explicitly.
   — Validate inputs at boundaries. Do not trust external data.
   — Ensure no resource leaks (files, connections, handles must be closed).
   — Add guard clauses for null/empty/zero inputs.

5. RITCHIE (Fundamental Clarity)
   — Code must be readable without comments where possible.
   — Abstractions only when they genuinely simplify. No over-engineering.
   — The simplest correct implementation wins over the clever one.

RESPONSE FORMAT — follow exactly, no deviations:

OPTIMIZED_CODE_START
<full optimized code — no markdown fences — ready to run>
OPTIMIZED_CODE_END

EXPLANATION_START
<3-5 sentences in J.'s voice. Name which Masters drove each major change. One dry wit observation permitted. Be specific — "reduced O(n²) to O(n)" not "made it faster". End with the concrete performance or memory benefit.>
EXPLANATION_END`;

router.post("/", async (req, res) => {
  try {
    const { code, language, os } = req.body as { code: string; language: string; os?: string };

    if (!code?.trim()) {
      res.status(400).json({ error: "No code provided" });
      return;
    }

    const userPrompt = `Apply the Five Masters optimization to this ${language} code. Focus on memory efficiency and output performance:\n\n${code}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: FIVE_MASTERS_OPTIMIZE(language) },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const raw = response.choices[0]?.message?.content ?? "";

    const codeMatch = raw.match(/OPTIMIZED_CODE_START\n([\s\S]*?)\nOPTIMIZED_CODE_END/);
    const explanationMatch = raw.match(/EXPLANATION_START\n([\s\S]*?)\nEXPLANATION_END/);

    const optimizedCode = codeMatch?.[1]?.trim() ?? code;
    const explanation = explanationMatch?.[1]?.trim() ?? "Five Masters optimization applied.";

    res.json({ optimizedCode, explanation, language });
  } catch (err) {
    req.log.error({ err }, "Optimize error");
    res.status(500).json({ error: "Optimization failed" });
  }
});

export default router;
