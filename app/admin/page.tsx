import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import Link from "next/link";
import { dashboardCounts } from "@/lib/quotation-management";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  let counts:any[]=[];try{counts=await dashboardCounts()}catch{} const total=counts.reduce((n,x)=>n+x._count,0),draft=counts.find(x=>x.status==="DRAFT")?._count||0,final=counts.find(x=>x.status==="FINAL")?._count||0; return <main className="min-h-screen bg-black px-5 py-8 text-white lg:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-signal">STBS / Administration</p><h1 className="mt-3 font-display text-4xl font-bold uppercase">Dashboard</h1></div><div className="flex items-center gap-3"><Link href="/admin/quotations/new" className="bg-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-black">New quotation</Link><AdminLogoutButton /></div></header><section className="grid gap-5 py-12 sm:grid-cols-3"><div className="border border-white/10 p-6">TOTAL QUOTATIONS<h2 className="mt-3 text-3xl text-signal">{total}</h2></div><div className="border border-white/10 p-6">DRAFT QUOTATIONS<h2 className="mt-3 text-3xl text-signal">{draft}</h2></div><div className="border border-white/10 p-6">FINAL QUOTATIONS<h2 className="mt-3 text-3xl text-signal">{final}</h2></div></section><div className="flex gap-3"><Link href="/admin/quotations" className="border border-signal px-5 py-3 text-signal">QUOTATIONS</Link><Link href="/admin/clients" className="border border-signal px-5 py-3 text-signal">CLIENTS</Link></div></div></main>;
}
