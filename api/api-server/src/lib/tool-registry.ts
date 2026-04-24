/**
 * J.'s Tool Registry — extensible function-calling toolkit.
 *
 * Each tool has:
 *   - definition: OpenAI-compatible function schema (name, description, parameters)
 *   - handler:    async function that executes the tool and returns a string result
 *
 * To add a new tool:
 *   1. Define the schema in TOOL_DEFINITIONS
 *   2. Add a handler in TOOL_HANDLERS
 *   3. That's it — J. will discover and use it automatically
 *
 * Tools are exposed to the LLM via the `tools` parameter in the chat completion.
 * The agent loop in bluej.service.ts handles tool_calls → execution → response.
 */

import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { getOpenAI, getFastModel, hasApiKey } from "./ai-client.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

// ─── Tool Definitions (OpenAI function-calling format) ──────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "execute_code",
      description:
        "Execute code in a sandboxed environment. Supports Python, JavaScript, and C++. " +
        "Use this when the learner asks you to run their code, test something, or when you " +
        "want to demonstrate output. Returns stdout, stderr, exit code, and runtime.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The source code to execute",
          },
          language: {
            type: "string",
            enum: ["python", "javascript", "cpp"],
            description: "Programming language of the code",
          },
        },
        required: ["code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "optimize_code",
      description:
        "Run the Five Sovereign Masters optimization engine on a code block. " +
        "Applies Korotkevich (efficiency), Torvalds (rigor), Carmack (performance), " +
        "Hamilton (reliability), and Ritchie (clarity) in sequence. " +
        "Use when the learner asks to improve, optimize, or review their code.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to optimize",
          },
          language: {
            type: "string",
            description: "Programming language (python, javascript, typescript, cpp)",
          },
        },
        required: ["code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_hardware",
      description:
        "Simulate how code would run on a specific hardware profile — from a Raspberry Pi " +
        "to a cloud GPU instance. Shows realistic terminal output including timing, memory " +
        "usage, and hardware-specific errors (e.g., OOM on low-RAM devices). " +
        "Use when the learner wants to test how their code performs on different machines.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to simulate",
          },
          language: {
            type: "string",
            description: "Programming language",
          },
          profile: {
            type: "string",
            enum: ["auto", "high-end", "mid-range", "budget-laptop", "raspberry-pi", "cloud-gpu"],
            description: "Hardware profile to simulate on. Default: auto",
          },
          os: {
            type: "string",
            enum: ["linux", "macos", "windows", "android", "ios"],
            description: "Operating system to simulate. Default: linux",
          },
        },
        required: ["code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "push_to_github",
      description:
        "Push a code file to a GitHub repository. Requires the learner's GitHub token. " +
        "Creates the repo if it doesn't exist. Use when the learner wants to save or " +
        "share their work on GitHub.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to push",
          },
          language: {
            type: "string",
            description: "Programming language (for default filename)",
          },
          token: {
            type: "string",
            description: "GitHub Personal Access Token",
          },
          owner: {
            type: "string",
            description: "GitHub username / org",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          filename: {
            type: "string",
            description: "Filename to commit (e.g. main.py). Defaults based on language.",
          },
          commitMessage: {
            type: "string",
            description: "Git commit message",
          },
        },
        required: ["code", "language", "token", "owner", "repo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "patch_file",
      description:
        "Apply a natural-language instruction to modify a code file. Returns the updated " +
        "content and a summary of changes. Use when the learner wants to refactor, rename, " +
        "or restructure existing code based on a description.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The current file content to modify",
          },
          instruction: {
            type: "string",
            description: "Natural-language instruction describing the changes to make",
          },
          language: {
            type: "string",
            description: "Programming language of the file",
          },
        },
        required: ["content", "instruction", "language"],
      },
    },
  },
];

// ─── Execution internals (extracted from execute.ts) ────────────────────────

