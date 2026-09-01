'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';
import { PRIMARY_NAVIGATION, PROVIDER_SETTINGS_NAVIGATION, SETTINGS_NAVIGATION } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, type WorkspacePanel } from '@/stores/workspace-store';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';

export function AppSidebar() {
  const pathname = usePathname() ?? '';
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);
  const setStudioCollapsed = useWorkspaceStore((state) => state.setStudioCollapsed);
  const [panel, setPanel] = useState<string | null>(null);
  useEffect(() => setPanel(new URLSearchParams(window.location.search).get('panel')), [pathname]);

  return (
    <aside className="hidden h-dvh w-64 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col" aria-label="Primary navigation">
      <div className="flex h-18 items-center border-b border-border px-4">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {PRIMARY_NAVIGATION.map((item) => {
          const [itemPath] = item.href.split('?');
          const itemPanel = new URLSearchParams(item.href.split('?')[1] ?? '').get('panel');
          const pathMatches = pathname === itemPath || pathname.startsWith(`${itemPath}/`);
          const active = itemPanel ? pathname === itemPath && panel === itemPanel : pathMatches && (!panel || itemPath !== '/workspace');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                  const itemPanel = new URLSearchParams(item.href.split('?')[1] ?? '').get('panel') as WorkspacePanel | null;
                  if (itemPanel) {
                    setPanel(itemPanel);
                    setActivePanel(itemPanel);
                  if (itemPanel === 'studio') setStudioCollapsed(false);
                }
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon aria-hidden="true" className="size-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-1">
          <Link
            href={SETTINGS_NAVIGATION.href}
            aria-current={pathname.startsWith(SETTINGS_NAVIGATION.href) ? 'page' : undefined}
            className={cn('flex h-10 flex-1 items-center gap-3 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', pathname.startsWith(SETTINGS_NAVIGATION.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
          >
            <SETTINGS_NAVIGATION.icon aria-hidden="true" className="size-4.5" />
            Settings
          </Link>
          <ThemeToggle />
        </div>
        <Link href={PROVIDER_SETTINGS_NAVIGATION.href} aria-current={pathname.startsWith(PROVIDER_SETTINGS_NAVIGATION.href) ? 'page' : undefined} className={cn('mt-1 flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-medium', pathname.startsWith(PROVIDER_SETTINGS_NAVIGATION.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}><PROVIDER_SETTINGS_NAVIGATION.icon aria-hidden="true" className="size-4" />AI Providers</Link>
        <div className="mt-2 rounded-lg border border-border bg-background/60 p-2">
          <WorkspaceSwitcher />
          <p className="mt-1 truncate text-[10px] text-muted-foreground">Workspace context</p>
        </div>
      </div>
    </aside>
  );
}
