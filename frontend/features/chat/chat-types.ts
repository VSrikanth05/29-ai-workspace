export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt?: string };
export type Conversation = { id: string; title: string; provider?: string | null; model?: string | null; streamStatus: string; lastActivityAt: string; messages?: ChatMessage[]; _count?: { messages: number } };
export type Citation = { documentId: string; documentName: string; excerpt: string; chunkIndex: number };
export type AiStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; conversationId: string; message: ChatMessage; sources: Citation[]; finishReason: string }
  | { type: 'error'; message: string; code?: string; requestId?: string };
