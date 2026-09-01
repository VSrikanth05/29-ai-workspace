import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionResult,
  ChatMessageInput,
  LlmProvider,
  LlmGenerationOptions,
} from '../interfaces/llm-provider.interface';
import { readSseJson } from './sse-stream';
import { MockLlmProvider } from './mock-llm.provider';
import { fetchProvider, providerPolicy, type ProviderRequestPolicy } from './provider-http';

@Injectable()
export class AnthropicProvider implements LlmProvider {
  readonly key = 'claude';
  readonly displayName = 'Anthropic Claude';
  readonly model: string;

  private readonly apiKey?: string;
  private readonly requestPolicy: ProviderRequestPolicy;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockLlmProvider,
  ) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.model =
      this.configService.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6';
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
    const system = messages.find((m) => m.role === 'system')?.content;
    const conversation = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetchProvider('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature,
        top_p: options.topP,
        system,
        messages: conversation,
      }),
    }, { ...this.requestPolicy, signal: options.signal });

    if (!response.ok) {
      throw new Error(
        `Anthropic API error (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const content = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      provider: this.key,
      model,
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens ?? 0,
        outputTokens: data.usage.output_tokens ?? 0,
        totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
      } : undefined,
    };
  }

  async *streamChat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): AsyncGenerator<string> {
    const system = messages.find(
      (message) => message.role === 'system',
    )?.content;
    const conversation = messages.filter(
      (message) => message.role !== 'system',
    );
    const response = await fetchProvider('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      signal: options.signal,
      body: JSON.stringify({
        model: options.model ?? this.model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature,
        top_p: options.topP,
        system,
        messages: conversation,
        stream: true,
      }),
    }, { ...this.requestPolicy, signal: options.signal });
    if (!response.ok)
      throw new Error(
        `Anthropic API error (${response.status}): ${await response.text()}`,
      );
    for await (const event of readSseJson<{
      type?: string;
      delta?: { type?: string; text?: string };
    }>(response)) {
      if (event.type === 'content_block_delta' && event.delta?.text)
        yield event.delta.text;
    }
  }

  /** Anthropic has no embeddings endpoint - delegate to the mock's deterministic vectors. */
  async embed(text: string): Promise<number[]> {
    return this.mockProvider.embed(text);
  }
}
