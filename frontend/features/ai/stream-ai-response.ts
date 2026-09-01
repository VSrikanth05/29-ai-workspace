import { apiStreamRequest } from '@/lib/api-client';
import type { AiStreamEvent } from '@/features/chat/chat-types';

export async function streamAiResponse(payload: unknown, signal: AbortSignal, onEvent: (event: AiStreamEvent) => void) {
  const response = await apiStreamRequest('/ai/chat/stream', payload, signal);
  if (!response.body) throw new Error('The streaming response had no body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let terminal = false;

  const consume = (eventBlock: string) => {
    const data = eventBlock.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    const event = JSON.parse(data) as AiStreamEvent;
    onEvent(event);
    if (event.type === 'done') terminal = true;
    if (event.type === 'error') {
      terminal = true;
      throw new Error(event.message || 'The AI response could not be generated.');
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const eventBlock = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        consume(eventBlock);
        boundary = buffer.indexOf('\n\n');
      }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!terminal) throw new Error('The AI stream ended before completion.');
  } finally {
    if (!terminal) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
