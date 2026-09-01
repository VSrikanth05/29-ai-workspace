import { vi } from 'vitest';
import { streamAiResponse } from './stream-ai-response';

describe('streamAiResponse', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('parses incremental SSE events split across network chunks', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('retry: 3000\n\nevent: delta\ndata: {"type":"delta","content":"Hel'));
        controller.enqueue(encoder.encode('lo"}\n\nevent: done\ndata: {"type":"done","conversationId":"c1","message":{"id":"m1","role":"assistant","content":"Hello"},"sources":[],"finishReason":"stop"}\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })));
    const events: { type: string }[] = [];
    await streamAiResponse({ message: 'Hi' }, new AbortController().signal, (event) => events.push(event));
    expect(events.map((event) => event.type)).toEqual(['delta', 'done']);
  });

  it('surfaces a server-sent error and does not leave the caller pending', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: error\ndata: {"type":"error","message":"Provider unavailable"}\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));

    await expect(streamAiResponse({}, new AbortController().signal, () => undefined)).rejects.toThrow('Provider unavailable');
  });
});
