/**
 * Settings API — configure API key, model, and endpoint from the app.
 *
 * GET  /api/bluej/settings  → current settings (key masked)
 * PUT  /api/bluej/settings  → update settings
 */
import { Router, type IRouter } from "express";
import { getSettingsPublic, updateSettings } from "../../lib/settings.js";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json(getSettingsPublic());
});

router.put("/", (req, res) => {
  const { apiKey, baseUrl, chatModel, fastModel, ttsVoice } = req.body as Record<string, string>;
  const patch: Record<string, string> = {};
  if (apiKey !== undefined) patch.apiKey = apiKey;
  if (baseUrl !== undefined) patch.baseUrl = baseUrl;
  if (chatModel !== undefined) patch.chatModel = chatModel;
  if (fastModel !== undefined) patch.fastModel = fastModel;
  if (ttsVoice !== undefined) patch.ttsVoice = ttsVoice;

  updateSettings(patch);
  res.json(getSettingsPublic());
});

export default router;
