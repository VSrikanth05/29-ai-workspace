import type { LucideIcon } from 'lucide-react';

export function ModulePage({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <section className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="module-title">
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">29 AI Workspace</p>
        <h1 id="module-title" className="text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border bg-muted/25 p-8 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-4 text-base font-semibold">Your {title.toLowerCase()} will live here</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">The platform foundation is ready. This module will gain its domain workflow in a dedicated milestone.</p>
        </div>
      </div>
    </section>
  );
}
