'use client';

import { Laptop, Moon, Palette, Save, Settings, SlidersHorizontal, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useProviderCatalog } from '@/features/providers/hooks/use-provider-catalog';
import { useWorkspaces } from '@/features/sources/hooks/use-sources';
import { readGenerationSettings, saveGenerationSettings, type GenerationSettings } from '@/lib/generation-settings';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { usePreferences, useUpdatePreferences } from '../hooks/use-knowledge';
import type { Preference } from '../knowledge-types';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', description: 'Follow your device settings', icon: Laptop },
  { value: 'light', label: 'Light', description: 'A bright, focused workspace', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'A softer experience for low light', icon: Moon },
] as const;

export function WorkspaceSettings() {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);
  const workspaces = useWorkspaces();
  const preferences = usePreferences(workspaceId);
  const update = useUpdatePreferences(workspaceId);
  const catalog = useProviderCatalog();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<Partial<Preference>>({});
  const [generation, setGeneration] = useState<GenerationSettings>(readGenerationSettings(workspaceId));

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!workspaceId && workspaces.data?.[0]) setActiveWorkspaceId(workspaces.data[0].id);
  }, [setActiveWorkspaceId, workspaces.data, workspaceId]);
  useEffect(() => {
    if (preferences.data) {
      setForm(preferences.data);
      if (mounted) setTheme(preferences.data.theme);
    }
  }, [mounted, preferences.data, setTheme]);
  useEffect(() => setGeneration(readGenerationSettings(workspaceId)), [workspaceId]);

  const change = (key: keyof Preference, value: string | boolean) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'defaultProvider') {
        const nextModels = (catalog.models.data ?? []).filter(
          (item) => item.provider === value && item.configured,
        );
        if (nextModels.length > 0 && nextModels[0]?.id) {
          next.defaultModel = nextModels[0].id;
        }
      }
      return next;
    });
    if (key === 'theme' && mounted) setTheme(value as Preference['theme']);
  };
  const changeGeneration = (key: keyof GenerationSettings, value: number) => setGeneration((current) => ({ ...current, [key]: value }));
  const save = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(form);
    saveGenerationSettings(workspaceId, generation);
  };

  const models = catalog.models.data?.filter((item) => item.provider === form.defaultProvider) ?? [];
  return (
    <section className="mx-auto min-h-full max-w-4xl p-4 sm:p-6 lg:p-8" aria-labelledby="settings-title">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace preferences</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Settings className="size-5" /></span>
          <div><h1 id="settings-title" className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Settings</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">Tune your workspace once, then keep the main conversation focused on your work.</p></div>
        </div>
      </div>

      <form onSubmit={save} className="mt-8 space-y-5">
        <section className="rounded-2xl border border-border bg-panel p-5" aria-labelledby="ai-defaults-title">
          <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><SlidersHorizontal className="size-4" /></span><div><h2 id="ai-defaults-title" className="text-sm font-semibold">AI defaults</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Provider, model, and generation settings are used by Chat and AI Studio.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Default provider"><select value={form.defaultProvider ?? ''} onChange={(event) => change('defaultProvider', event.target.value)} className="field" required><option value="" disabled>Select a provider</option>{catalog.providers.data?.map((item) => <option key={item.id} value={item.id} disabled={!item.configured}>{item.name}{item.configured ? '' : ' (not configured)'}</option>)}</select></Field>
            <Field label="Default model"><select value={form.defaultModel ?? ''} onChange={(event) => change('defaultModel', event.target.value)} className="field" required><option value="" disabled>Select a model</option>{models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Temperature"><input type="number" min="0" max="2" step="0.1" value={generation.temperature} onChange={(event) => changeGeneration('temperature', Number(event.target.value))} className="field" /><span className="mt-1 block text-[11px] font-normal text-muted-foreground">Lower values keep answers more focused.</span></Field>
            <Field label="Maximum tokens"><input type="number" min="1" max="32768" value={generation.maxTokens} onChange={(event) => changeGeneration('maxTokens', Number(event.target.value))} className="field" /><span className="mt-1 block text-[11px] font-normal text-muted-foreground">Controls the maximum response length.</span></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5" aria-labelledby="appearance-title">
          <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Palette className="size-4" /></span><div><h2 id="appearance-title" className="text-sm font-semibold">Appearance</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose the theme that feels right for your workspace.</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => { const Icon = option.icon; const checked = (form.theme ?? theme ?? 'system') === option.value; return <button key={option.value} type="button" role="radio" aria-checked={checked} onClick={() => change('theme', option.value)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}><Icon className={`mt-0.5 size-4 ${checked ? 'text-primary' : 'text-muted-foreground'}`} /><span><span className="block text-xs font-semibold">{option.label}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{option.description}</span></span></button>; })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5" aria-labelledby="workspace-behavior-title">
          <h2 id="workspace-behavior-title" className="text-sm font-semibold">Workspace behavior</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Language"><select value={form.language ?? 'en'} onChange={(event) => change('language', event.target.value)} className="field"><option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option></select></Field><Field label="Default export format"><select value={form.defaultExportFormat ?? 'markdown'} onChange={(event) => change('defaultExportFormat', event.target.value)} className="field"><option value="markdown">Markdown</option><option value="json">JSON</option><option value="csv">CSV</option></select></Field></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><Toggle label="Stream AI responses" checked={form.streaming ?? true} onChange={(value) => change('streaming', value)} /><Toggle label="Autosave outputs" checked={form.autosave ?? true} onChange={(value) => change('autosave', value)} /></div>
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-5"><span role="status" className="text-xs text-muted-foreground">{update.isSuccess ? 'Preferences saved' : ''}</span><Button disabled={!workspaceId || update.isPending}><Save className="size-4" />Save preferences</Button></div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="text-xs font-medium">{label}{children}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-primary" /></label>;
}
