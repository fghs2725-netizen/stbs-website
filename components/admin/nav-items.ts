import {
  Building2,
  Database,
  FileText,
  Home,
  Images,
  Inbox,
  KeyRound,
  LayoutTemplate,
  ListChecks,
  ReceiptText,
  RotateCcw,
  SlidersHorizontal,
  Truck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItemDef {
  /** Full name, used in the sidebar and the More sheet. */
  name: string;
  /** Short name for the phone tab bar, where a label gets ~64px. */
  short?: string;
  href: string;
  icon: LucideIcon;
}

/**
 * The work the admin exists to do. These are the Quick Links on Home, the
 * sidebar's first group, and the source for the phone tab bar below.
 */
export const ADMIN_WORK_NAV: NavItemDef[] = [
  { name: 'Home', short: 'Home', href: '/admin', icon: Home },
  { name: 'Quotations', short: 'Quotes', href: '/admin/quotations', icon: FileText },
  { name: 'Invoices', short: 'Invoices', href: '/admin/invoices', icon: ReceiptText },
  { name: 'Delivery challans', short: 'Challans', href: '/admin/delivery-challans', icon: Truck },
  { name: 'Sale returns', short: 'Returns', href: '/admin/sale-returns', icon: RotateCcw },
  { name: 'Clients', short: 'Clients', href: '/admin/clients', icon: Users },
  { name: 'Enquiries', short: 'Enquiries', href: '/admin/enquiries', icon: Inbox },
];

/**
 * Setup, reached from the sidebar's second group or the phone More sheet.
 *
 * Each document type's setup sits under that document type, both in the path and here: invoice
 * settings were unreachable while they lived at a route nothing linked to, and quotation templates
 * were easy to mistake for every kind of template while they sat at the top level.
 */
export const ADMIN_SETUP_NAV: NavItemDef[] = [
  { name: 'Company', href: '/admin/settings/company', icon: Building2 },
  { name: 'Quotation templates', href: '/admin/quotations/templates', icon: LayoutTemplate },
  { name: 'Quotation presets', href: '/admin/quotations/presets', icon: ListChecks },
  { name: 'Invoice settings', href: '/admin/invoices/settings', icon: SlidersHorizontal },
  { name: 'Website photos', href: '/admin/photos', icon: Images },
  { name: 'Data & files', href: '/admin/storage', icon: Database },
  { name: 'Account & password', href: '/admin/account', icon: KeyRound },
];

/** Four tabs plus More. Anything not here is one tap away inside the More sheet. */
export const ADMIN_TAB_NAV: NavItemDef[] = [
  ADMIN_WORK_NAV[0],
  ADMIN_WORK_NAV[1],
  ADMIN_WORK_NAV[2],
  ADMIN_WORK_NAV[5],
];

/** Everything the tab bar could not fit, in the order the More sheet lists it. */
export const ADMIN_MORE_NAV: NavItemDef[] = [ADMIN_WORK_NAV[6], ADMIN_WORK_NAV[3], ADMIN_WORK_NAV[4]];

/** `/admin` must match exactly or it would light up on every child route. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}
