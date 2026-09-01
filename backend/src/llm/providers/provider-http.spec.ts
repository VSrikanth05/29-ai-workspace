import { fetchProvider } from './provider-http';

describe('fetchProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('retries transient provider responses with a bounded policy', async () => {
    const fetchMock = (jest.fn() as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    global.fetch = fetchMock;

    const response = await fetchProvider('https://provider.test', {}, {
      timeoutMs: 1_000,
      maxRetries: 1,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry client validation failures', async () => {
    const fetchMock = (jest.fn() as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      new Response('', { status: 400 }),
    );
    global.fetch = fetchMock;

    const response = await fetchProvider('https://provider.test', {}, {
      timeoutMs: 1_000,
      maxRetries: 3,
    });

    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
