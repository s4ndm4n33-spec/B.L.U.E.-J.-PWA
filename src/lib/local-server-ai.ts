/**
 * Local Server AI — connects to Ollama, LM Studio, llama.cpp server,
 * or any OpenAI-compatible API running on the user's machine.
 *
 * Unlike WebLLM (which needs WebGPU), this works everywhere because
 * the heavy lifting happens on the user's CPU/GPU natively.
 *
 * Default endpoints:
 *   Ollama:     http://localhost:11434/v1
 *   LM Studio:  http://localhost:1234/v1
 *   llama.cpp:  http://localhost:8080/v1
 */

import { useAIProviderStore } from './ai-provider';

export interface LocalModel {
  id: string;
  name: string;
  size?: string;
  family?: string;
  quantization?: string;
}

/**
 * Probe whether a local server is reachable.
 * Returns the server type and available models.
 */
export async function probeLocalServer(
  endpoint?: string
): Promise<{ reachable: boolean; serverType: string; models: LocalModel[]; error?: string }> {
  const url = endpoint || useAIProviderStore.getState().localEndpoint || 'http://localhost:11434/v1';
  const base = url.replace(/\/v1\/?$/, '');

  // Try Ollama's native endpoint first (more info)
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const models: LocalModel[] = (data.models || []).map((m: any) => ({
        id: m.name || m.model,
        name: (m.name || m.model || '').split(':')[0],
        size: formatBytes(m.size),
        family: m.details?.family || '',
        quantization: m.details?.quantization_level || '',
      }));
      return { reachable: true, serverType: 'Ollama', models };
    }
  } catch { /* not Ollama */ }

  // Try OpenAI-compatible /v1/models
  try {
    const modelsUrl = url.endsWith('/v1') ? `${url}/models` : `${url}/v1/models`;
    const res = await fetch(modelsUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const models: LocalModel[] = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        size: '',
        family: m.owned_by || '',
      }));
      return { reachable: true, serverType: 'OpenAI-compatible', models };
    }
  } catch { /* not reachable */ }

  return { reachable: false, serverType: 'unknown', models: [], error: 'Could not connect. Is the server running?' };
}

/**
 * Chat via a local server — streams response via callback.
 */
export async function chatLocalServer(
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  options?: { model?: string; endpoint?: string; signal?: AbortSignal }
): Promise<string> {
  const store = useAIProviderStore.getState();
  const endpoint = options?.endpoint || store.localEndpoint || 'http://localhost:11434/v1';
  const model = options?.model || store.localModel || 'llama3';

  const chatUrl = endpoint.endsWith('/v1')
    ? `${endpoint}/chat/completions`
    : `${endpoint}/v1/chat/completions`;

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.5,
      max_tokens: 2048,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Local server error ${res.status}: ${err || 'unknown'}`);
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
 * Non-streaming completion via local server.
 */
export async function completeLocalServer(
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string; endpoint?: string; maxTokens?: number }
): Promise<string> {
  const store = useAIProviderStore.getState();
  const endpoint = options?.endpoint || store.localEndpoint || 'http://localhost:11434/v1';
  const model = options?.model || store.localModel || 'llama3';

  const chatUrl = endpoint.endsWith('/v1')
    ? `${endpoint}/chat/completions`
    : `${endpoint}/v1/chat/completions`;

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: 0.3,
      max_tokens: options?.maxTokens || 1500,
    }),
  });

  if (!res.ok) throw new Error(`Local server error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}
