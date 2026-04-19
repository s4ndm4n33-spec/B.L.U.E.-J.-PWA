/**
 * AI Provider settings store — manages API key, model, and endpoint.
 *
 * For STANDALONE mode (Electron/Capacitor): the frontend calls OpenAI directly.
 * For HOSTED mode (web/Replit): the frontend hits the Express server.
 *
 * Settings are persisted to localStorage and synced to the server when available.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProviderMode = 'auto' | 'cloud' | 'local';

export interface AIProviderState {
  providerMode: ProviderMode;
  apiKey: string;            // User's OpenAI API key
  baseUrl: string;           // Custom endpoint (Ollama, LM Studio, etc.)
  chatModel: string;         // Primary model for chat
  fastModel: string;         // Smaller model for optimize/gauntlet
  ttsVoice: string;          // Default TTS voice
  localEndpoint: string;     // Local AI server endpoint (LM Studio etc.)
  hasServerAccess: boolean;  // Whether Express server is reachable

  // Actions
  setProviderMode: (mode: ProviderMode) => void;
  setApiKey: (key: string) => void;
  setBaseUrl: (url: string) => void;
  setChatModel: (model: string) => void;
  setFastModel: (model: string) => void;
  setTtsVoice: (voice: string) => void;
  setLocalEndpoint: (url: string) => void;
  setHasServerAccess: (v: boolean) => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const useAIProviderStore = create<AIProviderState>()(
  persist(
    (set, get) => ({
      providerMode: 'auto',
      apiKey: '',
      baseUrl: '',
      chatModel: 'gpt-4o',
      fastModel: 'gpt-4o-mini',
      ttsVoice: 'nova',
      localEndpoint: 'http://localhost:1234/v1',
      hasServerAccess: true,

      setProviderMode: (mode) => set({ providerMode: mode }),
      setApiKey: (key) => set({ apiKey: key }),
      setBaseUrl: (url) => set({ baseUrl: url }),
      setChatModel: (model) => set({ chatModel: model }),
      setFastModel: (model) => set({ fastModel: model }),
      setTtsVoice: (voice) => set({ ttsVoice: voice }),
      setLocalEndpoint: (url) => set({ localEndpoint: url }),
      setHasServerAccess: (v) => set({ hasServerAccess: v }),

      syncToServer: async () => {
        try {
          const { apiKey, baseUrl, chatModel, fastModel, ttsVoice } = get();
          await fetch('/api/bluej/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, baseUrl, chatModel, fastModel, ttsVoice }),
          });
        } catch {
          // Server not available — settings still persist in localStorage
        }
      },

      loadFromServer: async () => {
        try {
          const res = await fetch('/api/bluej/settings');
          if (res.ok) {
            const data = await res.json();
            set({ hasServerAccess: true });
            // Only sync model/voice from server, not the key (it's masked)
            if (data.chatModel) set({ chatModel: data.chatModel });
            if (data.fastModel) set({ fastModel: data.fastModel });
            if (data.ttsVoice) set({ ttsVoice: data.ttsVoice });
          }
        } catch {
          set({ hasServerAccess: false });
        }
      },
    }),
    {
      name: 'bluej-ai-provider',
      partialize: (state) => ({
        providerMode: state.providerMode,
        apiKey: state.apiKey,
        baseUrl: state.baseUrl,
        chatModel: state.chatModel,
        fastModel: state.fastModel,
        ttsVoice: state.ttsVoice,
        localEndpoint: state.localEndpoint,
      }),
    }
  )
);

/**
 * Direct OpenAI chat call from the browser — for standalone mode.
 * Streams response chunks via callback.
 */
export async function chatDirectOpenAI(
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { apiKey, baseUrl, chatModel } = useAIProviderStore.getState();
  if (!apiKey) throw new Error('No API key configured');

  const endpoint = (baseUrl || 'https://api.openai.com/v1') + '/chat/completions';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: chatModel,
      messages,
      stream: true,
      max_completion_tokens: 8192,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      } catch { /* partial chunk */ }
    }
  }

  return full;
}

/**
 * Direct OpenAI optimize call from the browser — for standalone mode.
 */
export async function optimizeDirectOpenAI(
  code: string,
  language: string,
  systemPrompt: string,
): Promise<{ optimizedCode: string; explanation: string }> {
  const { apiKey, baseUrl, fastModel } = useAIProviderStore.getState();
  if (!apiKey) throw new Error('No API key configured');

  const endpoint = (baseUrl || 'https://api.openai.com/v1') + '/chat/completions';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: fastModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Apply the Five Masters optimization to this ${language} code:\n\n${code}` },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  const codeMatch = raw.match(/OPTIMIZED_CODE_START\n([\s\S]*?)\nOPTIMIZED_CODE_END/);
  const explanationMatch = raw.match(/EXPLANATION_START\n([\s\S]*?)\nEXPLANATION_END/);

  return {
    optimizedCode: codeMatch?.[1]?.trim() ?? code,
    explanation: explanationMatch?.[1]?.trim() ?? 'Five Masters optimization applied.',
  };
}
