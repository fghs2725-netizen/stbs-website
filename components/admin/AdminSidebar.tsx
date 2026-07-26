'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Briefcase, 
  Users, 
  LayoutTemplate, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  HardDrive,
  Cog,
  Mail,
  Search,
  BarChart3,
  Activity
} from 'lucide-react';

const MAIN_NAV = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Documents', href: '/admin/documents', icon: FileText },
  { name: 'Quotations', href: '/admin/quotations', icon: Briefcase },
  { name: 'Approvals', href: '/admin/approvals', icon: CheckCircle },
];

const MANAGEMENT_NAV = [
  { name: 'Clients', href: '/admin/clients', icon: Users },
  { name: 'Templates', href: '/admin/templates', icon: LayoutTemplate },
];

const SYSTEM_NAV = [
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Storage', href: '/admin/storage', icon: HardDrive },
  { name: 'Jobs', href: '/admin/jobs', icon: Cog },
  { name: 'Email', href: '/admin/email', icon: Mail },
  { name: 'Search', href: '/admin/search', icon: Search },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Health', href: '/admin/health', icon: Activity },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const NavItem = ({ item }: { item: any }) => {
    const active = isActive(item.href);
    return (
      <Link href={item.href}>
        <div className={`flex items-center px-4 py-3 my-1 rounded-xl transition-all duration-200 group relative ${
          active ? 'bg-signal/10 text-signal' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
        }`}>
          {active && (
            <motion.div 
              layoutId="activeNav"
              className="absolute left-0 top-0 bottom-0 w-1 bg-signal rounded-r-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
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
    <motion.aside 
      className="h-full bg-steel border-r border-white/5 flex flex-col transition-all duration-300 relative z-20 backdrop-blur-xl"
      animate={{ width: collapsed ? 80 : 280 }}
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
        {!collapsed && (
          <div className="font-oswald text-2xl font-bold tracking-tight text-white flex items-center">
            <span className="text-signal mr-1">STBS</span>Enterprise
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
        className="absolute -right-3 top-20 bg-surface border border-white/10 rounded-full p-1 text-gray-400 hover:text-white hover:bg-steel transition-colors z-30"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-none">
        <div className="mb-6">
          {!collapsed && <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main</div>}
          {MAIN_NAV.map((item) => <NavItem key={item.name} item={item} />)}
        </div>

        <div className="mb-6">
          {!collapsed && <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Management</div>}
          {MANAGEMENT_NAV.map((item) => <NavItem key={item.name} item={item} />)}
        </div>

        <div>
          {!collapsed && <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</div>}
          {SYSTEM_NAV.map((item) => <NavItem key={item.name} item={item} />)}
        </div>
      </div>

      <div className="p-4 border-t border-white/5">
        <Link href="/api/auth/signout">
          <div className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-red-400 hover:bg-red-500/10 group ${collapsed ? 'justify-center' : ''}`}>
            <LogOut className={`w-5 h-5 flex-shrink-0 ${!collapsed && 'mr-3'}`} />
            {!collapsed && <span className="font-medium text-sm">Logout</span>}
          </div>
        </Link>
      </div>
    </motion.aside>
  );
}
