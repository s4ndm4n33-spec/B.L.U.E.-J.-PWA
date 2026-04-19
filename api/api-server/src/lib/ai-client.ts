/**
 * Configurable OpenAI client — replaces @workspace/integrations-openai-ai-server.
 *
 * Reads config from (in priority order):
 *   1. Runtime settings (set via /api/bluej/settings endpoint)
 *   2. Environment variables (OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL)
 *   3. Defaults
 */
import OpenAI from "openai";
import { getSettings, type AISettings } from "./settings.js";

let _client: OpenAI | null = null;
let _lastKey = "";
let _lastBase = "";

/** Current resolved settings */
export function currentSettings(): AISettings {
  return getSettings();
}

/** Get or create an OpenAI client using current settings */
export function getOpenAI(): OpenAI {
  const s = getSettings();
  // Recreate client if key or endpoint changed
  if (!_client || s.apiKey !== _lastKey || s.baseUrl !== _lastBase) {
    _lastKey = s.apiKey;
    _lastBase = s.baseUrl;
    _client = new OpenAI({
      apiKey: s.apiKey || "sk-missing",
      baseURL: s.baseUrl || undefined,
      // Don't throw on missing key — let the request fail with a clear error
      dangerouslyAllowBrowser: false,
    });
  }
  return _client;
}

/** Convenience: get the configured chat model */
export function getChatModel(): string {
  return getSettings().chatModel;
}

/** Convenience: get the configured fast/utility model */
export function getFastModel(): string {
  return getSettings().fastModel;
}

/** Check if we have a usable API key */
export function hasApiKey(): boolean {
  const key = getSettings().apiKey;
  return Boolean(key && key !== "sk-missing" && key.length > 10);
}

// Re-export as `openai` for easy drop-in replacement
export { getOpenAI as openai };
