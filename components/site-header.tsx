"use client";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWebsiteEditor } from "@/lib/website/editor-context";
import { DEFAULT_NAV_LINKS, ensureAboutLink, isActiveNavLink, isPublicNavLink, type NavLink } from "@/lib/website/nav-defaults";
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
  const links = ensureAboutLink((navLinks?.length ? navLinks : DEFAULT_NAV_LINKS).filter(isPublicNavLink));
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
    // Hold the page still behind the open sheet, so a scroll gesture moves the menu, not the page.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
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
            {/* Both icons stay mounted and cross-rotate, so the toggle glides rather than snapping. */}
            <span className="relative block h-6 w-6">
              <Menu size={24} strokeWidth={1.75} aria-hidden className={`absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`} />
              <X size={24} strokeWidth={1.75} aria-hidden className={`absolute inset-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Kept mounted so it eases both open and shut; `invisible` takes it out of the tab order
          when closed, and transitioning visibility holds it until the fade finishes. */}
      <nav
        id="mobile-nav"
        aria-label="Mobile navigation"
        aria-hidden={!open}
        className={`absolute inset-x-0 top-full h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain bg-stbs-brand-deep transition-[opacity,transform,visibility] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:hidden ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-3 opacity-0"}`}
      >
        <div className="container-x pb-u6 pt-u3">
          <ul>
            {links.map((l, i) => {
              const active = isActiveNavLink(l.href, pathname);
              return (
                <li
                  key={l.href}
                  // Opening staggers the links in; closing takes them out together, which reads faster.
                  style={{ transitionDelay: open ? `${90 + i * 55}ms` : "0ms" }}
                  className={`transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                >
                  <Link href={l.href} tabIndex={open ? undefined : -1} aria-current={active ? "page" : undefined} className={`flex min-h-[64px] items-center border-b border-white/10 font-body text-[1.75rem] font-semibold tracking-[-0.03em] ${active ? "text-white" : "text-white/70"} ${focus}`}>{l.label}</Link>
                </li>
              );
            })}
          </ul>
          <div
            style={{ transitionDelay: open ? `${90 + links.length * 55}ms` : "0ms" }}
            className={`transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            {phoneText && (
              <a href={telHref(phone!)} tabIndex={open ? undefined : -1} className={`mt-u4 flex min-h-[48px] items-center gap-u1 text-lg text-white/85 ${focus}`}>
                <Phone size={20} strokeWidth={1.75} aria-hidden /> <span className="tabular-nums">{phoneText}</span>
              </a>
            )}
            <Link href={CTA_HREF} tabIndex={open ? undefined : -1} className={`btn btn-primary mt-u3 w-full ${focus}`}>{CTA_LABEL}</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
