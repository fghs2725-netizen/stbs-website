import Link from "next/link";
import { FileText, Wrench, Images, Star, Building2, LayoutDashboard, Globe, Compass, Settings, SearchCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { getWebsiteStats } from "@/lib/website/actions";
import { canonicalSiteUrl } from "@/lib/site-url";

const STAT_CARDS = [
  { key: "pages" as const, label: "Pages", href: "/admin/website/pages", icon: FileText },
  { key: "sections" as const, label: "Sections", href: "/admin/website/pages", icon: LayoutDashboard },
  { key: "photos" as const, label: "Photos", href: "/admin/website/photos", icon: Images },
  { key: "testimonials" as const, label: "Testimonials", href: "/admin/website/testimonials", icon: Star },
  { key: "clients" as const, label: "Client logos", href: "/admin/website/clients", icon: Building2 },
];

const QUICK_LINKS = [
  { label: "Edit Homepage", href: "/admin/website/pages", icon: LayoutDashboard },
  { label: "Manage Photos", href: "/admin/website/photos", icon: Images },
  { label: "Manage Services", href: "/admin/website/services", icon: Wrench },
  { label: "Manage Testimonials", href: "/admin/website/testimonials", icon: Star },
  { label: "Manage Clients", href: "/admin/website/clients", icon: Building2 },
  { label: "Navigation", href: "/admin/website/navigation", icon: Compass },
  { label: "Global Settings", href: "/admin/website/settings", icon: Settings },
  { label: "SEO Settings", href: "/admin/website/seo", icon: SearchCheck },
];

export default async function WebsiteOverview() {
  let stats;
  try {
    stats = await getWebsiteStats();
  } catch {
    stats = null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Website CMS"
        title="Website"
        description="Manage every part of the public STBS website — pages, sections, photos, services, testimonials, clients, navigation, settings and SEO."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/" target="_blank" rel="noopener noreferrer">
                <Globe size={16} /> View Website
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/website/pages">Edit pages</Link>
            </Button>
          </div>
        }
      />

      {!stats ? (
        <div className="admin-card p-8 text-sm text-zinc-400">
          Could not load website stats. Check that the database is reachable.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {STAT_CARDS.map((card) => (
            <Link key={card.key} href={card.href} className="admin-card group p-5 transition-colors hover:border-signal/40">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-white/[.06] text-signal">
                  <card.icon size={18} />
                </span>
              </div>
              <p className="mt-5 font-display text-3xl font-bold text-white">{stats[card.key]}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[.08] p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">CMS status</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {canonicalSiteUrl()} · Content is Draft until you Publish it.
            </p>
          </div>
          <Link href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-signal hover:text-white">
            Preview website ↗
          </Link>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link key={q.label} href={q.href} className="flex items-center gap-3 rounded-lg border border-white/[.06] bg-white/[.02] px-4 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-signal/40 hover:text-white">
              <q.icon size={16} className="text-signal" />
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      {stats?.lastUpdated && (
        <p className="text-xs text-zinc-500">Last settings update: {new Date(stats.lastUpdated).toLocaleString()}</p>
      )}
    </>
  );
}