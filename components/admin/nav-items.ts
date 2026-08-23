import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  CheckCircle,
  HardDrive,
  Cog,
  Mail,
  Search,
  BarChart3,
  Activity,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItemDef {
  name: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_WORK_NAV: NavItemDef[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Documents', href: '/admin/documents', icon: FileText },
  { name: 'Quotations', href: '/admin/quotations', icon: Briefcase },
  { name: 'Approvals', href: '/admin/approvals', icon: CheckCircle },
  { name: 'Clients', href: '/admin/clients', icon: Users },
];

export const ADMIN_SYSTEM_NAV: NavItemDef[] = [
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Search', href: '/admin/search', icon: Search },
  { name: 'Storage', href: '/admin/storage', icon: HardDrive },
  { name: 'Jobs', href: '/admin/jobs', icon: Cog },
  { name: 'Email', href: '/admin/email', icon: Mail },
  { name: 'Health', href: '/admin/health', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];
