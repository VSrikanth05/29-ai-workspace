'use client';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Boxes, Clock3, FileText, FolderOpen, Library, MessageSquareText, Search, Settings, Sparkles, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAiOutputs } from '@/features/ai-studio/hooks/use-ai-outputs';
import type { Conversation } from '@/features/chat/chat-types';
import { useHasSession, useWorkspaces } from '@/features/sources/hooks/use-sources';
import { apiRequest } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useCollections, useSavedSearchActions, useSavedSearches, useSearch } from '../hooks/use-knowledge';
import type { SearchItem } from '../knowledge-types';

const pages = [
  { label: 'Dashboard', href: '/dashboard', icon: Sparkles }, { label: 'Workspace', href: '/workspace', icon: MessageSquareText },
  { label: 'Collections', href: '/collections', icon: Boxes }, { label: 'Output Library', href: '/outputs', icon: Library },
  { label: 'Favorites', href: '/favorites', icon: Star }, { label: 'History', href: '/history', icon: Clock3 }, { label: 'Workspace settings', href: '/settings', icon: Settings },
];

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; panel.current?.querySelector<HTMLElement>('input,button')?.focus(); return () => previous?.focus(); }, []);
  return <div className="fixed inset-0 z-[80] grid place-items-start bg-black/45 px-3 pt-[10dvh] backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div ref={panel} role="dialog" aria-modal="true" aria-label={title} className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">{children}</div></div>;
}

