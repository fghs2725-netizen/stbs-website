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
 * Sticky 56px frosted-glass navbar (dark, translucent, blurred) with a hairline bottom border.
 * It stays dark because the STBS logo is a white wordmark.
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
  const linkBase = `inline-flex h-full items-center font-body text-[0.8125rem] font-normal tracking-[-0.005em] transition-colors duration-300 ${focus}`;

  return (
    <header className={`${isEditor ? "absolute" : "sticky"} inset-x-0 top-0 z-50 h-[56px] glass border-b border-white/10 font-body`}>
      <div className="container-x flex h-full items-center justify-between gap-u2">
        <div className="flex items-center gap-u2">
          <Link href="/" data-editor-safe className={`flex min-h-[44px] items-center ${focus}`} aria-label={businessName ? `${businessName} home` : "Home"}>
            <span className="relative block h-[34px] w-[92px]">
              <Image src={logoUrl || "/stbs-logo-only.png"} alt="STBS logo" fill className={`object-contain object-left ${mobileLogoUrl ? "hidden sm:block" : ""}`} sizes="92px" priority />
              {mobileLogoUrl && <Image src={mobileLogoUrl} alt="STBS logo" fill className="object-contain object-left sm:hidden" sizes="92px" priority />}
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

        <nav className="hidden h-full items-center lg:flex" aria-label="Main navigation">
          {links.map((l) => {
            const active = isActiveNavLink(l.href, pathname);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`${linkBase} px-[14px] ${active ? "text-white" : "text-white/70 hover:text-white"}`}>
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-u2">
          {phoneText && (
            <a href={telHref(phone!)} className={`${linkBase} hidden gap-[6px] text-white/85 hover:text-white md:inline-flex`} aria-label={`Call ${phoneText}`}>
              <Phone size={15} strokeWidth={1.75} aria-hidden /> <span className="tabular-nums">{phoneText}</span>
            </a>
          )}
          <Link href={CTA_HREF} className={`btn btn-primary btn-sm hidden md:inline-flex ${focus}`}>{CTA_LABEL}</Link>
          {phoneText && (
            <a href={telHref(phone!)} className={`inline-flex h-11 w-11 items-center justify-center text-white md:hidden ${focus}`} aria-label={`Call ${phoneText}`}>
              <Phone size={22} strokeWidth={1.75} aria-hidden />
            </a>
          )}
          <button
            type="button"
            className={`inline-flex h-11 w-11 items-center justify-center text-white lg:hidden ${focus}`}
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
        <nav id="mobile-nav" aria-label="Mobile navigation" className="absolute inset-x-0 top-full h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain bg-stbs-brand-deep">
          <div className="container-x pb-u6 pt-u3">
            <ul>
              {links.map((l, i) => {
                const active = isActiveNavLink(l.href, pathname);
                return (
                  <li key={l.href} className="animate-[fadeSlideUp_0.5s_cubic-bezier(0.28,0.11,0.32,1)_both]" style={{ animationDelay: `${80 + i * 55}ms` }}>
                    <Link href={l.href} aria-current={active ? "page" : undefined} className={`flex min-h-[64px] items-center border-b border-white/10 font-body text-[1.75rem] font-semibold tracking-[-0.03em] ${active ? "text-white" : "text-white/70"} ${focus}`}>{l.label}</Link>
                  </li>
                );
              })}
            </ul>
            {phoneText && (
              <a href={telHref(phone!)} className={`mt-u4 flex min-h-[48px] items-center gap-u1 text-lg text-white/85 ${focus}`}>
                <Phone size={20} strokeWidth={1.75} aria-hidden /> <span className="tabular-nums">{phoneText}</span>
              </a>
            )}
            <Link href={CTA_HREF} className={`btn btn-primary mt-u3 w-full ${focus}`}>{CTA_LABEL}</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
