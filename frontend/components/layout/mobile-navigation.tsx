'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Workspace', href: '/workspace', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const;

export function MobileNavigation() {
  const pathname = usePathname() ?? '';
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-3 border-t border-border bg-background/95 px-3 backdrop-blur-lg lg:hidden" aria-label="Mobile navigation">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', active && 'text-primary')}
          >
            <item.icon aria-hidden="true" className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
