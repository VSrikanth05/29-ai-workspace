'use client';
/* The media provider returns signed URLs with runtime hosts; next/image cannot optimize an unknown host. */
/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, ArrowRight, AudioLines, BarChart3, BookOpenCheck, Check, Copy, Download, FileClock, FileImage, Image, Languages, Lightbulb, ListChecks, LoaderCircle, Map, MessageCircleQuestion, PanelRightClose, PenLine, RefreshCw, Save, Search, ScanText, Settings2, UploadCloud, Video, WandSparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { STUDIO_CATEGORIES, STUDIO_TOOLS, toolsForCategory, type StudioCategory } from '@/config/studio-tools';
import { apiRequest } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useProviderCatalog } from '@/features/providers/hooks/use-provider-catalog';
import { usePreferences } from '@/features/knowledge/hooks/use-knowledge';
import { downloadMindMapPng, downloadText, mindMapToSvg } from '@/features/ai-studio/exports/download';
import { useAiOutputs, useRegenerateOutput } from '@/features/ai-studio/hooks/use-ai-outputs';
import { MindMapViewer } from '@/features/ai-studio/mind-map/mind-map-viewer';
import { FlashcardViewer } from '@/features/ai-studio/learning/flashcard-viewer';
import { QuizPlayer } from '@/features/ai-studio/learning/quiz-player';
import { AnalyticsDashboard } from '@/features/ai-studio/analytics/analytics-dashboard';
import { ChartViewer } from '@/features/ai-studio/analytics/chart-viewer';
import { IMAGE_TRANSLATION_LANGUAGES } from '@/config/image-translation-languages';
import type { AIOutput, AnalyticsContent, ChartContent, ImageTranslationResult, MediaAsset, TransientToolResult } from '@/features/ai-studio/ai-studio-types';

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Arabic'] as const;
const CATEGORY_META: Record<StudioCategory, { icon: LucideIcon; description: string }> = {
  Understand: { icon: MessageCircleQuestion, description: 'Ask, explain, and clarify' },
  Create: { icon: PenLine, description: 'Shape knowledge into deliverables' },
  Media: { icon: Image, description: 'Generate and transform media' },
  Visualize: { icon: Map, description: 'See ideas and relationships' },
  Utilities: { icon: Settings2, description: 'Supporting workspace tools' },
};
const TOOL_ICONS: Partial<Record<string, LucideIcon>> = {
  explain: Lightbulb,
  'ask-anything': MessageCircleQuestion,
  summary: FileClock,
  'key-points': ListChecks,
  flashcards: BookOpenCheck,
  quiz: ListChecks,
  'study-guide': BookOpenCheck,
  'mind-map': Map,
  translate: Languages,
  report: PenLine,
  analytics: BarChart3,
  chart: BarChart3,
  image: Image,
  video: Video,
  audio: AudioLines,
  'image-translation': FileImage,
  'image-editing': FileImage,
  ocr: ScanText,
  'pdf-translation': FileImage,
  'speech-to-text': AudioLines,
  'text-to-speech': AudioLines,
  'diagram-generator': Map,
  'presentation-generator': FileImage,
};

