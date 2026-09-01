export type ProviderId = 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'ollama' | 'nvidia';
export type Provider = { id: ProviderId; name: string; configured: boolean; models: string[] };
export type Model = { id: string; provider: Provider['id']; name: string; configured: boolean };
export type ProviderHealth = { id: ProviderId; name: string; status: 'ready' | 'not_configured' | string; apiKeyConfigured: boolean; models: string[]; defaultModel: string | null };
