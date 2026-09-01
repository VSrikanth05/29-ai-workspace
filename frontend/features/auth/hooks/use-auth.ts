'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { useHasSession } from '@/features/sources/hooks/use-sources';
import type { AuthUser } from '../auth-types';

export function useCurrentUser() {
  const signedIn = useHasSession();
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiRequest<AuthUser>('/auth/me'),
    enabled: signedIn,
    retry: false,
    staleTime: 60_000,
  });
}
