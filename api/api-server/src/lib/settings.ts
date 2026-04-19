/**
 * AI Settings — persistent config for API key, model, and endpoint.
 *
 * Priority: runtime memory → settings.json file → env vars → defaults.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface AISettings {
  apiKey: string;
  baseUrl: string;       // Custom endpoint (Ollama, LM Studio, etc.)
  chatModel: string;     // Primary model for chat
  fastModel: string;     // Smaller/cheaper model for gauntlet, optimize
  ttsModel: string;      // TTS model
  ttsVoice: string;      // Default TTS voice
  sttModel: string;      // STT model (whisper)
}

const DEFAULTS: AISettings = {
  apiKey: "",
  baseUrl: "",
  chatModel: "gpt-4o",
  fastModel: "gpt-4o-mini",
  ttsModel: "tts-1",
  ttsVoice: "nova",
  sttModel: "whisper-1",
};

// In-memory settings (highest priority when set)
let _runtime: Partial<AISettings> = {};

function settingsDir(): string {
  const dir = join(homedir(), ".bluej");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function settingsPath(): string {
  return join(settingsDir(), "settings.json");
}

function loadFile(): Partial<AISettings> {
  try {
    const p = settingsPath();
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8"));
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

function fromEnv(): Partial<AISettings> {
  const env: Partial<AISettings> = {};
  if (process.env.OPENAI_API_KEY) env.apiKey = process.env.OPENAI_API_KEY;
  if (process.env.OPENAI_BASE_URL) env.baseUrl = process.env.OPENAI_BASE_URL;
  if (process.env.OPENAI_MODEL) env.chatModel = process.env.OPENAI_MODEL;
  if (process.env.BLUEJ_FAST_MODEL) env.fastModel = process.env.BLUEJ_FAST_MODEL;
  return env;
}

/** Get merged settings: runtime → file → env → defaults */
export function getSettings(): AISettings {
  const file = loadFile();
  const env = fromEnv();
  return { ...DEFAULTS, ...env, ...file, ..._runtime };
}

/** Update settings at runtime + persist to file */
export function updateSettings(patch: Partial<AISettings>): AISettings {
  _runtime = { ..._runtime, ...patch };

  // Also persist to file
  const file = loadFile();
  const merged = { ...file, ...patch };
  try {
    writeFileSync(settingsPath(), JSON.stringify(merged, null, 2));
  } catch (err) {
    console.warn("[settings] Could not write settings file:", err);
  }

  return getSettings();
}

/** Get settings safe for client (masks API key) */
export function getSettingsPublic(): AISettings & { hasKey: boolean } {
  const s = getSettings();
  return {
    ...s,
    apiKey: s.apiKey ? `sk-...${s.apiKey.slice(-4)}` : "",
    hasKey: Boolean(s.apiKey && s.apiKey.length > 10),
  };
}
