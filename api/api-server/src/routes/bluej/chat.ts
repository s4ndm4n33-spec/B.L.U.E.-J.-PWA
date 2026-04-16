import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { conversations as conversationsTable, messages as messagesTable, userProgressTable } from "@workspace/db";
import { ChatWithJBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { buildSystemPrompt, buildSafetyCheck } from "./j-personality.js";
import { CURRICULUM } from "./curriculum.js";

const router: IRouter = Router();

const VALID_LEARNER_MODES = new Set(["kids", "teen", "adult-beginner", "advanced"]);
type LearnerMode = "kids" | "teen" | "adult-beginner" | "advanced";

function parseLearnerMode(raw: unknown): LearnerMode {
  if (typeof raw === "string" && VALID_LEARNER_MODES.has(raw)) {
    return raw as LearnerMode;
  }
  return "adult-beginner";
}

function extractCodeBlocks(text: string): Array<{ lang: string; code: string }> {
  const blocks: Array<{ lang: string; code: string }> = [];
  const regex = /```([\w+#.-]+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const lang = (match[1] ?? "python").toLowerCase();
    const code = match[2]?.trim() ?? "";
    if (code.length > 10) blocks.push({ lang, code });
  }
  return blocks;
}

const STYLE_RULES: Record<string, string[]> = {
  python: [
    "1. snake_case for all variable and function names — no camelCase or mixedCase",
    "2. 4-space indentation — no tabs, no 2-space indents",
    "3. Spaces around all operators: a = 1 (not a=1); x + y (not x+y)",
    "4. Consistent string quotes — do not mix single and double quotes in the same block",
    "5. Always specify exception type in except clauses — never bare `except:` without a type",
  ],
  javascript: [
    "1. Use const for all bindings that are never reassigned; let for reassignable — never var",
    "2. Arrow functions for all callbacks and anonymous functions",
    "3. Template literals (`) instead of string concatenation with +",
    "4. Strict equality === for all comparisons — never == or !=",
    "5. camelCase for variable/function names, PascalCase for classes and constructors",
  ],
  typescript: [
    "1. Explicit types on all function parameters and return values (no implicit any)",
    "2. Use const for all bindings that are never reassigned — never var",
    "3. Template literals instead of string concatenation",
    "4. Strict equality === for all comparisons",
    "5. camelCase for identifiers, PascalCase for types/interfaces/classes",
  ],
  cpp: [
    "1. Use #pragma once or proper include guards in every header file",
    "2. Pass large objects by const reference (&) — never by value unless intentionally copying",
    "3. Use nullptr instead of NULL or 0 for null pointers",
    "4. Prefer std::string over raw char* for string handling",
    "5. Initialize every variable at declaration — no uninitialized reads",
  ],
};

function resolveRules(lang: string): string[] {
  if (lang.includes("python") || lang === "py") return STYLE_RULES.python;
  if (lang.includes("typescript") || lang === "ts" || lang === "tsx") return STYLE_RULES.typescript;
  if (lang.includes("javascript") || lang === "js" || lang === "jsx") return STYLE_RULES.javascript;
  if (lang.includes("c++") || lang === "cpp" || lang === "c") return STYLE_RULES.cpp;
  return STYLE_RULES.python;
}

interface GauntletResult {
  passed: boolean;
  violations: string[];
}

