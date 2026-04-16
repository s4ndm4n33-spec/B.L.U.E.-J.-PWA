import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

interface HardwareProfile {
  id: string;
  cores: number | null;
  ramGb: number | null;
  gpu: string | null;
  desc: string;
}

const PROFILE_MAP: Record<string, { cores: number; ramGb: number; gpu: string | null; label: string }> = {
  'auto':          { cores: 4,  ramGb: 8,  gpu: null,                label: 'Auto-detected machine' },
  'high-end':      { cores: 32, ramGb: 64, gpu: null,                label: 'High-End Workstation (32-core, 64GB RAM)' },
  'mid-range':     { cores: 8,  ramGb: 16, gpu: null,                label: 'Mid-Range PC (8-core, 16GB RAM)' },
  'budget-laptop': { cores: 4,  ramGb: 8,  gpu: null,                label: 'Budget Laptop (4-core, 8GB RAM)' },
  'raspberry-pi':  { cores: 4,  ramGb: 4,  gpu: null,                label: 'Raspberry Pi 4 (4-core ARM64, 4GB RAM)' },
  'cloud-gpu':     { cores: 8,  ramGb: 16, gpu: 'NVIDIA T4 16GB',    label: 'Cloud GPU Instance (8-core, 16GB RAM, NVIDIA T4)' },
};

function buildSimulationSystem(profile: { cores: number; ramGb: number; gpu: string | null; label: string }, os: string): string {
  const gpuLine = profile.gpu
    ? `GPU available: ${profile.gpu} — CUDA operations are available.`
    : 'No GPU — all compute is CPU-only.';

  return `You are J.'s hardware-aware execution simulation engine. You simulate code output exactly as it would appear running on this specific machine:

TARGET MACHINE: ${profile.label}
- CPU: ${profile.cores} cores
- RAM: ${profile.ramGb}GB
- ${gpuLine}
- OS: ${os}

CRITICAL RULES:
1. Your response must look like real terminal output — no markdown, no explanation, no preamble.
2. Show timing that is realistic for this hardware (slower on Pi, faster on workstation).
3. If the code loads a large model or dataset:
   - Check if it fits in ${profile.ramGb}GB RAM
   - If NOT: show a MemoryError or OOM kill, as would happen on real hardware
   - If yes but tight: show a warning about memory pressure
4. Show realistic import times, especially for libraries like numpy, torch, transformers (heavy on Pi/laptop).
5. If code uses CUDA/GPU and ${profile.gpu ? `GPU is available (${profile.gpu})` : 'there is NO GPU'}: ${profile.gpu ? 'show GPU operations working' : 'show RuntimeError: CUDA not available'}.
6. If code would run >30s on this hardware: show a spinner or progress indication, then truncate with [...continues...].
7. After the raw output, add a new line starting with "---" then ONE sentence from J. in dry British wit about the result on this specific hardware.

EXAMPLES OF REALISTIC OUTPUT:
- Raspberry Pi running torch: include slow import time (8–12s), possible OOM if model >3B params
- High-end workstation: fast, clean, no warnings
- Budget laptop running training loop: include RAM usage warnings if model is large`;
}

router.post("/", async (req, res) => {
  try {
    const {
      code,
      language,
      os = 'linux',
      simProfileId = 'auto',
      simCores,
      simRamGb,
      simGpu,
    } = req.body as {
      code: string;
      language: string;
      os?: string;
      simProfileId?: string;
      simCores?: number | null;
      simRamGb?: number | null;
      simGpu?: string | null;
    };

    if (!code?.trim()) {
      res.status(400).json({ error: "No code provided" });
      return;
    }

    // Resolve profile
    const baseProfile = PROFILE_MAP[simProfileId] ?? PROFILE_MAP['auto'];
    const profile = {
      ...baseProfile,
      cores: simCores ?? baseProfile.cores,
      ramGb: simRamGb ?? baseProfile.ramGb,
      gpu: simGpu !== undefined ? simGpu : baseProfile.gpu,
    };

    const systemPrompt = buildSimulationSystem(profile, os);
    const userPrompt = `Simulate running this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.15,
      max_tokens: 600,
    });

    const output = response.choices[0]?.message?.content ?? "(simulation failed)";

    res.json({
      output,
      language,
      simulatedAt: new Date().toISOString(),
      profile: {
        id: simProfileId,
        label: profile.label,
        cores: profile.cores,
        ramGb: profile.ramGb,
        gpu: profile.gpu,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Simulation error");
    res.status(500).json({ error: "Simulation failed" });
  }
});

export default router;
