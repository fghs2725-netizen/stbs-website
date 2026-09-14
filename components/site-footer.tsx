import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { CmsSettings } from "@/components/public/sections";

const DEFAULT_LINKS = ["About", "Services", "Clients", "Gallery", "Contact"];

export function SiteFooter({ settings, navLinks }: { settings?: Pick<CmsSettings, 'businessName' | 'shortDescription' | 'phone' | 'phone2' | 'email'> | null; navLinks?: Array<{ label: string; href: string }> }) {
  const phones = [settings?.phone, settings?.phone2].filter((p): p is string => Boolean(p));
  const email = settings?.email ?? "";
  const name = settings?.businessName ?? "";
  const tagline = settings?.shortDescription ?? "";
  const links = navLinks?.length ? navLinks.map(l => l.label).filter(l => !l.toLowerCase().includes("quote") && l.toLowerCase() !== "admin") : DEFAULT_LINKS;

  return <footer className="border-t border-white/10 bg-black text-white">
  <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
    <div className="lg:col-span-2"><div className="mb-5"><Image src="/stbs-logo-only.png" alt="STBS logo" width={220} height={93} className="object-contain object-left" /></div><p className="max-w-md text-sm leading-7 text-white/50">{tagline}</p></div>
    <div><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-signal">Navigate</p>{links.map(x=>{
      const href = navLinks?.length ? (navLinks.find(l => l.label === x)?.href ?? `/${x.toLowerCase()}`) : `/${x.toLowerCase()}`;
      return <Link className="mb-3 block text-sm text-white/60 hover:text-white" href={href} key={x}>{x}</Link>;
    })}</div>
    <div><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-signal">Contact</p>{phones.map((p,i)=><a key={i} href={`tel:+91${p}`} className="mb-3 block text-sm text-white/60 hover:text-white">+91 {p}</a>)}{email && <a href={`mailto:${email}`} className="mb-5 block text-sm text-white/60 hover:text-white">{email}</a>}<Link href="/quote" className="inline-flex items-center gap-2 border-b border-signal pb-2 font-bold">Request a quote <ArrowUpRight size={16}/></Link></div>
  </div>
  <div className="border-t border-white/10 px-5 py-6 text-center text-xs text-white/35">© {new Date().getFullYear()}{name ? ` ${name}` : ""}. All rights reserved.</div>
  </footer>
}
