/**
 * Offline AI engine using WebLLM — runs a small LLM entirely in the browser.
 * No server, no API key, and no internet needed after the first model download.
 */
import * as webllm from '@mlc-ai/web-llm';

const DEFAULT_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

let engine: webllm.MLCEngine | null = null;
let isReady = false;

export type DownloadProgress = { progress: number; text: string };
export type ChatTurn = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function initOfflineAI(
  onProgress?: (progress: DownloadProgress) => void,
  modelId: string = DEFAULT_MODEL,
): Promise<boolean> {
  try {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported — offline AI unavailable');
      return false;
    }
    engine = new webllm.MLCEngine();
    await engine.reload(modelId, {
      initProgressCallback: (report) => {
        onProgress?.({
          progress: Math.round(report.progress * 100),
          text: report.text,
        });
      },
    });
    isReady = true;
    return true;
  } catch (error) {
    console.error('Failed to initialise offline AI:', error);
    engine = null;
    isReady = false;
    return false;
  }
}

export function isOfflineReady(): boolean {
  return isReady && engine !== null;
}

export function supportsWebGPU(): boolean {
  return Boolean(navigator.gpu);
}

async function createStreamingResponse(
  messages: webllm.ChatCompletionMessageParam[],
  maxTokens: number,
): Promise<AsyncGenerator<string>> {
  if (!engine) {
    throw new Error('Offline AI not initialized');
  }

  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.5,
    max_tokens: maxTokens,
  });

  async function* emitChunks(): AsyncGenerator<string> {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  return emitChunks();
}

export async function completeOfflineText(
  messages: ChatTurn[],
  maxTokens = 1024,
): Promise<string> {
  if (!engine) {
    throw new Error('Offline AI not initialized');
  }

  const response = await engine.chat.completions.create({
    messages,
    stream: false,
    temperature: 0.4,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content?.trim() ?? '';
}

export async function* chatOffline(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  learnerMode: string,
  language: string,
): AsyncGenerator<string> {
  const systemPrompt = buildSystemPrompt(learnerMode, language);
  const fullMessages: webllm.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const stream = await createStreamingResponse(fullMessages, 1024);
  for await (const chunk of stream) {
    yield chunk;
  }
}

export async function optimizeOfflineCode(
  code: string,
  language: string,
): Promise<{ optimizedCode: string; explanation: string }> {
  const prompt = [
    `You are J.'s Five Masters optimisation engine for ${language}.`,
    'Return raw JSON only.',
    'Schema: {"optimizedCode":"string","explanation":"string"}',
    'Preserve the persona and safety logic if present.',
    'Optimise for clarity, performance, and edge-case handling.',
    '',
    code,
  ].join('\n');

  const raw = await completeOfflineText([
    {
      role: 'system',
      content: 'Return only valid JSON. No markdown fences. No prose outside the schema.',
    },
    { role: 'user', content: prompt },
  ], 1400);

  try {
    const parsed = JSON.parse(raw) as {
      optimizedCode?: string;
      explanation?: string;
    };
    return {
      optimizedCode: parsed.optimizedCode?.trim() || code,
      explanation: parsed.explanation?.trim() || 'Five Masters optimisation applied locally.',
    };
  } catch {
    return {
      optimizedCode: code,
      explanation: 'Local model could not produce a structured optimisation result.',
    };
  }
}

export async function patchOfflineCode(
  code: string,
  instruction: string,
  language: string,
): Promise<{ updatedContent: string; summary: string }> {
  const raw = await completeOfflineText([
    {
      role: 'system',
      content: 'Return only valid JSON with keys updatedContent and summary.',
    },
    {
      role: 'user',
      content: [
        `Patch this ${language} file according to the instruction.`,
        'Keep the core persona and safety logic intact if present.',
        `Instruction: ${instruction}`,
        '',
        code,
      ].join('\n'),
    },
  ], 1800);

  try {
    const parsed = JSON.parse(raw) as {
      updatedContent?: string;
      summary?: string;
    };
    return {
      updatedContent: parsed.updatedContent?.trim() || code,
      summary: parsed.summary?.trim() || 'Local patch proposal prepared.',
    };
  } catch {
    return {
      updatedContent: code,
      summary: 'Local model could not create a structured patch proposal.',
    };
  }
}

function buildSystemPrompt(learnerMode: string, language: string): string {
  const guides: Record<string, string> = {
    kids: 'You are a fun, encouraging coding teacher for kids aged 8-12. Use simple words, simple analogies, and short code examples.',
    teen: 'You are a coding mentor for teens. Be direct, supportive, and technically honest.',
    'adult-beginner': 'You are a patient coding instructor for adult beginners. Be clear, structured, and practical.',
    advanced: 'You are an expert programming assistant. Be concise, technical, and architecture-aware.',
  };

  return `${guides[learnerMode] || guides['adult-beginner']}

You are B.L.U.E.-J. ("J."), a calm, sharp AI mentor.
Preserve the persona: British English, dry wit, high standards, and strong safety boundaries.
Active language: ${language}.
Keep code in fenced markdown blocks with the proper language tag when code is needed.
Never drop the core J. identity just because the backend is local.`;
}

export async function disposeOfflineAI(): Promise<void> {
  if (engine) {
    await engine.unload();
    engine = null;
    isReady = false;
  }
}