export function KnowledgeOverlays() {
  const router = useRouter();
  const workspaces = useWorkspaces();
  const hasSession = useHasSession();
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setWorkspace = useWorkspaceStore((state) => state.setActiveWorkspaceId);
  const [mode, setMode] = useState<'palette' | 'search' | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const collections = useCollections(workspaceId);
  const outputs = useAiOutputs(workspaceId);
  const conversations = useQuery({ queryKey: ['command-conversations'], queryFn: () => apiRequest<Conversation[]>('/chat/sessions'), enabled: Boolean(workspaceId) && hasSession });
  const search = useSearch(workspaceId, query, mode === 'search', 'hybrid');
  const savedSearches = useSavedSearches(workspaceId);
  const savedSearchActions = useSavedSearchActions(workspaceId);
  useEffect(() => { if (!workspaceId && workspaces.data?.[0]) setWorkspace(workspaces.data[0].id); }, [setWorkspace, workspaceId, workspaces.data]);
  useEffect(() => { try { setRecentSearches(JSON.parse(localStorage.getItem('29ai.recent-searches') ?? '[]') as string[]); } catch { setRecentSearches([]); } }, []);
  useEffect(() => {
    const openPalette = () => { setMode('palette'); setQuery(''); setActive(0); };
    const openSearch = () => { setMode('search'); setQuery(''); setActive(0); };
    const key = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); openPalette(); }
      else if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'n') { event.preventDefault(); router.push('/workspace'); window.dispatchEvent(new Event('29ai:new-chat')); }
      else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'u') { event.preventDefault(); router.push('/workspace'); window.setTimeout(() => window.dispatchEvent(new Event('29ai:upload')), 100); }
      else if (event.ctrlKey && event.key.toLowerCase() === 's') { event.preventDefault(); window.dispatchEvent(new Event('29ai:save-output')); }
      else if (event.key === 'Escape') setMode(null);
    };
    window.addEventListener('keydown', key); window.addEventListener('29ai:palette', openPalette); window.addEventListener('29ai:search', openSearch);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('29ai:palette', openPalette); window.removeEventListener('29ai:search', openSearch); };
  }, [router]);
  const paletteItems = useMemo(() => {
    const term = query.toLowerCase();
    return [...pages.map((item) => ({ ...item, group: 'Navigate' })), ...(collections.data ?? []).map((item) => ({ label: item.name, href: `/collections?collection=${item.id}`, icon: FolderOpen, group: 'Collections' })), ...(outputs.data ?? []).slice(0, 6).map((item) => ({ label: item.title, href: `/outputs?output=${item.id}`, icon: FileText, group: 'Recent outputs' })), ...(conversations.data ?? []).slice(0, 6).map((item) => ({ label: item.title, href: `/workspace?conversation=${item.id}`, icon: MessageSquareText, group: 'Recent conversations' }))].filter((item) => item.label.toLowerCase().includes(term));
  }, [collections.data, conversations.data, outputs.data, query]);
  const searchItems = Object.values(search.data?.groups ?? {}).flat();
  const max = mode === 'palette' ? paletteItems.length : searchItems.length;
  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => { if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => Math.min(Math.max(0, max - 1), value + 1)); } if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); } if (event.key === 'Enter') { event.preventDefault(); if (mode === 'palette') { if (paletteItems[active]) router.push(paletteItems[active].href); } else if (searchItems[active]) openResult(searchItems[active]); if (query.trim()) saveRecent(query.trim()); setMode(null); } };
  const saveRecent = (value: string) => { const next = [value, ...recentSearches.filter((item) => item !== value)].slice(0, 6); setRecentSearches(next); localStorage.setItem('29ai.recent-searches', JSON.stringify(next)); };
  const openResult = (item: SearchItem) => { const routes: Record<SearchItem['kind'], string> = { source: '/workspace', conversation: `/workspace?conversation=${item.id}`, output: `/outputs?output=${item.id}`, collection: `/collections?collection=${item.id}`, tag: `/collections?tag=${item.id}` }; router.push(routes[item.kind]); };
  if (!mode) return null;
  return <Modal title={mode === 'palette' ? 'Command palette' : 'Search workspace'} onClose={() => setMode(null)}>
    <div className="flex items-center gap-3 border-b border-border px-4"><Search className="size-4 text-muted-foreground" aria-hidden="true"/><input aria-label={mode === 'palette' ? 'Search commands' : 'Search workspace'} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onInputKey} placeholder={mode === 'palette' ? 'Type a command or open recent work…' : 'Search sources, conversations, outputs, collections, and tags…'} className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none"/><Button variant="ghost" size="icon" aria-label="Close" onClick={() => setMode(null)}><X className="size-4"/></Button></div>
    <div className="max-h-[56dvh] overflow-y-auto p-2" role="listbox" aria-label="Results">
      {mode === 'palette' && paletteItems.map((item, index) => <button role="option" aria-selected={active === index} key={`${item.group}-${item.href}`} onMouseEnter={() => setActive(index)} onClick={() => { router.push(item.href); setMode(null); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${active === index ? 'bg-accent' : ''}`}><item.icon className="size-4 text-primary"/><span className="flex-1 truncate">{item.label}</span><span className="text-[10px] text-muted-foreground">{item.group}</span></button>)}
      {mode === 'search' && !query && <div className="p-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">Saved searches</p>{savedSearches.data?.map((item) => <div key={item.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-accent"><button onClick={() => setQuery(item.query)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"><Bookmark className="size-3.5 shrink-0 text-primary"/><span className="truncate">{item.name}</span></button><button aria-label={`Delete saved search ${item.name}`} onClick={() => savedSearchActions.remove.mutate(item.id)} className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><X className="size-3"/></button></div>)}<p className="mb-2 mt-4 text-xs font-semibold text-muted-foreground">Recent searches</p>{recentSearches.length ? recentSearches.map((item) => <button key={item} onClick={() => setQuery(item)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent"><Clock3 className="size-3.5"/>{item}</button>) : <p className="py-8 text-center text-sm text-muted-foreground">Search your entire workspace from one place.</p>}</div>}
      {mode === 'search' && query && searchItems.map((item, index) => <button role="option" aria-selected={active === index} key={`${item.kind}-${item.id}-${index}`} onMouseEnter={() => setActive(index)} onClick={() => { saveRecent(query); openResult(item); setMode(null); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${active === index ? 'bg-accent' : ''}`}><FileText className="size-4 text-primary"/><span className="min-w-0 flex-1"><span className="block truncate">{item.highlight.map((part, partIndex) => part.match ? <mark key={partIndex} className="rounded bg-primary/20 text-foreground">{part.text}</mark> : part.text)}</span>{item.snippet && <span className="block truncate text-xs text-muted-foreground">{item.snippet}</span>}</span><span className="text-[10px] capitalize text-muted-foreground">{item.kind}</span></button>)}
      {mode === 'search' && query && !search.isLoading && !searchItems.length && <p className="py-10 text-center text-sm text-muted-foreground">No matches found.</p>}
      {mode === 'search' && query && <div className="mt-2 border-t border-border p-3"><Button variant="outline" size="sm" disabled={savedSearchActions.create.isPending} onClick={() => savedSearchActions.create.mutate({ name: query.trim().slice(0, 80), query: query.trim() })}><Bookmark className="mr-2 size-3.5"/>Save this search</Button></div>}
    </div><div className="flex gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground"><span>↑↓ Navigate</span><span>Enter Open</span><span>Esc Close</span></div>
  </Modal>;
}
