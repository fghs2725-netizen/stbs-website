'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Ellipsis, LogOut, X } from 'lucide-react';
import { ADMIN_MORE_NAV, ADMIN_SETUP_NAV, ADMIN_TAB_NAV, isNavItemActive, type NavItemDef } from '../nav-items';

/**
 * Phone navigation: a frosted tab bar pinned to the bottom, plus a More sheet
 * for the items that do not fit. A bottom bar beats the old left drawer here —
 * it is reachable one-handed and shows where you are without being opened.
 */
export function AdminTabBar() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);

  useEffect(() => setMore(false), [pathname]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMore(false);
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [more]);

  const sheetItems = [...ADMIN_MORE_NAV, ...ADMIN_SETUP_NAV];
  // The More tab reads as selected whenever the current page lives inside the sheet.
  const inSheet = sheetItems.some((item) => isNavItemActive(item.href, pathname));

  const tabStyle = (active: boolean) => ({ color: active ? 'var(--a-brand)' : 'var(--a-faint)' });

  return (
    <>
      <nav
        aria-label="Admin sections"
        className="a-bar fixed inset-x-0 bottom-0 z-40 flex lg:hidden"
        style={{ borderTop: '1px solid var(--a-hairline)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {ADMIN_TAB_NAV.map((item) => {
          const active = isNavItemActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[54px] flex-1 flex-col items-center justify-center gap-[3px] pt-[6px] transition-colors duration-200"
              style={tabStyle(active)}
            >
              <item.icon size={22} strokeWidth={active ? 2 : 1.75} aria-hidden />
              <span className="text-[0.625rem] font-medium tracking-[0.01em]">{item.short ?? item.name}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-expanded={more}
          aria-controls="admin-more-sheet"
          className="flex min-h-[54px] flex-1 flex-col items-center justify-center gap-[3px] pt-[6px] transition-colors duration-200"
          style={tabStyle(inSheet || more)}
        >
          <Ellipsis size={22} strokeWidth={inSheet ? 2 : 1.75} aria-hidden />
          <span className="text-[0.625rem] font-medium tracking-[0.01em]">More</span>
        </button>
      </nav>

      {/* Kept mounted so it eases both ways, matching the public site's menu. */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${more ? 'visible' : 'invisible'}`}
        aria-hidden={!more}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setMore(false)}
          className={`absolute inset-0 bg-black/25 transition-opacity duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${more ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          id="admin-more-sheet"
          role="dialog"
          aria-modal={more || undefined}
          aria-label="More sections"
          className={`absolute inset-x-0 bottom-0 rounded-t-[22px] pb-[calc(16px+env(safe-area-inset-bottom))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${more ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ background: 'var(--a-surface)', boxShadow: '0 -12px 40px -20px rgba(0,0,0,.4)' }}
        >
          <div className="flex items-center justify-between px-5 pb-1 pt-4">
            <h2 className="a-h2">More</h2>
            <button
              type="button"
              onClick={() => setMore(false)}
              aria-label="Close"
              tabIndex={more ? undefined : -1}
              className="inline-flex size-11 items-center justify-center rounded-full"
              style={{ color: 'var(--a-muted)' }}
            >
              <X size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <ul className="a-divide px-5">
            {sheetItems.map((item: NavItemDef) => {
              const active = isNavItemActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    tabIndex={more ? undefined : -1}
                    aria-current={active ? 'page' : undefined}
                    className="flex min-h-[52px] items-center gap-3 text-[1rem]"
                    style={{ color: active ? 'var(--a-brand)' : 'var(--a-ink)', fontWeight: active ? 600 : 450 }}
                  >
                    <item.icon size={20} strokeWidth={1.75} aria-hidden style={{ color: active ? 'var(--a-brand)' : 'var(--a-muted)' }} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                tabIndex={more ? undefined : -1}
                onClick={() => signOut({ redirectTo: '/admin/login' })}
                className="flex min-h-[52px] w-full items-center gap-3 text-[1rem]"
                style={{ color: 'var(--a-danger)' }}
              >
                <LogOut size={20} strokeWidth={1.75} aria-hidden />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
