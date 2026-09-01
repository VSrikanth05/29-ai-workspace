import { ConfigService } from '@nestjs/config';
import { EMBEDDING_DIMENSIONS } from '../interfaces/llm-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { ErrorCode } from '../../common/errors/app.exception';

describe('GeminiProvider embeddings', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('requests and returns exactly the pgvector dimension', async () => {
    const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ embedding: { values } }), { status: 200 }),
    );
    const config = {
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new GeminiProvider(config);

    const result = await provider.embed('test');

    expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
    const request = fetchMock.mock.calls[0][1];
    const body = request?.body;
    if (typeof body !== 'string')
      throw new Error('Expected a JSON request body.');
    expect(JSON.parse(body) as unknown).toMatchObject({
      embedContentConfig: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });
  });

  it('limits Gemini 3 thinking so a successful response retains answer text', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
        { status: 200 },
      ),
    );
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'test-key';
        if (key === 'GEMINI_MODEL') return 'gemini-3.6-flash';
        return undefined;
      }),
    } as unknown as ConfigService;
    const provider = new GeminiProvider(config);

    await provider.chat([{ role: 'user', content: 'test' }], {
      maxTokens: 32,
    });

    const request = fetchMock.mock.calls[0][1];
    const body = request?.body;
    if (typeof body !== 'string')
      throw new Error('Expected a JSON request body.');
    expect(JSON.parse(body) as unknown).toMatchObject({
      generationConfig: {
        maxOutputTokens: 32,
        thinkingConfig: { thinkingLevel: 'minimal' },
      },
    });
  });

  it('rejects a provider response with a different dimension', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ embedding: { values: [0.1, 0.2] } }), {
        status: 200,
      }),
    );
    const config = {
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new GeminiProvider(config);

    await expect(provider.embed('test')).rejects.toMatchObject({
      code: ErrorCode.AI_PROVIDER_INVALID_RESPONSE,
      status: 502,
    });
  });

  it('returns a stable rate-limit error without exposing the provider body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429 }));
    const config = {
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new GeminiProvider(config);

    await expect(
      provider.chat([{ role: 'user', content: 'test' }]),
    ).rejects.toMatchObject({
      code: ErrorCode.AI_PROVIDER_RATE_LIMITED,
      status: 503,
    });
  });

  it('rejects a successful response that contains no answer', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    const config = {
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new GeminiProvider(config);

    await expect(
      provider.chat([{ role: 'user', content: 'test' }]),
    ).rejects.toMatchObject({
      code: ErrorCode.AI_PROVIDER_INVALID_RESPONSE,
      status: 502,
    });
  });

  it('streams Gemini SSE text deltas in order', async () => {
    const encoder = new TextEncoder();
    const first = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Hello' }] } }],
    });
    const second = JSON.stringify({
      candidates: [{ content: { parts: [{ text: ' world' }] } }],
    });
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${first}\r\n\r`));
            controller.enqueue(encoder.encode(`\ndata: ${second}\r\n\r\n`));
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );
    const config = {
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new GeminiProvider(config);

    const chunks: string[] = [];
    for await (const chunk of provider.streamChat([
      { role: 'user', content: 'test' },
    ])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
    const requestUrl = fetchMock.mock.calls[0][0];
    if (typeof requestUrl !== 'string')
      throw new Error('Expected a string request URL.');
    expect(requestUrl).toContain(':streamGenerateContent?alt=sse&key=');
  });

  it('rejects a stream that finishes without text', async () => {
    fetchMock.mockResolvedValue(
      new Response(`data: ${JSON.stringify({ candidates: [] })}\n\n`, {
        status: 200,
      }),
    );
    const config = {
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new GeminiProvider(config);

    const iterator = provider
      .streamChat([{ role: 'user', content: 'test' }])
      [Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toMatchObject({
      code: ErrorCode.AI_PROVIDER_INVALID_RESPONSE,
      status: 502,
    });
  });
});
