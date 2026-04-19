import { Router, type IRouter } from "express";
import db from "../../lib/mem-store.js";
import { z } from "zod";

const router: IRouter = Router();

const GetProgressQueryParams = z.object({ sessionId: z.string() });
const CompleteTaskBody = z.object({
  sessionId: z.string(),
  phaseIndex: z.number(),
  taskIndex: z.number(),
  language: z.string().default("python"),
  os: z.string().default("linux"),
  conversationId: z.number().nullable().optional(),
});

router.get("/", async (req, res) => {
  try {
    const { sessionId } = GetProgressQueryParams.parse(req.query);
    const p = db.getProgress(sessionId) ?? db.upsertProgress(sessionId, {});
    res.json({ sessionId: p.sessionId, selectedLanguage: p.selectedLanguage, selectedOs: p.selectedOs, conversationId: p.conversationId });
  } catch (err) {
    req.log.error({ err }, "Error getting progress");
    res.status(500).json({ error: "Failed to get progress" });
  }
});

router.post("/task", async (req, res) => {
  try {
    const body = CompleteTaskBody.parse(req.body);
    const p = db.upsertProgress(body.sessionId, {
      selectedLanguage: body.language,
      selectedOs: body.os,
      conversationId: body.conversationId ?? null,
    });
    res.json({ sessionId: p.sessionId, selectedLanguage: p.selectedLanguage, selectedOs: p.selectedOs, conversationId: p.conversationId });
  } catch (err) {
    req.log.error({ err }, "Error completing task");
    res.status(500).json({ error: "Failed to complete task" });
  }
});

export default router;
