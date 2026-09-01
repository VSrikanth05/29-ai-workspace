'use client';

import { ArrowRight, BarChart3, Clock3, FileText, Library, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useAiOutputs } from '@/features/ai-studio/hooks/use-ai-outputs';
import { useSources, useWorkspaces } from '@/features/sources/hooks/use-sources';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function DashboardPageContent() {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((state) => state.setActiveWorkspaceId);
  const workspaces = useWorkspaces();
  const sources = useSources(workspaceId, '');
  const outputs = useAiOutputs(workspaceId);

  useEffect(() => {
    if (!workspaceId && workspaces.data?.[0]) setActiveWorkspaceId(workspaces.data[0].id);
  }, [setActiveWorkspaceId, workspaces.data, workspaceId]);

  const activity = useMemo(() => [
    ...(sources.data?.items ?? []).map((source) => ({ id: `source-${source.id}`, label: source.originalName, detail: source.status === 'PROCESSED' ? 'Source ready' : 'Source processing', date: source.createdAt, icon: FileText, href: '/workspace?panel=sources' })),
    ...(outputs.data ?? []).map((output) => ({ id: `output-${output.id}`, label: output.title, detail: 'AI Studio output', date: output.createdAt, icon: Sparkles, href: `/outputs?output=${output.id}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5), [outputs.data, sources.data?.items]);

  const activeWorkspace = workspaces.data?.find((workspace) => workspace.id === workspaceId);
  const sourceCount = sources.data?.total ?? activeWorkspace?._count.documents ?? 0;
  const outputCount = outputs.data?.length ?? 0;
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="dashboard-title">
      {workspaces.isError && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600">Your workspaces could not be loaded. Refresh and try again.</p>}
      <div className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">29 AI Workspace</p><h1 id="dashboard-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">A calm place for your ideas.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Bring your sources together, ask grounded questions, and turn the useful parts into work.</p></div>
        <Link href="/workspace" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open workspace <ArrowRight aria-hidden="true" className="size-4" /></Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3"><StatCard label="Sources" value={sources.isLoading ? '…' : sourceCount} detail={activeWorkspace?.name ?? 'in your knowledge base'} icon={FileText} /><StatCard label="Saved outputs" value={outputs.isLoading ? '…' : outputCount} detail="ready in Output Library" icon={Library} /><StatCard label="AI Studio" value="Ready" detail="focused tools for your work" icon={BarChart3} /></div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-border bg-panel p-5" aria-labelledby="activity-title"><div className="flex items-center justify-between gap-3"><div><h2 id="activity-title" className="text-sm font-semibold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Pick up where you left off.</p></div><Clock3 className="size-4 text-muted-foreground" aria-hidden="true" /></div>{activity.length ? <ul className="mt-4 divide-y divide-border">{activity.map((item) => { const Icon = item.icon; return <li key={item.id}><Link href={item.href} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{item.label}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{item.detail}</span></span><span className="text-[10px] text-muted-foreground">{formatRelativeDate(item.date)}</span></Link></li>; })}</ul> : <div className="mt-4 rounded-xl border border-dashed border-border bg-background/50 p-6 text-center"><Sparkles className="mx-auto size-5 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-medium">Your workspace is ready</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Upload a source or start a conversation to build your activity feed.</p></div>}</section>
        <section className="rounded-2xl border border-border bg-panel p-5" aria-labelledby="next-title"><h2 id="next-title" className="text-sm font-semibold">Start here</h2><div className="mt-4 space-y-2"><QuickLink href="/workspace?panel=sources" icon={FileText} title="Add a source" description="Build your knowledge base" /><QuickLink href="/workspace" icon={Sparkles} title="Ask a question" description="Explore what you know" /><QuickLink href="/workspace?panel=studio" icon={BarChart3} title="Open AI Studio" description="Create something useful" /></div></section>
      </div>
    </section>
  );
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: number | string; detail: string; icon: typeof FileText }) {
  return <article className="rounded-2xl border border-border bg-panel p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className="size-4 text-primary" aria-hidden="true" /></div><p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></article>;
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: typeof FileText; title: string; description: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></span><span><span className="block text-xs font-medium">{title}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{description}</span></span><ArrowRight className="ml-auto size-3.5 text-muted-foreground" /></Link>;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
