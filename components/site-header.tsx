"use client";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowUpRight, Pencil } from "lucide-react";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { usePathname } from "next/navigation";
import { useWebsiteEditor } from "@/lib/website/editor-context";

const DEFAULT_LINKS = ["About", "Services", "Clients", "Gallery", "Contact"];

export function SiteHeader({ navLinks, businessName, logoUrl, mobileLogoUrl }: { navLinks?: Array<{ label: string; href: string }>; businessName?: string; logoUrl?: string; mobileLogoUrl?: string }) {
  const links = navLinks?.length
    ? navLinks.filter(l => !l.href.startsWith("/admin") && !l.href.startsWith("/quote") && l.label.toLowerCase() !== "admin").map(l => l.label)
    : DEFAULT_LINKS;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", latest => setScrolled(latest > 24));
  const editor = useWebsiteEditor();
  const isEditor = editor.isEditor;

  const headerPositionClass = isEditor
    ? "absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-xl"
    : `fixed inset-x-0 top-0 z-50 border-b transition-all duration-500 ${scrolled || open ? "border-white/10 bg-black/85 shadow-[0_18px_70px_rgba(0,0,0,.35)] backdrop-blur-xl" : "border-white/0 bg-black/25 backdrop-blur-sm"}`;

  return <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .6, ease: [0.22, 1, 0.36, 1] }} className={headerPositionClass}>
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-5 lg:px-8">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          data-editor-safe
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label={businessName && businessName.length > 0 ? `${businessName} home` : "Home"}
        >
          <motion.span animate={{ scale: scrolled ? .94 : 1 }} transition={{ duration: .35 }} className="relative block h-[50px] w-36 sm:h-[68px] sm:w-44">
            <Image src={logoUrl || "/stbs-logo-only.png"} alt="STBS logo" fill className={`object-contain object-left ${mobileLogoUrl ? "hidden sm:block" : ""}`} sizes="176px" priority />
            {mobileLogoUrl && <Image src={mobileLogoUrl} alt="STBS logo" fill className="object-contain object-left sm:hidden" sizes="176px" priority />}
          </motion.span>
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
            className="inline-flex min-h-8 items-center gap-1 rounded bg-signal/90 px-2 text-[10px] font-bold uppercase text-black hover:bg-white shadow-sm transition shrink-0"
            title="Edit Logo in Settings"
          >
            <Pencil size={11} /> Edit Logo
          </button>
        )}
      </div>
      <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
        <div className="flex items-center gap-1">
          {links.map(link => {
          const href = navLinks?.length ? (navLinks.find(l => l.label === link)?.href ?? `/${link.toLowerCase()}`) : `/${link.toLowerCase()}`;
          const active = pathname === href || (href !== "/about" && pathname.startsWith(`${href}/`));
            return <Link key={link} href={href} className={`group relative px-3 py-2 text-[11px] font-semibold uppercase tracking-[.13em] transition-colors duration-300 ${active ? "text-white" : "text-white/55 hover:text-white"}`}>
            {link}
            <span className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-signal transition-all duration-300 ease-out ${active ? "w-3/5 opacity-90" : "w-0 opacity-0 group-hover:w-3/5 group-hover:opacity-100"}`} />
            </Link>;
          })}
        </div>
        <Link href="/quote" className="flex h-11 items-center gap-2 rounded-xl bg-signal px-5 text-xs font-extrabold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-water-dark">Request Quote <ArrowUpRight size={16}/></Link>
      </nav>
      <button className="inline-flex min-h-11 min-w-11 items-center justify-center text-white lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
    </div>
    {open && <nav className="border-t border-white/10 bg-black px-5 py-6 lg:hidden">{[...links, "Quote"].map(link => {
      const href = navLinks?.length ? (navLinks.find(l => l.label === link)?.href ?? `/${link.toLowerCase()}`) : `/${link.toLowerCase()}`;
      return <Link onClick={() => setOpen(false)} key={link} href={href} className="block border-b border-white/10 py-4 font-display text-2xl uppercase text-white">{link}</Link>;
    })}</nav>}
  </motion.header>;
}
