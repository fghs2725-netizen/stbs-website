import Link from 'next/link';
import { Search, Settings, Store } from 'lucide-react';

/**
 * The 56px bar above the content. On phones it carries the business name (the
 * sidebar shows it on desktop); search collapses to an icon below `sm` so the
 * name keeps the room it needs.
 */
export function AdminTopBar({ businessName, userName }: { businessName: string; userName?: string | null }) {
  const initial = userName?.trim().charAt(0).toUpperCase();

  return (
    <header
      className="a-bar sticky top-0 z-30 flex h-[56px] shrink-0 items-center gap-3 px-4 lg:px-6"
      style={{ borderBottom: '1px solid var(--a-hairline)' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          aria-hidden
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full lg:hidden"
          style={{ background: 'var(--a-brand-soft)', color: 'var(--a-brand)' }}
        >
          <Store size={17} strokeWidth={1.75} />
        </span>
        <h1 className="truncate text-[1.0625rem] font-semibold lg:hidden" style={{ color: 'var(--a-ink)' }}>
          {businessName}
        </h1>

        <form
          action="/admin/search"
          method="GET"
          role="search"
          className="hidden h-9 w-full max-w-md items-center gap-2 rounded-[10px] px-3 sm:flex"
          style={{ background: 'rgba(0,0,0,.05)' }}
        >
          <Search size={16} strokeWidth={1.75} aria-hidden style={{ color: 'var(--a-faint)' }} />
          <label htmlFor="admin-search" className="sr-only">Search</label>
          <input
            id="admin-search"
            type="search"
            name="q"
            placeholder="Search quotations, clients"
            className="w-full min-w-0 bg-transparent text-[0.9375rem] outline-none"
            style={{ color: 'var(--a-ink)' }}
          />
        </form>
      </div>

      <Link
        href="/admin/search"
        aria-label="Search"
        className="inline-flex size-11 items-center justify-center rounded-full sm:hidden"
        style={{ color: 'var(--a-muted)' }}
      >
        <Search size={20} strokeWidth={1.75} aria-hidden />
      </Link>
      <Link
        href="/admin/settings/company"
        aria-label="Company settings"
        className="inline-flex size-11 items-center justify-center rounded-full"
        style={{ color: 'var(--a-muted)' }}
      >
        <Settings size={20} strokeWidth={1.75} aria-hidden />
      </Link>
      <Link
        href="/admin/account"
        aria-label={`Account${userName ? `: ${userName}` : ''}`}
        title="Account & password"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold"
        style={{ background: 'var(--a-brand)', color: '#fff' }}
      >
        {initial || 'A'}
      </Link>
    </header>
  );
}
