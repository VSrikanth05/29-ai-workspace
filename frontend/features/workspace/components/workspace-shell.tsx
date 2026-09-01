'use client';

import { MessageSquareText, PanelLeft, WandSparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ConversationPanel } from '@/features/conversation/components/conversation-panel';
import { SourcesPanel } from '@/features/sources/components/sources-panel';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, type WorkspacePanel } from '@/stores/workspace-store';
import { STUDIO_TOOLS } from '@/config/studio-tools';

const StudioPanel = dynamic(() => import('@/features/studio/components/studio-panel').then((module) => module.StudioPanel), { ssr: false, loading: () => <section className="flex h-full min-h-0 flex-col bg-panel" aria-labelledby="studio-loading-title"><div className="flex h-16 shrink-0 items-center border-b border-border px-4"><div><h2 id="studio-loading-title" className="text-sm font-semibold">AI Studio</h2><p className="mt-1 text-[11px] text-muted-foreground">Loading focused tools…</p></div></div><div className="grid flex-1 place-items-center text-xs text-muted-foreground">Preparing your workspace tools</div></section> });

const PANELS: readonly { id: WorkspacePanel; label: string; icon: typeof PanelLeft }[] = [
  { id: 'sources', label: 'Sources', icon: PanelLeft },
  { id: 'conversation', label: 'Chat', icon: MessageSquareText },
  { id: 'studio', label: 'Studio', icon: WandSparkles },
];

export function WorkspaceShell() {
  const activePanel = useWorkspaceStore((state) => state.activePanel);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);
  const studioCollapsed = useWorkspaceStore((state) => state.studioCollapsed);
  const setStudioCollapsed = useWorkspaceStore((state) => state.setStudioCollapsed);
  const pathname = usePathname();

  useEffect(() => {
    const syncPanel = () => {
      const panel = new URLSearchParams(window.location.search).get('panel');
      const tool = new URLSearchParams(window.location.search).get('tool');
      if (tool && STUDIO_TOOLS.some((item) => item.id === tool)) useWorkspaceStore.getState().selectTool(tool);
      if (panel === 'sources' || panel === 'conversation' || panel === 'studio') {
        setActivePanel(panel);
        if (panel === 'studio') setStudioCollapsed(false);
      }
    };
    syncPanel();
    window.addEventListener('popstate', syncPanel);
    window.addEventListener('29ai:workspace-panel', syncPanel);
    return () => {
      window.removeEventListener('popstate', syncPanel);
      window.removeEventListener('29ai:workspace-panel', syncPanel);
    };
  }, [pathname, setActivePanel, setStudioCollapsed]);

  const selectPanel = (panel: WorkspacePanel) => {
    setActivePanel(panel);
    if (panel === 'studio') setStudioCollapsed(false);
  };

  return (
    <div className="flex h-full min-h-[calc(100dvh-4rem-4rem)] flex-col lg:min-h-[calc(100dvh-4rem)]">
      <div className="grid h-11 shrink-0 grid-cols-3 border-b border-border bg-panel px-2 md:hidden" role="tablist" aria-label="Workspace panels">
        {PANELS.map((panel) => <button key={panel.id} type="button" role="tab" aria-selected={activePanel === panel.id} onClick={() => selectPanel(panel.id)} className={cn('flex items-center justify-center gap-2 border-b-2 border-transparent text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', activePanel === panel.id && 'border-primary text-primary')}><panel.icon aria-hidden="true" className="size-3.5" />{panel.label}</button>)}
      </div>
      <div className={cn('min-h-0 flex-1 md:grid md:grid-cols-[minmax(220px,27%)_minmax(360px,1fr)]', studioCollapsed ? 'xl:grid-cols-[280px_minmax(0,1fr)]' : 'xl:grid-cols-[280px_minmax(440px,1fr)_340px]')}>
        <div className={cn('h-full min-h-0 border-r border-border md:block', activePanel !== 'sources' && 'hidden')}><SourcesPanel /></div>
        <div className={cn('h-full min-h-0 md:block', activePanel !== 'conversation' && 'hidden')}><ConversationPanel /></div>
        {!studioCollapsed && <div className={cn('h-full min-h-0 border-l border-border md:hidden xl:block', activePanel !== 'studio' && 'hidden')}><StudioPanel /></div>}
      </div>
    </div>
  );
}
