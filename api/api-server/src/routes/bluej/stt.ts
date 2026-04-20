import { Router, type IRouter } from "express";
import { getOpenAI, hasApiKey } from "../../lib/ai-client.js";
import { getSettings } from "../../lib/settings.js";
import { Readable } from "stream";

const router: IRouter = Router();

function detectAudioFormat(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return "wav";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "mp3";
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return "mp3";
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "webm";
  return "webm"; // Default fallback
}

router.post("/", async (req, res) => {
  try {
    if (!hasApiKey()) {
      res.status(400).json({ error: "No API key configured." });
      return;
    }

    const { audio, format } = req.body as { audio: string; format?: string };

    if (!audio) {
      res.status(400).json({ error: "No audio data provided" });
      return;
    }

    const buffer = Buffer.from(audio, "base64");
    const detected = detectAudioFormat(buffer);
    const resolvedFormat = (["wav", "mp3", "webm"].includes(detected) ? detected : null)
      ?? (["wav", "mp3", "webm"].includes(format ?? "") ? format! : "webm");

    const openai = getOpenAI();
    const settings = getSettings();

    // Create a File-like object from the buffer for the OpenAI API
    const file = new File([buffer], `audio.${resolvedFormat}`, {
      type: `audio/${resolvedFormat}`,
    });

    const transcription = await openai.audio.transcriptions.create({
      model: settings.sttModel,
      file: file,
    });

    res.json({ transcript: transcription.text, format: resolvedFormat });
  } catch (err) {
    req.log.error({ err }, "STT error");
    res.status(500).json({ error: "Speech transcription failed" });
  }
});

export default router;