async function runCodeGauntlet(
  code: string,
  language: string
): Promise<GauntletResult> {
  if (!code || code.length < 20) return { passed: true, violations: [] };

  const rules = resolveRules(language).join("\n");
  const prompt = `Audit this ${language} code against ONLY these 5 style rules. Be strict but pragmatic — only flag genuine violations.

RULES:
${rules}

CODE:
\`\`\`${language}
${code}
\`\`\`

Respond ONLY in valid JSON (no markdown, no explanation):
{"passed": true|false, "violations": ["specific violation here"]}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a strict code quality auditor. Respond only in raw JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { passed?: boolean; violations?: string[] };
    return {
      passed: parsed.passed !== false,
      violations: Array.isArray(parsed.violations) ? parsed.violations : [],
    };
  } catch {
    // Fail-open: audit service errors must never block J. from sending code
    return { passed: true, violations: [] };
  }
}

async function generateWithGauntlet(
  chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  language: string,
  maxRetries = 2
): Promise<string> {
  let attempt = 0;
  let currentMessages = [...chatMessages];
  let lastResponse = "";

  while (attempt < maxRetries) {
    attempt++;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: currentMessages,
      stream: false,
    });

    const fullResponse = response.choices[0]?.message?.content ?? "";
    lastResponse = fullResponse;
    if (!fullResponse) return fullResponse;

    const codeBlocks = extractCodeBlocks(fullResponse);
    if (codeBlocks.length === 0) return fullResponse;

    // Validate ALL code blocks — aggregate violations across every block
    const allViolations: string[] = [];
    for (const block of codeBlocks) {
      const result = await runCodeGauntlet(block.code, block.lang || language);
      if (!result.passed) {
        allViolations.push(...result.violations);
      }
    }

    if (allViolations.length === 0) {
      return fullResponse;
    }

    if (attempt >= maxRetries) {
      // Retries exhausted — send the best available response with code intact.
      // The gauntlet is a quality advisor; it must never prevent J. from writing code.
      return lastResponse;
    }

    // Violations found — re-prompt J. to correct every flagged block
    const fixPrompt = [
      "Your code contains the following best-practice violations across one or more code blocks. Please revise your ENTIRE previous response to correct all of them:",
      "",
      allViolations.map((v, i) => `${i + 1}. ${v}`).join("\n"),
      "",
      "Reproduce the full explanation with corrected code. Do not acknowledge this correction — simply provide the improved response as if it were your first attempt.",
    ].join("\n");

    currentMessages = [
      ...currentMessages,
      { role: "assistant" as const, content: fullResponse },
      { role: "user" as const, content: fixPrompt },
    ];
  }

  return lastResponse;
}

router.post("/", async (req, res) => {
  try {
    const body = ChatWithJBody.parse(req.body);
    const { sessionId, message, language, os, phaseIndex, taskIndex, hardwareInfo } = body;

    // Validated learnerMode (not raw cast)
    const learnerMode = parseLearnerMode(req.body.learnerMode);
    let conversationId = body.conversationId;

    // Safety check
    const safety = buildSafetyCheck(message);
    if (!safety.safe) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ content: safety.reason })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
      return res.end();
    }

    // Ensure conversation record
    if (!conversationId) {
      const phase = CURRICULUM[phaseIndex];
      const title = phase
        ? `${phase.name} — ${sessionId.slice(0, 8)}`
        : `Session ${sessionId.slice(0, 8)}`;
      const conv = await db.insert(conversationsTable).values({ title }).returning();
      conversationId = conv[0].id;
    }

    const existingMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);

    const messageHistory = existingMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const currentPhase = CURRICULUM[phaseIndex] ?? null;
    const currentTask = currentPhase?.tasks[taskIndex] ?? null;

    const systemPrompt = buildSystemPrompt({
      phaseIndex,
      taskIndex,
      currentPhase,
      currentTask,
      language,
      os,
      hardwareInfo: hardwareInfo as { cpuCores?: number | null; ramGb?: number | null; platform?: string | null } | null | undefined,
      messageHistory,
      learnerMode,
    });

    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: message,
    });

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messageHistory.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const fullResponse = await generateWithGauntlet(chatMessages, language);

    await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    await db
      .update(userProgressTable)
      .set({ conversationId, selectedLanguage: language, selectedOs: os, updatedAt: new Date() })
      .where(eq(userProgressTable.sessionId, sessionId));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Chunk the response so it still feels streaming
    const CHUNK = 20;
    for (let i = 0; i < fullResponse.length; i += CHUNK) {
      res.write(`data: ${JSON.stringify({ content: fullResponse.slice(i, i + CHUNK) })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Internal error", done: true })}\n\n`);
      res.end();
    }
  }
});

export default router;