const PYTHON_BLOCKLIST = [
  /\bimport\s+socket\b/, /\bimport\s+subprocess\b/, /\bfrom\s+subprocess\b/,
  /\bos\.system\s*\(/, /\bos\.popen\s*\(/, /\bos\.exec[a-z]+\s*\(/,
  /\b__import__\s*\(\s*['"]socket/, /\b__import__\s*\(\s*['"]subprocess/,
  /\bimport\s+urllib\.request\b/, /\bimport\s+http\.client\b/,
  /\brequests\.get\b/, /\brequests\.post\b/,
];
const JS_BLOCKLIST = [
  /require\s*\(\s*['"]child_process['"]/, /require\s*\(\s*['"]net['"]/,
  /require\s*\(\s*['"]dgram['"]/, /require\s*\(\s*['"]cluster['"]/,
  /\bfetch\s*\(/, /\bXMLHttpRequest\b/,
];
const CPP_BLOCKLIST = [
  /#include\s*<\s*sys\/socket\.h\s*>/, /#include\s*<\s*netinet\/in\.h\s*>/,
  /\bsystem\s*\(/, /\bpopen\s*\(/, /\bexecv[pe]?\s*\(/, /\bfork\s*\(/,
];

const LANG_BLOCKLISTS: Record<string, RegExp[]> = {
  python: PYTHON_BLOCKLIST, javascript: JS_BLOCKLIST, cpp: CPP_BLOCKLIST,
};

function checkSafety(code: string, language: string): string | null {
  for (const re of (LANG_BLOCKLISTS[language] ?? [])) {
    if (re.test(code)) return `Blocked: ${re.source.slice(0, 50)}… Network/subprocess access disabled in sandbox.`;
  }
  return null;
}

const TMP_DIR = "/tmp/bluej-exec";
const EXEC_TIMEOUT_MS = 10_000;
const MAX_OUTPUT = 64 * 1024;

function spawnProcess(cmd: string, args: string[]): Promise<{
  stdout: string; stderr: string; exitCode: number; runtimeMs: number; timedOut: boolean;
}> {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = "", stderr = "";
    let timedOut = false;

    const proc = spawn(cmd, args, {
      env: { PATH: "/usr/local/bin:/usr/bin:/bin", PYTHONDONTWRITEBYTECODE: "1", PYTHONIOENCODING: "utf-8", HOME: "/tmp" },
    });

    const timer = setTimeout(() => { timedOut = true; proc.kill("SIGKILL"); }, EXEC_TIMEOUT_MS);

    proc.stdout.on("data", (c: Buffer) => {
      stdout += c.toString("utf-8");
      if (stdout.length > MAX_OUTPUT) { stdout = stdout.slice(0, MAX_OUTPUT) + "\n[output truncated]"; proc.kill("SIGKILL"); }
    });
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf-8");
      if (stderr.length > MAX_OUTPUT) { stderr = stderr.slice(0, MAX_OUTPUT) + "\n[truncated]"; proc.kill("SIGKILL"); }
    });
    proc.on("close", (code) => { clearTimeout(timer); resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? -1, runtimeMs: Date.now() - start, timedOut }); });
    proc.on("error", (err) => { clearTimeout(timer); resolve({ stdout: "", stderr: err.message, exitCode: -1, runtimeMs: Date.now() - start, timedOut: false }); });
  });
}

// ─── Hardware simulation profiles ───────────────────────────────────────────

const PROFILE_MAP: Record<string, { cores: number; ramGb: number; gpu: string | null; label: string }> = {
  auto:            { cores: 4,  ramGb: 8,  gpu: null,             label: "Auto-detected machine" },
  "high-end":      { cores: 32, ramGb: 64, gpu: null,             label: "High-End Workstation (32-core, 64GB)" },
  "mid-range":     { cores: 8,  ramGb: 16, gpu: null,             label: "Mid-Range PC (8-core, 16GB)" },
  "budget-laptop": { cores: 4,  ramGb: 8,  gpu: null,             label: "Budget Laptop (4-core, 8GB)" },
  "raspberry-pi":  { cores: 4,  ramGb: 4,  gpu: null,             label: "Raspberry Pi 4 (ARM64, 4GB)" },
  "cloud-gpu":     { cores: 8,  ramGb: 16, gpu: "NVIDIA T4 16GB", label: "Cloud GPU (8-core, 16GB, T4)" },
};

// ─── Five Masters optimize prompt ───────────────────────────────────────────

function fiveMastersPrompt(language: string): string {
  return `You are J.'s Five Masters Code Optimization Engine. Apply ALL five, in order.

LANGUAGE: ${language}

1. KOROTKEVICH (Efficiency) — eliminate redundant work, O(n²)→O(n) where possible.
2. TORVALDS (Rigor) — no magic numbers, no silent failures, clear naming.
3. CARMACK (Performance) — minimize allocations, right data structures, ${language}-specific opts.
4. HAMILTON (Reliability) — handle failure modes, validate inputs, no resource leaks.
5. RITCHIE (Clarity) — readable without comments, simplest correct implementation.

Respond ONLY in this format:

OPTIMIZED_CODE_START
<full optimized code — no markdown fences>
OPTIMIZED_CODE_END

EXPLANATION_START
<3-5 sentences, J.'s voice, name which Masters drove each change, one dry observation permitted>
EXPLANATION_END`;
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

const TOOL_HANDLERS: Record<string, ToolHandler> = {

  // ── Execute Code ────────────────────────────────────────────────────────
  async execute_code(args) {
    const code = String(args.code ?? "");
    const language = String(args.language ?? "python");

    if (!code.trim()) return "Error: No code provided.";
    if (!["python", "javascript", "cpp"].includes(language)) return `Error: Unsupported language "${language}". Supported: python, javascript, cpp.`;

    const blocked = checkSafety(code, language);
    if (blocked) return `[SANDBOX] ${blocked}`;

    if (!existsSync(TMP_DIR)) await mkdir(TMP_DIR, { recursive: true });
    const id = randomUUID();

    if (language === "python") {
      const f = join(TMP_DIR, `${id}.py`);
      await writeFile(f, code, "utf-8");
      const r = await spawnProcess("python3", [f]);
      await unlink(f).catch(() => {});
      return formatExecResult(r);
    }
    if (language === "javascript") {
      const f = join(TMP_DIR, `${id}.js`);
      await writeFile(f, code, "utf-8");
      const r = await spawnProcess("node", [f]);
      await unlink(f).catch(() => {});
      return formatExecResult(r);
    }
    if (language === "cpp") {
      const src = join(TMP_DIR, `${id}.cpp`);
      const bin = join(TMP_DIR, `${id}.out`);
      await writeFile(src, code, "utf-8");
      const compile = await spawnProcess("g++", ["-O2", "-std=c++17", "-o", bin, src, "-Wall"]);
      await unlink(src).catch(() => {});
      if (compile.exitCode !== 0) return `[COMPILE ERROR]\n${compile.stderr}`;
      const r = await spawnProcess(bin, []);
      await unlink(bin).catch(() => {});
      return formatExecResult(r);
    }
    return "Error: Unknown language.";
  },

  // ── Optimize Code (Five Masters) ────────────────────────────────────────
  async optimize_code(args) {
    const code = String(args.code ?? "");
    const language = String(args.language ?? "python");

    if (!code.trim()) return "Error: No code provided.";
    if (!hasApiKey()) return "Error: No OpenAI API key configured for optimization engine.";

    try {
      const openai = getOpenAI();
      const resp = await openai.chat.completions.create({
        model: getFastModel(),
        messages: [
          { role: "system", content: fiveMastersPrompt(language) },
          { role: "user", content: `Optimize this ${language} code:\n\n${code}` },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const raw = resp.choices[0]?.message?.content ?? "";
      const codeMatch = raw.match(/OPTIMIZED_CODE_START\n([\s\S]*?)\nOPTIMIZED_CODE_END/);
      const explMatch = raw.match(/EXPLANATION_START\n([\s\S]*?)\nEXPLANATION_END/);

      const optimized = codeMatch?.[1]?.trim() ?? "(optimization produced no output)";
      const explanation = explMatch?.[1]?.trim() ?? "Five Masters optimization applied.";

      return `OPTIMIZED CODE:\n\`\`\`${language}\n${optimized}\n\`\`\`\n\n${explanation}`;
    } catch (err) {
      return `Optimization error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },

  // ── Simulate Hardware ───────────────────────────────────────────────────
  async simulate_hardware(args) {
    const code = String(args.code ?? "");
    const language = String(args.language ?? "python");
    const profileId = String(args.profile ?? "auto");
    const os = String(args.os ?? "linux");

    if (!code.trim()) return "Error: No code provided.";
    if (!hasApiKey()) return "Error: No API key configured for simulation engine.";

    const baseProfile = PROFILE_MAP[profileId] ?? PROFILE_MAP["auto"];
    const gpuLine = baseProfile.gpu
      ? `GPU: ${baseProfile.gpu} — CUDA available.`
      : "No GPU — CPU only.";

    const systemPrompt = `You are J.'s hardware simulation engine. Simulate running code on:

TARGET: ${baseProfile.label}
CPU: ${baseProfile.cores} cores | RAM: ${baseProfile.ramGb}GB | ${gpuLine} | OS: ${os}

Rules: Show realistic terminal output with timing. OOM if code exceeds RAM. No markdown. After output, add "---" then one dry J. observation.`;

    try {
      const openai = getOpenAI();
      const resp = await openai.chat.completions.create({
        model: getFastModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Simulate:\n\`\`\`${language}\n${code}\n\`\`\`` },
        ],
        temperature: 0.15,
        max_tokens: 600,
      });
      return resp.choices[0]?.message?.content ?? "(simulation failed)";
    } catch (err) {
      return `Simulation error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },

  // ── Push to GitHub ──────────────────────────────────────────────────────
  async push_to_github(args) {
    const { code, language, token, owner, repo, filename, commitMessage } = args as Record<string, string>;

    if (!token?.trim()) return "Error: GitHub token is required.";
    if (!owner?.trim() || !repo?.trim()) return "Error: GitHub owner and repo are required.";
    if (!code?.trim()) return "Error: No code to push.";

    const file = filename || ({ python: "main.py", javascript: "main.js", cpp: "main.cpp" }[language] ?? "main.txt");
    const message = commitMessage || `J. export — ${language} — ${new Date().toISOString().slice(0, 10)}`;

    const ghFetch = async (path: string, method = "GET", body?: unknown) => {
      const res = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json",
          "User-Agent": "BLUEJ-AI/1.0",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    };

    try {
      // Verify token
      const auth = await ghFetch("/user");
      if (auth.status === 401) return "Error: Invalid GitHub token.";

      // Check if repo exists, create if not
      const repoCheck = await ghFetch(`/repos/${owner}/${repo}`);
      if (repoCheck.status === 404) {
        const create = await ghFetch("/user/repos", "POST", { name: repo, auto_init: true, private: false });
        if (create.status > 299) return `Error: Could not create repo — ${JSON.stringify(create.data)}`;
      }

      // Get current file SHA if it exists
      const existing = await ghFetch(`/repos/${owner}/${repo}/contents/${file}`);
      const sha = existing.status === 200 ? (existing.data as { sha?: string }).sha : undefined;

      // Push the file
      const push = await ghFetch(`/repos/${owner}/${repo}/contents/${file}`, "PUT", {
        message, content: Buffer.from(code).toString("base64"), sha,
      });

      if (push.status <= 299) {
        return `✅ Pushed ${file} to ${owner}/${repo}\nCommit: ${message}\nURL: https://github.com/${owner}/${repo}/blob/main/${file}`;
      }
      return `Error: Push failed (${push.status}) — ${JSON.stringify(push.data)}`;
    } catch (err) {
      return `GitHub error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },

  // ── Patch File ──────────────────────────────────────────────────────────
  async patch_file(args) {
    const content = String(args.content ?? "");
    const instruction = String(args.instruction ?? "");
    const language = String(args.language ?? "");

    if (!content.trim() || !instruction.trim()) return "Error: Content and instruction are required.";
    if (!hasApiKey()) return "Error: No API key configured for patch engine.";

    try {
      const openai = getOpenAI();
      const resp = await openai.chat.completions.create({
        model: getFastModel(),
        messages: [
          { role: "system", content: "You are a precise code patch engine. Return only valid JSON with keys updatedContent and summary." },
          {
            role: "user",
            content: `Patch this ${language} file:\nInstruction: ${instruction}\n\n${content}`,
          },
        ],
        temperature: 0.1,
        max_completion_tokens: 2400,
        response_format: { type: "json_object" },
      });

      const raw = resp.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { updatedContent?: string; summary?: string };
      const updated = parsed.updatedContent?.trim() || content;
      const summary = parsed.summary?.trim() || "Patch applied.";
      return `${summary}\n\nUpdated code:\n\`\`\`${language}\n${updated}\n\`\`\``;
    } catch (err) {
      return `Patch error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatExecResult(r: { stdout: string; stderr: string; exitCode: number; runtimeMs: number; timedOut: boolean }): string {
  const parts: string[] = [];
  if (r.timedOut) parts.push("[TIMED OUT — 10s limit]");
  if (r.stdout) parts.push(r.stdout);
  if (r.stderr) parts.push(`STDERR:\n${r.stderr}`);
  parts.push(`\nExit code: ${r.exitCode} | Runtime: ${r.runtimeMs}ms`);
  return parts.join("\n");
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Get all tool definitions for the LLM */
export function getToolDefinitions(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}

/** Execute a tool by name with given arguments */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return `Error: Unknown tool "${name}". Available: ${Object.keys(TOOL_HANDLERS).join(", ")}`;

  try {
    return await handler(args);
  } catch (err) {
    return `Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** List available tool names (for introspection / help) */
export function listToolNames(): string[] {
  return TOOL_DEFINITIONS.map((t) => t.function.name);
}
