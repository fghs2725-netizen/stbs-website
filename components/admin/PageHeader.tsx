import { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="flex flex-col gap-4 border-b border-white/[.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="mb-2 text-xs font-medium text-zinc-500">{eyebrow}</p>}
      <h1 className="font-display text-2xl font-semibold leading-tight text-[#f2f4f6]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-5 text-zinc-400">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>;
}
