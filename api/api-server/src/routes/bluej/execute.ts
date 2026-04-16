import { Router, type IRouter } from "express";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

const router: IRouter = Router();

// ─── Basic code safety filter ────────────────────────────────────────────────
// Blocks the most common dangerous patterns before execution.
// This is NOT a full sandbox — it's a best-effort layer for beta testing.
// For public launch, swap the executor for a proper isolation service.

const PYTHON_BLOCKLIST = [
  /\bimport\s+socket\b/,
  /\bimport\s+subprocess\b/,
  /\bfrom\s+subprocess\b/,
  /\bos\.system\s*\(/,
  /\bos\.popen\s*\(/,
  /\bos\.exec[a-z]+\s*\(/,
  /\beval\s*\(.*fetch|eval\s*\(.*request/i,
  /\bexec\s*\(.*fetch|exec\s*\(.*request/i,
  /\b__import__\s*\(\s*['"]socket/,
  /\b__import__\s*\(\s*['"]subprocess/,
  /\bimport\s+urllib\.request\b/,
  /\bimport\s+http\.client\b/,
  /\brequests\.get\b/,
  /\brequests\.post\b/,
];

const JS_BLOCKLIST = [
  /require\s*\(\s*['"]child_process['"]/,
  /require\s*\(\s*['"]net['"]/,
  /require\s*\(\s*['"]dgram['"]/,
  /require\s*\(\s*['"]cluster['"]/,
  /require\s*\(\s*['"]worker_threads['"]/,
  /\bexec\s*\(/,
  /\bspawn\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
];

const CPP_BLOCKLIST = [
  /#include\s*<\s*sys\/socket\.h\s*>/,
  /#include\s*<\s*netinet\/in\.h\s*>/,
  /#include\s*<\s*arpa\/inet\.h\s*>/,
  /\bsystem\s*\(/,
  /\bpopen\s*\(/,
  /\bexecv[pe]?\s*\(/,
  /\bfork\s*\(/,
];

const LANG_BLOCKLISTS: Record<string, RegExp[]> = {
  python: PYTHON_BLOCKLIST,
  javascript: JS_BLOCKLIST,
  cpp: CPP_BLOCKLIST,
};

function checkSafety(code: string, language: string): string | null {
  const patterns = LANG_BLOCKLISTS[language] ?? [];
  for (const re of patterns) {
    if (re.test(code)) {
      return `Blocked pattern detected (${re.source.slice(0, 60)}). Network access and subprocess execution are disabled in the sandbox.`;
    }
  }
  return null;
}

// ─── Local execution ─────────────────────────────────────────────────────────
const PYTHON_BIN = "/home/runner/.nix-profile/bin/python3";
const GPP_BIN    = "/nix/store/q5qbngdpv0n9zgh42d3ssprj31cf779j-replit-runtime-path/bin/g++";
const NODE_BIN   = process.execPath;
const EXEC_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64KB
const TMP_DIR = "/tmp/bluej-exec";

async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) await mkdir(TMP_DIR, { recursive: true });
}

function spawnProcess(cmd: string, args: string[]): Promise<{
  stdout: string; stderr: string; exitCode: number; runtimeMs: number; timedOut: boolean;
}> {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = "", stderr = "";
    let timedOut = false;

    const proc = spawn(cmd, args, {
      env: {
        // Minimal env — no credentials, no tokens
        PATH: "/usr/local/bin:/usr/bin:/bin",
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONIOENCODING: "utf-8",
        HOME: "/tmp",
      },
    });

    const timer = setTimeout(() => { timedOut = true; proc.kill("SIGKILL"); }, EXEC_TIMEOUT_MS);

    proc.stdout.on("data", (c: Buffer) => {
      stdout += c.toString("utf-8");
      if (stdout.length > MAX_OUTPUT_BYTES) {
        stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + "\n[output truncated — 64KB limit]";
        proc.kill("SIGKILL");
      }
    });
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf-8");
      if (stderr.length > MAX_OUTPUT_BYTES) {
        stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + "\n[error output truncated]";
        proc.kill("SIGKILL");
      }
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? -1, runtimeMs: Date.now() - start, timedOut });
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout: "", stderr: err.message, exitCode: -1, runtimeMs: Date.now() - start, timedOut: false });
    });
  });
}

// ─── Route ───────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { code, language } = req.body as { code: string; language: string };

  if (!code?.trim()) {
    res.status(400).json({ error: "No code provided." });
    return;
  }

  const supportedLangs = ["python", "javascript", "cpp"];
  if (!supportedLangs.includes(language)) {
    res.status(400).json({ error: `Unsupported language: ${language}` });
    return;
  }

  // Safety filter first
  const blocked = checkSafety(code, language);
  if (blocked) {
    res.json({
      stdout: "",
      stderr: `[SANDBOX] ${blocked}`,
      exitCode: 1,
      runtimeMs: 0,
      timedOut: false,
      phase: "blocked",
      engine: "sandbox-filter",
    });
    return;
  }

  await ensureTmpDir();
  const id = randomUUID();

  try {
    if (language === "python") {
      const f = join(TMP_DIR, `${id}.py`);
      await writeFile(f, code, "utf-8");
      const r = await spawnProcess(PYTHON_BIN, [f]);
      await unlink(f).catch(() => {});
      res.json({ ...r, phase: "run", engine: "server" });

    } else if (language === "javascript") {
      const f = join(TMP_DIR, `${id}.js`);
      await writeFile(f, code, "utf-8");
      const r = await spawnProcess(NODE_BIN, [f]);
      await unlink(f).catch(() => {});
      res.json({ ...r, phase: "run", engine: "server" });

    } else if (language === "cpp") {
      const src = join(TMP_DIR, `${id}.cpp`);
      const bin = join(TMP_DIR, `${id}.out`);
      await writeFile(src, code, "utf-8");
      const compile = await spawnProcess(GPP_BIN, ["-O2", "-std=c++17", "-o", bin, src, "-Wall"]);
      await unlink(src).catch(() => {});
      if (compile.exitCode !== 0) {
        res.json({ ...compile, phase: "compile", engine: "server" });
        return;
      }
      const run = await spawnProcess(bin, []);
      await unlink(bin).catch(() => {});
      res.json({ ...run, phase: "run", engine: "server" });
    }
  } catch (err) {
    req.log.error({ err }, "Execute error");
    res.status(500).json({ error: "Execution failed unexpectedly." });
  }
});

export default router;
