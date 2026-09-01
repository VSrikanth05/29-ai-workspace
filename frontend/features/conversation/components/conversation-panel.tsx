'use client';

import {
  ArrowLeft,
  ArrowUp,
  BookOpenText,
  Check,
  Clipboard,
  LoaderCircle,
  MessageSquareText,
  PanelRightOpen,
  Paperclip,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { streamAiResponse } from '@/features/ai/stream-ai-response';
import { MarkdownMessage } from '@/features/chat/components/markdown-message';
import type { ChatMessage, Citation, Conversation } from '@/features/chat/chat-types';
import { useProviderCatalog } from '@/features/providers/hooks/use-provider-catalog';
import { usePreferences } from '@/features/knowledge/hooks/use-knowledge';
import { useHasSession } from '@/features/sources/hooks/use-sources';
import { readGenerationSettings, type GenerationSettings } from '@/lib/generation-settings';
import { useWorkspaceStore } from '@/stores/workspace-store';

const STARTERS = ['What are the key ideas?', 'What should I pay attention to?', 'What connections are present?'] as const;

export function ConversationPanel() {
  const queryClient = useQueryClient();
  const signedIn = useHasSession();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const selectedSourceIds = useWorkspaceStore((state) => state.selectedSourceIds);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);
  const studioCollapsed = useWorkspaceStore((state) => state.studioCollapsed);
  const setStudioCollapsed = useWorkspaceStore((state) => state.setStudioCollapsed);
  const catalog = useProviderCatalog();
  const preferences = usePreferences(activeWorkspaceId);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [generation, setGeneration] = useState<GenerationSettings>(readGenerationSettings(null));
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intentionalNewRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiRequest<Conversation[]>('/conversations'),
    enabled: signedIn,
  });
  const conversation = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => apiRequest<Conversation>(`/conversations/${conversationId}`),
    enabled: signedIn && Boolean(conversationId),
  });

  useEffect(() => {
    if (!conversationId && !intentionalNewRef.current && conversations.data?.[0]) setConversationId(conversations.data[0].id);
  }, [conversationId, conversations.data]);
  useEffect(() => {
    if (conversation.data?.messages) setMessages(conversation.data.messages);
  }, [conversation.data]);
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
  useEffect(() => {
    const syncGeneration = () => setGeneration(readGenerationSettings(activeWorkspaceId));
    syncGeneration();
    window.addEventListener('29ai:generation-settings', syncGeneration);
    return () => window.removeEventListener('29ai:generation-settings', syncGeneration);
  }, [activeWorkspaceId]);
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: streaming ? 'auto' : 'smooth' });
  }, [messages, streaming]);

  const send = async (explicitMessage?: string) => {
    const text = (explicitMessage ?? draft).trim();
    if (!text || streaming) return;
    if (!conversationId && !activeWorkspaceId) { setError('Choose a workspace before starting a conversation.'); return; }
    if (!provider || !model) { setError('No AI model is available. Check provider configuration.'); return; }
    setError(null); setDraft(''); setCitations([]); setStreaming(true);
    const optimisticUser: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
    const optimisticAssistant: ChatMessage = { id: `assistant-${Date.now()}`, role: 'assistant', content: '' };
    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);
    const abort = new AbortController(); abortRef.current = abort;
    try {
      await streamAiResponse({ message: text, conversationId: conversationId ?? undefined, workspaceId: conversationId ? undefined : activeWorkspaceId, selectedSourceIds, provider, model, temperature: generation.temperature, maxTokens: generation.maxTokens }, abort.signal, (event) => {
        if (event.type === 'delta') setMessages((current) => current.map((item) => item.id === optimisticAssistant.id ? { ...item, content: item.content + event.content } : item));
        if (event.type === 'done') {
          intentionalNewRef.current = false; setConversationId(event.conversationId); setCitations(event.sources);
          setMessages((current) => current.map((item) => item.id === optimisticAssistant.id ? event.message : item));
        }
        if (event.type === 'error') setError(event.message);
      });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'The response could not be generated.');
      setMessages((current) => current.filter((item) => item.id !== optimisticAssistant.id || item.content));
    } finally { abortRef.current = null; setStreaming(false); }
  };

  const newConversation = () => { intentionalNewRef.current = true; abortRef.current?.abort(); setConversationId(null); setMessages([]); setCitations([]); setDraft(''); setError(null); setEditingTitle(false); };
  useEffect(() => { const reset = () => newConversation(); window.addEventListener('29ai:new-chat', reset); return () => window.removeEventListener('29ai:new-chat', reset); }, []);

  const removeConversation = async () => {
    if (!conversationId) return;
    await apiRequest(`/conversations/${conversationId}`, { method: 'DELETE' });
    newConversation(); await queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };
  const renameConversation = async () => {
    if (!conversationId || !titleDraft.trim()) return;
    await apiRequest(`/conversations/${conversationId}`, { method: 'PATCH', body: JSON.stringify({ title: titleDraft.trim() }) });
    setEditingTitle(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
    ]);
  };
  const copyMessage = async (message: ChatMessage) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1500);
  };
  const retry = () => { const last = [...messages].reverse().find((item) => item.role === 'user'); if (last) void send(last.content); };
  const onSubmit = (event: FormEvent) => { event.preventDefault(); void send(); };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } };
  const selectedConversation = conversations.data?.find((item) => item.id === conversationId);

  return (
    <section className="flex h-full min-h-0 flex-col bg-background" aria-labelledby="conversation-title">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              title="Back to dashboard"
              className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {editingTitle ? <input aria-label="Conversation title" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void renameConversation(); if (event.key === 'Escape') setEditingTitle(false); }} className="h-8 min-w-0 max-w-64 rounded-md border border-border bg-background px-2 text-sm font-semibold" autoFocus /> : <h2 id="conversation-title" className="truncate text-sm font-semibold">{selectedConversation?.title ?? 'New workspace'}</h2>}
            {conversationId && <Button variant="ghost" size="icon" aria-label={editingTitle ? 'Save conversation title' : 'Rename conversation'} onClick={() => { if (editingTitle) void renameConversation(); else { setTitleDraft(selectedConversation?.title ?? ''); setEditingTitle(true); } }}>{editingTitle ? <Save className="size-3.5" /> : <Pencil className="size-3.5" />}</Button>}
          </div>
          <label className="sr-only" htmlFor="conversation-list">Conversations</label>
          <select id="conversation-list" aria-label="Conversations" value={conversationId ?? ''} onChange={(event) => { intentionalNewRef.current = !event.target.value; setConversationId(event.target.value || null); }} className="mt-1 max-w-56 bg-transparent text-[11px] text-muted-foreground outline-none">
            <option value="">New conversation</option>
            {conversations.data?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {provider && (
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
              className="hidden h-8 max-w-28 rounded-md border border-border bg-background px-2 text-[11px] sm:block"
            >
              {(catalog.providers.data ?? []).map((item) => (
                <option key={item.id} value={item.id} disabled={!item.configured}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          {model && (
            <select
              aria-label="AI model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="hidden h-8 max-w-40 rounded-md border border-border bg-background px-2 text-[11px] md:block"
            >
              {(catalog.models.data ?? [])
                .filter((item) => item.provider === provider)
                .map((item) => (
                  <option key={item.id} value={item.id} disabled={!item.configured}>
                    {item.name}
                  </option>
                ))}
            </select>
          )}
          {studioCollapsed && <Button variant="ghost" size="icon" aria-label="Show AI Studio" title="Show AI Studio" onClick={() => setStudioCollapsed(false)}><PanelRightOpen className="size-4" /></Button>}
          {conversationId && <Button variant="ghost" size="icon" aria-label="Delete conversation" onClick={() => void removeConversation()}><Trash2 className="size-3.5" /></Button>}
          <Button variant="ghost" size="sm" onClick={newConversation}><MessageSquareText aria-hidden="true" className="size-3.5" /> New chat</Button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {conversation.isLoading ? <div className="grid min-h-full place-items-center text-xs text-muted-foreground"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Loading conversation</div> : messages.length ? <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">{messages.map((item) => <article key={item.id} className={item.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground' : 'max-w-[92%] text-sm leading-7'} aria-label={`${item.role} message`}><div>{item.role === 'assistant' && item.content ? <MarkdownMessage content={item.content} /> : <div className="whitespace-pre-wrap">{item.content}</div>}{streaming && item === messages[messages.length - 1] && item.role === 'assistant' && <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-primary" />}</div>{item.role === 'assistant' && item.content && !streaming && <Button type="button" variant="ghost" size="sm" className="mt-2 text-[11px] text-muted-foreground" onClick={() => void copyMessage(item)}>{copiedMessageId === item.id ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}{copiedMessageId === item.id ? 'Copied' : 'Copy'}</Button>}</article>)}{citations.length > 0 && <aside className="rounded-xl border border-border bg-panel p-3 text-xs" aria-label="Sources"><p className="font-medium">Sources</p><ul className="mt-2 space-y-2">{citations.map((source) => <li key={`${source.documentId}-${source.chunkIndex}`}><span className="font-medium">{source.documentName}</span><span className="ml-1 text-muted-foreground">{source.excerpt}</span></li>)}</ul></aside>}</div> : <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-blue-500/15 text-primary ring-1 ring-primary/15"><Sparkles className="size-6" /></span><p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Workspace conversation</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Ask anything about your sources</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Start with a question, follow the citations, and keep the useful parts of your research together.</p><div className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Suggested prompts">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => setDraft(starter)} className="rounded-full border border-border bg-panel px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">{starter}</button>)}</div><div className="mt-7 flex items-center gap-2 text-[11px] text-muted-foreground"><BookOpenText className="size-3.5" /> Answers include source-level citations{!signedIn && <><span aria-hidden="true">·</span><span>Sign in to save conversations</span></>}</div></div>}
      </div>

      <div className="shrink-0 border-t border-border bg-background/90 p-3 backdrop-blur sm:p-4">
        {error && <div role="alert" className="mx-auto mb-2 flex max-w-3xl items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600"><span>{error}</span><Button variant="ghost" size="sm" onClick={retry}><RefreshCw className="size-3.5" /> Retry</Button></div>}
        <form className="mx-auto max-w-3xl" onSubmit={onSubmit}><div className="rounded-2xl border border-border bg-panel p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10"><label htmlFor="workspace-message" className="sr-only">Ask about your sources</label><textarea id="workspace-message" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} disabled={!signedIn || streaming} placeholder={signedIn ? 'Ask anything about your sources...' : 'Sign in to start asking questions...'} className="max-h-40 min-h-12 w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground" /><div className="flex items-center justify-between"><Button type="button" variant="ghost" size="icon" aria-label="Select sources" onClick={() => setActivePanel('sources')}><Paperclip className="size-4" /></Button><div className="flex items-center gap-2"><span className="hidden text-[10px] text-muted-foreground sm:inline">{selectedSourceIds.length ? `${selectedSourceIds.length} selected source${selectedSourceIds.length === 1 ? '' : 's'}` : ''}</span>{streaming ? <Button type="button" size="icon" aria-label="Stop generation" onClick={() => abortRef.current?.abort()}><Square className="size-3.5 fill-current" /></Button> : <Button type="submit" size="icon" disabled={!draft.trim() || !signedIn || !model} aria-label="Send message"><ArrowUp className="size-4" /></Button>}</div></div></div><p className="mt-2 text-center text-[10px] text-muted-foreground">AI can make mistakes. Verify important information against cited sources.</p></form>
      </div>
    </section>
  );
}
