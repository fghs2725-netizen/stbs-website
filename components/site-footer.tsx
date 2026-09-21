"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Pencil } from "lucide-react";
import type { CmsSettings } from "@/components/public/sections";
import { businessInfo } from "@/lib/company";
import { formatIndianPhone, telHref } from "@/lib/phone";
import { useWebsiteEditor } from "@/lib/website/editor-context";
import { DEFAULT_NAV_LINKS, ensureAboutLink, FOOTER_ONLY_LINKS, isPublicNavLink } from "@/lib/website/nav-defaults";
import { SERVICE_PAGES } from "@/lib/website/service-pages";

type FooterSettings = Pick<CmsSettings, "businessName" | "shortDescription" | "phone" | "phone2" | "email" | "address" | "whatsapp" | "primaryLogoUrl" | "lightLogoUrl" | "darkLogoUrl" | "logoUrl">;

const LINK = "flex min-h-[44px] items-center text-stbs-muted-on-dark transition-colors duration-[250ms] hover:text-stbs-ink-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stbs-ink-on-dark";

/**
 * Footer on --brand-deep. Facts with no verified value (registered office, GSTIN) are hidden, not faked.
 * The Maps link is a plain link, not an embed: a third-party iframe on every page would cost the
 * performance budget (the contact page carries the actual embed).
 */
export function SiteFooter({ settings, navLinks }: { settings?: FooterSettings | null; navLinks?: Array<{ label: string; href: string }> }) {
  const phones = [settings?.phone, settings?.phone2].filter((p): p is string => Boolean(p));
  const email = settings?.email ?? "";
  const name = settings?.businessName ?? "";
  const tagline = settings?.shortDescription ?? "";
  const address = settings?.address || (businessInfo.registeredOffice ? `${businessInfo.registeredOffice}, Haryana ${businessInfo.pinCode}` : "");
  const whatsapp = (settings?.whatsapp || phones[0] || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  // Main nav links first, then footer-only pages (About, Gallery) that are no longer in the navbar.
  const main = ensureAboutLink((navLinks?.length ? navLinks : DEFAULT_NAV_LINKS).filter(isPublicNavLink));
  const links = [...main, ...FOOTER_ONLY_LINKS.filter((x) => !main.some((m) => m.href === x.href))];
  const editor = useWebsiteEditor();
  const isEditor = editor.isEditor;

  return (
    <footer className="band-deep rule-on-dark">
      <div className="container-x grid gap-u7 py-u10 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-u6">
        <div>
          <div className="flex flex-wrap items-center gap-u1">
            <Link href="/" data-editor-safe className="inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stbs-ink-on-dark" aria-label={name ? `${name} home` : "Home"}>
              <Image
                src={settings?.primaryLogoUrl || settings?.lightLogoUrl || settings?.darkLogoUrl || settings?.logoUrl || "/stbs-logo-only.png"}
                alt="STBS logo"
                width={220}
                height={93}
                className="h-auto w-40 object-contain object-left"
              />
            </Link>
            {isEditor && editor.mode === "edit" && (
              <button
                type="button"
                data-editor-safe
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); editor.openEditor({ kind: "settings" }); }}
                className="inline-flex min-h-8 items-center gap-1 rounded-[4px] bg-stbs-ink-on-dark px-2 text-[10px] font-medium uppercase text-stbs-brand-deep"
                title="Edit Logo in Settings"
              >
                <Pencil size={11} strokeWidth={1.75} /> Edit Logo
              </button>
            )}
          </div>
          {tagline && <p className="t-body mt-u3 max-w-[32ch] text-stbs-muted-on-dark">{tagline}</p>}
          <div className="mt-u3">
            {phones.map((p) => (
              <a key={p} href={telHref(p)} className={`${LINK} tabular-nums`}>{formatIndianPhone(p)}</a>
            ))}
            {whatsapp && (
              <a href={`https://wa.me/91${whatsapp}`} target="_blank" rel="noopener noreferrer" className={LINK}>WhatsApp</a>
            )}
            {email && <a href={`mailto:${email}`} className={`${LINK} break-all`}>{email}</a>}
            <Link href="/quote" className="mt-u1 inline-flex min-h-[44px] items-center gap-u1 font-medium text-stbs-ink-on-dark underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stbs-ink-on-dark">
              Request a proposal <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="text-[0.9375rem] font-semibold text-white">Navigate</h2>
          <ul className="mt-u2">
            {links.map((x) => (
              <li key={x.href}><Link className={LINK} href={x.href}>{x.label}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Services">
          <h2 className="text-[0.9375rem] font-semibold text-white">Services</h2>
          <ul className="mt-u2">
            {SERVICE_PAGES.map((s) => (
              <li key={s.slug}><Link className={LINK} href={s.href}>{s.fullTitle}</Link></li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-[0.9375rem] font-semibold text-white">Company</h2>
          <dl className="mt-u2 space-y-u2 text-stbs-muted-on-dark">
            {address && (
              <div><dt className="text-sm text-stbs-ink-on-dark">Registered office</dt><dd className="m-0 mt-[2px]">{address}</dd></div>
            )}
            {businessInfo.gstin && (
              <div><dt className="text-sm text-stbs-ink-on-dark">GSTIN</dt><dd className="m-0 mt-[2px] tabular-nums">{businessInfo.gstin}</dd></div>
            )}
            <div>
              <dt className="text-sm text-stbs-ink-on-dark">Working hours</dt>
              <dd className="m-0 mt-[2px]">{businessInfo.hours.map((h) => <span key={h} className="block">{h}</span>)}</dd>
            </div>
            <div>
              <dt className="text-sm text-stbs-ink-on-dark">Service area</dt>
              <dd className="m-0 mt-[2px]">{businessInfo.serviceAreas.join(" · ")}</dd>
            </div>
          </dl>
          <a href={businessInfo.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} mt-u1 text-stbs-ink-on-dark underline underline-offset-4`}>Open in Google Maps</a>
        </div>
      </div>

      {/* Bottom bar. Extra bottom padding at every width keeps the floating WhatsApp button clear of these links. */}
      <div className="rule-on-dark">
        <div className="container-x flex flex-col gap-u1 py-u3 pb-[calc(88px+env(safe-area-inset-bottom))] text-sm text-stbs-muted-on-dark sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0">&copy; {new Date().getFullYear()}{name ? ` ${name}` : ""}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-u3">
            <li><Link className={LINK} href="/privacy">Privacy Policy</Link></li>
            <li><Link className={LINK} href="/terms">Terms of Service</Link></li>
            <li><Link className={LINK} href="/admin">Admin</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
