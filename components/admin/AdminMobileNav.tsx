'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut } from 'lucide-react';
import { ADMIN_WORK_NAV, ADMIN_SYSTEM_NAV, NavItemDef } from './nav-items';

export function AdminMobileNav({ userName }: { userName?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawerRef.current?.focus();
    else triggerRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const renderGroup = (label: string, items: NavItemDef[]) => (
    <div className="mb-6">
      <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link key={item.name} href={item.href}>
            <div className={`flex items-center px-4 py-3 my-1 rounded-xl transition-colors ${
              active ? 'bg-signal/10 text-signal' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
            }`}>
              <item.icon className={`w-5 h-5 mr-3 ${active ? 'text-signal' : ''}`} />
              <span className="font-medium text-sm">{item.name}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="admin-mobile-navigation"
        className="lg:hidden size-10 inline-flex items-center justify-center -ml-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              id="admin-mobile-navigation"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              tabIndex={-1}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#141416] border-r border-white/[.08] flex flex-col outline-none"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                <div className="font-display text-lg font-semibold tracking-tight text-white">
                  <span className="text-signal mr-1">STBS</span> Admin
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-none">
                {renderGroup('Work', ADMIN_WORK_NAV)}
                {renderGroup('System', ADMIN_SYSTEM_NAV)}
              </nav>

              <div className="px-4 pb-4 pt-3 border-t border-white/5">
                {userName && (
                  <div className="px-4 pb-3 text-sm text-gray-500 truncate">{userName}</div>
                )}
                <button
                  onClick={() => signOut({ redirectTo: '/admin/login' })}
                  className="w-full flex items-center px-4 py-3 rounded-xl transition-colors text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  <span className="font-medium text-sm">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
