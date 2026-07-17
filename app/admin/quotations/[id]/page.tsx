import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
export const dynamic = "force-dynamic";
export default async function QuotationViewPage({ params }: { params: Promise<{ id: string }> }) { const session = await auth(); if (!session?.user) redirect("/admin/login"); const { id } = await params; return <main className="min-h-screen bg-black px-5 py-8 text-white lg:px-8"><div className="mx-auto max-w-4xl"><p className="text-xs font-bold uppercase tracking-[.25em] text-signal">STBS / Quotation</p><h1 className="mt-4 font-display text-4xl uppercase">Quotation {id}</h1><div className="mt-10 border border-white/10 bg-white/[.035] p-8"><p className="text-sm text-white/55">Quotation persistence is not connected yet. This view is reserved for the saved quotation document.</p><Link href="/admin/quotations" className="mt-7 inline-block border border-signal px-5 py-3 text-xs font-bold uppercase tracking-wider text-signal">Back to quotations</Link></div></div></main>; }

