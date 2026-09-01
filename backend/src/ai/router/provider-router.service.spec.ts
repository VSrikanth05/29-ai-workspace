import { ProviderRouterService } from './provider-router.service';
import { LlmGatewayService } from '../../llm/llm-gateway.service';

describe('ProviderRouterService', () => {
  const gateway = {
    listProviders: jest.fn().mockResolvedValue([
      {
        provider: 'gpt',
        displayName: 'OpenAI',
        model: 'gpt-test',
        isConfigured: true,
        isActive: true,
      },
      {
        provider: 'claude',
        displayName: 'Anthropic',
        model: 'claude-test',
        isConfigured: true,
        isActive: true,
      },
      {
        provider: 'mock',
        displayName: 'Mock',
        model: 'mock',
        isConfigured: true,
        isActive: true,
      },
    ]),
    chat: jest.fn(),
    streamChat: jest.fn(),
  } as unknown as LlmGatewayService;
  const service = new ProviderRouterService(gateway);

  it('publishes only approved providers and maps public identifiers', async () => {
    expect(await service.providers()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'openai' }),
        expect.objectContaining({ id: 'anthropic' }),
      ]),
    );
    expect(
      (await service.providers()).some((item) => item.id === ('mock' as never)),
    ).toBe(false);
    await expect(service.resolve('openai', 'gpt-test')).resolves.toMatchObject({
      gatewayKey: 'gpt',
      model: 'gpt-test',
    });
  });

  it('rejects models that do not belong to the provider', async () => {
    await expect(service.resolve('openai', 'claude-test')).rejects.toThrow(
      'not available',
    );
  });
});
