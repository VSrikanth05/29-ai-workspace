import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5" aria-label="29 AI Workspace">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)]">
        <Sparkles aria-hidden="true" className="size-4.5" strokeWidth={2.2} />
      </span>
      <span className={cn('min-w-0 leading-tight', compact && 'sr-only')}>
        <span className="block truncate text-sm font-semibold tracking-[-0.02em]">29 AI Workspace</span>
        <span className="block truncate text-[10px] font-medium text-muted-foreground">One Workspace. Unlimited Possibilities.</span>
      </span>
    </div>
  );
}
