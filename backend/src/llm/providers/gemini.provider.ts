import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionResult,
  ChatMessageInput,
  EMBEDDING_DIMENSIONS,
  LlmProvider,
  LlmGenerationOptions,
} from '../interfaces/llm-provider.interface';
import { AppException, ErrorCode } from '../../common/errors/app.exception';
import { fetchProvider, providerPolicy, type ProviderRequestPolicy } from './provider-http';

@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly key = 'gemini';
  readonly displayName = 'Google Gemini';
  readonly model: string;

  private readonly apiKey?: string;
  private readonly embeddingModel: string;
  private readonly requestPolicy: ProviderRequestPolicy;
  private readonly thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.model =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.6-flash';
    this.embeddingModel =
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ??
      'text-embedding-004';
    this.requestPolicy = providerPolicy(this.configService);
    const configuredThinkingLevel = this.configService
      .get<string>('GEMINI_THINKING_LEVEL')
      ?.trim()
      .toLowerCase();
    const thinkingLevels = new Set(['minimal', 'low', 'medium', 'high']);
    this.thinkingLevel = thinkingLevels.has(configuredThinkingLevel ?? '')
      ? (configuredThinkingLevel as 'minimal' | 'low' | 'medium' | 'high')
      : /^gemini-3(?:\.|$)/i.test(this.model)
        ? 'minimal'
        : undefined;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): Promise<ChatCompletionResult> {
    const model = options.model ?? this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify(this.chatRequest(messages, options)),
    });

    const data = await this.parseJson<{
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    }>(response);

    const content =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('') ?? '';

    if (!content.trim()) {
      throw this.invalidResponse('Gemini returned no text content.');
    }

    return {
      content,
      provider: this.key,
      model,
      usage: data.usageMetadata ? {
        inputTokens: data.usageMetadata.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata.totalTokenCount ?? 0,
      } : undefined,
    };
  }

  async *streamChat(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ): AsyncGenerator<string> {
    const model = options.model ?? this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const response = await this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify(this.chatRequest(messages, options)),
    });

    if (!response.body) {
      throw this.invalidResponse('Gemini returned no streaming response body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedText = false;
    let finished = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        buffer = buffer.replace(/\r\n/g, '\n');

        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const text = this.parseStreamEvent(event);
          if (text) {
            receivedText = true;
            yield text;
          }
          boundary = buffer.indexOf('\n\n');
        }

        if (done) break;
      }

      if (buffer.trim()) {
        const text = this.parseStreamEvent(buffer);
        if (text) {
          receivedText = true;
          yield text;
        }
      }

      if (!receivedText) {
        throw this.invalidResponse('Gemini streamed no text content.');
      }
      finished = true;
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw new AppException(
        ErrorCode.AI_PROVIDER_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        'The Gemini service is temporarily unavailable.',
        error,
      );
    } finally {
      if (!finished) await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }

  async embed(text: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;

    const response = await this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${this.embeddingModel}`,
        content: { parts: [{ text }] },
        // Gemini embedding models default to 3072 values. Keep the API output
        // explicit so it always matches DocumentChunk.embedding vector(1536).
        embedContentConfig: { outputDimensionality: EMBEDDING_DIMENSIONS },
      }),
    });

    const data = await this.parseJson<{
      embedding?: { values?: number[] };
    }>(response);
    const embedding = data.embedding?.values;

    if (!embedding) {
      throw this.invalidResponse('Gemini returned no embedding.');
    }

    if (
      embedding.length !== EMBEDDING_DIMENSIONS ||
      !embedding.every(Number.isFinite)
    ) {
      throw this.invalidResponse(
        `Gemini returned an invalid embedding with ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSIONS} finite values.`,
      );
    }

    return embedding;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await fetchProvider(url, init, { ...this.requestPolicy, signal: init.signal ?? undefined });
    } catch (error) {
      throw new AppException(
        ErrorCode.AI_PROVIDER_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        'The Gemini service is temporarily unavailable.',
        error,
      );
    }

    if (response.ok) return response;

    if (response.status === 429) {
      throw new AppException(
        ErrorCode.AI_PROVIDER_RATE_LIMITED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'The Gemini service is temporarily rate limited.',
        new Error(`Gemini returned HTTP ${response.status}.`),
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AppException(
        ErrorCode.AI_PROVIDER_AUTHENTICATION_FAILED,
        HttpStatus.BAD_GATEWAY,
        'Gemini authentication failed.',
        new Error(`Gemini returned HTTP ${response.status}.`),
      );
    }

    if (response.status >= 500) {
      throw new AppException(
        ErrorCode.AI_PROVIDER_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        'The Gemini service is temporarily unavailable.',
        new Error(`Gemini returned HTTP ${response.status}.`),
      );
    }

    throw new AppException(
      ErrorCode.AI_PROVIDER_REQUEST_FAILED,
      HttpStatus.BAD_GATEWAY,
      'Gemini rejected the request.',
      new Error(`Gemini returned HTTP ${response.status}.`),
    );
  }

  private chatRequest(
    messages: ChatMessageInput[],
    options: LlmGenerationOptions = {},
  ) {
    const systemInstruction = messages.find(
      (message) => message.role === 'system',
    )?.content;
    const contents = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    return {
      contents,
      generationConfig: {
        temperature: options.temperature,
        topP: options.topP,
        maxOutputTokens: options.maxTokens,
        ...(this.thinkingLevel
          ? { thinkingConfig: { thinkingLevel: this.thinkingLevel } }
          : {}),
      },
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
        : {}),
    };
  }

  private parseStreamEvent(event: string): string {
    const payload = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trimStart())
      .join('\n');

    if (!payload || payload === '[DONE]') return '';

    let data: {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    try {
      data = JSON.parse(payload) as typeof data;
    } catch (error) {
      throw this.invalidResponse('Gemini streamed invalid JSON.', error);
    }

    return (
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('') ?? ''
    );
  }

  private async parseJson<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw this.invalidResponse('Gemini returned invalid JSON.', error);
    }
  }

  private invalidResponse(message: string, cause?: unknown): AppException {
    return new AppException(
      ErrorCode.AI_PROVIDER_INVALID_RESPONSE,
      HttpStatus.BAD_GATEWAY,
      'Gemini returned an invalid response.',
      cause ?? new Error(message),
    );
  }
}
