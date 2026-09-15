"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Images,
  Star,
  Building2,
  Compass,
  Settings,
  SearchCheck,
} from "lucide-react";

const CMS_TABS: ReadonlyArray<{ name: string; href: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { name: "Overview", href: "/admin/website", icon: LayoutDashboard, exact: true },
  { name: "Pages", href: "/admin/website/pages", icon: FileText },
  { name: "Services", href: "/admin/website/services", icon: Wrench },
  { name: "Photos", href: "/admin/website/photos", icon: Images },
  { name: "Testimonials", href: "/admin/website/testimonials", icon: Star },
  { name: "Clients", href: "/admin/website/clients", icon: Building2 },
  { name: "Navigation", href: "/admin/website/navigation", icon: Compass },
  { name: "Settings", href: "/admin/website/settings", icon: Settings },
  { name: "SEO", href: "/admin/website/seo", icon: SearchCheck },
];

export function WebsiteCmsTabs() {
  const pathname = usePathname();
  const isActive = (tab: (typeof CMS_TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  // The visual editor owns /admin/website. The classic split-pane CMS screens
  // are reachable one level down and keep this tab bar.
  if (pathname === "/admin/website") return null;

  return (
    <div className="flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-white/[.08] bg-[#141416] p-1.5 lg:flex-nowrap">
      {CMS_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors ${
            isActive(tab)
              ? "bg-signal text-black"
              : "text-zinc-400 hover:bg-white/[.06] hover:text-white"
          }`}
        >
          <tab.icon size={16} />
          {tab.name}
        </Link>
      ))}
    </div>
  );
}