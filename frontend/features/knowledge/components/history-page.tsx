'use client';

import {
  ArrowRight,
  Clock3,
  MessageSquareText,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { useAiOutputs } from '@/features/ai-studio/hooks/use-ai-outputs';
import { useWorkspaces } from '@/features/sources/hooks/use-sources';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { Conversation } from '@/features/chat/chat-types';

export function HistoryPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'chats' | 'outputs'>('all');
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaces();
  const outputs = useAiOutputs(workspaceId);

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiRequest<Conversation[]>('/conversations'),
  });

  const deleteConversation = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    await apiRequest('/conversations/' + id, { method: 'DELETE' });
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const resumeChat = (convId: string) => {
    router.push('/workspace?panel=conversation&conversationId=' + convId);
  };

  const filteredConversations = useMemo(() => {
    const list = conversations.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages?.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations.data, search]);

  const filteredOutputs = useMemo(() => {
    const list = outputs.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q) ||
        (o.content &&
          typeof (o.content as { markdown?: string }).markdown === 'string' &&
          (o.content as { markdown?: string }).markdown!.toLowerCase().includes(q)),
    );
  }, [outputs.data, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="history-title">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Clock3 className="size-5" />
            </span>
            <h1 id="history-title" className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              History & Activity
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Resume your recent conversations, review source history, and access generated deliverables.
          </p>
        </div>
        <Link
          href="/workspace"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Open Workspace <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search history, questions, or outputs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-panel pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-panel p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Activity
          </button>
          <button
            type="button"
            onClick={() => setFilter('chats')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === 'chats' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Conversations ({filteredConversations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('outputs')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === 'outputs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Studio Outputs ({filteredOutputs.length})
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {(filter === 'all' || filter === 'chats') && (
          <section aria-labelledby="chats-section-title">
            <div className="flex items-center justify-between">
              <h2 id="chats-section-title" className="text-base font-semibold text-foreground">
                Chat Conversations
              </h2>
              <span className="text-xs text-muted-foreground">
                {filteredConversations.length} total
              </span>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-panel/50 p-8 text-center">
                <MessageSquareText className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No conversations found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start a new conversation in your workspace to begin building your chat history.
                </p>
                <Link
                  href="/workspace"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Start a chat <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredConversations.map((conv) => {
                  const lastMessage = conv.messages?.[conv.messages.length - 1];
                  return (
                    <div
                      key={conv.id}
                      onClick={() => resumeChat(conv.id)}
                      className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border bg-panel p-4 transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                              <MessageSquareText className="size-3.5" />
                            </span>
                            <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                              {conv.title || 'Untitled Conversation'}
                            </h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete conversation"
                            onClick={(e) => deleteConversation(conv.id, e)}
                            className="size-7 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {lastMessage?.content || 'No messages yet.'}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                          {conv.provider || 'NVIDIA NIM'}
                        </span>
                        <span>{formatDate(conv.lastActivityAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {(filter === 'all' || filter === 'outputs') && (
          <section aria-labelledby="outputs-section-title">
            <div className="flex items-center justify-between">
              <h2 id="outputs-section-title" className="text-base font-semibold text-foreground">
                Generated Studio Outputs
              </h2>
              <span className="text-xs text-muted-foreground">
                {filteredOutputs.length} total
              </span>
            </div>

            {filteredOutputs.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-panel/50 p-8 text-center">
                <Sparkles className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No studio outputs yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Generate slide decks, reports, summaries, mind maps, or media in AI Studio.
                </p>
                <Link
                  href="/workspace?panel=studio"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open AI Studio <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOutputs.map((out) => (
                  <Link
                    key={out.id}
                    href={`/outputs?output=${out.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-panel p-4 transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-7 place-items-center rounded-lg bg-violet-500/10 text-violet-500">
                            <Sparkles className="size-3.5" />
                          </span>
                          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                            {out.title || 'Untitled Output'}
                          </h3>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {out.type}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {out.content && typeof (out.content as { markdown?: string }).markdown === 'string'
                          ? (out.content as { markdown?: string }).markdown!.slice(0, 140)
                          : 'Structured visual deliverable'}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                      <span>Saved output</span>
                      <span>{formatDate(out.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function formatDate(val: string) {
  const d = new Date(val);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
