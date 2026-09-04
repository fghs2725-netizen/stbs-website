'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_WORK_NAV, ADMIN_SYSTEM_NAV, NavItemDef } from './nav-items';

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const NavItem = ({ item }: { item: NavItemDef }) => {
    const active = isActive(item.href);
    return (
      <Link href={item.href}>
        <div className={`flex min-h-11 items-center px-3 py-2 my-1 rounded-lg transition-colors duration-200 group relative ${
          active ? 'bg-signal/10 text-signal' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
        }`}>
          {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-0.5 bg-signal rounded-r" />}
          <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-signal' : 'text-gray-400 group-hover:text-gray-200'} ${!collapsed && 'mr-3'}`} />
          {!collapsed && (
            <span className="font-medium whitespace-nowrap overflow-hidden text-sm">
              {item.name}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <aside style={{ width: collapsed ? 80 : 264 }} className="hidden lg:flex h-full shrink-0 bg-[#141416] border-r border-white/[.08] flex-col transition-[width] duration-200 relative z-20">
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
        {!collapsed && (
          <div className="font-display text-lg font-semibold tracking-tight text-white flex items-center">
            <span className="text-signal mr-1">STBS</span> Admin
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center font-oswald text-2xl font-bold text-signal">
            S
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:block absolute -right-3 top-20 bg-surface border border-white/10 rounded-full p-1 text-gray-400 hover:text-white hover:bg-steel transition-colors z-30"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-none">
        <div className="mb-6">
          {!collapsed && <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Work</div>}
          {ADMIN_WORK_NAV.map((item) => <NavItem key={item.name} item={item} />)}
        </div>

        <div>
          {!collapsed && <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</div>}
          {ADMIN_SYSTEM_NAV.map((item) => <NavItem key={item.name} item={item} />)}
        </div>
      </div>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => signOut({ redirectTo: '/admin/login' })}
          className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-red-400 hover:bg-red-500/10 group ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className={`w-5 h-5 flex-shrink-0 ${!collapsed && 'mr-3'}`} />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
      </aside>
  );
}
