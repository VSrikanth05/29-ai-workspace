export type GenerationSettings = {
  temperature: number;
  maxTokens: number;
};

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  temperature: 0.7,
  maxTokens: 1024,
};

function storageKey(workspaceId: string | null) {
  return workspaceId ? `29ai.generation.${workspaceId}` : '29ai.generation.default';
}

export function readGenerationSettings(workspaceId: string | null): GenerationSettings {
  if (typeof window === 'undefined') return DEFAULT_GENERATION_SETTINGS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(workspaceId)) ?? '{}') as Partial<GenerationSettings>;
    return {
      temperature: typeof parsed.temperature === 'number' ? Math.min(2, Math.max(0, parsed.temperature)) : DEFAULT_GENERATION_SETTINGS.temperature,
      maxTokens: typeof parsed.maxTokens === 'number' ? Math.min(32768, Math.max(1, Math.round(parsed.maxTokens))) : DEFAULT_GENERATION_SETTINGS.maxTokens,
    };
  } catch {
    return DEFAULT_GENERATION_SETTINGS;
  }
}

export function saveGenerationSettings(workspaceId: string | null, settings: GenerationSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(workspaceId), JSON.stringify(settings));
  window.dispatchEvent(new Event('29ai:generation-settings'));
}
