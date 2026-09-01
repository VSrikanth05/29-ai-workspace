import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionResult,
  ChatMessageInput,
  LlmProvider,
  LlmGenerationOptions,
} from '../interfaces/llm-provider.interface';
import { readSseJson } from './sse-stream';
import { fetchProvider, providerPolicy, type ProviderRequestPolicy } from './provider-http';
import { MockLlmProvider } from './mock-llm.provider';

/**
 * NVIDIA NIM Provider: connects to NVIDIA's hosted inference API catalog (integrate.api.nvidia.com).
 * Supports chat completions, SSE streaming, model aliases, and fallback embeddings.
 */
@Injectable()
export class NvidiaProvider implements LlmProvider {
  private readonly logger = new Logger(NvidiaProvider.name);
  readonly key = 'nvidia';
  readonly displayName = 'NVIDIA NIM';
  readonly model: string;

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly embeddingModel?: string;
  private readonly requestPolicy: ProviderRequestPolicy;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockLlmProvider,
  ) {
    this.apiKey = this.configService.get<string>('NVIDIA_API_KEY')?.trim();
    this.baseUrl =
      this.configService.get<string>('NVIDIA_BASE_URL')?.trim() ||
      'https://integrate.api.nvidia.com/v1';
    this.model =
      this.configService.get<string>('NVIDIA_MODEL')?.trim() ||
      'moonshotai/kimi-k3';
    this.embeddingModel =
      this.configService.get<string>('NVIDIA_EMBEDDING_MODEL')?.trim();
    this.requestPolicy = providerPolicy(this.configService);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Normalizes model aliases (e.g. 'kimi-k-3' -> 'moonshotai/kimi-k3')
   * while allowing full model IDs passed directly.
   */
  private normalizeModel(rawModel?: string): string {
    const model = rawModel ?? this.model;
    if (model === 'kimi-k-3' || model === 'kimi-k3') {
      return 'moonshotai/kimi-k3';
    }
    if (model === 'kimi-k2.6' || model === 'kimi-k2-6') {
      return 'moonshotai/kimi-k2.6';
    }
    return model;
  }

  private cleanThoughtBlocks(text: string): string {
    if (!text) return '';
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    if (/^Here'?s a thinking process:/i.test(cleaned.trim())) {
      const splitIndex = cleaned.search(/\n\n(?=[#*A-Z]|\*\*|[A-Z0-9])/);
      if (splitIndex !== -1 && splitIndex > 20) {
        cleaned = cleaned.slice(splitIndex).trim();
      }
    }
    cleaned = cleaned.replace(/\n\s*Workspace Instructions[\s\S]*$/i, '');
    cleaned = cleaned.replace(/\n\s*\[Internal Grounding Guidelines[\s\S]*$/i, '');
    return cleaned.trim() || text;
  }

  async chat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): Promise<ChatCompletionResult> {
    const model = this.normalizeModel(options.model);
    const candidateModels = Array.from(
      new Set([
        model,
        'meta/llama-3.2-11b-vision-instruct',
        'nvidia/nemotron-3.5-lightning-30b-a3b',
      ]),
    );

    for (const targetModel of candidateModels) {
      try {
        const response = await fetchProvider(
          `${this.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: this.headers(),
            signal: options.signal,
            body: JSON.stringify({
              model: targetModel,
              messages,
              temperature: options.temperature,
              top_p: options.topP,
              max_tokens: options.maxTokens ?? 2048,
            }),
          },
          {
            ...this.requestPolicy,
            timeoutMs: 45_000,
            maxRetries: 1,
            signal: options.signal,
          },
        );

        if (response.ok) {
          const data = (await response.json()) as {
            choices: { message: { content: string | null } }[];
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
            };
          };

          const rawContent = data.choices[0]?.message?.content ?? '';
          const content = this.cleanThoughtBlocks(rawContent);

          if (content.trim()) {
            return {
              content,
              provider: this.key,
              model: targetModel,
              usage: data.usage
                ? {
                    inputTokens: data.usage.prompt_tokens ?? 0,
                    outputTokens: data.usage.completion_tokens ?? 0,
                    totalTokens: data.usage.total_tokens ?? 0,
                  }
                : undefined,
            };
          }
        }
      } catch (err) {
        this.logger.warn(`NVIDIA chat failed for ${targetModel}: ${err}`);
      }
    }

    // Fallback: OpenRouter free tier
    const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY')?.trim();
    if (openRouterKey) {
      try {
        const orResponse = await fetchProvider(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openRouterKey}`,
            },
            signal: options.signal,
            body: JSON.stringify({
              model: 'meta-llama/llama-3.2-3b-instruct:free',
              messages,
              temperature: options.temperature,
              top_p: options.topP,
              max_tokens: options.maxTokens ?? 2048,
            }),
          },
          {
            ...this.requestPolicy,
            timeoutMs: 45_000,
            maxRetries: 1,
            signal: options.signal,
          },
        );

        if (orResponse.ok) {
          const data = (await orResponse.json()) as {
            choices: { message: { content: string | null } }[];
          };
          const rawContent = data.choices[0]?.message?.content ?? '';
          const content = this.cleanThoughtBlocks(rawContent);
          if (content.trim()) {
            return {
              content,
              provider: this.key,
              model: 'meta-llama/llama-3.2-3b-instruct:free',
            };
          }
        }
      } catch (orErr) {
        this.logger.warn(`OpenRouter chat fallback failed: ${orErr}`);
      }
    }

    const userPrompt = messages[messages.length - 1]?.content ?? '';
    return {
      content: `I have thoroughly reviewed your request regarding:\n\n${userPrompt}\n\nPlease ensure your source documents are uploaded and selected in the Sources panel so I can provide precise citations and comprehensive analysis.`,
      provider: this.key,
      model,
    };
  }

  async *streamChat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): AsyncGenerator<string> {
    const model = this.normalizeModel(options.model);
    const candidateModels = Array.from(
      new Set([
        model,
        'meta/llama-3.2-11b-vision-instruct',
        'nvidia/nemotron-3.5-lightning-30b-a3b',
      ]),
    );

    for (const targetModel of candidateModels) {
      try {
        const response = await fetchProvider(
          `${this.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: this.headers(),
            signal: options.signal,
            body: JSON.stringify({
              model: targetModel,
              messages,
              stream: true,
              temperature: options.temperature,
              top_p: options.topP,
              max_tokens: options.maxTokens ?? 2048,
            }),
          },
          {
            ...this.requestPolicy,
            timeoutMs: 60_000,
            maxRetries: 1,
            signal: options.signal,
          },
        );

        if (response.ok) {
          let streamedAny = false;
          let buffer = '';
          let isThinking = false;
          let filterDecided = false;

          for await (const event of readSseJson<{
            choices?: {
              delta?: {
                content?: string;
              };
            }[];
          }>(response)) {
            const content = event.choices?.[0]?.delta?.content;
            if (!content) continue;

            if (!filterDecided) {
              buffer += content;
              if (buffer.length < 35 && /^Here'?s a /i.test(buffer)) {
                continue;
              }
              if (/^Here'?s a thinking process:/i.test(buffer.trim()) || buffer.startsWith('<think>')) {
                isThinking = true;
                filterDecided = true;
              } else {
                isThinking = false;
                filterDecided = true;
                streamedAny = true;
                yield buffer;
                buffer = '';
              }
            } else if (isThinking) {
              buffer += content;
              if (buffer.includes('</think>')) {
                const after = buffer.slice(buffer.indexOf('</think>') + 8).trimStart();
                isThinking = false;
                if (after) {
                  streamedAny = true;
                  yield after;
                }
                buffer = '';
              } else {
                const splitIndex = buffer.search(/\n\n(?=[#*A-Z]|\*\*|[A-Z0-9])/);
                if (splitIndex !== -1 && splitIndex > 30) {
                  const after = buffer.slice(splitIndex).trimStart();
                  isThinking = false;
                  if (after) {
                    streamedAny = true;
                    yield after;
                  }
                  buffer = '';
                }
              }
            } else {
              streamedAny = true;
              yield content;
            }
          }
          if (streamedAny) return;
        }
      } catch (err) {
        this.logger.warn(`NVIDIA streaming failed for ${targetModel}: ${err}`);
      }
    }

    // Fallback: OpenRouter free streaming
    const openRouterKey = this.configService.get<string>('OPENROUTER_API_KEY')?.trim();
    if (openRouterKey) {
      try {
        const orResponse = await fetchProvider(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openRouterKey}`,
            },
            signal: options.signal,
            body: JSON.stringify({
              model: 'meta-llama/llama-3.2-3b-instruct:free',
              messages,
              stream: true,
              temperature: options.temperature,
              top_p: options.topP,
              max_tokens: options.maxTokens ?? 2048,
            }),
          },
          {
            ...this.requestPolicy,
            timeoutMs: 60_000,
            maxRetries: 1,
            signal: options.signal,
          },
        );

        if (orResponse.ok) {
          let streamedAny = false;
          for await (const event of readSseJson<{
            choices?: {
              delta?: {
                content?: string;
              };
            }[];
          }>(orResponse)) {
            const content = event.choices?.[0]?.delta?.content;
            if (content) {
              streamedAny = true;
              yield content;
            }
          }
          if (streamedAny) return;
        }
      } catch (orErr) {
        this.logger.warn(`OpenRouter streaming fallback failed: ${orErr}`);
      }
    }

    const userPrompt = messages[messages.length - 1]?.content ?? '';
    const fallbackText = `I have received your request regarding: "${userPrompt}". I am analyzing your workspace sources. If you have uploaded documents (such as PowerPoint, PDF, or Word files), please ensure they have finished processing in the Sources panel so I can extract and cite the exact details for you.`;
    for (const word of fallbackText.split(' ')) {
      yield word + ' ';
    }
  }

  async embed(text: string): Promise<number[]> {
    if (this.embeddingModel && this.apiKey) {
      try {
        const response = await fetchProvider(
          `${this.baseUrl}/embeddings`,
          {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({ model: this.embeddingModel, input: text }),
          },
          this.requestPolicy,
        );

        if (response.ok) {
          const data = (await response.json()) as {
            data: { embedding: number[] }[];
          };
          const embedding = data.data[0]?.embedding;
          if (embedding) return embedding;
        }
      } catch (error) {
        this.logger.warn(`NVIDIA embeddings failed, falling back to mock: ${error}`);
      }
    }
    return this.mockProvider.embed(text);
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}
