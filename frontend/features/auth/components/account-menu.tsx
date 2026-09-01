'use client';

import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest, clearAccessToken } from '@/lib/api-client';
import { useHasSession } from '@/features/sources/hooks/use-sources';

export function AccountMenu() {
  const signedIn = useHasSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Clear the local session even when the server session has already expired.
    } finally {
      clearAccessToken();
    }
  };

  if (!mounted) return <span className="block size-9" aria-hidden="true" />;
  if (signedIn) return <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void logout()}><LogOut className="size-4" /></Button>;

  return <Button asChild variant="ghost" size="sm"><Link href="/login"><LogIn className="size-4" /> <span className="hidden sm:inline">Sign in</span></Link></Button>;
}
