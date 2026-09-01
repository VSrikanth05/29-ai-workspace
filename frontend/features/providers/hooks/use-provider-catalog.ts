'use client';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { useHasSession } from '@/features/sources/hooks/use-sources';
import type { Model, Provider, ProviderHealth } from '../provider-types';

export function useProviderCatalog() {
  const enabled = useHasSession();
  const providers = useQuery({ queryKey: ['ai-providers'], queryFn: () => apiRequest<Provider[]>('/providers'), enabled, staleTime: 300_000 });
  const models = useQuery({ queryKey: ['ai-models'], queryFn: () => apiRequest<Model[]>('/models'), enabled, staleTime: 300_000 });
  const health = useQuery({ queryKey: ['ai-provider-health'], queryFn: () => apiRequest<{ checkedAt: string; providers: ProviderHealth[] }>('/ai/provider-health'), enabled, staleTime: 60_000 });
  return { providers, models, health };
}
