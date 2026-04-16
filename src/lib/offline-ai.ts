/**
 * Offline AI engine using WebLLM — runs a small LLM entirely in the browser.
 * No server, no API key, no internet needed after first model download.
 */
import * as webllm from "@mlc-ai/web-llm";

const DEFAULT_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC";

let engine: webllm.MLCEngine | null = null;
let _isReady = false;

export type DownloadProgress = { progress: number; text: string };

export async function initOfflineAI(
  onProgress?: (p: DownloadProgress) => void,
  modelId: string = DEFAULT_MODEL
): Promise<boolean> {
  try {
    if (!navigator.gpu) {
      console.warn("WebGPU not supported — offline AI unavailable");
      return false;
    }
    engine = new webllm.MLCEngine();
    await engine.reload(modelId, {
      initProgressCallback: (report) => {
        onProgress?.({ progress: Math.round(report.progress * 100), text: report.text });
      },
    });
    _isReady = true;
    return true;
  } catch (err) {
    console.error("Failed to init offline AI:", err);
    engine = null;
    _isReady = false;
    return false;
  }
}

export function isOfflineReady(): boolean {
  return _isReady && engine !== null;
}

export function supportsWebGPU(): boolean {
  return !!navigator.gpu;
}

export async function* chatOffline(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  learnerMode: string,
  language: string
): AsyncGenerator<string> {
  if (!engine) throw new Error("Offline AI not initialized");

  const systemPrompt = buildSystemPrompt(learnerMode, language);
  const fullMessages: webllm.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
  ];

  const stream = await engine.chat.completions.create({
    messages: fullMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1024,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

function buildSystemPrompt(learnerMode: string, language: string): string {
  const guides: Record<string, string> = {
    kids: "You are a fun, encouraging coding teacher for kids aged 8-12. Use simple words, emojis, and analogies. Keep code examples short.",
    teen: "You are a coding mentor for teens. Be chill but informative. Use relatable examples and encourage experimentation.",
    "adult-beginner": "You are a patient coding instructor for adult beginners. Be clear and thorough. Avoid jargon or explain it when used.",
    advanced: "You are an expert programming assistant. Be concise and technical. Discuss best practices, performance, and architecture.",
  };
  return `${guides[learnerMode] || guides["adult-beginner"]}

You are B.L.U.E.-J. (a.k.a. "J."), an AI coding assistant specializing in ${language}. 
Help the user learn to code, debug issues, and build projects.
Format code in markdown code blocks with the language tag. Be concise but helpful.
Maintain a calm, intelligent personality — you are a digital mentor with quiet confidence.`;
}

export async function disposeOfflineAI() {
  if (engine) { await engine.unload(); engine = null; _isReady = false; }
}
