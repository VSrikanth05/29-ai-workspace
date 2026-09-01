import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmailPageContent } from '@/features/auth/components/auth-pages';
import { AuthCard } from '@/features/auth/components/auth-shell';

export const metadata: Metadata = { title: 'Verify your email' };

export default function VerifyEmailPage() { return <Suspense fallback={<AuthCard title="Verify your email" description="Preparing your verification flow…"><p className="text-sm text-muted-foreground">Loading verification…</p></AuthCard>}><VerifyEmailPageContent /></Suspense>; }
