import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { company } from "@/lib/company";

export function SiteFooter() { return <footer className="border-t border-white/10 bg-black text-white">
  <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
    <div className="lg:col-span-2"><div className="mb-5"><Image src="/stbs-logo-only.png" alt="STBS logo" width={220} height={93} className="object-contain object-left" /></div><p className="max-w-md text-sm leading-7 text-white/50">Professional borewell, rainwater harvesting, material supply and tubewell construction services since 1992.</p></div>
    <div><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-signal">Navigate</p>{["About","Services","Clients","Gallery","Contact"].map(x=><Link className="mb-3 block text-sm text-white/60 hover:text-white" href={`/${x.toLowerCase()}`} key={x}>{x}</Link>)}</div>
    <div><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-signal">Contact</p><a href={`tel:+91${company.phones[0]}`} className="mb-3 block text-sm text-white/60 hover:text-white">+91 {company.phones[0]}</a><a href={`tel:+91${company.phones[1]}`} className="mb-3 block text-sm text-white/60 hover:text-white">+91 {company.phones[1]}</a><a href={`mailto:${company.email}`} className="mb-5 block text-sm text-white/60 hover:text-white">{company.email}</a><Link href="/quote" className="inline-flex items-center gap-2 border-b border-signal pb-2 font-bold">Request a quote <ArrowUpRight size={16}/></Link></div>
  </div>
  <div className="border-t border-white/10 px-5 py-6 text-center text-xs text-white/35">© {new Date().getFullYear()} {company.name}. All rights reserved.</div>
  </footer> }
