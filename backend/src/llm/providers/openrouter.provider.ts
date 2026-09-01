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

/** OpenRouter uses an OpenAI-compatible API for chat and embeddings. */
@Injectable()
export class OpenRouterProvider implements LlmProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);
  readonly key = 'openrouter';
  readonly displayName = 'OpenRouter';
  readonly model: string;

  private readonly apiKey?: string;
  private readonly embeddingModel: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly requestPolicy: ProviderRequestPolicy;

  constructor(private readonly configService: ConfigService) {
    // Treat an empty or whitespace-only value as absent. This avoids reporting
    // a provider as configured when the .env template has not been filled in.
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY')?.trim();
    this.model =
      this.configService.get<string>('OPENROUTER_CHAT_MODEL') ??
      'openai/gpt-4o-mini';
    this.embeddingModel =
      this.configService.get<string>('OPENROUTER_EMBEDDING_MODEL') ??
      'openai/text-embedding-3-small';
    this.requestPolicy = providerPolicy(this.configService);

    // Temporary startup diagnostics: intentionally log only whether the API
    // key exists, never its value.
    this.logger.log(`LLM configuration: cwd=${process.cwd()}`);
    this.logger.log(
      `OPENROUTER_API_KEY process.env=${process.env.OPENROUTER_API_KEY ? 'FOUND' : 'MISSING'}`,
    );
    this.logger.log(
      `OPENROUTER_API_KEY ConfigService=${this.configService.get<string>('OPENROUTER_API_KEY') ? 'FOUND' : 'MISSING'}`,
    );
    this.logger.log(
      `LLM_PROVIDER ConfigService=${this.configService.get<string>('LLM_PROVIDER') ?? 'MISSING'}`,
    );
    this.logger.log(`OPENROUTER_CHAT_MODEL ConfigService=${this.model}`);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): Promise<ChatCompletionResult> {
    const model = options.model ?? this.model;
    const response = await fetchProvider(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal: options.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature,
        top_p: options.topP,
        max_tokens: options.maxTokens,
      }),
    }, { ...this.requestPolicy, signal: options.signal });

    if (!response.ok) {
      throw new Error(
        `OpenRouter chat API error (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string | null } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? '',
      provider: this.key,
      model,
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens ?? 0,
        outputTokens: data.usage.completion_tokens ?? 0,
        totalTokens: data.usage.total_tokens ?? 0,
      } : undefined,
    };
  }

  async *streamChat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): AsyncGenerator<string> {
    const response = await fetchProvider(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal: options.signal,
      body: JSON.stringify({
        model: options.model ?? this.model,
        messages,
        stream: true,
        temperature: options.temperature,
        top_p: options.topP,
        max_tokens: options.maxTokens,
      }),
    }, { ...this.requestPolicy, signal: options.signal });
    if (!response.ok)
      throw new Error(
        `OpenRouter chat API error (${response.status}): ${await response.text()}`,
      );
    for await (const event of readSseJson<{
      choices?: { delta?: { content?: string } }[];
    }>(response)) {
      const content = event.choices?.[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetchProvider(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.embeddingModel, input: text }),
    }, this.requestPolicy);

    if (!response.ok) {
      throw new Error(
        `OpenRouter embeddings API error (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as { data: { embedding: number[] }[] };
    const embedding = data.data[0]?.embedding;
    if (!embedding) {
      throw new Error('OpenRouter embeddings API returned no embedding.');
    }

    return embedding;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}
