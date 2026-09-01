import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionResult,
  ChatMessageInput,
  LlmProvider,
  LlmGenerationOptions,
} from '../interfaces/llm-provider.interface';
import { readSseJson } from './sse-stream';
import { fetchProvider, providerPolicy, type ProviderRequestPolicy } from './provider-http';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly key = 'gpt';
  readonly displayName = 'OpenAI GPT';
  readonly model: string;

  private readonly apiKey?: string;
  private readonly embeddingModel: string;
  private readonly requestPolicy: ProviderRequestPolicy;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    this.embeddingModel =
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ??
      'text-embedding-3-small';
    this.requestPolicy = providerPolicy(this.configService);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): Promise<ChatCompletionResult> {
    const model = options.model ?? this.model;
    const response = await fetchProvider('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
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
        `OpenAI API error (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
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
    const response = await fetchProvider('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
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
        `OpenAI API error (${response.status}): ${await response.text()}`,
      );
    for await (const event of readSseJson<{
      choices?: { delta?: { content?: string } }[];
    }>(response)) {
      const content = event.choices?.[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetchProvider('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.embeddingModel, input: text }),
    }, this.requestPolicy);

    if (!response.ok) {
      throw new Error(
        `OpenAI embeddings error (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as { data: { embedding: number[] }[] };
    return data.data[0].embedding;
  }
}
