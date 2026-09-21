import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';

/** The quick-links card: the handful of things worth starting from Home. */
export function QuickLinks({ links }: { links: Array<{ label: string; href: string; icon: LucideIcon; tone?: 'brand' | 'neutral' }> }) {
  return (
    <section className="a-card p-4 sm:p-5" aria-labelledby="quick-links-heading">
      <h2 id="quick-links-heading" className="a-h2 mb-4">Quick links</h2>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {links.map(({ label, href, icon: Icon, tone = 'neutral' }) => (
          <li key={href}>
            <Link href={href} className="a-card-link flex flex-col items-center gap-2 rounded-[12px] py-2 text-center">
              <span
                aria-hidden
                className="inline-flex size-12 items-center justify-center rounded-[14px]"
                style={
                  tone === 'brand'
                    ? { background: 'var(--a-brand)', color: '#fff' }
                    : { background: 'var(--a-brand-soft)', color: 'var(--a-brand)' }
                }
              >
                <Icon size={22} strokeWidth={1.75} />
              </span>
              <span className="text-[0.75rem] font-medium leading-tight" style={{ color: 'var(--a-body)' }}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A metric tile. Values are strings so callers control INR / count formatting. */
export function StatTiles({ stats }: { stats: Array<{ label: string; value: string; hint?: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="a-card p-4">
          <p className="a-label">{s.label}</p>
          <p className="a-num mt-1 text-[1.5rem] font-semibold leading-tight" style={{ color: 'var(--a-ink)' }}>{s.value}</p>
          {s.hint && <p className="mt-1 text-[0.75rem]" style={{ color: 'var(--a-faint)' }}>{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** Honest empty state: says what is missing and offers the one next step. */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span aria-hidden className="mb-3 inline-flex size-12 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.05)', color: 'var(--a-faint)' }}>
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <h2 className="a-h2">{title}</h2>
      <p className="a-sub mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * The primary create action. It floats above the phone tab bar exactly the way
 * the reference layout does, and folds into the page header on desktop.
 */
export function FloatingAction({ href, label }: { href: string; label: string }) {
  // The wrapper carries `lg:hidden`, not the link: `.a-btn` sets `display` and
  // is more specific than a utility class, so it would override it there.
  return (
    <div className="lg:hidden" aria-hidden={false}>
      {/* The button floats out of flow, so this reserves the height it covers. */}
      <div className="h-8" aria-hidden />
      <Link
        href={href}
        className="a-btn a-btn-primary fixed left-1/2 z-30 -translate-x-1/2 shadow-lg"
        style={{ bottom: 'calc(66px + env(safe-area-inset-bottom))' }}
      >
        <Plus size={18} strokeWidth={2} aria-hidden />
        {label}
      </Link>
    </div>
  );
}

export function Pill({ tone, children }: { tone: 'neutral' | 'positive' | 'warn' | 'brand'; children: ReactNode }) {
  return <span className={`a-pill a-pill-${tone}`}>{children}</span>;
}
