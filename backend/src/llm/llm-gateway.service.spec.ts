import { ErrorCode } from '../common/errors/app.exception';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { LlmGatewayService } from './llm-gateway.service';

function provider(key: string, chat: LlmProvider['chat']): LlmProvider {
  return {
    key,
    displayName: key,
    model: 'test-model',
    isConfigured: () => true,
    chat,
    embed: jest.fn(),
  };
}

describe('LlmGatewayService error handling', () => {
  it('translates an untyped provider failure to a stable gateway error', async () => {
    const gemini = provider(
      'gemini',
      jest.fn().mockRejectedValue(new Error('socket failure')),
    );
    const other = provider('other', jest.fn());
    const service = new LlmGatewayService(
      {} as never,
      other as never,
      other as never,
      gemini as never,
      other as never,
      other as never,
      other as never,
      other as never,
    );

    await expect(
      service.chat('gemini', [{ role: 'user', content: 'hi' }]),
    ).rejects.toMatchObject({
      code: ErrorCode.AI_PROVIDER_REQUEST_FAILED,
      status: 502,
    });
  });

  it('passes through native provider stream chunks', async () => {
    async function* nativeStream() {
      await Promise.resolve();
      yield 'one';
      yield ' two';
    }
    const gemini = {
      ...provider('gemini', jest.fn()),
      streamChat: nativeStream,
    };
    const other = provider('other', jest.fn());
    const service = new LlmGatewayService(
      {} as never,
      other as never,
      other as never,
      gemini as never,
      other as never,
      other as never,
      other as never,
      other as never,
    );

    const result = service.streamChat('gemini', [
      { role: 'user', content: 'hi' },
    ]);
    const chunks: string[] = [];
    for await (const chunk of result.chunks) chunks.push(chunk);

    expect(chunks).toEqual(['one', ' two']);
    expect(result).toMatchObject({ provider: 'gemini', model: 'test-model' });
  });

  it('uses the non-streaming provider as a single-chunk fallback', async () => {
    const gemini = provider(
      'gemini',
      jest.fn().mockResolvedValue({
        content: 'complete answer',
        provider: 'gemini',
        model: 'test-model',
      }),
    );
    const other = provider('other', jest.fn());
    const service = new LlmGatewayService(
      {} as never,
      other as never,
      other as never,
      gemini as never,
      other as never,
      other as never,
      other as never,
      other as never,
    );

    const chunks: string[] = [];
    for await (const chunk of service.streamChat('gemini', []).chunks) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['complete answer']);
  });
});
