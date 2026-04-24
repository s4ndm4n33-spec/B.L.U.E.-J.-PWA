import { Router, type IRouter } from "express";
import { getOpenAI, getChatModel, getFastModel, hasApiKey } from "../../lib/ai-client.js";
import { askTutor, askAgent, hasPioneerKey } from "../../lib/bluej.service.js";
import type { JContext } from "../../lib/bluej.service.js";
import db from "../../lib/mem-store.js";
import { buildSystemPrompt, buildSafetyCheck } from "./j-personality.js";
import { CURRICULUM } from "./curriculum.js";
import { z } from "zod";

const router: IRouter = Router();

const ChatWithJBody = z.object({
  sessionId: z.string(),
  message: z.string(),
  conversationId: z.number().nullable().optional(),
  language: z.string().default("python"),
  os: z.string().default("linux"),
  phaseIndex: z.number().default(0),
  taskIndex: z.number().default(0),
  hardwareInfo: z.any().optional(),
  learnerMode: z.string().optional(),
  providerMode: z.string().optional(),
  model: z.string().optional(), // User can override model per-request
  agentPassword: z.string().optional(), // Pioneer agent mode password
});

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

async function runCodeGauntlet(code: string, language: string): Promise<GauntletResult> {
  if (!code || code.length < 20 || !hasApiKey()) return { passed: true, violations: [] };

  const rules = resolveRules(language).join("\n");
  const prompt = `Audit this ${language} code against ONLY these 5 style rules. Be strict but pragmatic — only flag genuine violations.\n\nRULES:\n${rules}\n\nCODE:\n\`\`\`${language}\n${code}\n\`\`\`\n\nRespond ONLY in valid JSON (no markdown, no explanation):\n{"passed": true|false, "violations": ["specific violation here"]}`;

  try {
    const openai = getOpenAI();
    const resp = await openai.chat.completions.create({
      model: getFastModel(),
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
    return { passed: true, violations: [] };
  }
}

async function generateWithGauntlet(
  chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  language: string,
  requestModel?: string,
  maxRetries = 2
): Promise<string> {
  const openai = getOpenAI();
  const model = requestModel || getChatModel();
  let attempt = 0;
  let currentMessages = [...chatMessages];
  let lastResponse = "";

  while (attempt < maxRetries) {
    attempt++;

    const response = await openai.chat.completions.create({
      model,
      max_completion_tokens: 8192,
      messages: currentMessages,
      stream: false,
    });

    const fullResponse = response.choices[0]?.message?.content ?? "";
    lastResponse = fullResponse;
    if (!fullResponse) return fullResponse;

    const codeBlocks = extractCodeBlocks(fullResponse);
    if (codeBlocks.length === 0) return fullResponse;

    const allViolations: string[] = [];
    for (const block of codeBlocks) {
      const result = await runCodeGauntlet(block.code, block.lang || language);
      if (!result.passed) {
        allViolations.push(...result.violations);
      }
    }

    if (allViolations.length === 0) return fullResponse;
    if (attempt >= maxRetries) return lastResponse;

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
    // Need either Pioneer or OpenAI configured
    if (!hasPioneerKey() && !hasApiKey()) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ content: "⚠️ No API key configured. Set PIONEER_API_KEY in .env for Pioneer AI, or go to Settings → AI Provider and enter your OpenAI API key. For offline use, switch to Local AI mode." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const body = ChatWithJBody.parse(req.body);
    const { sessionId, message, language, os, phaseIndex, taskIndex, hardwareInfo, model } = body;
    const learnerMode = parseLearnerMode(req.body.learnerMode);
    let conversationId = body.conversationId ?? null;

    const safety = buildSafetyCheck(message);
    if (!safety.safe) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ content: safety.reason })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
      return res.end();
    }

    // Create or get conversation
    if (!conversationId) {
      const phase = CURRICULUM[phaseIndex];
      const title = phase
        ? `${phase.name} — ${sessionId.slice(0, 8)}`
        : `Session ${sessionId.slice(0, 8)}`;
      const conv = db.createConversation(title);
      conversationId = conv.id;
    }

    const existingMessages = db.getMessages(conversationId);
    const messageHistory = existingMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const currentPhase = CURRICULUM[phaseIndex] ?? null;
    const currentTask = currentPhase?.tasks[taskIndex] ?? null;

    db.addMessage(conversationId, "user", message);

    // ── Generate response: Pioneer (preferred) → OpenAI (fallback) ──
    let fullResponse: string;

    if (hasPioneerKey()) {
      // Build J context for Pioneer service
      const jCtx: JContext = {
        phaseIndex,
        taskIndex,
        currentPhase,
        currentTask,
        language,
        os,
        hardwareInfo: hardwareInfo as { cpuCores?: number | null; ramGb?: number | null; platform?: string | null } | null | undefined,
        messageHistory: messageHistory.slice(-20),
        learnerMode,
      };

      if (body.agentPassword) {
        // Agent mode — password gated, full tool access
        fullResponse = await askAgent(jCtx, message, body.agentPassword);
      } else {
        // Tutor mode — always available, no tools
        fullResponse = await askTutor(jCtx, message);
      }
    } else {
      // Fallback to existing OpenAI flow with Code Gauntlet
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

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messageHistory.slice(-20).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ];

      fullResponse = await generateWithGauntlet(chatMessages, language, model ?? undefined);
    }

    db.addMessage(conversationId, "assistant", fullResponse);
    db.upsertProgress(sessionId, { conversationId, selectedLanguage: language, selectedOs: os });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

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
