'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { ADMIN_SETUP_NAV, ADMIN_WORK_NAV, isNavItemActive, type NavItemDef } from '../nav-items';

/**
 * Desktop navigation. Fixed width, no collapse toggle: six items never need
 * hiding, and a collapsed rail only trades legible labels for 180px of canvas.
 */
export function AdminSidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();

  const Item = ({ item }: { item: NavItemDef }) => {
    const active = isNavItemActive(item.href, pathname);
    return (
      <li>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className="flex min-h-[40px] items-center gap-3 rounded-[10px] px-3 text-[0.9375rem] transition-colors duration-200"
          style={{
            background: active ? 'var(--a-brand-soft)' : 'transparent',
            color: active ? 'var(--a-brand)' : 'var(--a-body)',
            fontWeight: active ? 600 : 450,
          }}
        >
          <item.icon size={18} strokeWidth={1.75} aria-hidden className="shrink-0" />
          <span className="truncate">{item.name}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside
      className="hidden w-[248px] shrink-0 flex-col lg:flex"
      style={{ borderRight: '1px solid var(--a-hairline)', background: 'var(--a-surface)' }}
      aria-label="Admin navigation"
    >
      <div className="flex h-[56px] items-center px-5" style={{ borderBottom: '1px solid var(--a-hairline)' }}>
        <Link href="/admin" className="truncate text-[0.9375rem] font-semibold" style={{ color: 'var(--a-ink)' }}>
          {businessName}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-[2px]">
          {ADMIN_WORK_NAV.map((item) => <Item key={item.href} item={item} />)}
        </ul>
        <p className="a-eyebrow mt-6 px-3 pb-2">Setup</p>
        <ul className="space-y-[2px]">
          {ADMIN_SETUP_NAV.map((item) => <Item key={item.href} item={item} />)}
        </ul>
      </nav>

      <div className="p-3" style={{ borderTop: '1px solid var(--a-hairline)' }}>
        <button
          type="button"
          onClick={() => signOut({ redirectTo: '/admin/login' })}
          className="flex min-h-[40px] w-full items-center gap-3 rounded-[10px] px-3 text-[0.9375rem] transition-colors duration-200"
          style={{ color: 'var(--a-muted)' }}
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
