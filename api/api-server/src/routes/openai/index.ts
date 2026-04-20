import { Router, type IRouter } from "express";
import { getOpenAI, getChatModel, hasApiKey } from "../../lib/ai-client.js";
import db from "../../lib/mem-store.js";
import { z } from "zod";

const router: IRouter = Router();

router.get("/conversations", async (_req, res) => {
  try {
    res.json(db.listConversations().map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt })));
  } catch (err) { res.status(500).json({ error: "Failed to list conversations" }); }
});

router.post("/conversations", async (req, res) => {
  try {
    const { title } = z.object({ title: z.string() }).parse(req.body);
    const c = db.createConversation(title);
    res.status(201).json({ id: c.id, title: c.title, createdAt: c.createdAt });
  } catch (err) { res.status(500).json({ error: "Failed to create conversation" }); }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const c = db.getConversation(id);
    if (!c) return res.status(404).json({ error: "Not found" });
    const msgs = db.getMessages(id);
    res.json({ id: c.id, title: c.title, createdAt: c.createdAt, messages: msgs.map((m) => ({ id: m.id, conversationId: m.conversationId, role: m.role, content: m.content, createdAt: m.createdAt })) });
  } catch (err) { res.status(500).json({ error: "Failed to get conversation" }); }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = db.deleteConversation(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: "Failed to delete conversation" }); }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const msgs = db.getMessages(Number(req.params.id));
    res.json(msgs.map((m) => ({ id: m.id, conversationId: m.conversationId, role: m.role, content: m.content, createdAt: m.createdAt })));
  } catch (err) { res.status(500).json({ error: "Failed to list messages" }); }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    if (!hasApiKey()) { res.status(400).json({ error: "No API key configured." }); return; }
    const id = Number(req.params.id);
    const { content } = z.object({ content: z.string() }).parse(req.body);

    const msgs = db.getMessages(id);
    db.addMessage(id, "user", content);

    const chatMessages = [
      ...msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const openai = getOpenAI();
    const stream = await openai.chat.completions.create({
      model: getChatModel(), max_completion_tokens: 8192, messages: chatMessages, stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) { fullResponse += c; res.write(`data: ${JSON.stringify({ content: c })}\n\n`); }
    }

    db.addMessage(id, "assistant", fullResponse);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "Failed to send message" });
    else { res.write(`data: ${JSON.stringify({ done: true, error: true })}\n\n`); res.end(); }
  }
});

export default router;
