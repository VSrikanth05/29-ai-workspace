'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/layout/brand';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="29 AI Workspace home" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Brand />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      
      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 pb-6 text-center text-[11px] text-muted-foreground sm:flex-row">
        <span className="inline-flex items-center gap-1"><ShieldCheck aria-hidden="true" className="size-3.5" /> Secure account access</span>
        <span className="hidden sm:inline" aria-hidden="true">·</span>
        <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">Back to 29 AI Workspace <ArrowUpRight aria-hidden="true" className="size-3" /></Link>
      </footer>
    </div>
  );
}

export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="w-full max-w-md rounded-3xl border border-border bg-panel/80 p-5 shadow-[0_20px_70px_-45px_var(--primary)] backdrop-blur sm:p-7" aria-labelledby="auth-card-title">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">29 AI Workspace</p>
        <h1 id="auth-card-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function AuthMessage({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${tone === 'error' ? 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>{children}</p>;
}

export function AuthDivider() {
  return <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>;
}