export function StudioPanel() {
  const [category, setCategory] = useState<StudioCategory>('Media');
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [summaryStyle, setSummaryStyle] = useState('medium');
  const [reportStyle, setReportStyle] = useState('detailed');
  const [language, setLanguage] = useState('English');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [chartType, setChartType] = useState('bar');
  const [xKey, setXKey] = useState('');
  const [yKey, setYKey] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<AIOutput | null>(null);
  const [transient, setTransient] = useState<TransientToolResult | null>(null);
  const [mediaAsset, setMediaAsset] = useState<MediaAsset | null>(null);
  const [imageTranslation, setImageTranslation] = useState<ImageTranslationResult | null>(null);
  const [imageTranslationStage, setImageTranslationStage] = useState<'ocr' | 'translation' | 'rendering'>('ocr');
  const [imageTranslationBusy, setImageTranslationBusy] = useState(false);
  const selectedToolId = useWorkspaceStore((state) => state.selectedToolId);
  const selectTool = useWorkspaceStore((state) => state.selectTool);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);
  const setStudioCollapsed = useWorkspaceStore((state) => state.setStudioCollapsed);
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const sourceIds = useWorkspaceStore((state) => state.selectedSourceIds);
  const selectedTool = STUDIO_TOOLS.find((tool) => tool.id === selectedToolId);
  const catalog = useProviderCatalog();
  const preferences = usePreferences(workspaceId);
  const outputs = useAiOutputs(workspaceId);
  const regenerate = useRegenerateOutput(workspaceId);
  const tools = useMemo(() => { const query = search.trim().toLowerCase(); return (query ? STUDIO_TOOLS : toolsForCategory(category)).filter((tool) => `${tool.name} ${tool.description}`.toLowerCase().includes(query)); }, [category, search]);
  const groupedTools = useMemo(() => search.trim() ? STUDIO_CATEGORIES.map((group) => ({ category: group, tools: tools.filter((tool) => tool.category === group) })).filter((group) => group.tools.length) : [{ category, tools }], [category, search, tools]);

  useEffect(() => { const saved = workspaceId ? window.localStorage.getItem(`29ai.language.${workspaceId}`) : null; if (saved && LANGUAGES.includes(saved as typeof LANGUAGES[number])) setLanguage(saved); }, [workspaceId]);
  useEffect(() => {
    if (provider) return;
    const preferred = preferences.data?.defaultProvider;
    const first =
      catalog.providers.data?.find(
        (item) => item.configured && (!preferred || item.id === preferred),
      ) ??
      catalog.providers.data?.find((item) => item.configured) ??
      catalog.providers.data?.[0];
    if (first) setProvider(first.id);
  }, [catalog.providers.data, preferences.data?.defaultProvider, provider]);

  useEffect(() => {
    if (!provider) return;
    const available = catalog.models.data?.filter((item) => item.provider === provider) ?? [];
    if (available.length === 0) return;
    const preferred = preferences.data?.defaultModel;
    if (!model || !available.some((item) => item.id === model)) {
      if (preferred && available.some((item) => item.id === preferred)) {
        setModel(preferred);
      } else {
        const configuredModel = available.find((item) => item.configured) ?? available[0];
        setModel(configuredModel?.id ?? '');
      }
    }
  }, [catalog.models.data, model, preferences.data?.defaultModel, provider]);

  const chooseTool = (id: string) => { if (id === 'ai-chat' || id === 'ask-anything') { setActivePanel('conversation'); return; } selectTool(id); setOutput(null); setTransient(null); setMediaAsset(null); setImageTranslation(null); setError(null); };
  const closeTool = () => { selectTool(''); setOutput(null); setTransient(null); setMediaAsset(null); setImageTranslation(null); setError(null); };

  const generate = async () => {
    if (!selectedTool?.endpoint || !workspaceId) return;
    setGenerating(true); setError(null); setTransient(null); setMediaAsset(null);
    try {
      const payload = selectedTool.mediaType
        ? {
            workspaceId,
            type: selectedTool.mediaType,
            prompt: text.trim() || `Create a ${selectedTool.name} for this workspace.`,
            provider: provider || undefined,
            model: model || undefined,
            sourceIds: sourceIds.length ? sourceIds : undefined,
          }
        : {
            workspaceId,
            sourceIds,
            text: text.trim() || undefined,
            provider: provider || undefined,
            model: model || undefined,
            ...(selectedTool.id === 'summary' ? { style: summaryStyle } : {}),
            ...(selectedTool.id === 'translate' ? { targetLanguage: language } : {}),
            ...(selectedTool.id === 'report' ? { style: reportStyle } : {}),
            ...(selectedTool.id === 'flashcards' ? { difficulty, count: questionCount } : {}),
            ...(selectedTool.id === 'quiz' ? { difficulty, questionCount } : {}),
            ...(['analytics', 'chart', 'diagram-generator'].includes(selectedTool.id) ? { sourceId: sourceIds[0] } : {}),
            ...(selectedTool.id === 'chart' ? { chartType, xKey: xKey || undefined, yKey: yKey || undefined } : {}),
          };
      if (selectedTool.mediaType) {
        setMediaAsset(await apiRequest<MediaAsset>(selectedTool.endpoint, { method: 'POST', body: JSON.stringify(payload) }));
      } else if (selectedTool.outputType) {
        const result = await apiRequest<AIOutput>(selectedTool.endpoint, { method: 'POST', body: JSON.stringify(payload) }); setOutput(result); await outputs.refetch();
      } else {
        setTransient(await apiRequest<TransientToolResult>(selectedTool.endpoint, { method: 'POST', body: JSON.stringify(payload) }));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The tool could not generate a result.'); }
    finally { setGenerating(false); }
  };

  const regenerateCurrent = async () => { if (!output) return; setError(null); try { setOutput(await regenerate.mutateAsync(output.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Regeneration failed.'); } };
  const exportOutput = async (format: 'markdown' | 'json' | 'csv') => { if (!output) return; const file = await apiRequest<{ filename: string; mimeType: string; content: string }>(`/ai-studio/outputs/${output.id}/export?format=${format}`); downloadText(file.filename, file.content, file.mimeType); };
  const root = output?.content.format === 'mind-map' ? output.content.root : undefined;
  const exportMindMap = (format: 'svg' | 'png') => { if (!root) return; if (format === 'svg') downloadText('mind-map.svg', mindMapToSvg(root), 'image/svg+xml'); else void downloadMindMapPng(root, 'mind-map.png').catch((cause) => setError(cause instanceof Error ? cause.message : 'PNG export failed.')); };

  const markdown = output?.content.format === 'markdown' ? output.content.markdown : transient?.message.content;
  const requiresDataSource = selectedTool?.requiresSource;
  const requiresModel = selectedTool && selectedTool.availability === 'available' && !selectedTool.mediaType && !requiresDataSource;
  const selectedProviderConfigured = catalog.providers.data?.find((item) => item.id === provider)?.configured ?? false;
  const SelectedToolIcon = selectedTool ? TOOL_ICONS[selectedTool.id] ?? CATEGORY_META[selectedTool.category].icon : null;
  return (
    <section className="flex h-full min-h-0 flex-col bg-panel" aria-labelledby="studio-title">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4"><div><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><WandSparkles className="size-4" /></span><h2 id="studio-title" className="text-sm font-semibold">AI Studio</h2></div><p className="mt-1 text-[11px] text-muted-foreground">Focused tools for understanding and creating</p></div><Button variant="ghost" size="icon" aria-label="Collapse AI Studio" title="Collapse AI Studio" onClick={() => setStudioCollapsed(true)}><PanelRightClose className="size-4" /></Button></div>
      {selectedTool ? <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <Button variant="ghost" size="sm" className="mb-3 self-start" onClick={closeTool}><ArrowLeft className="size-3.5" /> All tools</Button>
        <div className="flex items-start gap-3"><span className={cn('grid size-10 shrink-0 place-items-center rounded-xl studio-accent', `studio-accent-${selectedTool.accent ?? 'blue'}`)}>{SelectedToolIcon && <SelectedToolIcon className="size-4" />}</span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{selectedTool.category}</p><h3 className="text-lg font-semibold tracking-[-0.03em]">{selectedTool.name}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedTool.description}</p></div></div>
        {selectedTool.availability === 'missing' && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800"><p className="font-semibold">Backend endpoint unavailable</p><p className="mt-1 leading-5">{selectedTool.missingReason}</p></div>}
        {!output && !transient && !imageTranslation && selectedTool.availability === 'available' && !['image-translation', 'pdf-translation'].includes(selectedTool.id) && <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-medium">Configure</p><p className="text-[11px] text-muted-foreground">{sourceIds.length ? `${sourceIds.length} selected source${sourceIds.length === 1 ? '' : 's'}` : 'No sources selected — workspace context will be used.'}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-medium">Provider
              <select
                aria-label="AI provider"
                value={provider}
                onChange={(event) => {
                  const nextProvider = event.target.value;
                  setProvider(nextProvider);
                  const nextModels = (catalog.models.data ?? []).filter(
                    (item) => item.provider === nextProvider && item.configured,
                  );
                  if (nextModels.length > 0 && nextModels[0]?.id) {
                    setModel(nextModels[0].id);
                  }
                }}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs"
              >
                {catalog.providers.data?.map((item) => (
                  <option key={item.id} value={item.id} disabled={!item.configured}>
                    {item.name}{item.configured ? '' : ' — Not Configured'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-medium">Model
              <select
                aria-label="AI model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs"
              >
                {(catalog.models.data ?? [])
                  .filter((item) => item.provider === provider)
                  .map((item) => (
                    <option key={item.id} value={item.id} disabled={!item.configured}>
                      {item.name}{item.configured ? '' : ' — Not Configured'}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="block text-[11px] font-medium">{selectedTool.mediaType ? 'Prompt' : 'Selected text (optional)'}<textarea aria-label={selectedTool.mediaType ? 'Prompt' : 'Selected text'} rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder={selectedTool.mediaType ? 'Describe what to create' : 'Paste a passage to target this tool'} className="mt-1 w-full resize-y rounded-lg border border-border bg-panel p-2 text-xs font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
          {selectedTool.id === 'summary' && <label className="block text-[11px] font-medium">Summary length<select aria-label="Summary style" value={summaryStyle} onChange={(event) => setSummaryStyle(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs"><option value="short">Short</option><option value="medium">Medium</option><option value="detailed">Detailed</option><option value="bullet">Bullet Summary</option></select></label>}
          {selectedTool.id === 'translate' && <label className="block text-[11px] font-medium">Workspace language<select aria-label="Workspace language" value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs">{LANGUAGES.map((item) => <option key={item}>{item}</option>)}</select></label>}
          {selectedTool.id === 'report' && <label className="block text-[11px] font-medium">Report format<select aria-label="Report format" value={reportStyle} onChange={(event) => setReportStyle(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs"><option value="executive">Executive Summary</option><option value="detailed">Detailed Report</option><option value="bullet">Bullet Report</option></select></label>}
          {['flashcards', 'quiz'].includes(selectedTool.id) && <div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-medium">Difficulty<select aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label className="text-[11px] font-medium">Items<select aria-label="Question count" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label></div>}
          {requiresDataSource && <p role={sourceIds.length ? undefined : 'alert'} className={cn('rounded-lg p-2 text-[11px]', sourceIds.length ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-700')}>{sourceIds.length ? 'The first selected CSV/XLSX source will be analyzed.' : 'Select a CSV or XLSX source in the workspace first.'}</p>}
          {selectedTool.id === 'chart' && <><label className="block text-[11px] font-medium">Chart type<select aria-label="Chart type" value={chartType} onChange={(event) => setChartType(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs">{['bar', 'line', 'pie', 'scatter', 'histogram', 'area'].map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><input aria-label="X column" value={xKey} onChange={(event) => setXKey(event.target.value)} placeholder="X column (auto)" className="h-9 rounded-lg border border-border bg-panel px-2 text-xs" /><input aria-label="Y column" value={yKey} onChange={(event) => setYKey(event.target.value)} placeholder="Y column (auto)" className="h-9 rounded-lg border border-border bg-panel px-2 text-xs" /></div></>}
          <Button className="w-full" disabled={generating || !workspaceId || Boolean(requiresModel && (!model || !selectedProviderConfigured)) || Boolean(requiresDataSource && !sourceIds.length)} onClick={() => void generate()}>{generating ? <><LoaderCircle className="size-4 animate-spin" /> Generating</> : `Use ${selectedTool.name}`}</Button>{generating && <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Generating ${selectedTool.name}`}><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div>}
        </div>}
        {['image-translation', 'pdf-translation'].includes(selectedTool.id) && !imageTranslation && <ImageTranslationConfigurator workspaceId={workspaceId} busy={imageTranslationBusy} stage={imageTranslationStage} pdfOnly={selectedTool.id === 'pdf-translation'} endpoint={selectedTool.endpoint ?? '/ai-studio/image-translation'} onBusy={setImageTranslationBusy} onStage={setImageTranslationStage} onResult={setImageTranslation} onError={setError} />}
        {(output || transient || mediaAsset || imageTranslation) && <div className="mt-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">Result</p><div className="flex flex-wrap gap-1">{imageTranslation && <Button variant="outline" size="sm" onClick={() => void apiRequest(`/ai-studio/image-translation/${imageTranslation.id}/save`, { method: 'POST' }).then(() => outputs.refetch()).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not save to the Output Library.'))}><Save className="size-3.5" /> Save to Output Library</Button>}{output && <Button variant="outline" size="sm" disabled><Check className="size-3.5" /> Saved</Button>}{output && <Button variant="outline" size="sm" onClick={() => void regenerateCurrent()} disabled={regenerate.isPending}><RefreshCw className={cn('size-3.5', regenerate.isPending && 'animate-spin')} /> Regenerate</Button>}{output && <Button variant="outline" size="sm" onClick={() => void exportOutput('markdown')}><Download className="size-3.5" /> Markdown</Button>}{output && <Button variant="outline" size="sm" onClick={() => void exportOutput('json')}>JSON</Button>}{output && ['analytics', 'chart'].includes(output.content.format) && <Button variant="outline" size="sm" onClick={() => void exportOutput('csv')}>CSV</Button>}{root && <><Button variant="outline" size="sm" onClick={() => exportMindMap('svg')}>SVG</Button><Button variant="outline" size="sm" onClick={() => exportMindMap('png')}>PNG</Button></>}</div></div>{imageTranslation ? <ImageTranslationResultView result={imageTranslation} onError={setError} /> : mediaAsset ? mediaAsset.url && mediaAsset.type === 'IMAGE' ? <img src={mediaAsset.url} alt={mediaAsset.prompt} className="w-full rounded-xl border border-border" /> : mediaAsset.url && mediaAsset.type === 'VIDEO' ? <video controls src={mediaAsset.url} className="w-full rounded-xl border border-border" /> : mediaAsset.url && mediaAsset.type === 'AUDIO' ? <audio controls src={mediaAsset.url} className="w-full" /> : <p className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">Media job status: {mediaAsset.status}</p> : root ? <MindMapViewer root={root} /> : output?.content.format === 'flashcards' ? <FlashcardViewer cards={output.content.flashcards ?? []} /> : output?.content.format === 'quiz' ? <QuizPlayer questions={output.content.questions ?? []} /> : output?.content.format === 'analytics' ? <AnalyticsDashboard report={output.content as AnalyticsContent} /> : output?.content.format === 'chart' ? <ChartViewer chart={output.content as ChartContent} /> : <article className="prose prose-sm max-w-none rounded-xl border border-border bg-background p-4 text-xs leading-6 text-foreground"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown ?? ''}</ReactMarkdown></article>}<Button variant="ghost" size="sm" onClick={() => { setOutput(null); setTransient(null); setMediaAsset(null); setImageTranslation(null); }}>Run again</Button></div>}
        {error && <div role="alert" className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-600">{error}</div>}
      </div> : <><div className="border-b border-border p-3"><label className="relative block"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search AI Studio tools</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a tool" className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring" /></label><div className="scrollbar-none mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="AI Studio categories">{STUDIO_CATEGORIES.map((item) => { const CategoryIcon = CATEGORY_META[item].icon; return <button key={item} role="tab" aria-selected={category === item} onClick={() => { setCategory(item); setSearch(''); }} className={cn('flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring', category === item ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}><CategoryIcon className="size-3.5" />{item}</button>; })}</div></div><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="space-y-5" aria-label={search ? 'Matching AI tools' : `${category} tools`}>{groupedTools.map((group) => { const CategoryIcon = CATEGORY_META[group.category].icon; return <section key={group.category} aria-labelledby={`studio-group-${group.category}`}><div className="mb-2 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground"><CategoryIcon className="size-3.5" /></span><div><h3 id={`studio-group-${group.category}`} className="text-xs font-semibold">{group.category}</h3><p className="text-[10px] text-muted-foreground">{CATEGORY_META[group.category].description}</p></div></div><ul className="space-y-2">{group.tools.map((tool) => { const ToolIcon = TOOL_ICONS[tool.id] ?? CategoryIcon; return <li key={tool.id}><button type="button" onClick={() => chooseTool(tool.id)} className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-background p-3 text-left transition-colors hover:border-border hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"><span className={cn('grid size-9 shrink-0 place-items-center rounded-xl studio-accent', `studio-accent-${tool.accent}`)}><ToolIcon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{tool.name}</span><span className="mt-0.5 line-clamp-1 block text-[11px] text-muted-foreground">{tool.description}</span></span><ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></button></li>; })}</ul></section>; })}</div>{!tools.length && <p className="py-10 text-center text-xs text-muted-foreground">No tools match “{search}”.</p>}{workspaceId && <div className="mt-6 border-t border-border pt-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><FileClock className="size-3.5" /> Output history</div>{outputs.isLoading ? <p className="text-[11px] text-muted-foreground">Loading saved outputs…</p> : outputs.isError ? <div role="alert" className="text-[11px] text-red-600">Output history could not be loaded.</div> : outputs.data?.length ? <ul className="space-y-1">{outputs.data.slice(0, 8).map((item) => <li key={item.id}><button className="w-full rounded-lg px-2 py-2 text-left hover:bg-accent" onClick={() => { setOutput(item); const tool = STUDIO_TOOLS.find((candidate) => candidate.outputType === item.type); if (tool) selectTool(tool.id); }}><span className="block truncate text-xs font-medium">{item.title}</span><span className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()} · {item.provider}</span></button></li>)}</ul> : <p className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">Generated outputs will appear here.</p>}</div>}</div></>}
    </section>
  );
}

type ImageTranslationConfiguratorProps = { workspaceId: string | null; busy: boolean; stage: 'ocr' | 'translation' | 'rendering'; pdfOnly?: boolean; endpoint: string; onBusy: (value: boolean) => void; onStage: (value: 'ocr' | 'translation' | 'rendering') => void; onResult: (value: ImageTranslationResult) => void; onError: (value: string | null) => void };

function ImageTranslationConfigurator({ workspaceId, busy, stage, pdfOnly = false, endpoint, onBusy, onStage, onResult, onError }: ImageTranslationConfiguratorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('spa_Latn');
  const [dragging, setDragging] = useState(false);
  const chooseFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if ((!allowed.includes(candidate.type) || (pdfOnly && candidate.type !== 'application/pdf')) || candidate.size > 20 * 1024 * 1024) { onError(pdfOnly ? 'Choose a PDF file up to 20 MB.' : 'Choose a PNG, JPG, JPEG, WEBP, or PDF file up to 20 MB.'); return; }
    setFile(candidate); onError(null);
  };
  const submit = async () => {
    if (!workspaceId || !file) { onError('Choose an image or PDF first.'); return; }
    onBusy(true); onError(null); onStage('ocr');
    const timer1 = window.setTimeout(() => onStage('translation'), 900);
    const timer2 = window.setTimeout(() => onStage('rendering'), 2200);
    try {
      const body = new FormData(); body.append('file', file); body.append('workspaceId', workspaceId); body.append('targetLanguage', targetLanguage); if (sourceLanguage !== 'auto') body.append('sourceLanguage', sourceLanguage);
      onResult(await apiRequest<ImageTranslationResult>(endpoint, { method: 'POST', body }));
    } catch (cause) { onError(cause instanceof Error ? cause.message : 'Image translation failed.'); }
    finally { window.clearTimeout(timer1); window.clearTimeout(timer2); onBusy(false); }
  };
  return <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-3">
    <p className="text-xs font-medium">Translate text in an image</p>
    <button type="button" className={cn('flex min-h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center transition-colors', dragging ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/40')} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}>
      <UploadCloud className="mb-2 size-6 text-primary" /><span className="text-xs font-medium">{file ? file.name : pdfOnly ? 'Drop a PDF here' : 'Drop an image or PDF here'}</span><span className="mt-1 text-[10px] text-muted-foreground">{pdfOnly ? 'PDF · max 20 MB' : 'PNG, JPG, JPEG, WEBP, or PDF · max 20 MB'}</span><input ref={inputRef} className="hidden" type="file" accept={pdfOnly ? '.pdf,application/pdf' : '.png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf'} onChange={(event) => chooseFile(event.target.files?.[0])} />
    </button>
    <div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-medium">Source language<select aria-label="Image source language" value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs"><option value="auto">Auto Detect</option>{IMAGE_TRANSLATION_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label className="text-[11px] font-medium">Target language<select aria-label="Image target language" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-panel px-2 text-xs">{IMAGE_TRANSLATION_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label></div>
    {busy && <div className="space-y-2" role="status" aria-label="Image translation progress"><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className={stage === 'ocr' ? 'font-semibold text-primary' : ''}>OCR</span><span className={stage === 'translation' ? 'font-semibold text-primary' : ''}>Translation</span><span className={stage === 'rendering' ? 'font-semibold text-primary' : ''}>Rendering</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full bg-primary transition-all', stage === 'ocr' ? 'w-1/4' : stage === 'translation' ? 'w-2/3' : 'w-full')} /></div></div>}
    <Button className="w-full" disabled={busy || !file || !workspaceId} onClick={() => void submit()}>{busy ? <><LoaderCircle className="size-4 animate-spin" /> Processing</> : 'Translate image'}</Button>
  </div>;
}

function ImageTranslationResultView({ result, onError }: { result: ImageTranslationResult; onError: (value: string | null) => void }) {
  const copyText = async () => { try { await navigator.clipboard.writeText(result.extractedText); } catch { onError('Could not copy extracted text.'); } };
  return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><div><p className="mb-1 text-[11px] font-semibold">Original</p>{result.mimeType === 'application/pdf' ? <embed src={result.originalUrl} type="application/pdf" className="h-64 w-full rounded-xl border border-border" /> : <img src={result.originalUrl} alt={`Original ${result.originalName}`} className="max-h-80 w-full rounded-xl border border-border object-contain" />}</div><div><p className="mb-1 text-[11px] font-semibold">Translated</p>{result.translatedUrl ? <img src={result.translatedUrl} alt={`Translated ${result.originalName}`} className="max-h-80 w-full rounded-xl border border-border object-contain" /> : <p className="rounded-xl border border-border p-4 text-xs text-muted-foreground">Rendering is still in progress.</p>}</div></div><div className="flex flex-wrap gap-1"><a className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent" href={result.translatedUrl ?? '#'} download><Download className="size-3.5" /> Download</a><Button variant="outline" size="sm" onClick={() => void copyText()}><Copy className="size-3.5" /> Copy extracted text</Button></div><div className="rounded-xl border border-border bg-background p-3"><p className="mb-1 text-[11px] font-semibold">Extracted text</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{result.extractedText}</pre></div></div>;
}
