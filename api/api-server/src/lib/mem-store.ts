/**
 * In-memory data store — replaces @workspace/db for standalone mode.
 *
 * Stores conversations, messages, and user progress in memory.
 * Data persists for the lifetime of the server process.
 * For a desktop app, this is fine — the frontend has its own
 * persistent storage via Zustand + localStorage.
 */

export interface Conversation {
  id: number;
  title: string;
  createdAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

export interface UserProgress {
  sessionId: string;
  conversationId: number | null;
  selectedLanguage: string;
  selectedOs: string;
  updatedAt: Date;
}

let nextConvId = 1;
let nextMsgId = 1;

const conversations: Map<number, Conversation> = new Map();
const messages: Map<number, Message> = new Map();
const userProgress: Map<string, UserProgress> = new Map();

// ── Conversations ──────────────────────────────────────────

export function createConversation(title: string): Conversation {
  const conv: Conversation = {
    id: nextConvId++,
    title,
    createdAt: new Date(),
  };
  conversations.set(conv.id, conv);
  return conv;
}

export function getConversation(id: number): Conversation | undefined {
  return conversations.get(id);
}

export function listConversations(): Conversation[] {
  return [...conversations.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function deleteConversation(id: number): boolean {
  // Delete messages too
  for (const [msgId, msg] of messages) {
    if (msg.conversationId === id) messages.delete(msgId);
  }
  return conversations.delete(id);
}

// ── Messages ───────────────────────────────────────────────

export function addMessage(
  conversationId: number,
  role: string,
  content: string
): Message {
  const msg: Message = {
    id: nextMsgId++,
    conversationId,
    role,
    content,
    createdAt: new Date(),
  };
  messages.set(msg.id, msg);
  return msg;
}

export function getMessages(conversationId: number): Message[] {
  return [...messages.values()]
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function deleteMessages(conversationId: number): void {
  for (const [msgId, msg] of messages) {
    if (msg.conversationId === conversationId) messages.delete(msgId);
  }
}

// ── User Progress ──────────────────────────────────────────

export function upsertProgress(
  sessionId: string,
  data: Partial<Omit<UserProgress, "sessionId">>
): UserProgress {
  const existing = userProgress.get(sessionId) ?? {
    sessionId,
    conversationId: null,
    selectedLanguage: "python",
    selectedOs: "linux",
    updatedAt: new Date(),
  };
  const updated = { ...existing, ...data, updatedAt: new Date() };
  userProgress.set(sessionId, updated);
  return updated;
}

export function getProgress(sessionId: string): UserProgress | undefined {
  return userProgress.get(sessionId);
}

// ── Export all as a db-like namespace ───────────────────────

const db = {
  createConversation,
  getConversation,
  listConversations,
  deleteConversation,
  addMessage,
  getMessages,
  deleteMessages,
  upsertProgress,
  getProgress,
};

export default db;
