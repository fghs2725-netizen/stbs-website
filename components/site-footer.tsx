"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Pencil } from "lucide-react";
import type { CmsSettings } from "@/components/public/sections";
import { useWebsiteEditor } from "@/lib/website/editor-context";
import { DEFAULT_NAV_LINKS, FOOTER_ONLY_LINKS, isPublicNavLink } from "@/lib/website/nav-defaults";


export function SiteFooter({ settings, navLinks }: { settings?: Pick<CmsSettings, 'businessName' | 'shortDescription' | 'phone' | 'phone2' | 'email' | 'primaryLogoUrl' | 'lightLogoUrl' | 'darkLogoUrl' | 'logoUrl'> | null; navLinks?: Array<{ label: string; href: string }> }) {
  const phones = [settings?.phone, settings?.phone2].filter((p): p is string => Boolean(p));
  const email = settings?.email ?? "";
  const name = settings?.businessName ?? "";
  const tagline = settings?.shortDescription ?? "";
  // Main nav links first, then footer-only pages (About, Gallery) that are no longer in the navbar.
  const main = (navLinks?.length ? navLinks : DEFAULT_NAV_LINKS).filter(isPublicNavLink);
  const links = [...main, ...FOOTER_ONLY_LINKS.filter(x => !main.some(m => m.href === x.href))];
  const editor = useWebsiteEditor();
  const isEditor = editor.isEditor;

  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:gap-12 sm:px-5 sm:py-16 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Link
              href="/"
              data-editor-safe
              className="inline-block transition-opacity hover:opacity-90"
              aria-label={name ? `${name} home` : "Home"}
            >
              <Image
                src={settings?.primaryLogoUrl || settings?.lightLogoUrl || settings?.darkLogoUrl || settings?.logoUrl || "/stbs-logo-only.png"}
                alt="STBS logo"
                width={220}
                height={93}
                className="h-auto w-40 sm:w-52 object-contain object-left"
              />
            </Link>
            {isEditor && editor.mode === "edit" && (
              <button
                type="button"
                data-editor-safe
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  editor.openEditor({ kind: "settings" });
                }}
                className="inline-flex min-h-8 items-center gap-1 rounded bg-signal/90 px-2 text-[10px] font-bold uppercase text-black hover:bg-white shadow-sm transition"
                title="Edit Logo in Settings"
              >
                <Pencil size={11} /> Edit Logo
              </button>
            )}
          </div>
          <p className="max-w-md text-sm leading-7 text-white/50">{tagline}</p>
        </div>
        <div>
          <p className="mb-4 sm:mb-5 text-xs font-bold uppercase tracking-[.2em] text-signal">Navigate</p>
          {links.map(x => <Link className="mb-1 flex min-h-11 items-center text-sm text-white/60 hover:text-white" href={x.href} key={x.href}>{x.label}</Link>)}
        </div>
        <div>
          <p className="mb-4 sm:mb-5 text-xs font-bold uppercase tracking-[.2em] text-signal">Contact</p>
          {phones.map((p, i) => (
            <a key={i} href={`tel:+91${p}`} className="mb-1 flex min-h-11 items-center text-sm text-white/60 hover:text-white">+91 {p}</a>
          ))}
          {email && (
            <a href={`mailto:${email}`} className="mb-1 flex min-h-11 items-center text-sm text-white/60 hover:text-white">{email}</a>
          )}
          <Link href="/quote" className="inline-flex min-h-11 items-center gap-2 border-b border-signal font-bold">
            Request a proposal <ArrowUpRight size={16}/>
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-6 sm:px-5 text-center text-xs text-white/35">
        © {new Date().getFullYear()}{name ? ` ${name}` : ""}. All rights reserved.
      </div>
    </footer>
  );
}
