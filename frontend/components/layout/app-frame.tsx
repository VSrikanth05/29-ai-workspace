import type { PropsWithChildren } from 'react';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { MobileNavigation } from './mobile-navigation';
import { KnowledgeOverlays } from '@/features/knowledge/components/knowledge-overlays';

export function AppFrame({ children }: PropsWithChildren) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main id="main-content" className="min-h-0 flex-1 overflow-auto pb-16 lg:pb-0">{children}</main>
      </div>
      <MobileNavigation />
      <KnowledgeOverlays />
    </div>
  );
}
