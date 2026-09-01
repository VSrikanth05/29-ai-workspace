import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginPageContent } from '@/features/auth/components/auth-pages';
import { AuthCard } from '@/features/auth/components/auth-shell';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() { return <Suspense fallback={<AuthCard title="Welcome back" description="Preparing secure sign in…"><p className="text-sm text-muted-foreground">Loading sign in…</p></AuthCard>}><LoginPageContent /></Suspense>; }
