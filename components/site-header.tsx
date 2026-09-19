"use client";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWebsiteEditor } from "@/lib/website/editor-context";
import { DEFAULT_NAV_LINKS, isActiveNavLink, isPublicNavLink, type NavLink } from "@/lib/website/nav-defaults";
import { formatIndianPhone, telHref } from "@/lib/phone";

const CTA_LABEL = "Request a proposal";
const CTA_HREF = "/quote";

/**
 * Sticky 68px navbar on --brand-deep with a hairline bottom border. It sits on the dark
 * brand colour because the STBS logo is a white wordmark. Flat: no blur, no shadow.
 * Links are CMS-driven (Website -> Navigation); admin links and the quote page are
 * never rendered here (the quote page is the CTA button).
 */
export function SiteHeader({ navLinks, businessName, logoUrl, mobileLogoUrl, phone }: { navLinks?: NavLink[]; businessName?: string; logoUrl?: string; mobileLogoUrl?: string; phone?: string }) {
  const links = (navLinks?.length ? navLinks : DEFAULT_NAV_LINKS).filter(isPublicNavLink);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const editor = useWebsiteEditor();
  const isEditor = editor.isEditor;
  const phoneText = phone ? formatIndianPhone(phone) : "";

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stbs-ink-on-dark";
  const linkBase = `inline-flex min-h-[48px] items-center font-body text-[0.9375rem] font-medium transition-colors duration-[250ms] ${focus}`;

  return (
    <header className={`${isEditor ? "absolute" : "sticky"} inset-x-0 top-0 z-50 h-[68px] border-b border-stbs-hairline-on-dark bg-stbs-brand-deep font-body`}>
      <div className="container-x flex h-full items-center justify-between gap-u2">
        <div className="flex items-center gap-u2">
          <Link href="/" data-editor-safe className={`flex items-center ${focus}`} aria-label={businessName ? `${businessName} home` : "Home"}>
            <span className="relative block h-[44px] w-[104px]">
              <Image src={logoUrl || "/stbs-logo-only.png"} alt="STBS logo" fill className={`object-contain object-left ${mobileLogoUrl ? "hidden sm:block" : ""}`} sizes="104px" priority />
              {mobileLogoUrl && <Image src={mobileLogoUrl} alt="STBS logo" fill className="object-contain object-left sm:hidden" sizes="104px" priority />}
            </span>
          </Link>
          {isEditor && editor.mode === "edit" && (
            <button
              type="button"
              data-editor-safe
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); editor.openEditor({ kind: "settings" }); }}
              className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-[4px] bg-stbs-ink-on-dark px-2 text-[10px] font-medium uppercase text-stbs-brand-deep"
              title="Edit Logo in Settings"
            >
              <Pencil size={11} strokeWidth={1.75} /> Edit Logo
            </button>
          )}
        </div>

        <nav className="hidden items-center gap-u1 lg:flex" aria-label="Main navigation">
          {links.map((l) => {
            const active = isActiveNavLink(l.href, pathname);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`${linkBase} px-u2 ${active ? "text-stbs-ink-on-dark" : "text-stbs-muted-on-dark hover:text-stbs-ink-on-dark"}`}>
                <span className={`border-b py-[2px] ${active ? "border-stbs-ink-on-dark" : "border-transparent"}`}>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-u2">
          {phoneText && (
            <a href={telHref(phone!)} className={`${linkBase} hidden gap-u1 text-stbs-ink-on-dark md:inline-flex`} aria-label={`Call ${phoneText}`}>
              <Phone size={18} strokeWidth={1.75} aria-hidden /> <span className="tabular-nums">{phoneText}</span>
            </a>
          )}
          <Link href={CTA_HREF} className={`btn btn-primary hidden md:inline-flex ${focus}`}>{CTA_LABEL}</Link>
          {phoneText && (
            <a href={telHref(phone!)} className={`inline-flex min-h-[48px] min-w-[48px] items-center justify-center text-stbs-ink-on-dark md:hidden ${focus}`} aria-label={`Call ${phoneText}`}>
              <Phone size={22} strokeWidth={1.75} aria-hidden />
            </a>
          )}
          <button
            type="button"
            className={`inline-flex min-h-[48px] min-w-[48px] items-center justify-center text-stbs-ink-on-dark lg:hidden ${focus}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={24} strokeWidth={1.75} aria-hidden /> : <Menu size={24} strokeWidth={1.75} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-b border-stbs-hairline-on-dark bg-stbs-brand-deep">
          <div className="container-x pb-u3">
            <ul>
              {links.map((l) => {
                const active = isActiveNavLink(l.href, pathname);
                return (
                  <li key={l.href} className="border-b border-stbs-hairline-on-dark">
                    <Link href={l.href} aria-current={active ? "page" : undefined} className={`flex min-h-[56px] items-center font-body text-lg font-medium ${active ? "text-stbs-ink-on-dark" : "text-stbs-muted-on-dark"} ${focus}`}>{l.label}</Link>
                  </li>
                );
              })}
            </ul>
            {phoneText && (
              <a href={telHref(phone!)} className={`mt-u2 flex min-h-[48px] items-center gap-u1 text-stbs-ink-on-dark ${focus}`}>
                <Phone size={18} strokeWidth={1.75} aria-hidden /> <span className="tabular-nums">{phoneText}</span>
              </a>
            )}
            <Link href={CTA_HREF} className={`btn btn-primary mt-u2 w-full ${focus}`}>{CTA_LABEL}</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
