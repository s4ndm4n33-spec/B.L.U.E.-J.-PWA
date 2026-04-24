/**
 * Pioneer AI service — custom tutor + agent models for B.L.U.E.-J.
 *
 * Tutor model: always available, 1 024 token cap, NO tool access
 * Agent model: password-gated, 4 096 token cap, FULL tool access
 *
 * The agent mode runs an agentic loop:
 *   1. Send message + tool definitions to Pioneer
 *   2. If model returns tool_calls → execute → feed results back
 *   3. Repeat until model returns a final text response (max 10 iterations)
 *
 * Requires env vars:
 *   PIONEER_API_KEY        — your Pioneer API key
 *   BLUEJ_AGENT_PASSWORD   — password to unlock agent mode
 */

const PIONEER_API = "https://api.pioneer.ai/v1/chat/completions";
const API_KEY     = process.env.PIONEER_API_KEY;

const MODELS = {
  tutor: "100390fc-50f3-4fcd-a322-c62ed09c68e0",
  agent: "5797afdf-e08c-464b-be37-6d97666ff81d",
} as const;

import { buildSystemPrompt } from "../routes/bluej/j-personality.js";
import type { JContext } from "../routes/bluej/j-personality.js";
import { getToolDefinitions, executeTool, type ToolDefinition } from "./tool-registry.js";

export type { JContext };

// ── Password gate ───────────────────────────────────────────────────
const AGENT_PASSWORD = process.env.BLUEJ_AGENT_PASSWORD ?? "changeme";

function isAgentUnlocked(userPassword: string): boolean {
  return userPassword === AGENT_PASSWORD;
}

// ── Types for OpenAI-compatible tool calling ────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
}

// ── Core caller (simple, no tools) ──────────────────────────────────

async function callPioneer(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  tools?: ToolDefinition[],
): Promise<ChatCompletionResponse> {
  if (!API_KEY) throw new Error("PIONEER_API_KEY not set in environment");

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
  };

  // Only include tools if provided (tutor mode has no tools)
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(PIONEER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pioneer API error ${res.status}: ${err}`);
  }

  return (await res.json()) as ChatCompletionResponse;
}

// ── Simple call (tutor — no tools) ──────────────────────────────────

async function callSimple(
  model: string,
  ctx: JContext,
  userMessage: string,
  maxTokens = 1024,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(ctx) },
    ...ctx.messageHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const resp = await callPioneer(model, messages, maxTokens);
  return resp.choices[0]?.message?.content ?? "";
}

// ── Agentic call (agent — with tools) ───────────────────────────────

const MAX_TOOL_ITERATIONS = 10;

async function callWithTools(
  model: string,
  ctx: JContext,
  userMessage: string,
  maxTokens = 4096,
): Promise<string> {
  const tools = getToolDefinitions();

  // Build the tool-aware system prompt
  const basePrompt = buildSystemPrompt(ctx);
  const toolSystemAddendum = `

TOOL ACCESS — AGENT MODE ACTIVE
You have access to the following tools. Use them when appropriate — don't just describe what you would do, actually do it. When the learner asks you to run code, optimize code, simulate hardware, etc., call the corresponding tool.

Available tools: ${tools.map((t) => t.function.name).join(", ")}

After using a tool, explain the results to the learner in your characteristic style. You may chain multiple tools in one turn (e.g., optimize then execute to show the improvement).`;

  const messages: ChatMessage[] = [
    { role: "system", content: basePrompt + toolSystemAddendum },
    ...ctx.messageHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  // Agent loop — tool calls until final text response
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const resp = await callPioneer(model, messages, maxTokens, tools);
    const choice = resp.choices[0];
    const assistantMsg = choice?.message;

    if (!assistantMsg) break;

    // If no tool calls, we have the final response
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return assistantMsg.content ?? "";
    }

    // Append the assistant message with tool_calls
    messages.push({
      role: "assistant",
      content: assistantMsg.content,
      tool_calls: assistantMsg.tool_calls,
    });

    // Execute each tool call and append results
    for (const toolCall of assistantMsg.tool_calls) {
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      console.log(`[J. Agent] Tool call: ${toolCall.function.name}(${Object.keys(args).join(", ")})`);
      const result = await executeTool(toolCall.function.name, args);
      console.log(`[J. Agent] Tool result: ${result.slice(0, 200)}${result.length > 200 ? "..." : ""}`);

      messages.push({
        role: "tool",
        content: result,
        tool_call_id: toolCall.id,
      });
    }

    // Continue the loop — model will process tool results and either
    // call more tools or give a final text response
  }

  return "I seem to have gotten a bit recursive there. Let me try a more direct approach — could you rephrase your request?";
}

// ── Public API ──────────────────────────────────────────────────────

/** Tutor mode — always available, no tool access */
export async function askTutor(
  ctx: JContext,
  userMessage: string,
): Promise<string> {
  return callSimple(MODELS.tutor, ctx, userMessage, 1024);
}

/** Agent mode — password gated, full tool access */
export async function askAgent(
  ctx: JContext,
  userMessage: string,
  password: string,
): Promise<string> {
  if (!isAgentUnlocked(password)) {
    return "I'm afraid Agent Mode is locked. Complete the curriculum to earn the key.";
  }
  return callWithTools(MODELS.agent, ctx, userMessage, 4096);
}

/** Check if Pioneer API is configured */
export function hasPioneerKey(): boolean {
  return Boolean(API_KEY && API_KEY.length > 5);
}
