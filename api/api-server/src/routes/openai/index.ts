import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { voiceChatStream, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import { db, conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
  SendOpenaiVoiceMessageBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiVoiceMessageParams,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/conversations", async (req, res) => {
  try {
    const conversations = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.createdAt));
    res.json(conversations.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt })));
  } catch (err) {
    req.log.error({ err }, "Error listing conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const { title } = CreateOpenaiConversationBody.parse(req.body);
    const conv = await db.insert(conversationsTable).values({ title }).returning();
    const c = conv[0];
    res.status(201).json({ id: c.id, title: c.title, createdAt: c.createdAt });
  } catch (err) {
    req.log.error({ err }, "Error creating conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const { id } = GetOpenaiConversationParams.parse({ id: Number(req.params.id) });
    const convRows = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);
    if (convRows.length === 0) return res.status(404).json({ error: "Not found" });
    const c = convRows[0];
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      messages: msgs.map((m) => ({ id: m.id, conversationId: m.conversationId, role: m.role, content: m.content, createdAt: m.createdAt })),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = DeleteOpenaiConversationParams.parse({ id: Number(req.params.id) });
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
    const deleted = await db.delete(conversationsTable).where(eq(conversationsTable.id, id)).returning();
    if (deleted.length === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error deleting conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = ListOpenaiMessagesParams.parse({ id: Number(req.params.id) });
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json(msgs.map((m) => ({ id: m.id, conversationId: m.conversationId, role: m.role, content: m.content, createdAt: m.createdAt })));
  } catch (err) {
    req.log.error({ err }, "Error listing messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = SendOpenaiMessageParams.parse({ id: Number(req.params.id) });
    const { content } = SendOpenaiMessageBody.parse(req.body);

    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    await db.insert(messagesTable).values({ conversationId: id, role: "user", content });

    const chatMessages = [
      ...msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) {
        fullResponse += c;
        res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    if (!res.headersSent) res.status(500).json({ error: "Failed to send message" });
    else { res.write(`data: ${JSON.stringify({ done: true, error: true })}\n\n`); res.end(); }
  }
});

router.post("/conversations/:id/voice-messages", async (req, res) => {
  try {
    const { id } = SendOpenaiVoiceMessageParams.parse({ id: Number(req.params.id) });
    const { audio } = SendOpenaiVoiceMessageBody.parse(req.body);
    const audioBuffer = Buffer.from(audio, "base64");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);
    const stream = await voiceChatStream(buffer, "echo", format as "wav" | "mp3" | "webm" | "m4a" | "ogg" | "flac");

    let assistantTranscript = "";
    let userTranscript = "";

    for await (const event of stream) {
      if (event.type === "transcript") assistantTranscript += event.data;
      if (event.type === "user_transcript") userTranscript += event.data;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    await db.insert(messagesTable).values([
      { conversationId: id, role: "user", content: userTranscript || "[voice input]" },
      { conversationId: id, role: "assistant", content: assistantTranscript || "[voice response]" },
    ]);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Voice message error");
    if (!res.headersSent) res.status(500).json({ error: "Voice processing failed" });
    else { res.write(`data: ${JSON.stringify({ done: true, error: true })}\n\n`); res.end(); }
  }
});

export default router;
