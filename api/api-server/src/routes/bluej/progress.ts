import { Router, type IRouter } from "express";
import { db, userProgressTable } from "@workspace/db";
import { GetProgressQueryParams, CompleteTaskBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function getOrCreateProgress(sessionId: string) {
  const existing = await db.select().from(userProgressTable).where(eq(userProgressTable.sessionId, sessionId)).limit(1);
  if (existing.length > 0) return existing[0];

  const created = await db.insert(userProgressTable).values({
    sessionId,
    currentPhase: 0,
    currentTask: 0,
    completedTasks: [],
    selectedLanguage: "python",
    selectedOs: "linux",
  }).returning();
  return created[0];
}

router.get("/", async (req, res) => {
  try {
    const { sessionId } = GetProgressQueryParams.parse(req.query);
    const progress = await getOrCreateProgress(sessionId);
    res.json({
      sessionId: progress.sessionId,
      currentPhase: progress.currentPhase,
      currentTask: progress.currentTask,
      completedTasks: progress.completedTasks as string[],
      selectedLanguage: progress.selectedLanguage,
      selectedOs: progress.selectedOs,
      conversationId: progress.conversationId,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting progress");
    res.status(500).json({ error: "Failed to get progress" });
  }
});

router.post("/task", async (req, res) => {
  try {
    const body = CompleteTaskBody.parse(req.body);
    const progress = await getOrCreateProgress(body.sessionId);
    const taskKey = `p${body.phaseIndex}t${body.taskIndex}`;
    const completedTasks = (progress.completedTasks as string[]) || [];

    if (!completedTasks.includes(taskKey)) {
      completedTasks.push(taskKey);
    }

    let nextPhase = progress.currentPhase;
    let nextTask = progress.currentTask;

    if (body.phaseIndex >= progress.currentPhase) {
      nextPhase = body.phaseIndex;
      nextTask = body.taskIndex + 1;
    }

    const updated = await db.update(userProgressTable)
      .set({
        completedTasks,
        currentPhase: nextPhase,
        currentTask: nextTask,
        selectedLanguage: body.language,
        selectedOs: body.os,
        conversationId: body.conversationId ?? progress.conversationId,
        updatedAt: new Date(),
      })
      .where(eq(userProgressTable.sessionId, body.sessionId))
      .returning();

    const p = updated[0];
    res.json({
      sessionId: p.sessionId,
      currentPhase: p.currentPhase,
      currentTask: p.currentTask,
      completedTasks: p.completedTasks as string[],
      selectedLanguage: p.selectedLanguage,
      selectedOs: p.selectedOs,
      conversationId: p.conversationId,
    });
  } catch (err) {
    req.log.error({ err }, "Error completing task");
    res.status(500).json({ error: "Failed to complete task" });
  }
});

export default router;
