'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { readAccessToken, subscribeToAuthChanges } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';
import { useWorkspaceStore } from '@/stores/workspace-store';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => subscribeToAuthChanges(() => {
    if (!readAccessToken()) {
      queryClient.clear();
      useWorkspaceStore.getState().resetSession();
    }
  }), [queryClient]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider delayDuration={350}>{children}</Tooltip.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
