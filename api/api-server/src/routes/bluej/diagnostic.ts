import { Router, type IRouter } from "express";
import { getOpenAI, getFastModel, hasApiKey } from "../../lib/ai-client.js";
import db from "../../lib/mem-store.js";

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

    const existing = db.getProgress(sessionId ?? "");
    const sessionExists = Boolean(existing);

    if (!sessionExists && sessionId) {
      db.upsertProgress(sessionId, {
        selectedLanguage: "python",
        selectedOs: "linux",
      });
    }

    const hardwareStatus = computeHardwareStatus(cpuCores, ramGb);

    const hwDesc =
      cpuCores || ramGb
        ? `CPU: ${cpuCores ?? "?"}×cores, RAM: ${ramGb ?? "?"}GB`
        : "hardware telemetry unavailable";

    let jSummary = "Systems nominal. Shall we proceed?";

    if (hasApiKey()) {
      try {
        const diagPrompt = [
          "System diagnostic clearance — J.'s voice, under 55 words, 2 sentences max.",
          `Hardware: ${hwDesc}. Status: ${hardwareStatus.toUpperCase()}.`,
          sessionExists
            ? "Returning operator — session restored."
            : "New operator — session initialized.",
          "Be dry, precise, and British. End with one hardware-specific recommendation.",
        ].join(" ");

        const openai = getOpenAI();
        const jResponse = await openai.chat.completions.create({
          model: getFastModel(),
          messages: [
            {
              role: "system",
              content: "You are J. from B.L.U.E.-J. — dry wit, precise, British. Keep it under 55 words.",
            },
            { role: "user", content: diagPrompt },
          ],
          temperature: 0.7,
          max_tokens: 120,
        });

        jSummary = jResponse.choices[0]?.message?.content ?? jSummary;
      } catch {
        // AI summary is non-critical
      }
    }

    res.json({
      orphanedConversations: 0,
      orphanedMessages: 0,
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
