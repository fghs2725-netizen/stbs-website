"use client";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { usePathname } from "next/navigation";

const links = ["About", "Services", "Clients", "Gallery", "Contact"];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", latest => setScrolled(latest > 24));

  return <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .6, ease: [0.22, 1, 0.36, 1] }} className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-500 ${scrolled || open ? "border-white/10 bg-black/85 shadow-[0_18px_70px_rgba(0,0,0,.35)] backdrop-blur-xl" : "border-white/0 bg-black/25 backdrop-blur-sm"}`}>
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link href="/" className="flex items-center gap-3" aria-label="Saini Tubewell home">
        <motion.span animate={{ scale: scrolled ? .94 : 1 }} transition={{ duration: .35 }} className="relative block h-[68px] w-44">
          <Image src="/stbs-logo-only.png" alt="STBS logo" fill className="object-contain object-left" sizes="176px" priority />
        </motion.span>
      </Link>
      <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
        <div className="flex items-center gap-1">
          {links.map(link => {
          const href = `/${link.toLowerCase()}`;
          const active = pathname === href || (href !== "/about" && pathname.startsWith(`${href}/`));
            return <Link key={link} href={href} className={`group relative px-3 py-2 text-[11px] font-semibold uppercase tracking-[.13em] transition-colors duration-300 ${active ? "text-white" : "text-white/55 hover:text-white"}`}>
            {link}
            <span className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-signal transition-all duration-300 ease-out ${active ? "w-3/5 opacity-90" : "w-0 opacity-0 group-hover:w-3/5 group-hover:opacity-100"}`} />
            </Link>;
          })}
        </div>
        <Link href="/quote" className="flex h-11 items-center gap-2 bg-signal px-5 text-xs font-extrabold uppercase tracking-wider text-black transition hover:-translate-y-0.5 hover:bg-white">Request Quote <ArrowUpRight size={16}/></Link>
      </nav>
      <button className="text-white lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
    </div>
    {open && <nav className="border-t border-white/10 bg-black px-5 py-6 lg:hidden">{[...links, "Quote"].map(link => <Link onClick={() => setOpen(false)} key={link} href={`/${link.toLowerCase()}`} className="block border-b border-white/10 py-4 font-display text-2xl uppercase text-white">{link}</Link>)}</nav>}
  </motion.header>;
}
