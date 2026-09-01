'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { useHasSession } from '@/features/sources/hooks/use-sources';
import type { AIOutput } from '../ai-studio-types';

export function useAiOutputs(workspaceId: string | null) {
  const hasSession = useHasSession();
  return useQuery({ queryKey: ['ai-outputs', workspaceId], queryFn: () => apiRequest<AIOutput[]>(`/ai-studio/outputs?workspaceId=${encodeURIComponent(workspaceId ?? '')}`), enabled: Boolean(workspaceId) && hasSession });
}
export function usePaginatedAiOutputs(workspaceId: string | null) {
  const hasSession = useHasSession();
  return useInfiniteQuery({ queryKey: ['ai-outputs-paginated', workspaceId], queryFn: ({ pageParam }) => apiRequest<{ items: AIOutput[]; nextCursor: string | null }>(`/ai-studio/outputs?workspaceId=${encodeURIComponent(workspaceId ?? '')}&limit=30${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`), initialPageParam: '' as string, getNextPageParam: (page) => page.nextCursor ?? undefined, enabled: Boolean(workspaceId) && hasSession });
}
export function useRegenerateOutput(workspaceId: string | null) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiRequest<AIOutput>(`/ai-studio/outputs/${id}/regenerate`, { method: 'POST' }), onSuccess: () => client.invalidateQueries({ queryKey: ['ai-outputs', workspaceId] }) });
}
