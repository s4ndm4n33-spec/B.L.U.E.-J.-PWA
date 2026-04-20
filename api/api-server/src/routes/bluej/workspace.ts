import { Router, type IRouter } from 'express';
import { getOpenAI, getChatModel, hasApiKey } from '../../lib/ai-client.js';

const router: IRouter = Router();

router.post('/patch', async (req, res) => {
  try {
    if (!hasApiKey()) {
      res.status(400).json({ error: 'No API key configured.' });
      return;
    }
    const { content, instruction, language } = req.body as { content: string; instruction: string; language: string };
    if (!content?.trim() || !instruction?.trim()) {
      res.status(400).json({ error: 'Content and instruction are required.' });
      return;
    }
    const prompt = [
      `Patch this ${language} file according to the instruction.`,
      'Preserve any B.L.U.E.-J. persona logic, safety logic, or Five Masters optimiser logic unless the instruction explicitly changes them.',
      'Keep the result production-ready.',
      'Return only raw JSON with keys updatedContent and summary.',
      `Instruction: ${instruction}`,
      '', content,
    ].join('\n');

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: getChatModel(),
      messages: [
        { role: 'system', content: 'You are a precise code patch engine. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1, max_completion_tokens: 2400,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { updatedContent?: string; summary?: string };
    res.json({ updatedContent: parsed.updatedContent?.trim() || content, summary: parsed.summary?.trim() || 'Patch proposal prepared.' });
  } catch (error) {
    req.log.error({ error }, 'Workspace patch error');
    res.status(500).json({ error: 'Patch proposal failed' });
  }
});

export default router;
