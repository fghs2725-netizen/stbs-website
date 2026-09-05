import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  CheckCircle,
  Building2,
  Palette,
  Database,
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
  { name: 'Clients', href: '/admin/clients', icon: Users },
  { name: 'Approvals', href: '/admin/approvals', icon: CheckCircle },
];

export const ADMIN_SYSTEM_NAV: NavItemDef[] = [
  { name: 'Company', href: '/admin/settings/company', icon: Building2 },
  { name: 'Branding & Print', href: '/admin/settings', icon: Palette },
  { name: 'Data', href: '/admin/storage', icon: Database },
  { name: 'Health', href: '/admin/health', icon: Activity },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];
