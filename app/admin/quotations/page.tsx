import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function QuotationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return <main className="min-h-screen bg-black px-5 py-8 text-white lg:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-signal">STBS / Administration</p><h1 className="mt-3 font-display text-4xl font-bold uppercase">Quotations</h1></div><Link href="/admin/quotations/new" className="bg-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-black">New quotation</Link></header><section className="py-16"><div className="border border-white/10 bg-white/[.035] p-10 text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-signal">Quotation history</p><h2 className="mt-4 font-display text-3xl uppercase">No saved quotations yet</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/45">Saved drafts and finalized quotations will appear here once persistence is connected.</p><Link href="/admin/quotations/new" className="mt-8 inline-flex border border-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-signal">Create first quotation</Link></div></section></div></main>;
}

