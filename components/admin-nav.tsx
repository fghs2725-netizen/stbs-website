"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin-logout-button";

const links = [{label:"Dashboard",href:"/admin"},{label:"New Quotation",href:"/admin/quotations/new"},{label:"Quotations",href:"/admin/quotations"},{label:"Clients",href:"/admin/clients"}];
export function AdminNav(){const pathname=usePathname();return <nav aria-label="Admin navigation" className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 text-xs font-bold uppercase tracking-wider"><span className="mr-2 text-signal">STBS ADMIN</span>{links.map(link=><Link key={link.href} href={link.href} className={`px-3 py-2 transition ${pathname===link.href?"bg-signal text-black":"text-white/60 hover:text-white"}`}>{link.label}</Link>)}<AdminLogoutButton/></nav>}
