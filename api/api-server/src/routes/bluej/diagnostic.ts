import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversations as conversationsTable,
  messages as messagesTable,
  userProgressTable,
} from "@workspace/db";
import { eq, notInArray, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function computeHardwareStatus(
  cpuCores?: number | null,
  ramGb?: number | null
): "optimal" | "adequate" | "constrained" {
  const cores = cpuCores ?? 0;
  const ram = ramGb ?? 0;
  if (cores >= 8 && ram >= 16) return "optimal";
  if (cores >= 4 && ram >= 8) return "adequate";
  return "constrained";
}

router.post("/", async (req, res) => {
  try {
    const { sessionId, cpuCores, ramGb } = req.body as {
      sessionId: string;
      cpuCores?: number | null;
      ramGb?: number | null;
    };

    let orphanedConversations = 0;
    let orphanedMessages = 0;
    let sessionExists = false;

    // 1. Session check / init
    const existingProgress = await db
      .select({ id: userProgressTable.id, conversationId: userProgressTable.conversationId })
      .from(userProgressTable)
      .where(eq(userProgressTable.sessionId, sessionId ?? ""));

    sessionExists = existingProgress.length > 0;

    if (!sessionExists && sessionId) {
      await db.insert(userProgressTable).values({
        sessionId,
        currentPhase: 0,
        currentTask: 0,
        completedTasks: [],
        selectedLanguage: "python",
        selectedOs: "linux",
      });
    }

    // 2. Scoped orphan purge — only remove conversations not referenced by ANY session
    try {
      // All conversation IDs referenced by any progress record (cross-session safety)
      const allProgress = await db
        .select({ cid: userProgressTable.conversationId })
        .from(userProgressTable);

      const referencedBySession = allProgress
        .map((r) => r.cid)
        .filter((id): id is number => id !== null);

      // Conversations that have at least one message
      const convsWithMessages = await db
        .selectDistinct({ cid: messagesTable.conversationId })
        .from(messagesTable);

      const convsWithMsgIds = convsWithMessages.map((r) => r.cid);

      // Safe to delete: no messages AND not referenced by any progress record
      const allConvs = await db
        .select({ id: conversationsTable.id })
        .from(conversationsTable);

      const safeToDelete = allConvs
        .map((c) => c.id)
        .filter(
          (id) =>
            !convsWithMsgIds.includes(id) &&
            !referencedBySession.includes(id)
        );

      orphanedConversations = safeToDelete.length;

      if (safeToDelete.length > 0) {
        await db
          .delete(conversationsTable)
          .where(inArray(conversationsTable.id, safeToDelete));
      }

      // 3. Duplicate message detection and removal for current session
      // Find duplicate messages: same conversationId + role + content, keep only the first (lowest id)
      if (existingProgress.length > 0) {
        const sessionConvId = existingProgress[0].conversationId;
        if (sessionConvId) {
          const sessionMessages = await db
            .select()
            .from(messagesTable)
            .where(eq(messagesTable.conversationId, sessionConvId));

          const seen = new Map<string, number>();
          const duplicateIds: number[] = [];

          for (const msg of sessionMessages) {
            const key = `${msg.role}::${msg.content.slice(0, 200)}`;
            if (seen.has(key)) {
              duplicateIds.push(msg.id);
            } else {
              seen.set(key, msg.id);
            }
          }

          orphanedMessages = duplicateIds.length;

          if (duplicateIds.length > 0) {
            await db
              .delete(messagesTable)
              .where(inArray(messagesTable.id, duplicateIds));
          }
        }
      }
    } catch (dbErr) {
      req.log.warn({ dbErr }, "Orphan-purge query failed — non-fatal, continuing");
    }

    // 4. Hardware assessment
    const hardwareStatus = computeHardwareStatus(cpuCores, ramGb);

    // 5. J.'s diagnostic summary
    const hwDesc =
      cpuCores || ramGb
        ? `CPU: ${cpuCores ?? "?"}×cores, RAM: ${ramGb ?? "?"}GB`
        : "hardware telemetry unavailable";

    const purgeReport =
      orphanedConversations > 0 || orphanedMessages > 0
        ? `${orphanedConversations} orphaned conversation(s) and ${orphanedMessages} duplicate message(s) found and purged.`
        : "No orphaned or duplicate records found.";

    const diagPrompt = [
      "System diagnostic clearance — J.'s voice, under 55 words, 2 sentences max.",
      `Hardware: ${hwDesc}. Status: ${hardwareStatus.toUpperCase()}.`,
      purgeReport,
      sessionExists
        ? "Returning operator — session restored."
        : "New operator — session initialized.",
      "Be dry, precise, and British. End with one hardware-specific recommendation.",
    ].join(" ");

    const jResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are J. from B.L.U.E.-J. — dry wit, precise, British. Keep it under 55 words.",
        },
        { role: "user", content: diagPrompt },
      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    const jSummary =
      jResponse.choices[0]?.message?.content ?? "Systems nominal. Shall we proceed?";

    res.json({
      orphanedConversations,
      orphanedMessages,
      sessionExists,
      hardwareStatus,
      jSummary,
    });
  } catch (err) {
    req.log.error({ err }, "Diagnostic error");
    res.status(500).json({
      orphanedConversations: 0,
      orphanedMessages: 0,
      sessionExists: false,
      hardwareStatus: "adequate" as const,
      jSummary: "Diagnostic inconclusive. Shall we proceed regardless?",
    });
  }
});

export default router;
