'use client';

import { useState } from 'react';
import {
  Download,
  FileImage,
  Film,
  Image as ImageIcon,
  LoaderCircle,
  Sparkles,
  Volume2,
  Wand2,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useWorkspaces } from '@/features/sources/hooks/use-sources';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MediaTab = 'image' | 'video' | 'audio';

interface MediaAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO';
  url?: string;
  status: string;
  prompt: string;
}

export function MediaToolsPage() {
  const [activeTab, setActiveTab] = useState<MediaTab>('image');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1536x1024' | '1024x1536'>('1024x1024');
  const [voice, setVoice] = useState('alloy');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<MediaAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);
  const workspaces = useWorkspaces();

  const currentWorkspaceId = activeWorkspaceId ?? workspaces.data?.[0]?.id ?? null;

  const generateMedia = async (type: 'image' | 'video' | 'audio') => {
    if (!currentWorkspaceId) {
      setError('Please create or select a workspace first.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a description or prompt.');
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        workspaceId: currentWorkspaceId,
        type,
        prompt: prompt.trim(),
        ...(type === 'image' ? { size } : {}),
        ...(type === 'audio' ? { voice } : {}),
      };

      const asset = await apiRequest<MediaAsset>('/media/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(asset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Media generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto min-h-full max-w-6xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <ImageIcon className="size-4.5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Media Hub</p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Media Tools</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Generate and edit AI images, cinematic videos, and voice audio from natural language.
          </p>
        </div>

        {/* Workspace selector */}
        {workspaces.data && workspaces.data.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Workspace:</label>
            <select
              aria-label="Workspace"
              value={currentWorkspaceId ?? ''}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
              className="h-9 rounded-lg border border-border bg-panel px-3 text-xs font-medium"
            >
              {workspaces.data.map((ws: { id: string; name: string }) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => { setActiveTab('image'); setResult(null); setError(null); }}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'image' ? 'bg-primary text-primary-foreground' : 'bg-panel text-muted-foreground hover:bg-accent',
          )}
        >
          <Sparkles className="size-3.5" /> Image Studio
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('video'); setResult(null); setError(null); }}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'video' ? 'bg-primary text-primary-foreground' : 'bg-panel text-muted-foreground hover:bg-accent',
          )}
        >
          <Film className="size-3.5" /> Video Studio
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('audio'); setResult(null); setError(null); }}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'audio' ? 'bg-primary text-primary-foreground' : 'bg-panel text-muted-foreground hover:bg-accent',
          )}
        >
          <Volume2 className="size-3.5" /> Audio & Speech
        </button>
      </div>

      {/* Main Generator Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Configuration Column */}
        <div className="space-y-4 rounded-2xl border border-border bg-panel p-5 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">
              {activeTab === 'image' && 'Image Generator'}
              {activeTab === 'video' && 'Video Motion Generator'}
              {activeTab === 'audio' && 'Speech & Audio Generator'}
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              {activeTab === 'image' && 'Prompt / Visual Description'}
              {activeTab === 'video' && 'Scene & Motion Description'}
              {activeTab === 'audio' && 'Text to Speak / Spoken Prompt'}
            </label>
            <textarea
              aria-label="Media prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'image'
                  ? 'e.g. A futuristic glass architectural building with lush gardens at sunset, photorealistic 8k'
                  : activeTab === 'video'
                  ? 'e.g. Drone camera gliding through a misty redwood forest, cinematic lighting, 4k 60fps'
                  : 'e.g. Welcome to our workspace. Today we are reviewing the quarterly project updates.'
              }
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {activeTab === 'image' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Resolution</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(['1024x1024', '1536x1024', '1024x1536'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSize(opt)}
                    className={cn(
                      'rounded-lg border p-2 text-center text-xs font-medium transition-colors',
                      size === opt
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {opt === '1024x1024' ? '1:1 Square' : opt === '1536x1024' ? '16:9 Landscape' : '9:16 Portrait'}
                    <span className="block text-[10px] text-muted-foreground">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Voice Persona</label>
              <select
                aria-label="Voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
              >
                {['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'].map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0).toUpperCase() + v.slice(1)} Voice
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-lg bg-red-500/10 p-3 text-xs text-red-600">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            disabled={generating || !currentWorkspaceId}
            onClick={() => void generateMedia(activeTab)}
          >
            {generating ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Generating {activeTab}...
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Generate {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </>
            )}
          </Button>
        </div>

        {/* Output & Preview Column */}
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-border bg-panel p-6 lg:col-span-7">
          {generating ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <LoaderCircle className="size-6 animate-spin" />
              </div>
              <p className="text-sm font-semibold">Creating your {activeTab}...</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Synthesizing media using the active AI generative pipeline.
              </p>
            </div>
          ) : result ? (
            <div className="flex w-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Generated {result.type}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{result.prompt}</p>
                </div>
                {result.url && (
                  <a
                    href={result.url}
                    download={`generated-${result.type.toLowerCase()}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <Download className="size-3.5" /> Download
                  </a>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {result.url && result.type === 'IMAGE' ? (
                  <img src={result.url} alt={result.prompt} className="h-auto max-h-[500px] w-full object-contain" />
                ) : result.url && result.type === 'VIDEO' ? (
                  <video controls src={result.url} className="w-full" />
                ) : result.url && result.type === 'AUDIO' ? (
                  <div className="p-6">
                    <audio controls src={result.url} className="w-full" />
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Media job status: {result.status}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
              <div className="grid size-12 place-items-center rounded-2xl bg-muted">
                <FileImage className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Ready to create</p>
              <p className="max-w-xs text-xs">
                Enter your prompt on the left and click generate to synthesize custom media assets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
