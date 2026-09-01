'use client';

import { LoaderCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clearAccessToken } from '@/lib/api-client';
import { useCurrentUser } from '../hooks/use-auth';
import { useHasSession } from '@/features/sources/hooks/use-sources';

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/dashboard';
  const signedIn = useHasSession();
  const user = useCurrentUser();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (user.isError) clearAccessToken();
    if (!signedIn || user.isError || (signedIn && !user.isPending && !user.data)) {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [hydrated, pathname, router, signedIn, user.data, user.isError, user.isPending]);

  if (!hydrated || !signedIn || user.isPending || user.isError || !user.data) {
    return <div className="grid min-h-dvh place-items-center bg-background px-6 text-muted-foreground" role="status" aria-live="polite"><div className="flex items-center gap-2 text-sm"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Checking your workspace session…</div></div>;
  }

  return <>{children}</>;
}
