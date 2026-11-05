import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";

export const GBP_TABS = [
  { key: "overview", label: "Overview", href: "/admin/google-business" },
  { key: "reviews", label: "Reviews", href: "/admin/google-business/reviews" },
  { key: "posts", label: "Posts", href: "/admin/google-business/posts" },
  { key: "info", label: "Info", href: "/admin/google-business/info" },
  { key: "photos", label: "Photos", href: "/admin/google-business/photos" },
] as const;
export type GbpTab = (typeof GBP_TABS)[number]["key"];

/** Header and section tabs shared by every Google Business page once a listing is connected. */
export function GbpFrame({ tab, title, mapsUri, children }: { tab: GbpTab; title: string; mapsUri?: string; children: ReactNode }) {
  return (
    <div className="a-page">
      <PageHeader
        eyebrow="Google Business"
        title={title}
        description="Your Google Search and Maps listing, managed from here."
        action={mapsUri ? (
          <a href={mapsUri} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-secondary a-btn-sm">
            <ExternalLink className="size-4" aria-hidden /> View on Google Maps
          </a>
        ) : undefined}
      />
      {/* Five tabs are wider than a phone, so the row scrolls sideways instead of wrapping. */}
      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <nav className="a-segment w-max" aria-label="Google Business sections">
          {GBP_TABS.map((t) => (
            <Link key={t.key} href={t.href} data-active={t.key === tab} aria-current={t.key === tab ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}

/** A Google error shown in place of a section, with the one thing to do about it. */
export function GbpErrorCard({ message, activationUrl, retryHref }: { message: string; activationUrl?: string; retryHref?: string }) {
  return (
    <section role="alert" className="a-card p-4 sm:p-5">
      <p className="text-[0.9375rem]" style={{ color: "var(--a-danger)" }}>{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {activationUrl && (
          <a href={activationUrl} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-primary a-btn-sm">
            Enable the API <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
        {retryHref && <Link href={retryHref} className="a-btn a-btn-secondary a-btn-sm">Try again</Link>}
      </div>
    </section>
  );
}

export function Notice({ tone, children }: { tone: "positive" | "warn" | "danger" | "brand"; children: ReactNode }) {
  const colors = {
    positive: { background: "var(--a-positive-soft)", color: "var(--a-positive)" },
    warn: { background: "var(--a-warn-soft)", color: "var(--a-warn)" },
    danger: { background: "var(--a-danger-soft)", color: "var(--a-danger)" },
    brand: { background: "var(--a-brand-soft)", color: "var(--a-brand)" },
  }[tone];
  return <div role="status" className="rounded-[12px] p-3 text-[0.875rem]" style={colors}>{children}</div>;
}
