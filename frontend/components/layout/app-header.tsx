'use client';

import { useState } from 'react';
import { ArrowLeft, Bell, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';
import { AccountMenu } from '@/features/auth/components/account-menu';
import { PricingModal } from '@/features/payments/components/pricing-modal';

export function AppHeader() {
  const [pricingOpen, setPricingOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Brand />
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Dashboard</span>
          </Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event('29ai:search'))} className="relative block w-full max-w-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="flex h-9 w-full items-center rounded-lg border border-border bg-muted/60 pl-9 pr-3 text-sm text-muted-foreground">Search your workspace</span>
          </button>
          <button type="button" onClick={() => window.dispatchEvent(new Event('29ai:palette'))} className="hidden rounded-md border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground xl:inline">Ctrl K</button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setPricingOpen(true)}
            size="sm"
            variant="outline"
            className="hidden h-8 gap-1.5 border-primary/40 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 sm:inline-flex"
          >
            <Sparkles className="size-3.5" />
            <span>Upgrade</span>
          </Button>
          <div className="lg:hidden"><ThemeToggle /></div>
          <Button variant="ghost" size="icon" aria-label="Notifications"><Bell aria-hidden="true" className="size-4" /></Button>
          <AccountMenu />
        </div>
      </header>

      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  );
}
