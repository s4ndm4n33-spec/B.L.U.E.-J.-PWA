import { Router, type IRouter } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { TextToSpeechBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  try {
    const { text, voice = "echo" } = TextToSpeechBody.parse(req.body);

    const audioBuffer = await textToSpeech(text, voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer", "mp3");
    const base64 = audioBuffer.toString("base64");

    res.json({ audio: base64, format: "mp3" });
  } catch (err) {
    req.log.error({ err }, "TTS error");
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
