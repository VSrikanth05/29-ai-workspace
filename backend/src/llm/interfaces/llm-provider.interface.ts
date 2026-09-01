export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface LlmGenerationOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Every concrete provider (OpenAI/GPT, Gemini, Claude, Llama, Mock, ...)
 * implements this so LlmGatewayService can route to any of them uniformly.
 * This is the "Extensible AI Gateway for future models" requirement —
 * adding a new LLM is just a new class implementing LlmProvider plus one
 * line registering it in LlmGatewayService.
 */
export interface LlmProvider {
  readonly key: string;
  readonly displayName: string;
  readonly model: string;

  /** Whether this provider has real credentials configured (vs. running as a mock fallback). */
  isConfigured(): boolean;

  chat(
    messages: ChatMessageInput[],
    options?: LlmGenerationOptions,
  ): Promise<ChatCompletionResult>;

  /** Streams text deltas when the provider supports native streaming. */
  streamChat?(
    messages: ChatMessageInput[],
    options?: LlmGenerationOptions,
  ): AsyncIterable<string>;

  /** Returns a vector of length EMBEDDING_DIMENSIONS. */
  embed(text: string): Promise<number[]>;
}
