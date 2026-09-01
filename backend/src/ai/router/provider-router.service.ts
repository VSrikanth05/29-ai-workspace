import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../../llm/llm-gateway.service';
import type {
  ChatMessageInput,
  LlmGenerationOptions,
} from '../providers/provider.interface';
import type {
  ProviderDescriptor,
  AiProviderId,
} from '../providers/provider.interface';

const PROVIDER_ALIASES: Record<AiProviderId, string> = {
  openai: 'gpt',
  gemini: 'gemini',
  anthropic: 'claude',
  openrouter: 'openrouter',
  ollama: 'ollama',
  nvidia: 'nvidia',
};
const REVERSE_ALIASES: Record<string, AiProviderId> = {
  gpt: 'openai',
  gemini: 'gemini',
  claude: 'anthropic',
  openrouter: 'openrouter',
  ollama: 'ollama',
  nvidia: 'nvidia',
};

@Injectable()
export class ProviderRouterService {
  constructor(private readonly gateway: LlmGatewayService) {}

  async providers(): Promise<ProviderDescriptor[]> {
    const configured = await this.gateway.listProviders();
    return configured.flatMap((entry) => {
      const id = REVERSE_ALIASES[entry.provider];
      const extraModels =
        id === 'nvidia'
          ? [
              'moonshotai/kimi-k3',
              'nvidia/nemotron-3.5-lightning-30b-a3b',
              'meta/llama-3.2-11b-vision-instruct',
            ]
          : id === 'openrouter'
            ? [
                'nvidia/nemotron-3.5-lightning:free',
                'minimax/minimax-m2.7:free',
                'inclusionai/ling-3.0-flash-fin:free',
              ]
            : [];
      return id
        ? [
            {
              id,
              name: entry.displayName,
              configured: entry.isConfigured && entry.isActive,
              models: Array.from(new Set([entry.model, ...extraModels])),
            },
          ]
        : [];
    });
  }

  async models() {
    return (await this.providers()).flatMap((provider) =>
      provider.models.map((id) => ({
        id,
        provider: provider.id,
        name: id,
        configured: provider.configured,
      })),
    );
  }

  async resolve(provider: string, model?: string) {
    if (!(provider in PROVIDER_ALIASES))
      throw new BadRequestException(`Unsupported provider "${provider}".`);
    const publicId = (REVERSE_ALIASES[provider] ?? provider) as AiProviderId;
    const gatewayKey = PROVIDER_ALIASES[publicId] ?? provider;
    const descriptors = await this.providers();
    const descriptor = descriptors.find((item) => item.id === publicId);
    if (!descriptor)
      throw new BadRequestException(`Unsupported provider "${provider}".`);

    const selectedModel = model ?? descriptor.models[0];
    if (
      model &&
      descriptor.models.length > 0 &&
      !descriptor.models.includes(model) &&
      !descriptor.models.some((m) => model.includes(m) || m.includes(model))
    ) {
      throw new BadRequestException(
        `Model "${model}" is not available for ${provider}.`,
      );
    }

    return {
      publicId,
      gatewayKey,
      model: selectedModel,
    };
  }

  chat(
    providerKey: string,
    messages: ChatMessageInput[],
    options: LlmGenerationOptions,
  ) {
    return this.gateway.chat(providerKey, messages, options);
  }

  stream(
    providerKey: string,
    messages: ChatMessageInput[],
    options: LlmGenerationOptions,
  ) {
    return this.gateway.streamChat(providerKey, messages, options);
  }
}
