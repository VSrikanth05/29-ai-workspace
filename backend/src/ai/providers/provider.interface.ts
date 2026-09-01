export type {
  ChatCompletionResult,
  ChatMessageInput,
  LlmGenerationOptions,
} from '../../llm/interfaces/llm-provider.interface';
export type AiProviderId =
  | 'openai'
  | 'gemini'
  | 'anthropic'
  | 'openrouter'
  | 'ollama'
  | 'nvidia';
export interface ProviderDescriptor {
  id: AiProviderId;
  name: string;
  configured: boolean;
  models: string[];
}
