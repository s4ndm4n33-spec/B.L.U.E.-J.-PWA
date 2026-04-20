import { Router, type IRouter } from "express";
import { getOpenAI, hasApiKey } from "../../lib/ai-client.js";
import { getSettings } from "../../lib/settings.js";
import { z } from "zod";

const router: IRouter = Router();

const TextToSpeechBody = z.object({
  text: z.string().min(1),
  voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
});

router.post("/", async (req, res) => {
  try {
    if (!hasApiKey()) {
      res.status(400).json({ error: "No API key configured." });
      return;
    }

    const { text, voice } = TextToSpeechBody.parse(req.body);
    const settings = getSettings();
    const openai = getOpenAI();

    const response = await openai.audio.speech.create({
      model: settings.ttsModel,
      voice: voice,
      input: text,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    res.json({ audio: base64, format: "mp3" });
  } catch (err) {
    req.log.error({ err }, "TTS error");
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
