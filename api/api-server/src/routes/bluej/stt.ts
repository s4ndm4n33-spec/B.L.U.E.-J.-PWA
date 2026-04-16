import { Router, type IRouter } from "express";
import { speechToText, detectAudioFormat } from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  try {
    const { audio, format } = req.body as { audio: string; format?: string };

    if (!audio) {
      res.status(400).json({ error: "No audio data provided" });
      return;
    }

    const buffer = Buffer.from(audio, "base64");

    const detectedFormat = detectAudioFormat(buffer);
    const resolvedFormat: "wav" | "mp3" | "webm" =
      (["wav", "mp3", "webm"].includes(detectedFormat) ? detectedFormat : null) ??
      (["wav", "mp3", "webm"].includes(format ?? "") ? (format as "wav" | "mp3" | "webm") : "webm");

    const transcript = await speechToText(buffer, resolvedFormat);

    res.json({ transcript, format: resolvedFormat });
  } catch (err) {
    req.log.error({ err }, "STT error");
    res.status(500).json({ error: "Speech transcription failed" });
  }
});

export default router;
