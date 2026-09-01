import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionResult,
  ChatMessageInput,
  LlmGenerationOptions,
  LlmProvider,
} from '../interfaces/llm-provider.interface';
import { MockLlmProvider } from './mock-llm.provider';
import { fetchProvider, providerPolicy, type ProviderRequestPolicy } from './provider-http';

/**
 * Generic OpenAI-compatible client for Llama models, so it works against
 * Together.ai, Groq, Ollama, or any self-hosted OpenAI-compatible gateway -
 * just point LLAMA_API_URL at it. This mirrors how LiteLLM itself routes
 * "llama" family models.
 */
@Injectable()
export class LlamaProvider implements LlmProvider {
  readonly key = 'ollama';
  readonly displayName = 'Ollama';
  readonly model: string;

  private readonly apiKey?: string;
  private readonly baseUrl?: string;
  private readonly requestPolicy: ProviderRequestPolicy;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockLlmProvider,
  ) {
    this.apiKey = this.configService.get<string>('OLLAMA_API_KEY')?.trim() || this.configService.get<string>('LLAMA_API_KEY')?.trim();
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL')?.trim() || this.configService.get<string>('LLAMA_API_URL')?.trim();
    this.model =
      this.configService.get<string>('OLLAMA_MODEL') ??
      this.configService.get<string>('LLAMA_MODEL') ??
      'llama3.2';
    this.requestPolicy = providerPolicy(this.configService);
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  async chat(messages: ChatMessageInput[], options: LlmGenerationOptions = {}): Promise<ChatCompletionResult> {
    const model = options.model ?? this.model;
    const response = await fetchProvider(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: options.signal,
      body: JSON.stringify({ model, messages, temperature: options.temperature, top_p: options.topP, max_tokens: options.maxTokens }),
    }, { ...this.requestPolicy, signal: options.signal });

    if (!response.ok) {
      throw new Error(
        `Llama gateway error (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    return {
      content: data.choices[0]?.message?.content ?? '',
      provider: this.key,
      model,
    };
  }

  /** Most OpenAI-compatible Llama hosts don't expose embeddings - fall back to mock. */
  async embed(text: string): Promise<number[]> {
    return this.mockProvider.embed(text);
  }
}
