'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiRequest, readAccessToken, subscribeToAuthChanges } from '@/lib/api-client';
import type { SourcePage, Workspace } from '../source-types';

export function useHasSession() {
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    const sync = () => setHasSession(Boolean(readAccessToken()));
    sync();
    return subscribeToAuthChanges(sync);
  }, []);
  return hasSession;
}

export function useWorkspaces() {
  const enabled = useHasSession();
  return useQuery({ queryKey: ['workspaces'], queryFn: () => apiRequest<Workspace[]>('/workspaces'), enabled, staleTime: 60_000 });
}

export function useCreateWorkspace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiRequest<{ id: string; name: string }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useDeleteWorkspace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => apiRequest(`/workspaces/${workspaceId}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useSources(workspaceId: string | null, search: string) {
  const hasSession = useHasSession();
  return useQuery({
    queryKey: ['sources', workspaceId, search],
    queryFn: () => apiRequest<SourcePage>(`/workspaces/${workspaceId}/sources?search=${encodeURIComponent(search)}`),
    enabled: Boolean(workspaceId) && hasSession,
    refetchInterval: (query) => query.state.data?.items.some((source) => source.status === 'UPLOADED' || source.status === 'PROCESSING') ? 2_500 : false,
  });
}

export function useSourceActions(workspaceId: string | null) {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ['sources', workspaceId] });
  const remove = useMutation({ mutationFn: (sourceId: string) => apiRequest(`/workspaces/${workspaceId}/sources/${sourceId}`, { method: 'DELETE' }), onSuccess: invalidate });
  const retry = useMutation({ mutationFn: (sourceId: string) => apiRequest(`/workspaces/${workspaceId}/sources/${sourceId}/retry`, { method: 'POST' }), onSuccess: invalidate });
  const download = async (sourceId: string) => {
    const { url } = await apiRequest<{ url: string }>(`/workspaces/${workspaceId}/sources/${sourceId}/download-url`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  return { remove, retry, download, invalidate };
}
