import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChatCompletionResult,
  ChatMessageInput,
  LlmProvider,
  LlmGenerationOptions,
} from './interfaces/llm-provider.interface';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LlamaProvider } from './providers/llama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { NvidiaProvider } from './providers/nvidia.provider';
import { AppException, ErrorCode } from '../common/errors/app.exception';
import { tracedIterable, withSpan } from '../infrastructure/trace.util';

export interface ChatStreamResult {
  chunks: AsyncIterable<string>;
  provider: string;
  model: string;
}

/**
 * Central AI Gateway: routes a chat/embed request to whichever provider was
 * requested (gpt | gemini | claude | llama | openrouter | nvidia | mock). Provider
 * failures are surfaced to the caller; a real request is never silently
 * replaced with mock output.
 * Adding a new model later = one new LlmProvider class + one line in
 * `registerProviders()`.
 */
@Injectable()
export class LlmGatewayService implements OnModuleInit {
  private readonly providers = new Map<string, LlmProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mockProvider: MockLlmProvider,
    private readonly openAiProvider: OpenAiProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly llamaProvider: LlamaProvider,
    private readonly openRouterProvider: OpenRouterProvider,
    private readonly nvidiaProvider: NvidiaProvider,
  ) {
    this.registerProviders();
  }

  private registerProviders() {
    for (const provider of [
      this.mockProvider,
      this.openAiProvider,
      this.geminiProvider,
      this.anthropicProvider,
      this.llamaProvider,
      this.openRouterProvider,
      this.nvidiaProvider,
    ]) {
      this.providers.set(provider.key, provider);
    }
  }

  /** Seeds/updates the LlmConfig catalog table so the frontend can list available models. */
  async onModuleInit() {
    for (const provider of this.providers.values()) {
      await this.prisma.llmConfig.upsert({
        where: { provider: provider.key },
        update: {
          displayName: provider.displayName,
          model: provider.model,
          isConfigured: provider.isConfigured(),
        },
        create: {
          provider: provider.key,
          displayName: provider.displayName,
          model: provider.model,
          isConfigured: provider.isConfigured(),
        },
      });
    }
  }

  listProviders() {
    return this.prisma.llmConfig.findMany({ orderBy: { provider: 'asc' } });
  }

  private resolve(providerKey: string): LlmProvider {
    const provider = this.providers.get(providerKey);

    if (!provider) {
      throw new AppException(
        ErrorCode.AI_PROVIDER_UNKNOWN,
        HttpStatus.BAD_REQUEST,
        `Unknown AI provider "${providerKey}".`,
      );
    }

    if (!provider.isConfigured()) {
      throw new AppException(
        ErrorCode.AI_PROVIDER_NOT_CONFIGURED,
        HttpStatus.SERVICE_UNAVAILABLE,
        `AI provider "${providerKey}" is not configured.`,
      );
    }

    return provider;
  }

  async chat(
    providerKey: string,
    messages: ChatMessageInput[],
    options?: LlmGenerationOptions,
  ): Promise<ChatCompletionResult> {
    const provider = this.resolve(providerKey);

    try {
      return await withSpan(
        'ai.gateway.chat',
        { 'ai.provider': provider.key, 'ai.model': provider.model },
        () => provider.chat(messages, options),
      );
    } catch (error) {
      this.rethrowProviderError(error);
    }
  }

  streamChat(
    providerKey: string,
    messages: ChatMessageInput[],
    options?: LlmGenerationOptions,
  ): ChatStreamResult {
    const provider = this.resolve(providerKey);
    return {
      chunks: tracedIterable(
        'ai.gateway.stream',
        { 'ai.provider': provider.key, 'ai.model': provider.model },
        this.streamProvider(provider, messages, options),
      ),
      provider: provider.key,
      model: provider.model,
    };
  }

  /**
   * Embedding failures are never replaced by vectors from another model,
   * because mixing embedding spaces makes similarity search invalid.
   */
  async embed(providerKey: string, text: string): Promise<number[]> {
    const provider = this.resolve(providerKey);

    try {
      return await withSpan(
        'ai.gateway.embed',
        { 'ai.provider': provider.key, 'ai.model': provider.model },
        () => provider.embed(text),
      );
    } catch (error) {
      this.rethrowProviderError(error);
    }
  }

  private rethrowProviderError(error: unknown): never {
    if (error instanceof AppException) throw error;
    throw new AppException(
      ErrorCode.AI_PROVIDER_REQUEST_FAILED,
      HttpStatus.BAD_GATEWAY,
      'The AI provider could not complete the request.',
      error,
    );
  }

  private async *streamProvider(
    provider: LlmProvider,
    messages: ChatMessageInput[],
    options?: LlmGenerationOptions,
  ): AsyncGenerator<string> {
    try {
      let receivedText = false;
      if (provider.streamChat) {
        for await (const chunk of provider.streamChat(messages, options)) {
          if (!chunk) continue;
          receivedText = true;
          yield chunk;
        }
      } else {
        const result = await provider.chat(messages, options);
        if (result.content) {
          receivedText = true;
          yield result.content;
        }
      }

      if (!receivedText) {
        throw new AppException(
          ErrorCode.AI_PROVIDER_INVALID_RESPONSE,
          HttpStatus.BAD_GATEWAY,
          'The AI provider returned an invalid response.',
        );
      }
    } catch (error) {
      this.rethrowProviderError(error);
    }
  }
}
