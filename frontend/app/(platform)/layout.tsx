import type { ReactNode } from 'react';
import { AppFrame } from '@/components/layout/app-frame';
import { AuthGate } from '@/features/auth/components/auth-gate';

export default function PlatformLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AuthGate><AppFrame>{children}</AppFrame></AuthGate>;
}
